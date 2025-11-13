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
    const [Users, setUsers] = useState([])
    const [loading, setLoading] = useState(true);

    const flatListRef = useRef<FlatList>(null);
    const socketRef = useRef<any>(null);
    const chatId = `chat_${[myPhone, contactPhone].sort().join("_")}`;

    const dedupeMessages = useCallback((list: any[]) => {
        const map = new Map();
        list.forEach((m) => {
            const key = `${m.from}_${m.message}_${m.timestamp}`;
            map.set(key, m);
        });
        return Array.from(map.values());
    }, []);

    const saveContactToLocalStorage = async () => {
        try {
            // Get existing contacts
            const res = await AsyncStorage.getItem("Users");
            const existingUsers = res ? JSON.parse(res) : [];

            // Create a new contact object
            const contact = {
                id: (existingUsers.length + 1).toString(),
                name: contactPhone,
                phone: contactPhone,
            };

            // Add new contact to list
            const updatedUsers = [...existingUsers, contact];

            // Save updated list to AsyncStorage
            await AsyncStorage.setItem("Users", JSON.stringify(updatedUsers));

            // Update React state
            setUsers(updatedUsers);

            console.log("✅ Contact saved successfully:", contact);
        } catch (error) {
            console.error("❌ Error saving contact:", error);
        }
    };

    const markMessagesSeen = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) return;
            await axios.post(
                "https://chatter-mobo-app.onrender.com/api/messages/seen",
                { receiverPhoneNumber: contactPhone },
                { headers: { token } }
            );
            socketRef.current?.emit("messagesSeen", {
                to: myPhone,
                from: contactPhone,
            });
        } catch (error: any) {
            console.log(error.message);
        }
    }, [contactPhone, myPhone]);

    useEffect(() => {
        socketRef.current = io("https://chatter-mobo-app.onrender.com/", {
            transports: ["websocket"],
            reconnection: true,
        });

        socketRef.current.on("connect", () => {
            socketRef.current.emit("register", myPhone);
        });

        socketRef.current.on("receiveMessage", ({ from, message, publickey }: { from: any; message: string; publickey: string }) => {
            const newMsg = {
                from: from === myPhone ? "Me" : from,
                message,
                publickey,
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

    useEffect(() => {
        (async () => {
            const local = await AsyncStorage.getItem(chatId);
            if (local) setMessages(JSON.parse(local));
            setLoading(false);
            await fetchMessagesFromBackend();
            await markMessagesSeen();
            saveContactToLocalStorage()
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

    const handleSend = async () => {
        // Retrieve Publickey from AsyncStorage
        const serverkey = await AsyncStorage.getItem("serverkey");
        const privatekey = await AsyncStorage.getItem("privatekey");
        if (!serverkey || !privatekey) {
            console.error("Server key or private key not found in AsyncStorage");
            return;
        }
        const Publickey = serverkey + privatekey;
        if (!message.trim()) return;
        const text = message.trim();
        const newMsg = { from: "Me", message: text, timestamp: Date.now(), Publickey };
        setMessage("");
        setMessages((prev) => {
            const updated = [...prev, newMsg];
            AsyncStorage.setItem(chatId, JSON.stringify(updated));
            return updated;
        });
        
        const token = await AsyncStorage.getItem("token");
        if (token) {
            axios.post(
                "https://chatter-mobo-app.onrender.com/api/messages/send",
                { receiverPhoneNumber: contactPhone, message: text, Publickey },
                { headers: { token } }
            );
        }
    };

    useEffect(() => {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }, [messages]);

    const renderMessage = ({ item }: any) => {
        const isMe = item.from === "Me";
        return (
            <View style={[styles.msgWrap, { alignSelf: isMe ? "flex-end" : "flex-start" }]}>
                <View style={[styles.bubble, isMe ? styles.mine : styles.theirs]}>
                    <Text style={styles.msgText}>{item.message}</Text>
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
            <View style={styles.backgroundOverlay} />
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{contactPhone}</Text>
                {/* <Text style={styles.headerSubtitle}>Online</Text> */}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#00D4C2" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item, i) => `${item.timestamp}_${i}`}
                    renderItem={renderMessage}
                    contentContainerStyle={{ padding: 12 }}
                />
            )}

            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    placeholderTextColor="#A9A9C5"
                    value={message}
                    onChangeText={setMessage}
                    multiline
                />
                <TouchableOpacity
                    style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
                    disabled={!message.trim()}
                    onPress={handleSend}
                >
                    <Text style={styles.sendText}>Send</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

// 🎨 Enhanced Styles
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#131537" },
    backgroundOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "#1E1F4B",
        shadowColor: "#0D0F2C",
        shadowOffset: { width: 0, height: -250 },
        shadowOpacity: 0.8,
        shadowRadius: 250,
        opacity: 0.9,
    },
    header: {
        backgroundColor: "transparent",
        padding: 18,
        paddingTop: 55,
        borderBottomWidth: 0.5,
        borderBottomColor: "rgba(255,255,255,0.1)",
    },
    headerTitle: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "700",
    },
    headerSubtitle: {
        fontSize: 12,
        color: "#00D4C2",
    },
    msgWrap: { marginBottom: 10, maxWidth: "75%" },
    bubble: {
        padding: 12,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
    },
    mine: {
        backgroundColor: "#00D4C2",
        borderBottomRightRadius: 4,
    },
    theirs: {
        backgroundColor: "rgba(255,255,255,0.1)",
        borderBottomLeftRadius: 4,
    },
    msgText: {
        color: "#fff",
        fontSize: 15,
    },
    time: {
        fontSize: 10,
        color: "rgba(255,255,255,0.6)",
        marginTop: 3,
        textAlign: "right",
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        padding: 10,
        backgroundColor: "rgba(255,255,255,0.08)",
        borderTopWidth: 0.5,
        borderTopColor: "rgba(255,255,255,0.1)",
    },
    input: {
        flex: 1,
        backgroundColor: "rgba(255,255,255,0.15)",
        borderRadius: 25,
        paddingHorizontal: 16,
        paddingVertical: 10,
        color: "#fff",
        fontSize: 15,
    },
    sendButton: {
        backgroundColor: "#00D4C2",
        marginLeft: 10,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 25,
        shadowColor: "#00C1FF",
        shadowOpacity: 0.4,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    sendButtonDisabled: { backgroundColor: "rgba(255,255,255,0.2)" },
    sendText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 15,
    },
});
