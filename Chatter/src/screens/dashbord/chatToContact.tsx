import React, { useEffect, useState, useRef } from "react";
import { Text, TextInput, TouchableOpacity, FlatList, View, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { io } from "socket.io-client";

const socket = io("http://10.104.186.98:8000");

export default function App({ route }: any) {
    const { myPhone, contactPhone } = route.params;
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<Array<{ from: string; message: string; timestamp: number }>>([]);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {

        socket.on("receiveMessage", ({ from, message }: { from: string; message: string }) => {
            setMessages((prev) => [...prev, { from, message, timestamp: Date.now() }]);
        });

        return () => {
            socket.off("receiveMessage");
        };
    }, [myPhone]);

    useEffect(() => {
        if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
        }
    }, [messages]);

    const handleSend = () => {
        if (!contactPhone || !message.trim()) return;
        socket.emit("sendMessage", { from: myPhone, to: contactPhone, message: message.trim() });
        setMessages((prev) => [...prev, { from: "Me", message: message.trim(), timestamp: Date.now() }]);
        setMessage("");
    };

    const renderMessage = ({ item }: { item: { from: string; message: string; timestamp: number } }) => {
        const isMe = item.from === "Me";
        return (
            <View style={[styles.messageContainer, isMe ? styles.myMessageContainer : styles.otherMessageContainer]}>
                <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.otherMessage]}>
                    {!isMe && <Text style={styles.senderName}>{item.from}</Text>}
                    <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
                        {item.message}
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

            {/* Messages List */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(_, i) => i.toString()}
                renderItem={renderMessage}
                contentContainerStyle={styles.messagesList}
                showsVerticalScrollIndicator={false}
            />

            {/* Input Area */}
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
                    style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]} 
                    onPress={handleSend}
                    disabled={!message.trim()}
                >
                    <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

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