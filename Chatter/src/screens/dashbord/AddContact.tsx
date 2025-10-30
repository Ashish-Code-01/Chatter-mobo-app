import {
    StyleSheet,
    Text,
    View,
    Alert,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    RefreshControl,
    Platform
} from 'react-native';
import React, { useEffect, useState } from 'react';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import Contacts from 'react-native-contacts';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ContactData {
    phoneNumber: string;
    displayName: string;
    isRegistered: boolean;
    userData?: {
        name?: string;
        avatar?: string;
    };
}

interface ContactsState {
    registered: ContactData[];
    unregistered: ContactData[];
    total: number;
}

const Home = () => {
    const [contacts, setContacts] = useState<ContactsState>({
        registered: [],
        unregistered: [],
        total: 0
    });
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const fetchRegisteredContacts = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert('Error', 'Please login again');
                return;
            }

            const response = await axios.post(
                'https://chatter-mobo-app.onrender.com/api/contact/registered',
                {},
                {
                    headers: {
                        'token': token,
                    },
                }
            );


            if (response.data.success) {
                setContacts(response.data.data.contacts);
            }
        } catch (error: any) {
            console.error('Error fetching registered contacts:', error);
            console.error('Error message:', error.message);
            console.error('Error details:', error.response?.data);

            if (error.code === 'ECONNABORTED') {
                Alert.alert('Error', 'Request timed out. Please check your internet connection.');
            } else if (error.message === 'Network Error') {
                Alert.alert('Network Error', 'Please check your internet connection and try again.');
            } else {
                Alert.alert('Error', 'Failed to fetch contacts from server');
            }
        }
    };

    const syncContactsWithBackend = async (deviceContacts: any[]) => {
        try {
            setSyncing(true);
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert('Error', 'Please login again');
                return;
            }

            const formattedContacts = deviceContacts
                .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
                .map(contact => ({
                    displayName: contact.displayName || contact.givenName || 'Unknown',
                    phoneNumber: contact.phoneNumbers[0].number.replace(/[\s\-()]/g, ''),
                    email: contact.emailAddresses?.[0]?.email || ''
                }));

            const response = await axios.post(
                'https://chatter-mobo-app.onrender.com/api/contact/sync',
                { contacts: formattedContacts },
                {
                    headers: {
                        'token': token,
                    }
                }
            );

            if (response.data.success) {
                await fetchRegisteredContacts();
            }
        } catch (error: any) {
            console.error('Sync error:', error);
            console.error('Sync error message:', error.message);
            console.error('Sync error details:', error.response?.data);

            if (error.code === 'ECONNABORTED') {
                Alert.alert('Error', 'Request timed out. Please check your internet connection.');
            } else if (error.message === 'Network Error') {
                Alert.alert('Network Error', 'Please check your internet connection and try again.');
            } else {
                Alert.alert('Error', 'Failed to sync contacts with server');
            }
        } finally {
            setSyncing(false);
        }
    };

    const getContacts = async () => {
        try {
            setLoading(true);
            const deviceContacts = await Contacts.getAll();

            if (deviceContacts.length === 0) {
                Alert.alert('Info', 'No contacts found on device');
                return;
            }

            await syncContactsWithBackend(deviceContacts);
        } catch (error) {
            console.error('Error loading contacts:', error);
            Alert.alert('Error', 'Failed to load contacts from device');
        } finally {
            setLoading(false);
        }
    };

    const requestPermissions = async () => {
        try {
            const permission = Platform.OS === 'ios'
                ? PERMISSIONS.IOS.CONTACTS
                : PERMISSIONS.ANDROID.READ_CONTACTS;

            const contactsResult = await request(permission);

            if (contactsResult === RESULTS.GRANTED) {
                await getContacts();
            } else if (contactsResult === RESULTS.DENIED) {
                Alert.alert(
                    'Permission Denied',
                    'Please enable contacts permissions in settings to use this feature'
                );
            } else if (contactsResult === RESULTS.BLOCKED) {
                Alert.alert(
                    'Permission Blocked',
                    'Contacts permission is blocked. Please enable it in your device settings.'
                );
            }
        } catch (error) {
            console.error('Error requesting permissions:', error);
            Alert.alert('Error', 'Failed to request permissions');
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await getContacts();
        } finally {
            setRefreshing(false);
        }
    };

    const renderContactItem = ({ item }: { item: ContactData }) => (
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

    if (loading && contacts.total === 0) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading contacts...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>
                    Chatter
                </Text>
                {(loading || syncing) && (
                    <ActivityIndicator color="#007AFF" />
                )}
            </View>

            {contacts.total === 0 && !loading && (
                <View style={styles.centerContent}>
                    <Text style={styles.emptyText}>No contacts found</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={getContacts}
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            {contacts.registered.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        On Chatter ({contacts.registered.length})
                    </Text>
                    <FlatList
                        data={contacts.registered}
                        renderItem={renderContactItem}
                        keyExtractor={(item, index) => `${item.phoneNumber}-${index}`}
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
                        keyExtractor={(item, index) => `${item.phoneNumber}-${index}`}
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
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
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