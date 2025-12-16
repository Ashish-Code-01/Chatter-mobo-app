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
    Image,
} from "react-native";
import { io, Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

// Configuration
// const API_URL = "https://chatter-mobo-app.onrender.com";
const API_URL = "http://10.73.208.98:8000"; // Uncomment for local dev
const DEFAULT_AVATAR = "https://res.cloudinary.com/dqmxpgv5k/image/upload/v1765892967/A_circular_default_c_cafouy.png";

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
    const [contactIsOnline, setContactIsOnline] = useState(false);
    const [contactAvatar, setContactAvatar] = useState<string>("");

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

            const secretkey = await AsyncStorage.getItem("secretkey");

            const contact = {
                id: (existingUsers.length + 1).toString(),
                name: contactPhone,
                phone: contactPhone,
                publickey: secretkey || "",
                avatar: contactAvatar || "",
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


        // Listen for online status changes
        socketRef.current.on("userStatusChanged", ({ phoneNumber, isOnline }: { phoneNumber: string; isOnline: boolean }) => {
            if (phoneNumber === contactPhone) {
                setContactIsOnline(isOnline);
            }
        });

        socketRef.current.on("receiveMessage", async ({ from, message: encryptedMsg, publickey }: { from: string; message: string; publickey: string }) => {
            try {
                // Only process messages from the contact, not from ourselves
                if (from === myPhone) {
                    return; // Skip our own messages from socket
                }

                // Get our stored secret key
                let keyToUse = secretKey;

                if (!keyToUse) {
                    // Try to derive key from the public key sent by sender
                    const privatekey = await AsyncStorage.getItem("privatekey");
                    if (publickey && privatekey) {
                        // Combine sender's public key (first 16 chars of their private) with our private key
                        keyToUse = publickey + privatekey;
                        console.log("Derived key from public key + our private key");
                    } else {
                        const serverkey = await AsyncStorage.getItem("serverkey");
                        if (privatekey && serverkey) {
                            keyToUse = privatekey + serverkey;
                        }
                    }
                }

                if (!keyToUse) {
                    console.error("No decryption key available");
                    return;
                }

                // Decrypt the message
                const decryptedMsg = decryptMessage(encryptedMsg, keyToUse);

                // Store the public key for future reference
                if (publickey && !secretKey) {
                    await AsyncStorage.setItem("secretkey", keyToUse);
                    setSecretKey(keyToUse);
                }

                const newMsg: Message = {
                    from: from,
                    message: decryptedMsg,
                    timestamp: Date.now(),
                };

                console.log("Message received and decrypted:", {
                    from: from,
                    encrypted: encryptedMsg,
                    decrypted: decryptedMsg,
                    keyUsed: keyToUse
                });

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
    }, [myPhone, secretKey, dedupeMessages, chatId, contactPhone]);

    useEffect(() => {
        (async () => {
            try {

                const local = await AsyncStorage.getItem(chatId);
                if (local) {
                    setMessages(JSON.parse(local));
                }

                // Fetch initial online status of contact
                await fetchContactStatus();
                await fetchContactAvatar();

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

    const fetchContactStatus = async () => {
        try {
            const response = await axios.get(
                `${API_URL}/api/online/status/${contactPhone}`
            );
            if (response.data?.success) {
                setContactIsOnline(response.data.data.isOnline);
            }
        } catch (error) {
            console.error("Error fetching contact status:", error);
        }
    };

    const fetchContactAvatar = async () => {
        try {
            const response = await axios.get(
                `${API_URL}/auth/user/${contactPhone}`
            );
            if (response.data?.success && response.data?.data?.avatar) {
                setContactAvatar(response.data.data.avatar);
            } else {
                // Use default avatar if none found
                setContactAvatar(DEFAULT_AVATAR);
            }
        } catch (error) {
            console.error("Error fetching contact avatar:", error);
            // Use default avatar on error
            setContactAvatar(DEFAULT_AVATAR);
        }
    };

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
            console.log("Messages from backend:", raw);
            const secretkey = await AsyncStorage.getItem("secretkey");

            const backendMsgs: Message[] = raw.map((msg: any) => {
                try {
                    // FIX: Decrypt using secretkey (derived from own privatekey + contact's publickey)
                    // Do NOT use msg.Publickey for decryption
                    const decryptedContent = decryptMessage(msg.content, secretkey);
                    return {
                        from: msg.sender === myPhone ? "Me" : msg.sender,
                        message: decryptedContent,
                        timestamp: new Date(msg.createdAt).getTime(),
                    };
                } catch (error) {
                    console.error("Error decrypting message:", error);
                    return {
                        from: msg.sender === myPhone ? "Me" : msg.sender,
                        message: "[Decryption failed]",
                        timestamp: new Date(msg.createdAt).getTime(),
                    };
                }
            });


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

            let keyToUse = secretKey;

            // Fallback if secret key not available
            if (!keyToUse) {
                const privatekey = await AsyncStorage.getItem("privatekey");
                const serverkey = await AsyncStorage.getItem("serverkey");

                if (!privatekey || !serverkey) {
                    console.error("Encryption keys not found. Please login again.");
                    Alert.alert("Error", "Encryption keys not found. Please login again.");
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

            // Encrypt message using the encryption key
            const encryptedMsg = encryptMessage(text, keyToUse);

            if (!encryptedMsg || encryptedMsg === text) {
                console.warn("Message encryption may have failed");
            }

            // Get public key (first 16 characters of privatekey) to send to receiver
            // The receiver will combine this with their privatekey to derive same decryption key
            const publickey = keyToUse.substring(0, 16);

            // Send via socket with encrypted message and public key
            socketRef.current?.emit("sendMessage", {
                from: myPhone,
                to: contactPhone,
                message: encryptedMsg,
                publickey: publickey,  // Always send public key portion
            });

            console.log("Message sent encrypted:", {
                original: text,
                encrypted: encryptedMsg,
                publickey: publickey,
                keyUsed: keyToUse
            });

        } catch (error) {
            console.error("Error sending message:", error);
            Alert.alert("Error", "Failed to send message");
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
                {contactAvatar ? (
                    <Image
                        source={{ uri: contactAvatar }}
                        style={styles.avatarImage}
                    />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>U</Text>
                    </View>
                )}
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>{contactPhone}</Text>
                    <Text style={[styles.statusText, { color: contactIsOnline ? "#00D4C2" : "#A9A9C5" }]}>
                        {contactIsOnline ? "● Online" : "● Offline"}
                    </Text>
                </View>
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
        backgroundColor: "#0F1419",
    },

    backgroundOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "#0F1419",
    },

    /* ==================== HEADER ==================== */
    header: {
        paddingTop: 50,
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(0, 212, 194, 0.15)",
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        backgroundColor: "rgba(15, 20, 25, 0.8)",
        backdropFilter: "blur(10px)",
    },

    headerContent: {
        flex: 1,
    },

    headerTitle: {
        color: "#FFFFFF",
        fontSize: 17,
        fontWeight: "600",
        letterSpacing: 0.3,
    },

    avatarImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "rgba(0, 212, 194, 0.15)",
        borderWidth: 2,
        borderColor: "rgba(0, 212, 194, 0.3)",
    },

    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "linear-gradient(135deg, #00D4C2 0%, #0099CC 100%)",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "rgba(0, 212, 194, 0.4)",
    },

    avatarText: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "700",
    },

    statusText: {
        fontSize: 11,
        marginTop: 4,
        fontWeight: "500",
        letterSpacing: 0.5,
    },

    /* ==================== LOADING ==================== */
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#0F1419",
    },

    /* ==================== MESSAGE LIST ==================== */
    messageList: {
        paddingHorizontal: 12,
        paddingVertical: 16,
        flexGrow: 1,
    },

    msgWrap: {
        marginVertical: 8,
        maxWidth: "85%",
    },

    /* BUBBLE BASE STYLE */
    bubble: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 18,
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },

    /* SENDER (ME) */
    mine: {
        backgroundColor: "rgba(0, 212, 194, 0.95)",
        alignSelf: "flex-end",
        borderBottomRightRadius: 6,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderBottomLeftRadius: 20,
    },

    /* RECEIVER */
    theirs: {
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        alignSelf: "flex-start",
        borderBottomLeftRadius: 6,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderBottomRightRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(0, 212, 194, 0.2)",
    },

    msgText: {
        fontSize: 15,
        color: "#fff",
        lineHeight: 21,
        fontWeight: "500",
    },

    time: {
        fontSize: 10,
        color: "rgba(255, 255, 255, 0.5)",
        marginTop: 6,
        textAlign: "right",
        fontWeight: "400",
    },

    /* ==================== INPUT AREA ==================== */
    inputRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 10,
        backgroundColor: "rgba(15, 20, 25, 0.6)",
        borderTopWidth: 1,
        borderTopColor: "rgba(0, 212, 194, 0.1)",
    },

    input: {
        flex: 1,
        paddingHorizontal: 18,
        paddingVertical: 12,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        borderRadius: 24,
        fontSize: 15,
        color: "#fff",
        maxHeight: 100,
        borderWidth: 1,
        borderColor: "rgba(0, 212, 194, 0.2)",
        fontWeight: "500",
    },

    sendButton: {
        backgroundColor: "rgba(0, 212, 194, 0.9)",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        shadowColor: "#00D4C2",
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        justifyContent: "center",
        alignItems: "center",
    },

    sendButtonDisabled: {
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        shadowOpacity: 0,
    },

    sendText: {
        color: "#0F1419",
        fontWeight: "700",
        fontSize: 14,
        letterSpacing: 0.5,
    },
});
