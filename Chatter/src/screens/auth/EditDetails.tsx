import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    Image,
    TouchableOpacity,
    Alert
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const EditDetails = () => {
    const [name, setName] = useState('John Doe');
    const [avatar, setAvatar] = useState(null);

    const handleChooseAvatar = () => {
        launchImageLibrary(
            { mediaType: 'photo', quality: 0.7 },
            (response: any) => {
                if (response.didCancel) {
                    return;
                } else if (response.errorCode) {
                    Alert.alert('Error', response.errorMessage || 'Something went wrong');
                } else {
                    const uri = response.assets?.[0]?.uri;
                    if (uri) setAvatar(uri);
                }
            }
        );
    };


    const handleSave = async () => {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
            Alert.alert('Error', 'Please login again');
            return;
        }
        try {
            await axios.post('https://chatter-mobo-app.vercel.app/auth/update', { name, avatar }, {
                headers: {
                    token
                }
            });

            Alert.alert('Success', 'OTP will be sent');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Something went wrong');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Edit Profile</Text>

            <TouchableOpacity onPress={handleChooseAvatar}>
                {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatar} />
                ) : (
                    <View style={styles.placeholderAvatar}>
                        <Text style={styles.avatarText}>+</Text>
                    </View>
                )}
            </TouchableOpacity>

            <Text style={styles.label}>Full Name</Text>
            <TextInput
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholder="Enter your name"
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveText}>Save Changes</Text>
            </TouchableOpacity>
        </View>
    );
};

export default EditDetails;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
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
        marginBottom: 20,
    },
    placeholderAvatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 20,
    },
    avatarText: {
        fontSize: 40,
        color: '#777',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        marginBottom: 20,
    },
    saveButton: {
        backgroundColor: '#007bff',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    saveText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
