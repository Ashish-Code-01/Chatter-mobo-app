import { StyleSheet, Text, View, Button, Alert, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import Contacts from 'react-native-contacts';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Home = () => {
    const [contactList, setContactList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const requestPermissions = async () => {
        try {
            const cameraResult = await request(PERMISSIONS.ANDROID.CAMERA);
            const contactsResult = await request(PERMISSIONS.ANDROID.READ_CONTACTS);

            if (cameraResult === RESULTS.GRANTED && contactsResult === RESULTS.GRANTED) {
                getContacts();
            } else {
                Alert.alert('Permission Denied', 'Please enable camera and contacts permissions in settings');
            }
        } catch (error) {
            console.error('Error requesting permissions:', error);
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

            const formattedContacts = contacts.map(contact => ({
                displayName: contact.displayName || 'Unknown',
                phoneNumber: contact.phoneNumbers[0]?.number?.replace(/\s+/g, '') || '',
                email: contact.emailAddresses[0]?.email || ''
            }));

            const response = await axios.post(
                'https://chatter-mobo-app.vercel.app/api/contact/sync',
                { contacts: formattedContacts },
                {
                    headers: {
                        token
                    }
                }
            );

            if (response.data.success) {
                Alert.alert('Success', 'Contacts synced successfully');
            }
        } catch (error) {
            console.error('Sync error:', error);
            Alert.alert('Error', 'Failed to sync contacts');
        } finally {
            setSyncing(false);
        }
    };

    const getContacts = async () => {
        try {
            setLoading(true);
            const contacts = await Contacts.getAll();
            const sortedContacts = contacts.sort((a, b) =>
                (a.displayName || '').localeCompare(b.displayName || '')
            );
            setContactList(sortedContacts);
            await syncContactsWithBackend(sortedContacts);
        } catch (error) {
            console.error('Error loading contacts:', error);
            Alert.alert('Error', 'Failed to load contacts');
        } finally {
            setLoading(false);
        }
    };

    const renderContactItem = ({ item }: any) => {
        const phoneNumber = item.phoneNumbers[0]?.number || 'No number';
        const email = item.emailAddresses[0]?.email || 'No email';

        return (
            <TouchableOpacity style={styles.contactItem}>
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>
                        {item.displayName?.[0]?.toUpperCase() || '?'}
                    </Text>
                </View>
                <View style={styles.contactDetails}>
                    <Text style={styles.contactName}>{item.displayName || 'Unknown'}</Text>
                    <Text style={styles.contactInfo}>{phoneNumber}</Text>
                    <Text style={styles.contactInfo}>{email}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    useEffect(() => {
        requestPermissions();
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Contacts ({contactList.length})</Text>
                {(loading || syncing) ? (
                    <ActivityIndicator color="#007AFF" />
                ) : (
                    <Button
                        title="Refresh"
                        onPress={getContacts}
                    />
                )}
            </View>

            <FlatList
                data={contactList}
                renderItem={renderContactItem}
                keyExtractor={(item) => item.recordID}
                style={styles.list}
                contentContainerStyle={styles.listContent}
            />
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
    list: {
        flex: 1,
    },
    listContent: {
        padding: 16,
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
    avatarText: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    contactDetails: {
        flex: 1,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        marginBottom: 8,
        borderRadius: 8,
        backgroundColor: '#f8f8f8',
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
    }
});