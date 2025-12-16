import React, { useEffect, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Image,
    TouchableOpacity,
    Animated,
} from 'react-native';

const WelcomeScreen = ({ navigation }: any) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();

        Animated.timing(translateY, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <View style={styles.container}>
            {/* Background overlay layer to mimic gradient */}
            <View style={styles.backgroundOverlay} />

            {/* Animated content */}
            <Animated.View
                style={{
                    opacity: fadeAnim,
                    transform: [{ translateY }],
                    alignItems: 'center',
                }}
            >
                <Image
                    source={require('../../assets/logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />

                <Text style={styles.appName}>Chatter</Text>

                <Text style={styles.title}>Welcome</Text>

                <Text style={styles.description}>
                    This is a chat application. Your chats are{' '}
                    <Text style={{ fontWeight: '600' }}>end-to-end encrypted 🔒</Text>.
                </Text>
            </Animated.View>

            {/* Get Started button */}
            <TouchableOpacity
                activeOpacity={0.8}
                style={styles.button}
                onPress={() => navigation.replace('Login')}
                accessibilityLabel="Get Started Button"
            >
                <Text style={styles.buttonText}>Get Started</Text>
            </TouchableOpacity>
        </View>
    );
};

export default WelcomeScreen;

const styles = StyleSheet.create({
    /* ==================== CONTAINER ==================== */
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F1419',
        overflow: 'hidden',
    },

    /* ==================== BACKGROUND ==================== */
    backgroundOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#0F1419',
    },

    /* ==================== LOGO ==================== */
    logo: {
        width: 140,
        height: 140,
        marginBottom: 16,
        shadowColor: '#00D4C2',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
    },

    /* ==================== TYPOGRAPHY ==================== */
    appName: {
        fontSize: 18,
        fontWeight: '600',
        color: 'rgba(200, 210, 234, 0.9)',
        marginBottom: 8,
        letterSpacing: 0.5,
    },

    title: {
        fontSize: 36,
        fontWeight: '800',
        color: '#FFFFFF',
        marginTop: 12,
        letterSpacing: 0.8,
    },

    description: {
        fontSize: 15,
        color: 'rgba(200, 210, 234, 0.75)',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 50,
        paddingHorizontal: 32,
        lineHeight: 24,
        fontWeight: '500',
    },

    /* ==================== BUTTON ==================== */
    button: {
        backgroundColor: 'rgba(0, 212, 194, 0.9)',
        paddingVertical: 16,
        paddingHorizontal: 48,
        borderRadius: 16,
        shadowColor: '#00D4C2',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
    },

    buttonText: {
        color: '#0F1419',
        fontSize: 17,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
});
