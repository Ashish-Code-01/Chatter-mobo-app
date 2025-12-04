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
import { io, Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

// Configuration
// const API_URL = "https://chatter-mobo-app.onrender.com";
const API_URL = "http://10.172.241.98:8000"; // Uncomment for local dev

interface Message {
    from: string;
    message: string;
    timestamp: number;
}

interface RouteParams {
    myPhone: string;
    contactPhone: string;
}

export default function ChatToContact({ route }: { route: { params: RouteParams } }) {
    const { myPhone, contactPhone } = route.params;
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [secretKey, setSecretKey] = useState<string>("");

    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!'_-&@#$%*()/:<>|+= ";

    const flatListRef = useRef<FlatList>(null);
    const socketRef = useRef<Socket | null>(null);
    const chatId = `chat_${[myPhone, contactPhone].sort().join("_")}`;

    const dedupeMessages = useCallback((list: Message[]) => {
        const map = new Map();
        list.forEach((m) => {
            // Create a more robust key that includes message content and from field
            // Use a small time window (1 second) to catch duplicates
            const timeWindow = Math.floor(m.timestamp / 1000);
            const key = `${m.from}_${m.message}_${timeWindow}`;

            // Only keep the first occurrence
            if (!map.has(key)) {
                map.set(key, m);
            }
        });
        return Array.from(map.values()) as Message[];
    }, []);

    const saveContactToLocalStorage = async () => {
        try {
            const res = await AsyncStorage.getItem("Users");
            const existingUsers = res ? JSON.parse(res) : [];

            const contactExists = existingUsers.some((user: any) => user.phone === contactPhone);
            if (contactExists) return;

            const publickey = await AsyncStorage.getItem("publickey");

            const contact = {
                id: (existingUsers.length + 1).toString(),
                name: contactPhone,
                phone: contactPhone,
                publickey: publickey || "",
            };

            const updatedUsers = [...existingUsers, contact];
            await AsyncStorage.setItem("Users", JSON.stringify(updatedUsers));
        } catch (error) {
            console.error("❌ Error saving contact:", error);
        }
    };

    const markMessagesSeen = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) return;

            await axios.post(
                `${API_URL}/api/messages/seen`,
                { receiverPhoneNumber: contactPhone },
                { headers: { token } }
            );
        } catch (error: any) {
            console.error("Error marking messages as seen:", error.message);
        }
    }, [contactPhone]);

    // Initialize encryption key
    const initializeSecretKey = async () => {
        try {
            let key = await AsyncStorage.getItem("secretkey");

            if (!key) {
                const privatekey = await AsyncStorage.getItem("privatekey");
                const serverkey = await AsyncStorage.getItem("serverkey");

                if (privatekey && serverkey) {
                    key = privatekey + serverkey;
                    await AsyncStorage.setItem("secretkey", key);
                }
            }

            if (key) {
                setSecretKey(key);
            }
        } catch (error) {
            console.error("Error initializing secret key:", error);
        }
    };

    // Encrypt Message
    const encryptMessage = (text: string, key: string): string => {
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
                encryptedText += textChar;
            } else {
                const newIndex = (textIndex + keyIndex) % alphabet.length;
                encryptedText += alphabet[newIndex];
            }
        }

        return encryptedText;
    };

    // Decrypt Message
    const decryptMessage = (encryptedText: string, key: string): string => {
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
    };

    // Setup Socket
    useEffect(() => {
        socketRef.current = io(API_URL, {
            transports: ["websocket"],
            reconnection: true,
        });

        socketRef.current.on("connect", () => {
            console.log("Socket connected");
            socketRef.current?.emit("register", myPhone);
        });

        socketRef.current.on("receiveMessage", async ({ from, message: encryptedMsg, publickey }: { from: string; message: string; publickey: string }) => {
            try {
                // Only process messages from the contact, not from ourselves
                if (from === myPhone) {
                    return; // Skip our own messages from socket
                }

                // Use the stored secret key or the provided public key
                const keyToUse = secretKey || publickey;
                const decryptedMsg = decryptMessage(encryptedMsg, keyToUse);

                // Store the public key if we received a new one
                if (publickey && !secretKey) {
                    const privatekey = await AsyncStorage.getItem("privatekey");
                    if (privatekey) {
                        const fullKey = publickey + privatekey;
                        await AsyncStorage.setItem("secretkey", fullKey);
                        setSecretKey(fullKey);
                    }
                }

                const newMsg: Message = {
                    from: from,
                    message: decryptedMsg,
                    timestamp: Date.now(),
                };

                setMessages((prev) => {
                    const merged = dedupeMessages([...prev, newMsg]);
                    AsyncStorage.setItem(chatId, JSON.stringify(merged));
                    return merged;
                });
            } catch (error) {
                console.error("Error receiving message:", error);
            }
        });

        socketRef.current.on("connect_error", (error) => {
            console.error("Socket connection error:", error);
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, [myPhone, secretKey, dedupeMessages, chatId]);

    useEffect(() => {
        (async () => {
            try {
                await initializeSecretKey();

                const local = await AsyncStorage.getItem(chatId);
                if (local) {
                    setMessages(JSON.parse(local));
                }

                await fetchMessagesFromBackend();
                await markMessagesSeen();
                await saveContactToLocalStorage();
            } catch (error) {
                console.error("Error during initial load:", error);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const fetchMessagesFromBackend = async () => {
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) return;

            const res = await axios.post(
                `${API_URL}/api/messages/get/${contactPhone}`,
                {},
                { headers: { token } }
            );

            const raw = res.data?.data || [];
            console.log(raw);

            const backendMsgs: Message[] = raw.map((msg: any) => ({
                from: msg.sender === myPhone ? "Me" : msg.sender,
                message: decryptMessage(msg.content, msg.Publickey),
                timestamp: new Date(msg.createdAt).getTime(),
            }));


            setMessages((prev) => {
                const merged = dedupeMessages([...prev, ...backendMsgs]).sort(
                    (a, b) => a.timestamp - b.timestamp
                );
                AsyncStorage.setItem(chatId, JSON.stringify(merged));
                return merged;
            });
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    };

    const handleSend = async () => {
        try {
            if (!message.trim()) return;

            // Use the stored secret key
            let keyToUse = secretKey;

            // Fallback if secret key not available
            if (!keyToUse) {
                const privatekey = await AsyncStorage.getItem("privatekey");
                const serverkey = await AsyncStorage.getItem("serverkey");

                if (!privatekey || !serverkey) {
                    console.error("Encryption keys not found. Please login again.");
                    return;
                }

                keyToUse = privatekey + serverkey;
                await AsyncStorage.setItem("secretkey", keyToUse);
                setSecretKey(keyToUse);
            }

            const text = message.trim();
            const timestamp = Date.now();
            const newMsg: Message = {
                from: "Me",
                message: text,
                timestamp: timestamp,
            };

            // Clear input and update UI immediately
            setMessage("");
            setMessages((prev) => {
                const updated = [...prev, newMsg];
                AsyncStorage.setItem(chatId, JSON.stringify(updated));
                return updated;
            });

            // Encrypt and send
            const encryptedMsg = encryptMessage(text, keyToUse);

            // Send via socket (don't emit back to ourselves)
            socketRef.current?.emit("sendMessage", {
                from: myPhone,
                to: contactPhone,
                message: encryptedMsg,
                publickey: keyToUse,
            });
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    // Auto-scroll to bottom
    useEffect(() => {
        const timer = setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
        return () => clearTimeout(timer);
    }, [messages]);

    const renderMessage = ({ item }: { item: Message }) => {
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
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
            <View style={styles.backgroundOverlay} />
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{contactPhone}</Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#00D4C2" />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item, i) => `${item.timestamp}_${i}`}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.messageList}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
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
                    maxLength={1000}
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#131537",
    },
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
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    messageList: {
        padding: 12,
        flexGrow: 1,
    },
    msgWrap: {
        marginBottom: 10,
        maxWidth: "75%",
    },
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
        lineHeight: 20,
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
        maxHeight: 100,
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
    sendButtonDisabled: {
        backgroundColor: "rgba(255,255,255,0.2)",
    },
    sendText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 15,
    },
});