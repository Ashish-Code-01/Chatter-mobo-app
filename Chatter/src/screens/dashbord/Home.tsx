import {
    StyleSheet,
    Text,
    View,
    Button,
    Alert,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    RefreshControl
} from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import Contacts from 'react-native-contacts';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Home = () => {
    const [contacts, setContacts] = useState({
        registered: [],
        unregistered: [],
        total: 0
    });
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const requestPermissions = async () => {
        try {
            const contactsResult = await request(PERMISSIONS.ANDROID.READ_CONTACTS);
            if (contactsResult === RESULTS.GRANTED) {
                await getContacts();
            } else {
                Alert.alert('Permission Denied', 'Please enable contacts permissions in settings');
            }
        } catch (error) {
            console.error('Error requesting permissions:', error);
            Alert.alert('Error', 'Failed to request permissions');
        }
    };

    const syncContactsWithBackend = async (contacts) => {
        try {
            setSyncing(true);
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert('Error', 'Please login again');
                return;
            }

            const formattedContacts = contacts
                .filter(contact => contact.phoneNumbers?.[0]?.number)
                .map(contact => ({
                    displayName: contact.displayName || 'Unknown',
                    phoneNumber: contact.phoneNumbers[0].number.replace(/\s+/g, ''),
                    email: contact.emailAddresses?.[0]?.email || ''
                }));

            const response = await axios.post(
                'https://chatter-mobo-app.vercel.app/api/contacts/sync',
                { contacts: formattedContacts },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.data.success) {
                await fetchRegisteredContacts();
            }
        } catch (error) {
            console.error('Sync error:', error);
            Alert.alert('Error', 'Failed to sync contacts');
        } finally {
            setSyncing(false);
        }
    };

    const fetchRegisteredContacts = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert('Error', 'Please login again');
                return;
            }

            const response = await axios.get(
                'https://chatter-mobo-app.vercel.app/api/contact/registered',
                {
                    headers: {
                        token
                    }
                }
            );

            if (response.data.success) {
                setContacts(response.data.data.contacts);
            }
        } catch (error) {
            console.error('Error fetching registered contacts:', error);
            Alert.alert('Error', 'Failed to fetch contacts');
        }
    };

    const getContacts = async () => {
        try {
            setLoading(true);
            const deviceContacts = await Contacts.getAll();
            await syncContactsWithBackend(deviceContacts);
        } catch (error) {
            console.error('Error loading contacts:', error);
            Alert.alert('Error', 'Failed to load contacts');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await getContacts();
        } finally {
            setRefreshing(false);
        }
    }, []);

    const renderContactItem = ({ item }: any) => (
        <TouchableOpacity
            style={[styles.contactItem, item.isRegistered && styles.registeredContact]}
        >
            <View style={styles.avatarContainer}>
                {item.userData?.avatar ? (
                    <Image
                        source={{ uri: item.userData.avatar }}
                        style={styles.avatar}
                    />
                ) : (
                    <Text style={styles.avatarText}>
                        {(item.userData?.name || item.displayName)?.[0]?.toUpperCase() || '?'}
                    </Text>
                )}
            </View>
            <View style={styles.contactDetails}>
                <Text style={styles.contactName}>
                    {item.userData?.name || item.displayName || 'Unknown'}
                </Text>
                <Text style={styles.contactInfo}>{item.phoneNumber}</Text>
                {item.isRegistered && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>On Chatter</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    useEffect(() => {
        requestPermissions();
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>
                    Contacts ({contacts.total})
                </Text>
                {(loading || syncing) && (
                    <ActivityIndicator color="#007AFF" />
                )}
            </View>

            {contacts.registered.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        On Chatter ({contacts.registered.length})
                    </Text>
                    <FlatList
                        data={contacts.registered}
                        renderItem={renderContactItem}
                        keyExtractor={item => item.phoneNumber}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                            />
                        }
                    />
                </View>
            )}

            {contacts.unregistered.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Invite to Chatter ({contacts.unregistered.length})
                    </Text>
                    <FlatList
                        data={contacts.unregistered}
                        renderItem={renderContactItem}
                        keyExtractor={item => item.phoneNumber}
                    />
                </View>
            )}
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    section: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        padding: 16,
        backgroundColor: '#f5f5f5',
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    registeredContact: {
        backgroundColor: '#e8f5e9',
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    avatarText: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    contactDetails: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    contactInfo: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    badge: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    }
});