import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Alert,
    Platform,
    TouchableOpacity,
    FlatList,
    Modal,
} from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import Contacts from 'react-native-contacts';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSocket } from '../../context/socketcontext';

const API_URL = "http://10.119.77.98:8000";  // Update this for production

const Home = ({ navigation }: any) => {
    const { registerUser, unregisterUser, onStatusChanged, offStatusChanged, contactStatusMap: contextStatusMap } = useSocket();

    const [user, setUser] = useState<any>(null);
    const [unseenMessages, setUnseenMessages] = useState<any>({});
    const [UsersContact, setUsersContact] = useState<any>([]);
    const [menuVisible, setMenuVisible] = useState(false);
    const [contactStatusMap, setContactStatusMap] = useState<any>(contextStatusMap);

    const fetchContactStatus = useCallback(async (phoneNumber: string) => {
        try {
            const response = await axios.get(
                `${API_URL}/api/online/status/${phoneNumber}`
            );
            if (response.data?.success) {
                setContactStatusMap((prev: any) => ({
                    ...prev,
                    [phoneNumber]: response.data.data.isOnline
                }));
            }
        } catch (error) {
            console.error(`Error fetching status for ${phoneNumber}:`, error);
        }
    }, []);

    const handleLogout = useCallback(async () => {
        Alert.alert("Logout", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Logout",
                style: "destructive",
                onPress: async () => {
                    try {
                        await AsyncStorage.clear();
                        unregisterUser();
                        navigation.reset({ index: 0, routes: [{ name: "Welcome" }] });
                    } catch (error) {
                        console.error('Logout error:', error);
                    }
                },
            },
        ]);
    }, [unregisterUser, navigation]);

    const handleLinkDevices = useCallback(() => {
        setMenuVisible(false);
        navigation.navigate("LinkDevicesScreen");
    }, [navigation]);

    useEffect(() => {
        const initialize = async () => {
            try {
                // Request permissions
                const permission =
                    Platform.OS === 'ios'
                        ? PERMISSIONS.IOS.CONTACTS
                        : PERMISSIONS.ANDROID.READ_CONTACTS;

                const result = await request(permission);
                if (result === RESULTS.GRANTED) {
                    const deviceContacts = await Contacts.getAll();
                    if (deviceContacts.length > 0) {
                        const token = await AsyncStorage.getItem("token");
                        if (token) {
                            const formatted = deviceContacts
                                .filter((c: any) => c.phoneNumbers?.length > 0)
                                .map((c: any) => ({
                                    displayName: c.displayName || c.givenName || "Unknown",
                                    phoneNumber: c.phoneNumbers[0].number.replace(/[\s\-()]/g, ""),
                                }));
                            await AsyncStorage.setItem("DeviceContacts", JSON.stringify(formatted));

                            await axios.post(
                                `${API_URL}/api/contact/sync`,
                                { contacts: formatted },
                                { headers: { token } }
                            );
                        }
                    }
                } else {
                    Alert.alert('Permission Required', 'Enable contact permission in settings.');
                }

                // Get user
                const token = await AsyncStorage.getItem("token");
                if (!token) return;

                const savedUser = await AsyncStorage.getItem("User");

                if (savedUser) {
                    const parsed = JSON.parse(savedUser);
                    setUser(parsed);
                    registerUser(parsed.phoneNumber);
                } else {
                    const { data } = await axios.post(
                        `${API_URL}/auth/me`,
                        {},
                        { headers: { token } }
                    );

                    if (data?.user) {
                        setUser(data.user);
                        await AsyncStorage.setItem("User", JSON.stringify(data.user));
                        registerUser(data.user.phoneNumber);
                    }
                }

                // Get unseen messages
                const { data: msgData } = await axios.post(
                    `${API_URL}/api/messages/get/msg/all`,
                    {},
                    { headers: { token } }
                );

                if (msgData?.success) {
                    const grouped: any = {};
                    msgData.data.forEach((msg: any) => {
                        if (!msg.seen) {
                            grouped[msg.sender] = (grouped[msg.sender] || 0) + 1;
                        }
                    });
                    setUnseenMessages(grouped);
                }

                // Get contacts
                const res = await AsyncStorage.getItem("Users");
                const contacts = res ? JSON.parse(res) : [];
                setUsersContact(contacts);

                // Fetch initial statuses from API
                for (const contact of contacts) {
                    try {
                        const response = await axios.get(
                            `${API_URL}/api/online/status/${contact.phone}`
                        );
                        if (response.data?.success) {
                            setContactStatusMap((prev: any) => ({
                                ...prev,
                                [contact.phone]: response.data.data.isOnline
                            }));
                        }
                    } catch (error) {
                        console.error(`Error fetching status for ${contact.phone}:`, error);
                    }
                }
            } catch (error) {
                console.error('Initialization error:', error);
            }
        };

        initialize();
    }, [registerUser]);

    // Listen for real-time status changes
    useEffect(() => {
        const handleStatusChanged = ({ phoneNumber, isOnline }: { phoneNumber: string; isOnline: boolean }) => {
            setContactStatusMap((prev: any) => ({
                ...prev,
                [phoneNumber]: isOnline
            }));
        };

        onStatusChanged(handleStatusChanged);

        return () => {
            offStatusChanged();
        };
    }, [onStatusChanged, offStatusChanged]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Chatter</Text>
                <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuButton}>
                    <Text style={styles.menuDots}>⋮</Text>
                </TouchableOpacity>
                {user && <Text style={styles.subtitle}>Hi, {user.name}</Text>}
            </View>

            <FlatList
                data={UsersContact}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No contacts found.</Text>
                }
                contentContainerStyle={styles.flatListContent}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                    const unseen = unseenMessages[item.phone] || 0;
                    const isOnline = contactStatusMap[item.phone] || false;

                    return (
                        <TouchableOpacity
                            style={styles.contactCard}
                            onPress={() =>
                                navigation.navigate("ChatToContact", {
                                    myPhone: user?.phoneNumber,
                                    contactPhone: item.phone,
                                    contactName: item.name,
                                })
                            }
                        >
                            <View>
                                <Text style={styles.name}>{item.name}</Text>
                                <View style={styles.phoneStatusRow}>
                                    <Text style={styles.phone}>{item.phone}</Text>
                                    <Text style={[styles.statusIndicator, isOnline ? styles.statusOnline : styles.statusOffline]}>
                                        {isOnline ? "● Online" : "● Offline"}
                                    </Text>
                                </View>
                            </View>

                            {unseen > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{unseen}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                }}
            />

            <TouchableOpacity
                style={styles.floatingButton}
                onPress={() => navigation.navigate("AddContact")}
            >
                <Text style={styles.floatingButtonText}>+</Text>
            </TouchableOpacity>

            {/* MENU MODAL */}
            <Modal visible={menuVisible} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    onPress={() => setMenuVisible(false)}
                >
                    <View style={styles.menuContainer}>
                        <TouchableOpacity style={styles.menuItem} onPress={() => {
                            setMenuVisible(false);
                            navigation.navigate("updateUserDetails");
                        }}>
                            <Text style={styles.menuText}>Profile</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={handleLinkDevices}>
                            <Text style={styles.menuText}>Link Device</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem}>
                            <Text style={styles.menuText}>Settings</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                            <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

