import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { pick, types } from '@react-native-documents/picker';
import axios from "axios";
import { useSocket } from "../../context/socketcontext";

const API_URL = "https://chatter-mobo-app.onrender.com";
const DEFAULT_AVATAR = "https://res.cloudinary.com/dqmxpgv5k/image/upload/v1765892967/A_circular_default_c_cafouy.png";

// Interface for bulk sync messages
interface BulkSyncData {
    messages: any[];
    batchNumber: number;
    totalBatches: number;
    isLastBatch?: boolean;
}

interface Message {
    from: string;
    message: string;
    timestamp: number;
    file?: any;
}

interface RouteParams {
    myPhone: string;
    contactPhone: string;
    contactName?: string;
}

export default function ChatToContact({ route, navigation }: { route: { params: RouteParams }, navigation: any }) {
    const { myPhone, contactPhone, contactName } = route.params;
    const { isConnected, onMessageReceived, offMessageReceived, onStatusChanged, offStatusChanged, sendMessage, onMessageSynced, offMessageSynced, requestMessageSync, onBulkMessageSync, offBulkMessageSync } = useSocket();

    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [secretKey, setSecretKey] = useState<string>("");
    const [contactIsOnline, setContactIsOnline] = useState(false);
    const [contactAvatar, setContactAvatar] = useState<string>("");
    const [deviceId, setDeviceId] = useState<string>("");
    const [isTyping, setIsTyping] = useState(false);
    const [contactTyping, setContactTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const alphabet = useMemo(() => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!'_-&@#$%*()/:<>|+= ", []);

    const flatListRef = useRef<FlatList>(null);
    const chatId = useMemo(() => `chat_${[myPhone, contactPhone].sort().join("_")}`, [myPhone, contactPhone]);

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
                name: contactName || contactPhone,
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

    // Setup message listener
    useEffect(() => {
        if (!isConnected) return;

        const handleMessageReceived = async ({ from, message: encryptedMsg, publickey, files }: { from: string; message: string; publickey: string, files: [] }) => {
            console.log(`Message from ${from}: ${encryptedMsg}`);
            try {
                if (from === myPhone) return;

                let keyToUse = secretKey;

                if (!keyToUse) {
                    const privatekey = await AsyncStorage.getItem("privatekey");
                    if (publickey && privatekey) {
                        keyToUse = publickey + privatekey;
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

                const decryptedMsg = decryptMessage(encryptedMsg, keyToUse);

                if (publickey && !secretKey) {
                    await AsyncStorage.setItem("secretkey", keyToUse);
                    setSecretKey(keyToUse);
                }

                const newMsg: Message = {
                    from: from,
                    message: decryptedMsg,
                    timestamp: Date.now(),
                    file: files || undefined,
                };

                setMessages((prev) => {
                    const merged = dedupeMessages([...prev, newMsg]);
                    AsyncStorage.setItem(chatId, JSON.stringify(merged));
                    return merged;
                });
            } catch (error) {
                console.error("Error receiving message:", error);
            }
        };

        onMessageReceived(handleMessageReceived);

        return () => {
            offMessageReceived();
        };
    }, [isConnected, secretKey, dedupeMessages, chatId, myPhone, onMessageReceived, offMessageReceived]);

    // Setup status listener
    useEffect(() => {
        const handleStatusChanged = ({ phoneNumber, isOnline }: { phoneNumber: string; isOnline: boolean }) => {
            if (phoneNumber === contactPhone) {
                setContactIsOnline(isOnline);
            }
        };

        onStatusChanged(handleStatusChanged);

        return () => {
            offStatusChanged();
        };
    }, [contactPhone, onStatusChanged, offStatusChanged]);

    // Setup message sync listener
    useEffect(() => {
        if (!isConnected) return;

        const handleMessageSynced = async ({ from, to, message: encryptedMsg, publickey, files, timestamp, messageId }: {
            from: string;
            to: string;
            message: string;
            publickey: string;
            files: any;
            timestamp: Date | string;
            messageId?: string;
        }) => {
            try {
                // Only process messages relevant to this chat
                if ((from !== contactPhone && to !== contactPhone) || (from !== myPhone && to !== myPhone)) {
                    return;
                }

                // Skip if this is a message we already have (check by messageId or content+timestamp)
                const msgTimestamp = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp.getTime();
                const existingMsg = messages.find(m => {
                    if (messageId && m.timestamp === msgTimestamp) return true;
                    const timeDiff = Math.abs(m.timestamp - msgTimestamp);
                    return timeDiff < 1000; // Within 1 second
                });
                if (existingMsg) {
                    return;
                }

                let keyToUse = secretKey;
                if (!keyToUse) {
                    const privatekey = await AsyncStorage.getItem("privatekey");
                    if (publickey && privatekey) {
                        keyToUse = publickey + privatekey;
                    } else {
                        const serverkey = await AsyncStorage.getItem("serverkey");
                        if (privatekey && serverkey) {
                            keyToUse = privatekey + serverkey;
                        }
                    }
                }

                if (!keyToUse) {
                    console.error("No decryption key available for synced message");
                    return;
                }

                const decryptedMsg = decryptMessage(encryptedMsg, keyToUse);

                const newMsg: Message = {
                    from: from === myPhone ? "Me" : from,
                    message: decryptedMsg,
                    timestamp: msgTimestamp,
                    file: files || undefined,
                };

                setMessages((prev) => {
                    const merged = dedupeMessages([...prev, newMsg]).sort(
                        (a, b) => a.timestamp - b.timestamp
                    );
                    AsyncStorage.setItem(chatId, JSON.stringify(merged));
                    return merged;
                });
            } catch (error) {
                console.error("Error handling synced message:", error);
            }
        };

        onMessageSynced(handleMessageSynced);

        return () => {
            offMessageSynced();
        };
    }, [isConnected, contactPhone, myPhone, secretKey, chatId, messages, dedupeMessages, onMessageSynced, offMessageSynced]);

    // Setup bulk message sync listener (for initial sync after device links)
    useEffect(() => {
        if (!isConnected) return;

        const handleBulkMessageSync = async (data: BulkSyncData) => {
            try {
                console.log(`📦 Processing bulk sync batch ${data.batchNumber}/${data.totalBatches}`);

                for (const msg of data.messages) {
                    // Skip messages not relevant to this chat
                    if ((msg.sender !== contactPhone && msg.receiver !== contactPhone) ||
                        (msg.sender !== myPhone && msg.receiver !== myPhone)) {
                        continue;
                    }

                    // Skip if message already exists
                    const msgTimestamp = msg.timestamp ? new Date(msg.timestamp).getTime() : msg.createdAt?.getTime() || Date.now();
                    const existingMsg = messages.find(m => Math.abs(m.timestamp - msgTimestamp) < 1000);
                    if (existingMsg) continue;

                    let keyToUse = secretKey;
                    if (!keyToUse && msg.publickey) {
                        const privatekey = await AsyncStorage.getItem("privatekey");
                        if (privatekey) {
                            keyToUse = msg.publickey + privatekey;
                        } else {
                            const serverkey = await AsyncStorage.getItem("serverkey");
                            if (serverkey) {
                                keyToUse = msg.publickey + serverkey;
                            }
                        }
                    }

                    if (!keyToUse) continue;

                    const decryptedContent = decryptMessage(msg.content || msg.message, keyToUse);

                    const newMsg: Message = {
                        from: msg.sender === myPhone ? "Me" : msg.sender,
                        message: decryptedContent,
                        timestamp: msgTimestamp,
                        file: msg.file || msg.files || undefined,
                    };

                    setMessages((prev) => {
                        const merged = dedupeMessages([...prev, newMsg]).sort(
                            (a, b) => a.timestamp - b.timestamp
                        );
                        AsyncStorage.setItem(chatId, JSON.stringify(merged));
                        return merged;
                    });
                }

                console.log(`✅ Bulk sync batch ${data.batchNumber} processed`);
            } catch (error) {
                console.error("Error processing bulk message sync:", error);
            }
        };

        onBulkMessageSync(handleBulkMessageSync);

        return () => {
            offBulkMessageSync();
        };
    }, [isConnected, contactPhone, myPhone, secretKey, chatId, messages, dedupeMessages, onBulkMessageSync, offBulkMessageSync]);

    // Setup typing indicator handler
    useEffect(() => {
        const handleTypingIndicator = ({ from, isTyping: typing }: { from: string; isTyping: boolean }) => {
            if (from === contactPhone) {
                setContactTyping(typing);
            }
        };

        onStatusChanged(handleTypingIndicator);

        return () => {
            offStatusChanged();
        };
    }, [contactPhone, onStatusChanged, offStatusChanged]);

    useEffect(() => {
        (async () => {
            try {
                // Get deviceId
                const storedDeviceId = await AsyncStorage.getItem("deviceId");
                if (storedDeviceId) {
                    setDeviceId(storedDeviceId);

                    // Request message sync for this device if socket is connected
                    if (isConnected && myPhone) {
                        console.log(`🔄 Requesting message sync for device ${storedDeviceId}`);
                        requestMessageSync(myPhone, storedDeviceId);
                    }
                }

                const local = await AsyncStorage.getItem(chatId);
                if (local) {
                    setMessages(JSON.parse(local));
                }

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
    }, [isConnected, myPhone, isConnected ? myPhone : null]);

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
                setContactAvatar(DEFAULT_AVATAR);
            }
        } catch (error) {
            console.error("Error fetching contact avatar:", error);
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

};

const handleTextChange = useCallback((text: string) => {
    setMessage(text);

    // Clear previous typing timeout
    if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
    }

    // Emit typing started if not already typing
    if (!isTyping && text.length > 0) {
        setIsTyping(true);
        // Can emit typing indicator event here if socket supports it
    }

    // Set timeout to emit typing stopped after 3 seconds of no input
    if (text.length > 0) {
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            // Can emit typing stopped event here
        }, 3000);
    } else {
        setIsTyping(false);
    }
}, [isTyping]);

const handleSend = useCallback(async () => {
    try {
        if (!message.trim()) return;

        let keyToUse = secretKey;

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

        setMessage("");
        setMessages((prev) => {
            const updated = [...prev, newMsg];
            AsyncStorage.setItem(chatId, JSON.stringify(updated));
            return updated;
        });

        const encryptedMsg = encryptMessage(text, keyToUse);

        if (!encryptedMsg || encryptedMsg === text) {
            console.warn("Message encryption may have failed");
        }

        const publickey = keyToUse.substring(0, 16);

        sendMessage(contactPhone, encryptedMsg, publickey, undefined, deviceId);

    } catch (error) {
        console.error("Error sending message:", error);
        Alert.alert("Error", "Failed to send message");
    }
}, [message, secretKey, chatId, contactPhone, sendMessage, encryptMessage, deviceId]);


const handleAttachDocument = async () => {
    try {
        const results = await pick({
            type: [types.allFiles],
            allowMultiSelection: true,
            quality: 1,
        });

        console.log(`Selected ${results.length} file(s)`);

        const maxSize = 10 * 1024 * 1024;
        const oversizedFiles = results.filter(file => file.size && file.size > maxSize);

        if (oversizedFiles.length > 0) {
            Alert.alert('Error', `${oversizedFiles.length} file(s) exceed 10MB limit`);
            return;
        }

        // Show loading indicator
        Alert.alert('Uploading', 'Please wait...');

        const uploadPromises = results.map(async (file) => {
            const fileurl = await uploadDocumentToCloudinary(file.uri, file.type, file.name);
            return { file, fileurl };
        });

        const uploadedFiles = await Promise.all(uploadPromises);

        // Navigate to preview screen
        navigation.navigate('PreviewDocuments', {
            uploadedFiles,
            myPhone,
            contactPhone,
            chatId,
        });

    } catch (err: any) {
        if (err?.code !== 'DOCUMENT_PICKER_CANCELED') {
            console.error('Error picking document:', err);
            Alert.alert('Error', 'Failed to attach documents');
        }
    }
};


const uploadDocumentToCloudinary = async (imageUri: string, filetype: string, filename: string) => {
    try {
        const formData = new FormData();
        formData.append('file', {
            uri: imageUri,
            type: filetype,
            name: filename,
        } as any);
        formData.append('upload_preset', 'chatter_unsigned');

        const response = await axios.post(
            'https://api.cloudinary.com/v1_1/dqmxpgv5k/image/upload',
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return response.data.secure_url;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
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
    const file = item.file;

    return (
        <View style={[styles.msgWrap, { alignSelf: isMe ? "flex-end" : "flex-start" }]}>
            <View style={[styles.bubble, isMe ? styles.mine : styles.theirs]}>

                <Text style={styles.msgText}>{item.message}</Text>
                {/* Time */}
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
                <Text style={styles.headerTitle}>{contactName}</Text>
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
            <TouchableOpacity
                style={styles.attachButton}
                onPress={handleAttachDocument}
            >
                <Image
                    source={require('../../assets/attach.png')}
                    style={styles.sendicon}
                    color="red"
                />
            </TouchableOpacity>

            <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor="#A9A9C5"
                value={message}
                onChangeText={handleTextChange}
                multiline
                maxLength={1000}
            />

            <TouchableOpacity
                style={[
                    styles.sendButton,
                    !message.trim() && styles.sendButtonDisabled,
                ]}
                disabled={!message.trim()}
                onPress={handleSend}
            >
                <Image
                    source={require('../../assets/send.png')}
                    style={styles.sendicon}
                />
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
        tintColor: "#6B6B8A",
    },

    sendicon: {
        width: 22,
        height: 22,
    },
    attachButton: {
        padding: 8,
        justifyContent: 'flex-end',
    },
});
