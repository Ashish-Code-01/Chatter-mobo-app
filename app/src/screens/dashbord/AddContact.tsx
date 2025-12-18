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

// const API_URL = "http://10.73.208.98:8000"; // Update for production
const API_URL = "https://chatter-mobo-app.onrender.com";

interface ContactData {
    phoneNumber: number | string;
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
                `${API_URL}/api/contact/registered`,
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
                `${API_URL}/api/contact/sync`,
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
            const User = await AsyncStorage.getItem('User');
            const parsedUser = User ? JSON.parse(User) : null;
            const myPhoneNumber = parsedUser?.phoneNumber;
            console.log(myPhoneNumber);

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
    /* ==================== CONTAINER ==================== */
    container: {
        flex: 1,
        backgroundColor: '#0F1419',
    },

    /* ==================== BACKGROUND ==================== */
    backgroundOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#0F1419',
    },

    /* ==================== HEADER ==================== */
    header: {
        paddingHorizontal: 18,
        paddingTop: 50,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 212, 194, 0.1)',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },

    /* ==================== CENTER CONTENT ==================== */
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    emptyText: {
        fontSize: 16,
        color: 'rgba(200, 210, 234, 0.7)',
        marginBottom: 24,
        fontWeight: '500',
    },

    /* ==================== RETRY BUTTON ==================== */
    retryButton: {
        backgroundColor: 'rgba(0, 212, 194, 0.9)',
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 16,
        shadowColor: '#00D4C2',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
    },

    retryButtonText: {
        color: '#0F1419',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },

    /* ==================== CONTACT ITEM ==================== */
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 12,
        marginVertical: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(0, 212, 194, 0.1)',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },

    registeredContact: {
        borderColor: 'rgba(0, 212, 194, 0.3)',
        backgroundColor: 'rgba(0, 212, 194, 0.05)',
    },

    /* ==================== AVATAR ==================== */
    avatarContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(0, 212, 194, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        borderWidth: 1,
        borderColor: 'rgba(0, 212, 194, 0.3)',
    },

    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 1,
        borderColor: 'rgba(0, 212, 194, 0.3)',
    },

    avatarText: {
        color: '#00D4C2',
        fontSize: 18,
        fontWeight: '700',
    },

    /* ==================== CONTACT DETAILS ==================== */
    contactDetails: {
        flex: 1,
    },

    contactName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },

    contactInfo: {
        fontSize: 13,
        color: 'rgba(200, 210, 234, 0.7)',
        marginTop: 4,
        fontWeight: '400',
    },

    /* ==================== BADGE ==================== */
    badge: {
        backgroundColor: 'rgba(0, 212, 194, 0.85)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginTop: 6,
        shadowColor: '#00D4C2',
        shadowOpacity: 0.4,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
    },

    badgeText: {
        color: '#0F1419',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
});
