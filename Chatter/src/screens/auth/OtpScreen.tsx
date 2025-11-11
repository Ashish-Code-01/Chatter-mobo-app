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

    const handleVerifyOtp = async () => {
        if (!otp || otp.length !== 6) {
            Alert.alert('Invalid OTP', 'Please enter a 6-digit OTP');
            return;
        }

        try {
            const phoneNo = `+91${phone}`;
            const response = await axios.post(
                'https://chatter-mobo-app.onrender.com/auth/verify',
                {
                    phoneNumber: phoneNo,
                    otp: otp,
                }
            );

            if (response.data.success) {
                await AsyncStorage.setItem('token', response.data.data.token);
                await AsyncStorage.setItem('user', JSON.stringify(response.data.data.user));
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
    // Base screen layout
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#131537', // Dark base
    },

    // Layered gradient-like overlay (simulated using shadow blending)
    backgroundOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#1E1F4B',
        shadowColor: '#0D0F2C',
        shadowOffset: { width: 0, height: -250 },
        shadowOpacity: 0.8,
        shadowRadius: 250,
        opacity: 0.9,
    },

    // Centered glassmorphic card
    card: {
        width: '90%',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 25,
        paddingVertical: 50,
        paddingHorizontal: 25,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
    },

    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 10,
        letterSpacing: 0.8,
    },

    subtitle: {
        fontSize: 16,
        color: '#C5C9F2',
        textAlign: 'center',
        marginBottom: 40,
    },

    highlight: {
        color: '#00D4C2',
        fontWeight: '600',
    },

    // OTP input box
    input: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 22,
        color: '#FFFFFF',
        textAlign: 'center',
        letterSpacing: 10,
        marginBottom: 30,
    },

    // Glowing cyan button
    button: {
        backgroundColor: '#00D4C2',
        paddingVertical: 15,
        paddingHorizontal: 60,
        borderRadius: 30,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#00C1FF',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
    },

    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
