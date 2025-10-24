import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Alert
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OtpScreen = ({ route, navigation }: { route: any, navigation: any }) => {
    const { phone } = route.params;
    const [otp, setOtp] = useState('');

    const handleVerifyOtp = async () => {
        if (!otp || otp.length !== 6) {
            Alert.alert('Invalid OTP', 'Please enter a 6-digit OTP');
            return;
        }

        try {
            const response = await axios.post('https://chatter-mobo-app.vercel.app/auth/verify', {
                phoneNumber: phone,
                otp,
            });
            if (response.data.success) {
                Alert.alert('Success', 'OTP verified successfully');
                // save token and navigate to EditDetails
                await AsyncStorage.setItem('token', response.data.token);
                navigation.push('EditDetails');
            } else {
                Alert.alert('Error', response.data.message || 'OTP verification failed');
            }

        } catch (error) {
            console.error(error);
            Alert.alert('Network Error', 'Unable to reach the server');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Enter OTP</Text>
            <Text style={styles.subtitle}>We sent an OTP to {phone}</Text>

            <TextInput
                style={styles.input}
                placeholder="6-digit OTP"
                keyboardType="numeric"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
            />

            <TouchableOpacity style={styles.button} onPress={handleVerifyOtp}>
                <Text style={styles.buttonText}>Verify OTP</Text>
            </TouchableOpacity>
        </View>
    );
};

export default OtpScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#777',
        marginBottom: 30,
        textAlign: 'center',
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 18,
        textAlign: 'center',
        letterSpacing: 10,
        marginBottom: 20,
    },
    button: {
        backgroundColor: 'rgb(21, 193, 109)',
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 25,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});
