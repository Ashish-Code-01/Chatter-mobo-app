import React, { useEffect, useState } from 'react';
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
    { id: '1', name: 'Ashish Kumar', phone: '+917385971824' },
    { id: '2', name: 'Rohit Sharma', phone: '+912222222222' },
    { id: '3', name: 'Sneha Patel', phone: '+913333333333' },
    { id: '4', name: 'Neha Singh', phone: '+914444444444' },
    { id: '5', name: 'Raj Verma', phone: '+915555555555' },
    { id: '6', name: 'Papa', phone: '+919820922824' },
];

const socket = io("https://chatter-mobo-app.onrender.com/");

const Home = ({ navigation }: any) => {
    const [user, setUser] = useState<any>(null);

    // ✅ Request contacts permission
    const requestPermissions = async () => {
        try {
            const permission =
                Platform.OS === 'ios'
                    ? PERMISSIONS.IOS.CONTACTS
                    : PERMISSIONS.ANDROID.READ_CONTACTS;

            const result = await request(permission);

            if (result === RESULTS.GRANTED) {

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

    // ✅ Get logged-in user from backend
    const getUser = async () => {
        try {
            const token = await AsyncStorage.getItem("token");

            if (!token) {
                Alert.alert("Error", "Please login again");
                return;
            }

            const storedUser = await AsyncStorage.getItem("User");

            if (storedUser) {
                // Parse the stored user JSON string
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                await AsyncStorage.setItem("MyPhone", parsedUser.phoneNumber)
                console.log("phone number is saved ");

            } else {
                // Fetch user from backend
                const response = await axios.post(
                    "https://chatter-mobo-app.onrender.com/auth/me",
                    {},
                    {
                        headers: { token },
                    }
                );

                if (response.data?.user) {
                    setUser(response.data.user);

                    // Store user as JSON string
                    await AsyncStorage.setItem('User', JSON.stringify(response.data.user));
                } else {
                    console.warn('No user found in API response');
                }
            }

        } catch (error) {
            console.error('User fetch error:', error);
            Alert.alert('Error', 'Failed to fetch user details.');
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

    // ✅ Sync contacts with backend
    const syncContactsWithBackend = async (deviceContacts: any) => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert('Error', 'Please login again');
                return;
            }

            const formattedContacts = deviceContacts
                .filter((contact: any) => contact.phoneNumbers?.length > 0)
                .map((contact: any) => ({
                    displayName:
                        contact.displayName || contact.givenName || 'Unknown',
                    phoneNumber: contact.phoneNumbers[0].number.replace(
                        /[\s\-()]/g,
                        ''
                    ),
                    email: contact.emailAddresses?.[0]?.email || '',
                }));

            await axios.post(
                'https://chatter-mobo-app.onrender.com/api/contact/sync',
                { contacts: formattedContacts },
                { headers: { token }, timeout: 10000 }
            );
        } catch (error: any) {
            console.error('Sync error:', error);

            if (error.code === 'ECONNABORTED') {
                Alert.alert('Timeout', 'Request timed out.');
            } else if (error.message === 'Network Error') {
                Alert.alert('Network Error', 'Check your connection.');
            } else {
                Alert.alert('Error', 'Failed to sync contacts.');
            }
        }
    };

    useEffect(() => {
        getUser();
        requestPermissions();

        socket.on("connect", () => { });

        return () => {
            socket.disconnect();
        };
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Chatter</Text>
                {user && <Text style={styles.subtitle}>Hi, {user.name}</Text>}
            </View>

            <FlatList
                data={sampleUsers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.contactCard}
                        onPress={() =>
                            navigation.navigate('ChatToContact', {
                                myPhone: user?.phoneNumber || '',
                                contactPhone: item.phone,
                            })
                        }
                    >
                        <Text style={styles.name}>{item.name}</Text>
                        <Text style={styles.phone}>{item.phone}</Text>
                    </TouchableOpacity>
                )}
            />

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
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: { fontSize: 22, fontWeight: 'bold' },
    subtitle: { fontSize: 14, color: '#666' },
    contactCard: {
        backgroundColor: '#f8f8f8',
        padding: 15,
        marginHorizontal: 10,
        marginVertical: 6,
        borderRadius: 10,
    },
    name: { fontSize: 16, fontWeight: '600' },
    phone: { fontSize: 14, color: '#666' },
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
    },
    floatingButtonText: { color: '#fff', fontSize: 28, fontWeight: '600' },
});
