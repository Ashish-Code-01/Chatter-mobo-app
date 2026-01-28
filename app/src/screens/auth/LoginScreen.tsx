import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Alert,
    Animated,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import axios from 'axios';

const API_URL = "https://chatter-mobo-app.onrender.com";

const LoginScreen = ({ navigation }: any) => {
    const [phone, setPhone] = useState('');
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    const handleLogin = async () => {
        if (!phone || phone.length < 10) {
            Alert.alert('Invalid Number', 'Please enter a valid phone number');
            return;
        }

        try {
            navigation.replace('Otp', { phone });
            await axios.post(`${API_URL}/auth/login`, {
                phoneNumber: phone,
            });
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Something went wrong');
        }
    };

    return (
        <View style={styles.container}>
            {/* Animated card */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ width: '100%', alignItems: 'center' }}
            >
                <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
                    <Text style={styles.title}>Login</Text>
                    <Text style={styles.subtitle}>
                        Enter your phone number to continue
                    </Text>

                    {/* Input field */}
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="+91 xxxxx xxxxx"
                            placeholderTextColor="#A1A1B5"
                            keyboardType="phone-pad"
                            value={phone}
                            onChangeText={setPhone}
                            maxLength={10}
                        />
                    </View>

                    {/* Send OTP button */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleLogin}
                        style={styles.buttonContainer}
                    >
                        <View style={styles.button}>
                            <Text style={styles.buttonText}>Send OTP</Text>
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            </KeyboardAvoidingView>
        </View>
    );
};

export default LoginScreen;

const styles = StyleSheet.create({
    /* ==================== CONTAINER ==================== */
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        fontSize: 36,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 12,
        letterSpacing: 1,
    },

    subtitle: {
        fontSize: 15,
        color: 'rgba(200, 210, 234, 0.8)',
        textAlign: 'center',
        marginBottom: 40,
        fontWeight: '500',
        lineHeight: 22,
    },

    /* ==================== INPUT FIELD ==================== */
    inputWrapper: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0, 212, 194, 0.2)',
        marginBottom: 28,
        paddingHorizontal: 20,
    },

    input: {
        color: '#fff',
        fontSize: 17,
        height: 52,
        letterSpacing: 0.4,
        fontWeight: '500',
    },

    /* ==================== BUTTON ==================== */
    buttonContainer: {
        width: '100%',
    },

    button: {
        backgroundColor: 'rgba(0, 212, 194, 0.9)',
        paddingVertical: 16,
        borderRadius: 16,
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
