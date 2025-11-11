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
            await axios.post('https://chatter-mobo-app.onrender.com/auth/login', {
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
    // Simulated gradient background using layered colors
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#131537',
        // add subtle simulated gradient by shadow overlay
        shadowColor: '#1E1F4B',
        shadowOffset: { width: 0, height: -200 },
        shadowOpacity: 0.5,
        shadowRadius: 200,
    },

    // Card with frosted glass illusion
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

    // Typography hierarchy
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 10,
        letterSpacing: 0.8,
    },
    subtitle: {
        fontSize: 16,
        color: '#C5C9F2',
        textAlign: 'center',
        marginBottom: 35,
    },

    // Input field styling
    inputWrapper: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        marginBottom: 30,
        paddingHorizontal: 20,
    },
    input: {
        color: '#fff',
        fontSize: 18,
        height: 50,
        letterSpacing: 0.3,
    },

    // Button with simulated gradient and shadow
    buttonContainer: {
        width: '100%',
    },
    button: {
        backgroundColor: '#00D4C2',
        paddingVertical: 15,
        borderRadius: 30,
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
