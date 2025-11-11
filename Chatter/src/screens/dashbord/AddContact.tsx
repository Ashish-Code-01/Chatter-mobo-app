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
    Platform,
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

const Home = ({ navigation }: any) => {
    const [contacts, setContacts] = useState<ContactsState>({
        registered: [],
        unregistered: [],
        total: 0,
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
                { headers: { token } }
            );

            if (response.data.success) {
                setContacts(response.data.data.contacts);
            }
        } catch (error: any) {
            console.error('Error fetching registered contacts:', error);
            Alert.alert('Error', 'Failed to fetch contacts from server');
        }
    };

    const syncContactsWithBackend = async (deviceContacts: any[]) => {
        try {
            setSyncing(true);
            const token = await AsyncStorage.getItem('token');
            if (!token) return;

            const formattedContacts = deviceContacts
                .filter((contact) => contact.phoneNumbers?.length > 0)
                .map((contact) => ({
                    displayName:
                        contact.displayName || contact.givenName || 'Unknown',
                    phoneNumber: contact.phoneNumbers[0].number.replace(
                        /[\s\-()]/g,
                        ''
                    ),
                }));

            const response = await axios.post(
                'https://chatter-mobo-app.onrender.com/api/contact/sync',
                { contacts: formattedContacts },
                { headers: { token } }
            );

            if (response.data.success) await fetchRegisteredContacts();
        } catch (error) {
            console.error('Sync error:', error);
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
            const permission =
                Platform.OS === 'ios'
                    ? PERMISSIONS.IOS.CONTACTS
                    : PERMISSIONS.ANDROID.READ_CONTACTS;

            const contactsResult = await request(permission);
            if (contactsResult === RESULTS.GRANTED) await getContacts();
            else
                Alert.alert(
                    'Permission Required',
                    'Please enable contact permissions in settings.'
                );
        } catch (error) {
            console.error('Error requesting permissions:', error);
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

    const handleContactPress = async (contact: ContactData) => {
        try {
            const myPhoneNumber = await AsyncStorage.getItem('MyPhone');
            if (!myPhoneNumber) {
                Alert.alert(
                    'Error',
                    'Unable to find your phone number. Please log in again.'
                );
                return;
            }
            navigation.navigate('ChatToContact', {
                myPhoneNumber,
                contactPhone: contact.phoneNumber,
            });
        } catch (error) {
            Alert.alert('Error', 'Failed to open chat');
        }
    };

    const renderContactItem = ({ item }: { item: ContactData }) => (
        <TouchableOpacity
            style={[
                styles.contactItem,
                item.isRegistered && styles.registeredContact,
            ]}
            onPress={() => handleContactPress(item)}
        >
            <View style={styles.avatarContainer}>
                {item.userData?.avatar ? (
                    <Image
                        source={{ uri: item.userData.avatar }}
                        style={styles.avatar}
                    />
                ) : (
                    <Text style={styles.avatarText}>
                        {(item.userData?.name || item.displayName)?.[0]
                            ?.toUpperCase() || '?'}
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
            <View style={styles.backgroundOverlay} />

            <View style={styles.header}>
                <Text style={styles.title}>Chatter</Text>
                {(loading || syncing) && (
                    <ActivityIndicator color="#00D4C2" />
                )}
            </View>

            {contacts.total === 0 && !loading && (
                <View style={styles.centerContent}>
                    <Text style={styles.emptyText}>No contacts found 😕</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={getContacts}
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            {contacts.registered.length > 0 && (
                <FlatList
                    data={contacts.registered}
                    renderItem={renderContactItem}
                    keyExtractor={(item, index) => `${item.phoneNumber}-${index}`}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#00D4C2"
                        />
                    }
                />
            )}
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#C5C9F2',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#00D4C2',
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 25,
        shadowColor: '#00C1FF',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 15,
        marginVertical: 8,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: 15,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    registeredContact: {
        borderColor: '#00D4C2',
        borderWidth: 1,
    },
    avatarContainer: {
        width: 55,
        height: 55,
        borderRadius: 27,
        backgroundColor: 'rgba(0,212,194,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    avatar: {
        width: 55,
        height: 55,
        borderRadius: 27,
    },
    avatarText: {
        color: '#00D4C2',
        fontSize: 20,
        fontWeight: 'bold',
    },
    contactDetails: {
        flex: 1,
    },
    contactName: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    contactInfo: {
        fontSize: 14,
        color: '#C5C9F2',
    },
    badge: {
        backgroundColor: '#00D4C2',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
});
