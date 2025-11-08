import React, { useEffect, useState, useRef, useCallback } from "react";
import {
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    View,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from "react-native";
import { io } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export default function ChatToContact({ route }: any) {
    const { myPhone, contactPhone } = route.params;

    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<
        Array<{ from: string; message: string; timestamp: number }>
    >([]);
    const [loading, setLoading] = useState(true);

    const flatListRef = useRef<FlatList>(null);
    const socketRef = useRef<any>(null);

    const chatId = `chat_${[myPhone, contactPhone].sort().join("_")}`;

    // ⭐ Prevent duplicate messages
    const dedupeMessages = useCallback((list: any[]) => {
        const map = new Map();
        list.forEach((m) => {
            const key = `${m.from}_${m.message}_${m.timestamp}`;
            map.set(key, m);
        });
        return Array.from(map.values());
    }, []);

    // ✅ Mark messages as seen when opening
    const markMessagesSeen = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) return;

            await axios.post(
                "https://chatter-mobo-app.onrender.com/api/messages/seen",
                { receiverPhoneNumber: contactPhone },
                { headers: { token } }
            );

            // 👇 instantly clears unread badge in Home screen (if using socket event)
            socketRef.current?.emit("messagesSeen", {
                to: myPhone,
                from: contactPhone,
            });
        } catch (error: any) {
            console.log(error.message);
        }
    }, [contactPhone, myPhone]);

    // ✅ Setup Socket
    useEffect(() => {
        socketRef.current = io("https://chatter-mobo-app.onrender.com/", {
            transports: ["websocket"],
            reconnection: true,
        });

        socketRef.current.on("connect", () => {
            socketRef.current.emit("register", myPhone);
        });

        // Receive messages
        socketRef.current.on("receiveMessage", ({ from, message }: { from: any, message: string }) => {
            const newMsg = {
                from: from === myPhone ? "Me" : from,
                message,
                timestamp: Date.now(),
            };

            setMessages((prev) => {
                const merged = dedupeMessages([...prev, newMsg]);
                AsyncStorage.setItem(chatId, JSON.stringify(merged));
                return merged;
            });
        });

        return () => socketRef.current.disconnect();
    }, [myPhone, dedupeMessages]);

    // ✅ Fetch messages on load
    useEffect(() => {
        (async () => {
            // Local first (for instant UI)
            const local = await AsyncStorage.getItem(chatId);
            if (local) setMessages(JSON.parse(local));

            await fetchMessagesFromBackend();
            await markMessagesSeen();
            setLoading(false);
        })();
    }, []);

    const fetchMessagesFromBackend = async () => {
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) return;

            const res = await axios.post(
                `https://chatter-mobo-app.onrender.com/api/messages/get/${contactPhone}`,
                {},
                { headers: { token } }
            );

            const raw = res.data?.data || [];
            const backendMsgs = raw.map((msg: any) => ({
                from: msg.sender === myPhone ? "Me" : msg.sender,
                message: msg.content,
                timestamp: new Date(msg.createdAt).getTime(),
            }));

            setMessages((prev) => {
                const merged = dedupeMessages([...prev, ...backendMsgs]).sort(
                    (a, b) => a.timestamp - b.timestamp
                );
                AsyncStorage.setItem(chatId, JSON.stringify(merged));
                return merged;
            });
        } catch (e) {
            console.log("fetch err", e);
        }
    };

    // ✅ Send message
    const handleSend = async () => {
        if (!message.trim()) return;

        const text = message.trim();
        const newMsg = { from: "Me", message: text, timestamp: Date.now() };

        setMessage("");
        setMessages((prev) => {
            const updated = [...prev, newMsg];
            AsyncStorage.setItem(chatId, JSON.stringify(updated));
            return updated;
        });

        socketRef.current.emit("sendMessage", {
            from: myPhone,
            to: contactPhone,
            message: text,
        });

        const token = await AsyncStorage.getItem("token");
        if (token) {
            axios.post(
                "https://chatter-mobo-app.onrender.com/api/messages/send",
                { receiverPhoneNumber: contactPhone, message: text },
                { headers: { token } }
            );
        }
    };

    // ✅ Auto scroll
    useEffect(() => {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }, [messages]);

    // ✅ UI
    const renderMessage = ({ item }: any) => {
        const isMe = item.from === "Me";
        return (
            <View
                style={[
                    styles.msgWrap,
                    { alignSelf: isMe ? "flex-end" : "flex-start" },
                ]}
            >
                <View style={[styles.bubble, isMe ? styles.mine : styles.theirs]}>
                    {!isMe && <Text style={styles.sender}>{item.from}</Text>}
                    <Text>{item.message}</Text>
                    <Text style={styles.time}>
                        {new Date(item.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{contactPhone}</Text>
                <Text style={styles.headerSubtitle}>Online</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item, i) => `${item.timestamp}_${i}`}
                    renderItem={renderMessage}
                    contentContainerStyle={{ padding: 12 }}
                />
            )}

            {/* Input */}
            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    placeholder="Type..."
                    value={message}
                    onChangeText={setMessage}
                    multiline
                />
                <TouchableOpacity
                    style={[styles.btn, !message.trim() && styles.btnDisabled]}
                    disabled={!message.trim()}
                    onPress={handleSend}
                >
                    <Text style={{ color: "#fff" }}>Send</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

// 🎨 Styles
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f5f5f5" },
    header: { backgroundColor: "#075E54", padding: 16, paddingTop: 50 },
    headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
    headerSubtitle: { fontSize: 12, color: "#b3e5d8" },

    msgWrap: { marginBottom: 10, maxWidth: "80%" },
    bubble: {
        padding: 10,
        borderRadius: 16,
    },
    mine: { backgroundColor: "#DCF8C6", borderBottomRightRadius: 4 },
    theirs: { backgroundColor: "#fff", borderBottomLeftRadius: 4 },
    sender: { fontSize: 12, color: "#075E54", marginBottom: 3 },
    time: { fontSize: 10, color: "#888", marginTop: 2, textAlign: "right" },

    inputRow: {
        flexDirection: "row",
        padding: 10,
        borderTopWidth: 1,
        borderColor: "#ddd",
        backgroundColor: "#fff",
    },
    input: {
        flex: 1,
        backgroundColor: "#eee",
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        maxHeight: 110,
    },
    btn: {
        backgroundColor: "#075E54",
        marginLeft: 8,
        paddingHorizontal: 18,
        borderRadius: 20,
        justifyContent: "center",
    },
    btnDisabled: { backgroundColor: "#999" },
});
