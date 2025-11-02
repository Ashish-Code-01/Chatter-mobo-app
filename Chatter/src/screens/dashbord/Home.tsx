import React, { useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Alert,
    Platform,
    TouchableOpacity,
    FlatList,
} from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import Contacts from 'react-native-contacts';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from "socket.io-client";

const sampleUsers = [
    { id: '1', name: 'Ashish Kumar', phone: '+911111111111' },
    { id: '2', name: 'Rohit Sharma', phone: '+912222222222' },
    { id: '3', name: 'Sneha Patel', phone: '+913333333333' },
    { id: '4', name: 'Neha Singh', phone: '+914444444444' },
    { id: '5', name: 'Raj Verma', phone: '+915555555555' },
];

const MY_PHONE = '+919999999999';

const socket = io("http://10.104.186.98:8000");

const Home = ({ navigation }: any) => {
    // ✅ Request contacts permission and sync them to backend
    const requestPermissions = async () => {
        try {
            const permission =
                Platform.OS === 'ios'
                    ? PERMISSIONS.IOS.CONTACTS
                    : PERMISSIONS.ANDROID.READ_CONTACTS;

            const result = await request(permission);

            if (result === RESULTS.GRANTED) {
                console.log('Contacts permission granted');
                await getContacts();
            } else if (result === RESULTS.DENIED) {
                Alert.alert(
                    'Permission Denied',
                    'Please enable contacts permission in settings to use this feature.'
                );
            } else if (result === RESULTS.BLOCKED) {
                Alert.alert(
                    'Permission Blocked',
                    'Contacts permission is blocked. Enable it in device settings.'
                );
            }
        } catch (error) {
            console.error('Permission request error:', error);
            Alert.alert('Error', 'Failed to request contacts permission.');
        }
    };

    // ✅ Get contacts from device
    const getContacts = async () => {
        try {
            const deviceContacts = await Contacts.getAll();

            if (deviceContacts.length === 0) {
                Alert.alert('Info', 'No contacts found on device');
                return;
            }

            await syncContactsWithBackend(deviceContacts);
        } catch (error) {
            console.error('Error loading contacts:', error);
            Alert.alert('Error', 'Failed to load contacts from device');
        }
    };

    // ✅ Sync contacts with backend API
    const syncContactsWithBackend = async (deviceContacts: any) => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert('Error', 'Please login again');
                return;
            }

            const formattedContacts = deviceContacts
                .filter(
                    (contact: any) =>
                        contact.phoneNumbers && contact.phoneNumbers.length > 0
                )
                .map((contact: any) => ({
                    displayName:
                        contact.displayName || contact.givenName || 'Unknown',
                    phoneNumber: contact.phoneNumbers[0].number.replace(
                        /[\s\-()]/g,
                        ''
                    ),
                    email: contact.emailAddresses?.[0]?.email || '',
                }));

            const response = await axios.post(
                'https://chatter-mobo-app.onrender.com/api/contact/sync',
                { contacts: formattedContacts },
                {
                    headers: {
                        token: token,
                    },
                    timeout: 10000, // prevent hanging requests
                }
            );

            console.log('Sync success:', response.data);
        } catch (error) {
            console.error('Sync error:', error);

            if (error.code === 'ECONNABORTED') {
                Alert.alert(
                    'Timeout',
                    'Request timed out. Check your internet connection.'
                );
            } else if (error.message === 'Network Error') {
                Alert.alert(
                    'Network Error',
                    'Please check your internet connection and try again.'
                );
            } else {
                Alert.alert('Error', 'Failed to sync contacts with server');
            }
        }
    };



    useEffect(() => {
        socket.on("connect", () => {
            console.log("Connected to server:", socket.id);
        });
        socket.emit("register", MY_PHONE);

        requestPermissions();
    }, []);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Chatter</Text>
            </View>

            {/* Contact List */}
            <FlatList
                data={sampleUsers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.contactCard}
                        onPress={() =>
                            navigation.navigate('ChatToContact', {
                                myPhone: MY_PHONE,
                                contactPhone: item.phone,
                            })
                        }
                    >
                        <Text style={styles.name}>{item.name}</Text>
                        <Text style={styles.phone}>{item.phone}</Text>
                    </TouchableOpacity>
                )}
            />

            {/* Floating Button */}
            <TouchableOpacity
                style={styles.floatingButton}
                onPress={() => navigation.navigate('AddContact')}
            >
                <Text style={styles.floatingButtonText}>+</Text>
            </TouchableOpacity>
        </View>
    );
};

export default Home;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    contactCard: {
        backgroundColor: '#f8f8f8',
        padding: 15,
        marginHorizontal: 10,
        marginVertical: 6,
        borderRadius: 10,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
    },
    phone: {
        fontSize: 14,
        color: '#666',
    },
    floatingButton: {
        position: 'absolute',
        right: 20,
        bottom: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    floatingButtonText: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '600',
    },
});
