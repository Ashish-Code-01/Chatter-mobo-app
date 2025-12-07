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
                "https://chatter-mobo-app.onrender.com/auth/me",
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
                'https://chatter-mobo-app.onrender.com/auth/update',
                { name, bio, avatar: avatarUrl },
                { headers: { token } }
            );

            if (response.data.success) {
                Alert.alert('Success', 'Profile updated successfully', [
                    { text: 'OK', onPress: () => navigation.navigate('home') },
                ]);
                await AsyncStorage.setItem("User", JSON.stringify(response.data.updatedUser));
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
    container: {
        flex: 1,
        backgroundColor: '#131537',
    },
    backgroundOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#1E1F4B',
        shadowColor: '#0D0F2C',
        shadowOffset: { width: 0, height: -250 },
        shadowOpacity: 0.8,
        shadowRadius: 250,
        opacity: 0.9,
    },
    scrollContent: {
        padding: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: '#FFFFFF',
        marginVertical: 20,
    },
    avatar: {
        width: 130,
        height: 130,
        borderRadius: 65,
        alignSelf: 'center',
        marginBottom: 10,
        borderWidth: 3,
        borderColor: '#00D4C2',
    },
    placeholderAvatar: {
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 10,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#00D4C2',
    },
    avatarText: {
        fontSize: 45,
        color: '#00D4C2',
    },
    avatarHint: {
        textAlign: 'center',
        color: '#00D4C2',
        fontSize: 14,
        marginBottom: 25,
    },
    card: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#C5C9F2',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        marginBottom: 25,
        color: '#fff',
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    saveButton: {
        backgroundColor: '#00D4C2',
        paddingVertical: 14,
        borderRadius: 25,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
});
