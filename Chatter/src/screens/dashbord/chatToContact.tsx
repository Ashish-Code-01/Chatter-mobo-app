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
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!'_-&@#$%*()/:<>|+= ";

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

            // Check if contact already exists
            const contactExists = existingUsers.some((user: any) => user.phone === contactPhone);
            if (contactExists) {
                setUsers(existingUsers);
                return;
            }

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
            )
        } catch (error: any) {
            console.log(error.message);
        }
    }, [contactPhone]);

    useEffect(() => {
        // socketRef.current = io("https://chatter-mobo-app.onrender.com/", {
        socketRef.current = io("http://10.172.241.98:8000/", {
            transports: ["websocket"],
            reconnection: true,
        });

        socketRef.current.on("connect", () => {
            socketRef.current.emit("register", myPhone);
        });

        socketRef.current.on("receiveMessage", ({ from, message, publickey }: { from: any; message: string; publickey: string }) => {
            const decryptedMsg = decryptMessage(message, publickey);
            console.log(`the msg ${decryptedMsg} was received from ${from} and the publickey is ${publickey}`);
            const privatekey = AsyncStorage.getItem("privatekey");
            const secretkey = publickey + privatekey; 
            AsyncStorage.setItem("secretkey", secretkey);
            const newMsg = {
                from: from === myPhone ? "Me" : from,
                message: decryptedMsg,
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
    }, [myPhone, dedupeMessages, chatId]);

    useEffect(() => {
        (async () => {
            const local = await AsyncStorage.getItem(chatId);
            if (local) setMessages(JSON.parse(local));
            setLoading(false);
            await fetchMessagesFromBackend();
            await markMessagesSeen();
            await saveContactToLocalStorage();
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

    // Encrypt and Decrypt Messages (Simple Caesar Cipher for Demo)
    const encryptMessage = (text: string, key: string) => {
        // Add null/undefined checks
        if (!text || !key) {
            console.error("Text or key is missing for encryption");
            return text || "";
        }

        let encryptedText = "";

        for (let i = 0; i < text.length; i++) {
            const textChar = text[i];
            const keyChar = key[i % key.length];

            const textIndex = alphabet.indexOf(textChar);
            const keyIndex = alphabet.indexOf(keyChar);

            if (textIndex === -1) {
                encryptedText += textChar; // Fixed typo: was "encryptText"
            } else {
                const newIndex = (textIndex + keyIndex) % alphabet.length;
                encryptedText += alphabet[newIndex];
            }
        }

        return encryptedText;
    }

    const decryptMessage = (encryptedText: string, key: string) => {
        // Add null/undefined checks
        if (!encryptedText || !key) {
            console.error("Encrypted text or key is missing for decryption");
            return encryptedText || "";
        }

        let decryptedText = "";

        for (let i = 0; i < encryptedText.length; i++) {
            const encryptedChar = encryptedText[i];
            const keyChar = key[i % key.length];

            const encryptedIndex = alphabet.indexOf(encryptedChar);
            const keyIndex = alphabet.indexOf(keyChar);

            if (encryptedIndex === -1) {
                decryptedText += encryptedChar;
            } else {
                let newIndex = encryptedIndex - keyIndex;
                if (newIndex < 0) newIndex += alphabet.length;
                decryptedText += alphabet[newIndex];
            }
        }

        return decryptedText;
    }

    const handleSend = async () => {
        try {
            const serverkey = await AsyncStorage.getItem("serverkey");
            const privatekey = await AsyncStorage.getItem("privatekey");

            if (!serverkey || !privatekey) {
                console.error("Server key or private key not found in AsyncStorage");
                return;
            }

            const publickey = serverkey + privatekey; // Consistent naming

            if (!message.trim()) return;

            const text = message.trim();
            const newMsg = { from: "Me", message: text, timestamp: Date.now(), publickey };

            setMessage("");
            setMessages((prev) => {
                const updated = [...prev, newMsg];
                AsyncStorage.setItem(chatId, JSON.stringify(updated));
                return updated;
            });

            const encryptmsg = encryptMessage(text, publickey);

            socketRef.current.emit("sendMessage", {
                from: myPhone,
                to: contactPhone,
                message: encryptmsg,
                publickey, // Consistent naming
            });

            console.log(`the msg this ${encryptmsg} was sent to ${contactPhone} and the publickey is ${publickey}`);

            const token = await AsyncStorage.getItem("token");
            if (token) {
                await axios.post(
                    // "https://chatter-mobo-app.onrender.com/api/messages/send",
                    "http://10.172.241.98:8000/api/messages/send",
                    { receiverPhoneNumber: contactPhone, message: encryptmsg, publickey }, // Consistent naming
                    { headers: { token } }
                );
            }
        } catch (error) {
            console.error("Error sending message:", error);
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