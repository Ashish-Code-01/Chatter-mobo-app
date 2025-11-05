import React, { useEffect, useState, useRef } from "react";
import {
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    View,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from "react-native";
import { io } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export default function App({ route }: any) {
    const { myPhone, contactPhone } = route.params;
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<
        Array<{ from: string; message: string; timestamp: number }>
    >([]);
    const flatListRef = useRef<FlatList>(null);
    const socketRef = useRef<any>(null);

    const chatId = `chat_${[myPhone, contactPhone].sort().join("_")}`;

    // ✅ Setup socket connection once
    useEffect(() => {
        socketRef.current = io("https://chatter-mobo-app.onrender.com/", {
            transports: ["websocket"],
            reconnection: true,
        });

        socketRef.current.on("connect", () => {
            console.log("Connected to socket:", socketRef.current.id);
            socketRef.current.emit("register", myPhone); // register user
        });

        // Listen for incoming messages
        socketRef.current.on(
            "receiveMessage",
            ({ from, message }: { from: string; message: string }) => {
                console.log("📩 Received from", from, ":", message);
                const newMessage = {
                    from: from === myPhone ? "Me" : from,
                    message,
                    timestamp: Date.now(),
                };

                setMessages((prev) => {
                    const updated = [...prev, newMessage];
                    saveMessages(updated);
                    return updated;
                });
            }
        );

        socketRef.current.on("disconnect", () => {
            console.log("Socket disconnected");
        });

        return () => {
            socketRef.current.disconnect();
        };
    }, []);

    // ✅ Load local + backend messages on mount
    useEffect(() => {
        (async () => {
            await loadMessages();
            await getMessagesFromBackend();
        })();
    }, []);

    const getMessagesFromBackend = async () => {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
            Alert.alert("Error", "Please login again");
            return;
        }

        try {
            const response = await axios.post(
                `https://chatter-mobo-app.onrender.com/api/messages/get/${contactPhone}`,
                {},
                {
                    headers: { token },
                }
            );

            if (response.data && Array.isArray(response.data)) {
                const fetchedMessages = response.data.map((msg: any) => ({
                    from: msg.from === myPhone ? "Me" : msg.from,
                    message: msg.message,
                    timestamp: msg.timestamp || Date.now(),
                }));

                setMessages(fetchedMessages);
                saveMessages(fetchedMessages);
            }
        } catch (error) {
            console.error("❌ Error fetching messages:", error);
        }
    };

    const loadMessages = async () => {
        try {
            const savedMessages = await AsyncStorage.getItem(chatId);
            if (savedMessages) {
                setMessages(JSON.parse(savedMessages));
            }
        } catch (error) {
            console.error("❌ Error loading messages:", error);
        }
    };

    const saveMessages = async (
        newMessages: Array<{ from: string; message: string; timestamp: number }>
    ) => {
        try {
            await AsyncStorage.setItem(chatId, JSON.stringify(newMessages));
        } catch (error) {
            console.error("❌ Error saving messages:", error);
        }
    };

    // ✅ Auto-scroll when messages update
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages]);

    // ✅ Send message
    const handleSend = async () => {
        if (!contactPhone || !message.trim()) return;

        const messageText = message.trim();
        const newMessage = {
            from: "Me",
            message: messageText,
            timestamp: Date.now(),
        };

        const updatedMessages = [...messages, newMessage];
        setMessages(updatedMessages);
        saveMessages(updatedMessages);
        setMessage("");

        // Emit via socket
        socketRef.current.emit("sendMessage", {
            from: myPhone,
            to: contactPhone,
            message: messageText,
        });

        // Send to backend API
        const token = await AsyncStorage.getItem("token");
        if (!token) {
            Alert.alert("Error", "Please login again");
            return;
        }

        try {
            await axios.post(
                "https://chatter-mobo-app.onrender.com/api/messages/send",
                {
                    receiverPhoneNumber: contactPhone,
                    message: messageText,
                },
                {
                    headers: { token },
                }
            );
        } catch (error) {
            console.error("❌ Error sending message to backend:", error);
        }
    };

    const renderMessage = ({
        item,
    }: {
        item: { from: string; message: string; timestamp: number };
    }) => {
        const isMe = item.from === "Me";
        return (
            <View
                style={[
                    styles.messageContainer,
                    isMe ? styles.myMessageContainer : styles.otherMessageContainer,
                ]}
            >
                <View
                    style={[
                        styles.messageBubble,
                        isMe ? styles.myMessage : styles.otherMessage,
                    ]}
                >
                    {!isMe && <Text style={styles.senderName}>{item.from}</Text>}
                    <Text
                        style={[
                            styles.messageText,
                            isMe ? styles.myMessageText : styles.otherMessageText,
                        ]}
                    >
                        {item.message}
                    </Text>
                    <Text style={styles.timestamp}>
                        {new Date(item.timestamp).toLocaleTimeString()}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={90}
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{contactPhone}</Text>
                <Text style={styles.headerSubtitle}>Online</Text>
            </View>

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(_, i) => i.toString()}
                renderItem={renderMessage}
                contentContainerStyle={styles.messagesList}
                showsVerticalScrollIndicator={false}
            />

            {/* Input */}
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    placeholderTextColor="#999"
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    maxLength={500}
                />
                <TouchableOpacity
                    style={[
                        styles.sendButton,
                        !message.trim() && styles.sendButtonDisabled,
                    ]}
                    onPress={handleSend}
                    disabled={!message.trim()}
                >
                    <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

// ✅ Styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    header: {
        backgroundColor: "#075E54",
        padding: 16,
        paddingTop: 50,
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#fff",
    },
    headerSubtitle: {
        fontSize: 12,
        color: "#b3e5d8",
        marginTop: 2,
    },
    messagesList: {
        padding: 16,
        paddingBottom: 8,
    },
    messageContainer: {
        marginBottom: 12,
        maxWidth: "80%",
    },
    myMessageContainer: {
        alignSelf: "flex-end",
    },
    otherMessageContainer: {
        alignSelf: "flex-start",
    },
    messageBubble: {
        borderRadius: 16,
        padding: 12,
        paddingHorizontal: 16,
    },
    myMessage: {
        backgroundColor: "#DCF8C6",
        borderBottomRightRadius: 4,
    },
    otherMessage: {
        backgroundColor: "#fff",
        borderBottomLeftRadius: 4,
    },
    senderName: {
        fontSize: 12,
        fontWeight: "600",
        color: "#075E54",
        marginBottom: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 20,
    },
    timestamp: {
        fontSize: 10,
        color: "#666",
        marginTop: 4,
        textAlign: "right",
    },
    myMessageText: {
        color: "#000",
    },
    otherMessageText: {
        color: "#000",
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "flex-end",
        padding: 12,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#ddd",
    },
    input: {
        flex: 1,
        backgroundColor: "#f0f0f0",
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 16,
        maxHeight: 100,
        marginRight: 8,
    },
    sendButton: {
        backgroundColor: "#075E54",
        borderRadius: 24,
        paddingVertical: 10,
        paddingHorizontal: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    sendButtonDisabled: {
        backgroundColor: "#ccc",
    },
    sendButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
});