export default Home;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0F1419",
    },

    /* ==================== HEADER ==================== */
    header: {
        paddingTop: 50,
        paddingHorizontal: 18,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(0, 212, 194, 0.1)",
        backgroundColor: "rgba(15, 20, 25, 0.5)",
    },

    title: {
        fontSize: 32,
        fontWeight: "800",
        color: "#FFFFFF",
        letterSpacing: 1,
    },

    subtitle: {
        marginTop: 6,
        fontSize: 14,
        color: "rgba(200, 210, 234, 0.8)",
        fontWeight: "500",
    },

    menuButton: {
        position: "absolute",
        right: 16,
        top: 50,
        padding: 10,
    },

    menuDots: {
        color: "#FFFFFF",
        fontSize: 24,
        fontWeight: "700",
    },

    /* ==================== CONTACT LIST ==================== */
    contactCard: {
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        marginHorizontal: 12,
        marginTop: 10,
        borderRadius: 20,
        padding: 14,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(0, 212, 194, 0.1)",
    },

    name: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
        letterSpacing: 0.3,
    },

    phone: {
        fontSize: 13,
        color: "rgba(200, 210, 234, 0.7)",
        marginTop: 4,
        fontWeight: "400",
    },

    phoneStatusRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 6,
    },

    statusIndicator: {
        fontSize: 11,
        fontWeight: "500",
        letterSpacing: 0.5,
    },

    badge: {
        backgroundColor: "rgba(0, 212, 194, 0.85)",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        minWidth: 28,
        alignItems: "center",
        shadowColor: "#00D4C2",
        shadowOpacity: 0.4,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
    },

    badgeText: {
        color: "#0F1419",
        fontSize: 12,
        fontWeight: "700",
    },

    emptyText: {
        textAlign: "center",
        marginTop: 80,
        color: "rgba(200, 210, 234, 0.5)",
        fontSize: 15,
        fontWeight: "500",
    },

    flatListContent: {
        paddingBottom: 100,
        paddingTop: 8,
    },

    statusOnline: {
        color: "#00D4C2",
    },

    statusOffline: {
        color: "rgba(169, 169, 197, 0.7)",
    },

    logoutText: {
        color: "#FF5A5A",
    },

    /* ==================== FLOATING BUTTON ==================== */
    floatingButton: {
        position: "absolute",
        right: 20,
        bottom: 28,
        width: 60,
        height: 60,
        backgroundColor: "rgba(0, 212, 194, 0.9)",
        borderRadius: 30,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#00D4C2",
        shadowOpacity: 0.5,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
    },

    floatingButtonText: {
        color: "#0F1419",
        fontSize: 32,
        fontWeight: "900",
    },

    /* ==================== MENU MODAL ==================== */
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-start",
        alignItems: "flex-end",
    },

    menuContainer: {
        backgroundColor: "rgba(30, 35, 50, 0.95)",
        marginTop: 70,
        marginRight: 12,
        paddingVertical: 8,
        borderRadius: 16,
        width: 180,
        borderWidth: 1,
        borderColor: "rgba(0, 212, 194, 0.15)",
        shadowColor: "#000",
        shadowOpacity: 0.5,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
    },

    menuItem: {
        paddingVertical: 14,
        paddingHorizontal: 18,
    },

    menuText: {
        fontSize: 15,
        color: "#FFFFFF",
        fontWeight: "500",
        letterSpacing: 0.3,
    },
});
