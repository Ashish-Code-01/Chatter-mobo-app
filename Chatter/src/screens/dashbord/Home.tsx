import {
    StyleSheet,
    Text,
    View,
    Alert,
    Platform,
    TouchableOpacity
} from 'react-native';
import React, { useEffect } from 'react';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import Contacts from 'react-native-contacts';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';




const Home = ({ navigation }: any) => {


    const syncContactsWithBackend = async (deviceContacts: any[]) => {
        try {
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

            await axios.post(
                'https://chatter-mobo-app.vercel.app/api/contact/sync',
                { contacts: formattedContacts },
                {
                    headers: {
                        'token': token,
                    }
                }
            );
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
            Alert.alert('Error', 'Failed to load contacts from device');
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

    useEffect(() => {
        requestPermissions();
    }, []);


    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>
                    Chatter
                </Text>
            </View>

            <View style={styles.content}>
                {/* contatch that the use chat will display it here  */}
            </View>

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
    content: {
        flex: 1,
    },
    bottomButton: {
        backgroundColor: '#007AFF',
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        margin: 16,
        borderRadius: 8,
        marginBottom: 32,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
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
        fontWeight: '300',
    },
});