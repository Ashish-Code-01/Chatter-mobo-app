import React, { useEffect, useState } from 'react';
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
import { io } from "socket.io-client";

const socket = io("https://chatter-mobo-app.onrender.com/");

const Home = ({ navigation }: any) => {
    const [user, setUser] = useState<any>(null);
    const [unseenMessages, setUnseenMessages] = useState<any>({});
    const [UsersContact, setUsersContact] = useState<any>([]);
    const [menuVisible, setMenuVisible] = useState(false);

    const requestPermissions = async () => {
        try {
            const permission =
                Platform.OS === 'ios'
                    ? PERMISSIONS.IOS.CONTACTS
                    : PERMISSIONS.ANDROID.READ_CONTACTS;

            const result = await request(permission);
            if (result === RESULTS.GRANTED) await getContacts();
            else Alert.alert('Permission Required', 'Enable contact permission in settings.');
        } catch (error) {
            console.error('Permission request error:', error);
        }
    };

    const getUser = async () => {
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) return;

            const savedUser = await AsyncStorage.getItem("User");

            if (savedUser) {
                const parsed = JSON.parse(savedUser);
                console.log(parsed);
                setUser(parsed);
                return;
            }

            const { data } = await axios.post(
                "https://chatter-mobo-app.onrender.com/auth/me",
                {},
                { headers: { token } }
            );

            if (data?.user) {
                setUser(data.user);
                await AsyncStorage.setItem("User", JSON.stringify(data.user));
            }
        } catch (error) {
            console.error("User fetch error:", error);
        }
    };

    const getContacts = async () => {
        try {
            const deviceContacts = await Contacts.getAll();
            if (deviceContacts.length === 0) {
                Alert.alert("No Contacts", "Your device has no contacts saved.");
                return;
            }
            await syncContactsWithBackend(deviceContacts);
        } catch (error) {
            console.error("Error loading contacts:", error);
        }
    };

    const syncContactsWithBackend = async (deviceContacts: any) => {
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) return;

            const formatted = deviceContacts
                .filter((c: any) => c.phoneNumbers?.length > 0)
                .map((c: any) => ({
                    displayName: c.displayName || c.givenName || "Unknown",
                    phoneNumber: c.phoneNumbers[0].number.replace(/[\s\-()]/g, ""),
                }));

            await axios.post(
                "https://chatter-mobo-app.onrender.com/api/contact/sync",
                { contacts: formatted },
                { headers: { token } }
            );
        } catch (error) {
            console.error("Sync error:", error);
        }
    };

    const allUnseenMessages = async () => {
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) return;

            const { data } = await axios.post(
                "https://chatter-mobo-app.onrender.com/api/messages/get/msg/all",
                {},
                { headers: { token } }
            );

            if (data?.success) {
                const grouped: any = {};
                data.data.forEach((msg: any) => {
                    if (!msg.seen) {
                        grouped[msg.sender] = (grouped[msg.sender] || 0) + 1;
                    }
                });
                setUnseenMessages(grouped);
            }
        } catch (error) {
            console.error("Message fetch error:", error);
        }
    };

    const getUsersContact = async () => {
        const res = await AsyncStorage.getItem("Users");
        setUsersContact(res ? JSON.parse(res) : []);
    };

    const handleLogout = async () => {
        Alert.alert("Logout", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Logout",
                style: "destructive",
                onPress: async () => {
                    await AsyncStorage.clear();
                    socket.disconnect();
                    navigation.reset({ index: 0, routes: [{ name: "Welcome" }] });
                },
            },
        ]);
    };

    useEffect(() => {
        getUser();
        getUsersContact();
        requestPermissions();
        allUnseenMessages();
    }, []);

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
                contentContainerStyle={{ paddingBottom: 90 }}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                    const unseen = unseenMessages[item.phone] || 0;

                    return (
                        <TouchableOpacity
                            style={styles.contactCard}
                            onPress={() =>
                                navigation.navigate("ChatToContact", {
                                    myPhone: user?.phoneNumber,
                                    contactPhone: item.phone,
                                })
                            }
                        >
                            <View>
                                <Text style={styles.name}>{item.name}</Text>
                                <Text style={styles.phone}>{item.phone}</Text>
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

                        <TouchableOpacity style={styles.menuItem}>
                            <Text style={styles.menuText}>Link Device</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem}>
                            <Text style={styles.menuText}>Settings</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                            <Text style={[styles.menuText, { color: "#FF5D5D" }]}>Logout</Text>
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
        backgroundColor: "#10122C",
    },

    // HEADER
    header: {
        paddingTop: 55,
        paddingHorizontal: 20,
        paddingBottom: 18,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.08)",
    },
    title: {
        fontSize: 28,
        fontWeight: "800",
        color: "#FFFFFF",
    },
    subtitle: {
        marginTop: 4,
        fontSize: 15,
        color: "#C7C9F5",
    },
    menuButton: {
        position: "absolute",
        right: 18,
        top: 55,
        padding: 10,
    },
    menuDots: {
        color: "#FFF",
        fontSize: 24,
        fontWeight: "700",
    },

    // CONTACT LIST
    contactCard: {
        backgroundColor: "rgba(255,255,255,0.06)",
        marginHorizontal: 15,
        marginTop: 10,
        borderRadius: 14,
        padding: 18,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    name: {
        fontSize: 17,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    phone: {
        fontSize: 14,
        color: "#C9CCF2",
        marginTop: 2,
    },
    badge: {
        backgroundColor: "#00D4C2",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
        minWidth: 24,
        alignItems: "center",
    },
    badgeText: {
        color: "#FFF",
        fontSize: 12,
        fontWeight: "700",
    },
    emptyText: {
        textAlign: "center",
        marginTop: 60,
        color: "#A0A3D2",
        fontSize: 15,
    },

    // FLOATING BUTTON
    floatingButton: {
        position: "absolute",
        right: 22,
        bottom: 30,
        width: 62,
        height: 62,
        backgroundColor: "#00D4C2",
        borderRadius: 31,
        justifyContent: "center",
        alignItems: "center",
        elevation: 8,
    },
    floatingButtonText: {
        color: "#FFF",
        fontSize: 30,
        fontWeight: "900",
    },

    // MENU MODAL
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "flex-start",
        alignItems: "flex-end",
    },
    menuContainer: {
        backgroundColor: "#1A1C3F",
        marginTop: 75,
        marginRight: 14,
        paddingVertical: 5,
        borderRadius: 12,
        width: 170,
        elevation: 15,
    },
    menuItem: {
        paddingVertical: 13,
        paddingHorizontal: 20,
    },
    menuText: {
        fontSize: 16,
        color: "#E6E7F5",
    },
});
