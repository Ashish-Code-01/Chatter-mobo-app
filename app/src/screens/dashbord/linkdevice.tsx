import React, { useEffect, useState, useCallback } from 'react'
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    FlatList,
    Alert,
    ActivityIndicator,
    Modal,
    TextInput,
    ScrollView,
    Platform
} from 'react-native'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import DeviceInfo from 'react-native-device-info'

// const API_URL = "http://10.73.208.98:8000"
const API_URL = "https://chatter-mobo-app.onrender.com";

const LinkDevice = ({ navigation }: any) => {
    const [devices, setDevices] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [token, setToken] = useState('')
    const [showLinkModal, setShowLinkModal] = useState(false)
    const [deviceName, setDeviceName] = useState('')

    useEffect(() => {
        const getToken = async () => {
            try {
                const storedToken = await AsyncStorage.getItem('token')
                if (storedToken) {
                    setToken(storedToken)
                }
            } catch (error) {
                console.error('Error getting token:', error)
            }
        }
        getToken()
    }, [])

    useEffect(() => {
        if (token) {
            fetchDevices()
        }
    }, [token])

    const fetchDevices = useCallback(async () => {
        if (!token) return

        try {
            setLoading(true)
            const response = await axios.get(
                `${API_URL}/api/devices/list`,
                {
                    headers: {
                        token
                    }
                }
            )

            if (response.data?.success) {
                setDevices(response.data.data || [])
            }
        } catch (error) {
            console.error('Error fetching devices:', error)
            Alert.alert('Error', 'Failed to fetch devices')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [token])

    const handleRefresh = () => {
        setRefreshing(true)
        fetchDevices()
    }

    const handleLinkDevice = async () => {
        if (!deviceName.trim()) {
            Alert.alert('Error', 'Please enter a device name')
            return
        }

        try {
            setLoading(true)
            const deviceModel = await DeviceInfo.getModel()
            const osVersion = `${Platform.OS} ${await DeviceInfo.getSystemVersion()}`

            const response = await axios.post(
                `${API_URL}/api/devices/link`,
                {
                    deviceName: deviceName.trim(),
                    deviceModel,
                    osVersion
                },
                {
                    headers: {
                        token
                    }
                }
            )

            if (response.data?.success) {
                Alert.alert('Success', 'Device linked successfully')
                setDeviceName('')
                setShowLinkModal(false)
                fetchDevices()
            }
        } catch (error: any) {
            console.error('Error linking device:', error)
            Alert.alert('Error', error.response?.data?.message || 'Failed to link device')
        } finally {
            setLoading(false)
        }
    }

    const handleUnlinkDevice = (deviceId: string, deviceName: string) => {
        Alert.alert(
            'Unlink Device',
            `Are you sure you want to unlink "${deviceName}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Unlink',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true)
                            const response = await axios.post(
                                `${API_URL}/api/devices/unlink`,
                                { deviceId },
                                {
                                    headers: {
                                        token
                                    }
                                }
                            )

                            if (response.data?.success) {
                                Alert.alert('Success', 'Device unlinked successfully')
                                fetchDevices()
                            }
                        } catch (error: any) {
                            console.error('Error unlinking device:', error)
                            Alert.alert('Error', error.response?.data?.message || 'Failed to unlink device')
                        } finally {
                            setLoading(false)
                        }
                    }
                }
            ]
        )
    }

    const handleSetPrimaryDevice = async (deviceId: string) => {
        try {
            setLoading(true)
            const response = await axios.post(
                `${API_URL}/api/devices/set-primary`,
                { deviceId },
                {
                    headers: {
                        token
                    }
                }
            )

            if (response.data?.success) {
                Alert.alert('Success', 'Primary device updated successfully')
                fetchDevices()
            }
        } catch (error: any) {
            console.error('Error setting primary device:', error)
            Alert.alert('Error', error.response?.data?.message || 'Failed to set primary device')
        } finally {
            setLoading(false)
        }
    }

    const renderDeviceItem = ({ item }: any) => (
        <View style={styles.deviceCard}>
            <View style={styles.deviceHeader}>
                <View>
                    <Text style={styles.deviceName}>{item.deviceName}</Text>
                    <Text style={styles.deviceModel}>{item.deviceModel}</Text>
                    <Text style={styles.deviceOS}>{item.osVersion}</Text>
                </View>
                {item.isPrimary && (
                    <View style={styles.primaryBadge}>
                        <Text style={styles.primaryBadgeText}>Primary</Text>
                    </View>
                )}
            </View>

            <View style={styles.deviceMeta}>
                <Text style={styles.metaText}>
                    Linked: {new Date(item.linkedAt).toLocaleDateString()}
                </Text>
                <Text style={styles.metaText}>
                    Last Active: {new Date(item.lastActive).toLocaleDateString()}
                </Text>
            </View>

            <View style={styles.buttonContainer}>
                {!item.isPrimary && (
                    <TouchableOpacity
                        style={[styles.button, styles.primaryButton]}
                        onPress={() => handleSetPrimaryDevice(item.deviceId)}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>Set Primary</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[styles.button, styles.unlinkButton]}
                    onPress={() => handleUnlinkDevice(item.deviceId, item.deviceName)}
                    disabled={loading}
                >
                    <Text style={styles.unlinkButtonText}>Unlink</Text>
                </TouchableOpacity>
            </View>
        </View>
    )

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Linked Devices</Text>
                <Text style={styles.headerSubtitle}>Manage your connected devices</Text>
            </View>

            {loading && !devices.length && (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            )}

            {devices.length === 0 && !loading && (
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>No devices linked yet</Text>
                </View>
            )}

            <FlatList
                data={devices}
                keyExtractor={(item) => item.deviceId}
                renderItem={renderDeviceItem}
                scrollEnabled={false}
                contentContainerStyle={styles.listContainer}
                refreshing={refreshing}
                onRefresh={handleRefresh}
            />

            <TouchableOpacity
                style={styles.linkButton}
                onPress={() => setShowLinkModal(true)}
                disabled={loading}
            >
                <Text style={styles.linkButtonText}>+ Link New Device</Text>
            </TouchableOpacity>

            <Modal
                visible={showLinkModal}
                animationType="slide"
                transparent={true}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Link New Device</Text>

                        <Text style={styles.label}>Device Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., My iPhone, Office Android"
                            value={deviceName}
                            onChangeText={setDeviceName}
                            editable={!loading}
                        />

                        <View style={styles.modalButtonContainer}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setShowLinkModal(false)
                                    setDeviceName('')
                                }}
                                disabled={loading}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={handleLinkDevice}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <Text style={styles.confirmButtonText}>Link Device</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
    /* ==================== CONTAINER ==================== */
    container: {
        flex: 1,
        backgroundColor: '#0F1419'
    },

    /* ==================== HEADER ==================== */
    header: {
        backgroundColor: 'rgba(15, 20, 25, 0.5)',
        paddingHorizontal: 18,
        paddingTop: 50,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 212, 194, 0.1)'
    },

    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 6,
        letterSpacing: 0.5
    },

    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(200, 210, 234, 0.7)',
        fontWeight: '500'
    },

    /* ==================== LIST ==================== */
    listContainer: {
        paddingHorizontal: 12,
        paddingVertical: 16
    },

    /* ==================== DEVICE CARD ==================== */
    deviceCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 212, 194, 0.1)',
        shadowColor: '#00D4C2',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12
    },

    deviceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 14
    },

    deviceName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 6,
        letterSpacing: 0.3
    },

    deviceModel: {
        fontSize: 13,
        color: 'rgba(200, 210, 234, 0.7)',
        marginBottom: 3,
        fontWeight: '500'
    },

    deviceOS: {
        fontSize: 12,
        color: 'rgba(200, 210, 234, 0.5)',
        fontWeight: '400'
    },

    primaryBadge: {
        backgroundColor: 'rgba(0, 212, 194, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 212, 194, 0.4)'
    },

    primaryBadgeText: {
        color: '#00D4C2',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.3
    },

    /* ==================== DEVICE META ==================== */
    deviceMeta: {
        marginBottom: 14,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: 'rgba(0, 212, 194, 0.08)'
    },

    metaText: {
        fontSize: 12,
        color: 'rgba(200, 210, 234, 0.6)',
        marginVertical: 3,
        fontWeight: '400'
    },

    /* ==================== BUTTONS ==================== */
    buttonContainer: {
        flexDirection: 'row',
        gap: 10
    },

    button: {
        flex: 1,
        paddingVertical: 11,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1
    },

    primaryButton: {
        backgroundColor: 'rgba(0, 212, 194, 0.2)',
        borderColor: 'rgba(0, 212, 194, 0.4)'
    },

    unlinkButton: {
        backgroundColor: 'rgba(255, 90, 90, 0.1)',
        borderColor: 'rgba(255, 90, 90, 0.3)'
    },

    buttonText: {
        color: '#00D4C2',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.3
    },

    unlinkButtonText: {
        color: '#FF5A5A',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.3
    },

    /* ==================== LINK BUTTON ==================== */
    linkButton: {
        marginHorizontal: 12,
        marginBottom: 20,
        backgroundColor: 'rgba(0, 212, 194, 0.9)',
        paddingVertical: 15,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#00D4C2',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16
    },

    linkButtonText: {
        color: '#0F1419',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.4
    },

    /* ==================== CENTER CONTAINER ==================== */
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },

    emptyText: {
        fontSize: 16,
        color: 'rgba(200, 210, 234, 0.5)',
        fontWeight: '500'
    },

    /* ==================== MODAL ==================== */
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end'
    },

    modalContent: {
        backgroundColor: 'rgba(30, 35, 50, 0.98)',
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 32,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 1,
        borderColor: 'rgba(0, 212, 194, 0.15)'
    },

    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 24,
        letterSpacing: 0.5
    },

    label: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(200, 210, 234, 0.9)',
        marginBottom: 10,
        letterSpacing: 0.3
    },

    input: {
        borderWidth: 1,
        borderColor: 'rgba(0, 212, 194, 0.2)',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        marginBottom: 24,
        color: '#FFFFFF',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        fontWeight: '500'
    },

    /* ==================== MODAL BUTTONS ==================== */
    modalButtonContainer: {
        flexDirection: 'row',
        gap: 12
    },

    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1
    },

    cancelButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderColor: 'rgba(255, 255, 255, 0.1)'
    },

    cancelButtonText: {
        color: 'rgba(200, 210, 234, 0.9)',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.3
    },

    confirmButton: {
        backgroundColor: 'rgba(0, 212, 194, 0.9)',
        borderColor: 'rgba(0, 212, 194, 0.3)',
        shadowColor: '#00D4C2',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12
    },

    confirmButtonText: {
        color: '#0F1419',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.3
    }
})

export default LinkDevice