import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Alert,
} from 'react-native';
import axios from 'axios';

const LoginScreen = ({ navigation }: any) => {
    const [phone, setPhone] = useState('');

    const handleLogin = async () => {
        if (!phone || phone.length < 10) {
            Alert.alert('Invalid Number', 'Please enter a valid phone number');
            return;
        }
        Alert.alert('Success', 'OTP will be sent');
        navigation.replace('Otp', { phone });

        try {
            await axios.post('https://chatter-mobo-app.vercel.app/auth/login', { phoneNumber: phone });

            Alert.alert('Success', 'OTP will be sent');


        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Something went wrong');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>
            <Text style={styles.subtitle}>Enter your phone number to continue</Text>

            <TextInput
                style={styles.input}
                placeholder="+91 xxxxx xxxxx"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={10}
            />

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>Send OTP</Text>
            </TouchableOpacity>
        </View>
    );
};

export default LoginScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#777',
        marginBottom: 30,
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        marginBottom: 20,
    },
    button: {
        backgroundColor: 'rgb(21, 193, 109)',
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 25,
        width: '100%',
        alignItems: 'center',
        elevation: 3,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});
