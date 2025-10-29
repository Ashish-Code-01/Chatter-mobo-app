import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    Image,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const EditDetails = ({ navigation }: any) => {
    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState('');
    const [loading, setLoading] = useState(false);


    const handleChooseAvatar = () => {
        launchImageLibrary(
            {
                mediaType: 'photo',
                quality: 0.7,
                maxWidth: 500,
                maxHeight: 500
            },
            (response: any) => {
                if (response.didCancel) {
                    return;
                } else if (response.errorCode) {
                    Alert.alert('Error', response.errorMessage || 'Something went wrong');
                } else {
                    const uri = response.assets?.[0]?.uri;
                    if (uri) {
                        setAvatar(uri);
                    }
                }
            }
        );
    };

    const uploadImageToCloudinary = async (imageUri: string) => {
        try {
            const formData = new FormData();
            formData.append('file', {
                uri: imageUri,
                type: 'image/jpeg',
                name: 'avatar.jpg',
            } as any);
            formData.append("upload_preset", "chatter_unsigned");

            const response = await axios.post(
                'https://api.cloudinary.com/v1_1/dqmxpgv5k/image/upload',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            return response.data.secure_url;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter your name');
            return;
        }

        const token = await AsyncStorage.getItem('token');
        if (!token) {
            Alert.alert('Error', 'Please login again');
            return;
        }

        try {
            setLoading(true);

            let avatarUrl = avatar;
            if (avatar && (avatar.startsWith('file://') || avatar.startsWith('content://'))) {
                avatarUrl = await uploadImageToCloudinary(avatar);
            }

            const response = await axios.put(
                'https://chatter-mobo-app.vercel.app/auth/update',
                // 'http://10.52.230.98:8000/auth/update',
                { name: name, avatar: avatarUrl },
                {
                    headers: { token }
                }
            );

            if (response.data.success) {
                Alert.alert('Success', 'Profile updated successfully', [
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack()
                    }
                ]);
            } else {
                Alert.alert('Error', response.data.message || 'Failed to update profile');
            }
        } catch (error: any) {
            console.error('Error updating profile:', error);
            console.error('Error details:', error.response?.data);

            if (error.message === 'Network Error') {
                Alert.alert('Network Error', 'Please check your internet connection and try again.');
            } else {
                Alert.alert('Error', error.response?.data?.message || 'Something went wrong');
            }
        } finally {
            setLoading(false);
        }
    };


    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.title}>Edit Profile</Text>

                <TouchableOpacity
                    onPress={handleChooseAvatar}
                    activeOpacity={0.7}
                >
                    {avatar ? (
                        <Image source={{ uri: avatar }} style={styles.avatar} />
                    ) : (
                        <View style={styles.placeholderAvatar}>
                            <Text style={styles.avatarText}>+</Text>
                        </View>
                    )}
                    <Text style={styles.avatarHint}>Tap to change photo</Text>
                </TouchableOpacity>

                <Text style={styles.label}>Full Name</Text>
                <TextInput
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                    placeholder="Enter your name"
                    editable={!loading}
                    autoCapitalize="words"
                />

                <TouchableOpacity
                    style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveText}>Save Changes</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default EditDetails;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        padding: 20,
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
        marginVertical: 20,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignSelf: 'center',
        marginBottom: 10,
        borderWidth: 3,
        borderColor: '#007bff',
    },
    placeholderAvatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 10,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#999',
    },
    avatarText: {
        fontSize: 40,
        color: '#777',
    },
    avatarHint: {
        textAlign: 'center',
        color: '#007bff',
        fontSize: 14,
        marginBottom: 30,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 6,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        marginBottom: 30,
        backgroundColor: '#f9f9f9',
    },
    saveButton: {
        backgroundColor: '#007bff',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
    },
    saveButtonDisabled: {
        backgroundColor: '#93c5fd',
    },
    saveText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});