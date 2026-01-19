import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSocket } from '../../context/socketcontext';

const API_URL = "http://10.119.77.98:8000"; // Update this for production

interface UploadedFile {
    file: {
        name: string;
        type: string;
        size: number;
        uri: string;
    };
    fileurl: string;
}

interface Message {
    from: string;
    message: string;
    timestamp: number;
    files?: {
        name: string;
        type: string;
        size: number;
        url: string;
    }[];
}

interface RouteParams {
    uploadedFiles: UploadedFile[];
    myPhone: string;
    contactPhone: string;
    chatId: string;
}

const DocumentPreviewScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { uploadedFiles, myPhone, contactPhone, chatId } = route.params as RouteParams;
    const { sendFiles } = useSocket();

    const [files, setFiles] = useState<UploadedFile[]>(uploadedFiles);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    // Format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    // Get file icon based on type
    const getFileIcon = (type: string): string => {
        if (type.includes('pdf')) return '📄';
        if (type.includes('image')) return '🖼️';
        if (type.includes('video')) return '🎥';
        if (type.includes('audio')) return '🎵';
        if (type.includes('word') || type.includes('document')) return '📝';
        if (type.includes('excel') || type.includes('sheet')) return '📊';
        if (type.includes('powerpoint') || type.includes('presentation')) return '📽️';
        if (type.includes('zip') || type.includes('rar')) return '🗜️';
        return '📎';
    };

    // Remove file from list
    const handleRemoveFile = useCallback((index: number) => {
        Alert.alert(
            'Remove File',
            `Remove "${files[index].file.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                        const newFiles = files.filter((_, i) => i !== index);
                        setFiles(newFiles);

                        if (newFiles.length === 0) {
                            Alert.alert('No Files', 'All files removed. Going back.');
                            navigation.goBack();
                        }
                    },
                },
            ]
        );
    }, [files, navigation]);

    // Send files to user
    const handleSendDocuments = useCallback(async () => {
        if (files.length === 0) {
            Alert.alert('Error', 'No files to send');
            return;
        }

        try {
            setSending(true);

            // Prepare files data
            const filesData = files.map(file => ({
                name: file.file.name,
                type: file.file.type,
                size: file.file.size,
                url: file.fileurl,
            }));

            const timestamp = Date.now();
            const publickey = ''; // Will be handled by context

            // Send via socket context
            sendFiles(contactPhone, filesData, message.trim(), publickey);

            // Create message object to save locally
            const newMsg: Message = {
                from: "Me",
                message: message.trim() || "",
                timestamp: timestamp,
                files: filesData,
            };

            // Save to AsyncStorage
            try {
                const existingMessagesJson = await AsyncStorage.getItem(chatId);
                const existingMessages: Message[] = existingMessagesJson
                    ? JSON.parse(existingMessagesJson)
                    : [];

                const updatedMessages = [...existingMessages, newMsg];
                await AsyncStorage.setItem(chatId, JSON.stringify(updatedMessages));
            } catch (storageError) {
                console.error('Error saving to AsyncStorage:', storageError);
            }

            setMessage("");
            setSending(false);

            Alert.alert(
                'Success',
                `${files.length} document(s) sent successfully!`,
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            navigation.goBack();
                        },
                    },
                ]
            );

        } catch (error) {
            setSending(false);
            console.error('Error sending documents:', error);
            Alert.alert('Error', 'Failed to send documents. Please try again.');
        }
    }, [files, message, contactPhone, chatId, sendFiles, navigation]);

    // Render each file item
    const renderFileItem = ({ item, index }: { item: UploadedFile; index: number }) => {
        const isImage = item.file.type.includes('image');

        return (
            <View style={styles.fileCard}>
                <View style={styles.fileContent}>
                    {isImage ? (
                        <Image source={{ uri: item.file.uri }} style={styles.thumbnail} />
                    ) : (
                        <View style={styles.iconContainer}>
                            <Text style={styles.fileIcon}>{getFileIcon(item.file.type)}</Text>
                        </View>
                    )}

                    <View style={styles.fileInfo}>
                        <Text style={styles.fileName} numberOfLines={2}>
                            {item.file.name}
                        </Text>
                        <Text style={styles.fileSize}>{formatFileSize(item.file.size)}</Text>
                        <Text style={styles.fileType} numberOfLines={1}>
                            {item.file.type || 'Unknown type'}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveFile(index)}
                    >
                        <Text style={styles.removeButtonText}>✕</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Preview Documents</Text>
                <View style={styles.placeholder} />
            </View>

            {/* File count */}
            <View style={styles.countContainer}>
                <Text style={styles.countText}>
                    {files.length} {files.length === 1 ? 'document' : 'documents'} selected
                </Text>
            </View>

            {/* Files list */}
            <FlatList
                data={files}
                renderItem={renderFileItem}
                keyExtractor={(item, index) => index.toString()}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />

            {/* Message input */}
            <View style={styles.messageContainer}>
                <TextInput
                    style={styles.messageInput}
                    placeholder="Add a message (optional)"
                    placeholderTextColor="#999"
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    maxLength={500}
                />
            </View>

            {/* Send button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.sendButton, sending && styles.sendButtonDisabled]}
                    onPress={handleSendDocuments}
                    disabled={sending}
                >
                    {sending ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.sendButtonText}>
                            Send {files.length} {files.length === 1 ? 'Document' : 'Documents'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    backButton: {
        padding: 4,
    },
    backButtonText: {
        fontSize: 16,
        color: '#007AFF',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    placeholder: {
        width: 60,
    },
    countContainer: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    countText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    listContent: {
        padding: 16,
    },
    fileCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 12,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    fileContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    thumbnail: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fileIcon: {
        fontSize: 32,
    },
    fileInfo: {
        flex: 1,
        marginLeft: 12,
        marginRight: 8,
    },
    fileName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    fileSize: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    fileType: {
        fontSize: 12,
        color: '#999',
    },
    removeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#ff3b30',
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    messageContainer: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        padding: 16,
    },
    messageInput: {
        backgroundColor: '#f8f8f8',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#000',
        minHeight: 80,
        maxHeight: 120,
        textAlignVertical: 'top',
    },
    footer: {
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    sendButton: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#ccc',
    },
    sendButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});

export default DocumentPreviewScreen;