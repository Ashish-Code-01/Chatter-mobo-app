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

const socket = io("https://chatter-mobo-app.onrender.com/");

const Home = ({ navigation }: any) => {
    const [user, setUser] = useState<any>(null);
    const [unseenMessages, setUnseenMessages] = useState<any>({});
    const [UsersContact, setUsersContact] = useState()
    const Users = UsersContact;

    // same logic — unchanged
    const requestPermissions = async () => {
        try {
            const permission =
                Platform.OS === 'ios'
                    ? PERMISSIONS.IOS.CONTACTS
                    : PERMISSIONS.ANDROID.READ_CONTACTS;

            const result = await request(permission);
            if (result === RESULTS.GRANTED) await getContacts();
            else if (result === RESULTS.DENIED) {
                Alert.alert('Permission Denied', 'Please enable contacts permission in settings.');
            } else if (result === RESULTS.BLOCKED) {
                Alert.alert('Permission Blocked', 'Enable it in device settings.');
            }
        } catch (error) {
            console.error('Permission request error:', error);
        }
    };

    const getUser = async () => {
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) {
                Alert.alert("Error", "Please login again");
                return;
            }

            const storedUser = await AsyncStorage.getItem("User");
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                await AsyncStorage.setItem("MyPhone", parsedUser.phoneNumber);
            } else {
                const response = await axios.post(
                    "https://chatter-mobo-app.onrender.com/auth/me",
                    {},
                    { headers: { token } }
                );
                if (response.data?.user) {
                    setUser(response.data.user);
                    await AsyncStorage.setItem('User', JSON.stringify(response.data.user));
                }
            }
        } catch (error) {
            console.error('User fetch error:', error);
        }
    };

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
        }
    };

    const syncContactsWithBackend = async (deviceContacts: any) => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) return;

            const formattedContacts = deviceContacts
                .filter((contact: any) => contact.phoneNumbers?.length > 0)
                .map((contact: any) => ({
                    displayName: contact.displayName || contact.givenName || 'Unknown',
                    phoneNumber: contact.phoneNumbers[0].number.replace(/[\s\-()]/g, ''),
                }));

            await axios.post(
                'https://chatter-mobo-app.onrender.com/api/contact/sync',
                { contacts: formattedContacts },
                { headers: { token }, timeout: 10000 }
            );
        } catch (error: any) {
            console.error('Sync error:', error);
        }
    };

    const allUnseenMessages = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) return;

            const response = await axios.post(
                "https://chatter-mobo-app.onrender.com/api/messages/get/msg/all",
                {},
                { headers: { token }, timeout: 10000 }
            );

            if (response.data?.success && Array.isArray(response.data.data)) {
                const grouped: Record<string, number> = {};
                response.data.data.forEach((msg: any) => {
                    if (!msg.seen) {
                        grouped[msg.sender] = (grouped[msg.sender] || 0) + 1;
                    }
                });
                setUnseenMessages(grouped);
            }
        } catch (error) {
            console.error("Error fetching unseen messages:", error);
        }
    };

    const getUsersContact = async () => {
        const res = await AsyncStorage.getItem("Users")
        const Users = JSON.parse(res)
        setUsersContact(Users)
    }


    useEffect(() => {
        const init = async () => {
            await getUser();
            getUsersContact()
            await requestPermissions();
            await allUnseenMessages();
        };
        init();

        socket.on("connect", () => console.log("Socket connected"));
        return () => {
            socket.disconnect();
        };
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.backgroundOverlay} />

            <View style={styles.header}>
                <Text style={styles.title}>Chatter</Text>
                {user && <Text style={styles.subtitle}>Hi, {user.name}</Text>}
            </View>

            <FlatList
                data={Users}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                    const unseen = unseenMessages?.[item.phone] || 0;
                    return (
                        <TouchableOpacity
                            style={styles.contactCard}
                            onPress={() =>
                                navigation.navigate('ChatToContact', {
                                    myPhone: user?.phoneNumber || '',
                                    contactPhone: item.phone,
                                })
                            }
                        >
                            <View style={styles.cardRow}>
                                <View>
                                    <Text style={styles.name}>{item.name}</Text>
                                    <Text style={styles.phone}>{item.phone}</Text>
                                </View>
                                {unseen > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{unseen}</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                }}
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
    container: {
        flex: 1,
        backgroundColor: '#131537',
    },
    backgroundOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#1E1F4B',
        shadowColor: '#0D0F2C',
        shadowOffset: { width: 0, height: -250 },
        shadowOpacity: 0.8,
        shadowRadius: 250,
        opacity: 0.9,
    },
    header: {
        padding: 20,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: '#C5C9F2',
    },
    contactCard: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        padding: 16,
        marginHorizontal: 12,
        marginVertical: 6,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
    },
    name: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    phone: {
        fontSize: 14,
        color: '#C5C9F2',
        marginTop: 3,
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    badge: {
        backgroundColor: '#00D4C2',
        borderRadius: 12,
        minWidth: 24,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        shadowColor: '#00C1FF',
        shadowOpacity: 0.4,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    badgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    floatingButton: {
        position: 'absolute',
        right: 20,
        bottom: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#00D4C2',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#00C1FF',
        shadowOpacity: 0.4,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
    },
    floatingButtonText: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '800',
    },
});
