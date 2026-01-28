import React, { useEffect, useState } from 'react';
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
    ScrollView,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = "https://chatter-mobo-app.onrender.com";

const EditDetails = ({ navigation }: any) => {
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [avatar, setAvatar] = useState('');
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>(null);

    const fetchUserDetails = async () => {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;
        let userData;
        if (AsyncStorage.getItem("User")) {
            userData = JSON.parse(await AsyncStorage.getItem("User") || '{}');
            setUser(userData);
            console.log("form local");
        }
        else {
            const { data } = await axios.post(
                `${API_URL}/auth/me`,
                {},
                { headers: { token } }
            );
            userData = data.user;
            console.log("Fetched user:", userData);
        }
        setUser(userData);
        setName(userData?.name || '');
        setBio(userData?.bio || '');
        setAvatar(userData?.avatar || '');
        await AsyncStorage.setItem("User", JSON.stringify(userData));
    }

    useEffect(() => {

        fetchUserDetails();
    }, [])


    const handleChooseAvatar = () => {
        launchImageLibrary(
            {
                mediaType: 'photo',
                quality: 0.7,
                maxWidth: 500,
                maxHeight: 500,
            },
            (response: any) => {
                if (response.didCancel) return;
                if (response.errorCode) {
                    Alert.alert('Error', response.errorMessage || 'Something went wrong');
                } else {
                    const uri = response.assets?.[0]?.uri;
                    if (uri) setAvatar(uri);
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
                `${API_URL}/auth/update`,
                { name, bio, avatar: avatarUrl },
                { headers: { token } }
            );

            if (response.data.success) {
                Alert.alert('Success', 'Profile updated successfully', [
                    { text: 'OK', onPress: () => navigation.navigate('home') },
                ]);
                await AsyncStorage.setItem("User", JSON.stringify(response.data.data));
            } else {
                Alert.alert('Error', response.data.message || 'Failed to update profile');
            }
        } catch (error: any) {
            console.error('Error updating profile:', error);
            if (error.message === 'Network Error') {
                Alert.alert('Network Error', 'Please check your internet connection.');
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
            <View style={styles.backgroundOverlay} />

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.title}>Edit Profile</Text>

                <TouchableOpacity onPress={handleChooseAvatar} activeOpacity={0.8}>
                    {avatar ? (
                        <Image source={{ uri: avatar }} style={styles.avatar} />
                    ) : (
                        <View style={styles.placeholderAvatar}>
                            <Text style={styles.avatarText}>+</Text>
                        </View>
                    )}
                    <Text style={styles.avatarHint}>Tap to change photo</Text>
                </TouchableOpacity>

                <View style={styles.card}>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                        value={name}
                        onChangeText={setName}
                        style={styles.input}
                        placeholder="Enter your name"
                        placeholderTextColor="#A1A1B5"
                        editable={!loading}
                    />

                    <Text style={styles.label}>Bio</Text>
                    <TextInput
                        value={bio}
                        onChangeText={setBio}        // FIXED: uses correct state
                        style={styles.input}
                        placeholder="This is my bio"
                        placeholderTextColor="#A1A1B5"
                        editable={!loading}
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
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default EditDetails;

const styles = StyleSheet.create({
    /* ==================== CONTAINER ==================== */
    container: {
        flex: 1,
        backgroundColor: '#0F1419',
    },

    /* ==================== BACKGROUND ==================== */
    backgroundOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#0F1419',
    },

    /* ==================== SCROLL CONTENT ==================== */
    scrollContent: {
        paddingHorizontal: 18,
        paddingVertical: 20,
        alignItems: 'center',
    },

    /* ==================== TITLE ==================== */
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
        marginVertical: 24,
        letterSpacing: 0.5,
    },

    /* ==================== AVATAR ==================== */
    avatar: {
        width: 130,
        height: 130,
        borderRadius: 65,
        alignSelf: 'center',
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'rgba(0, 212, 194, 0.4)',
        shadowColor: '#00D4C2',
        shadowOpacity: 0.3,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
    },

    placeholderAvatar: {
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: 'rgba(0, 212, 194, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: 'rgba(0, 212, 194, 0.4)',
    },

    avatarText: {
        fontSize: 48,
        color: '#00D4C2',
        fontWeight: '700',
    },

    avatarHint: {
        textAlign: 'center',
        color: 'rgba(0, 212, 194, 0.8)',
        fontSize: 13,
        marginBottom: 28,
        fontWeight: '500',
    },

    /* ==================== CARD ==================== */
    card: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(0, 212, 194, 0.15)',
    },

    /* ==================== LABELS ==================== */
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: 'rgba(200, 210, 234, 0.8)',
        marginBottom: 10,
        letterSpacing: 0.3,
    },

    /* ==================== INPUTS ==================== */
    input: {
        borderWidth: 1,
        borderColor: 'rgba(0, 212, 194, 0.2)',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        marginBottom: 24,
        color: '#fff',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        fontWeight: '500',
    },

    /* ==================== SAVE BUTTON ==================== */
    saveButton: {
        backgroundColor: 'rgba(0, 212, 194, 0.9)',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#00D4C2',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
    },

    saveButtonDisabled: {
        opacity: 0.5,
    },

    saveText: {
        color: '#0F1419',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
