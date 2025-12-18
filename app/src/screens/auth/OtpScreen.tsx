import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Alert,
    Animated,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// const API_URL = "http://10.73.208.98:8000"; // Update for production
const API_URL = "https://chatter-mobo-app.onrender.com";

const OtpScreen = ({ route, navigation }: { route: any; navigation: any }) => {
    const { phone } = route.params;
    const [otp, setOtp] = useState('');
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    const generatePrivateKey = (length = 16) => {
        // Ensure valid length: min 1, max 16
        length = Math.floor(Number(length)) || 16;
        if (length < 1) length = 1;
        if (length > 16) length = 16;

        const lower = "abcdefghijklmnopqrstuvwxyz";
        const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const digits = "0123456789";
        const special = "!@#$%^&*()-_=+[]{};:,.<>/?~`|";
        const all = lower + upper + digits + special;

        // Secure random integer generator
        function randInt(max) {
            if (typeof crypto !== "undefined" && crypto.getRandomValues) {
                const arr = new Uint32Array(1);
                crypto.getRandomValues(arr);
                return arr[0] % max;
            } else {
                return Math.floor(Math.random() * max);
            }
        }

        const password = new Array(length);

        // Ensure at least one special character
        const specialPos = randInt(length);
        password[specialPos] = special[randInt(special.length)];

        // Fill the rest with random characters
        for (let i = 0; i < length; i++) {
            if (i === specialPos) continue;
            password[i] = all[randInt(all.length)];
        }

        // Shuffle to avoid predictable placement
        for (let i = password.length - 1; i > 0; i--) {
            const j = randInt(i + 1);
            [password[i], password[j]] = [password[j], password[i]];
        }

        return password.join("");
    }


    const handleVerifyOtp = async () => {
        if (!otp || otp.length !== 6) {
            Alert.alert('Invalid OTP', 'Please enter a 6-digit OTP');
            return;
        }

        try {
            const phoneNo = `+91${phone}`;
            const response = await axios.post(
                `${API_URL}/auth/verify`,
                {
                    phoneNumber: phoneNo,
                    otp: otp,
                }
            );

            if (response.data.success) {
                await AsyncStorage.setItem('token', response.data.data.token);
                await AsyncStorage.setItem('User', JSON.stringify(response.data.data.user));
                await AsyncStorage.setItem('serverkey', response.data.data.serverkey);
                await AsyncStorage.setItem('privatekey', generatePrivateKey(16));
                console.log(generatePrivateKey(16));
                Alert.alert('Success', 'OTP verified successfully');
                navigation.replace('EditDetails');
            } else {
                Alert.alert('Error', response.data.message || 'OTP verification failed');
            }
        } catch (error: any) {
            console.error('Verification error:', error.response?.data || error);
            Alert.alert(
                'Error',
                error.response?.data?.message || 'Failed to verify OTP'
            );
        }
    };

    return (
        <View style={styles.container}>
            {/* Simulated gradient background overlay */}
            <View style={styles.backgroundOverlay} />

            <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
                <Text style={styles.title}>Enter OTP</Text>
                <Text style={styles.subtitle}>
                    We sent an OTP to <Text style={styles.highlight}>{phone}</Text>
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="6-digit OTP"
                    placeholderTextColor="#A1A1B5"
                    keyboardType="numeric"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                />

                <TouchableOpacity
                    style={styles.button}
                    activeOpacity={0.8}
                    onPress={handleVerifyOtp}
                >
                    <Text style={styles.buttonText}>Verify OTP</Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

export default OtpScreen;

const styles = StyleSheet.create({
    /* ==================== CONTAINER ==================== */
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0F1419',
    },

    /* ==================== BACKGROUND ==================== */
    backgroundOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#0F1419',
    },

    /* ==================== CARD ==================== */
    card: {
        width: '88%',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 28,
        paddingVertical: 50,
        paddingHorizontal: 28,
        borderWidth: 1,
        borderColor: 'rgba(0, 212, 194, 0.15)',
        shadowColor: '#00D4C2',
        shadowOpacity: 0.2,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
    },

    /* ==================== TYPOGRAPHY ==================== */
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 12,
        letterSpacing: 0.8,
    },

    subtitle: {
        fontSize: 15,
        color: 'rgba(200, 210, 234, 0.8)',
        textAlign: 'center',
        marginBottom: 40,
        fontWeight: '500',
        lineHeight: 22,
    },

    highlight: {
        color: '#00D4C2',
        fontWeight: '700',
    },

    /* ==================== INPUT ==================== */
    input: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0, 212, 194, 0.2)',
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 24,
        color: '#FFFFFF',
        textAlign: 'center',
        letterSpacing: 8,
        marginBottom: 28,
        fontWeight: '600',
    },

    /* ==================== BUTTON ==================== */
    button: {
        backgroundColor: 'rgba(0, 212, 194, 0.9)',
        paddingVertical: 16,
        borderRadius: 16,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#00D4C2',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
    },

    buttonText: {
        color: '#0F1419',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
