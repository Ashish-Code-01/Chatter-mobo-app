import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';

const WelcomeScreen = ({ navigation }: any) => {
    return (
        <View style={styles.container}>
            <Image
                source={require('../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
            />
            <Text style={styles.title}>Welcome</Text>
            <Text style={styles.description}>
                This is a chat application. The chats are end-to-end encrypted.
            </Text>

            {/* Get Started button */}
            <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.replace('Login')} 
            >
                <Text style={styles.buttonText}>Get Started</Text>
            </TouchableOpacity>
        </View>
    );
};

export default WelcomeScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        padding: 20,
    },
    logo: {
        width: 200,
        height: 200,
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
    },
    description: {
        fontSize: 16,
        color: '#555',
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 30,
    },
    button: {
        backgroundColor: 'rgb(21, 193, 109)', // nice blue
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 25,
        elevation: 3, // adds shadow on Android
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});
