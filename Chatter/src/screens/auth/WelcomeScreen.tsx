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
    // Main container with dark gradient illusion
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#131537', // base dark tone
        overflow: 'hidden',
    },

    // Simulated gradient overlay using shadow blur trick
    backgroundOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#1E1F4B',
        shadowColor: '#0D0F2C',
        shadowOffset: { width: 0, height: -250 },
        shadowOpacity: 0.8,
        shadowRadius: 250,
        opacity: 0.9,
    },

    logo: {
        width: 160,
        height: 160,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },

    appName: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 5,
    },

    title: {
        fontSize: 30,
        fontWeight: '700',
        color: '#FFFFFF',
        marginTop: 10,
        letterSpacing: 0.5,
    },

    description: {
        fontSize: 16,
        color: '#C5C9F2',
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 40,
        paddingHorizontal: 30,
        lineHeight: 22,
    },

    button: {
        backgroundColor: '#00D4C2', // bright cyan for visibility
        paddingVertical: 14,
        paddingHorizontal: 60,
        borderRadius: 20,
        elevation: 5,
        shadowColor: '#00C1FF',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
    },

    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
});
