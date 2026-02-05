import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Vibration,
    StatusBar,
} from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { useSocket } from '../../context/socketcontext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const QRScanner = ({ navigation }) => {
    const [hasPermission, setHasPermission] = useState(false);
    const [isActive, setIsActive] = useState(true);
    const [scannedData, setScannedData] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { linkDevice } = useSocket();

    const device = useCameraDevice('back');

    const sendLinkDevice = async (socketId: string) => {
        try {
            setIsLoading(true);
            const token = await AsyncStorage.getItem('token') || '';
            const privatekey = await AsyncStorage.getItem("privatekey");
            const serverkey = await AsyncStorage.getItem("serverkey");
            const Users = await AsyncStorage.getItem("Users");
            setScannedData(socketId);
            const success = await linkDevice(socketId, token, privatekey, serverkey, Users);

            if (!success) {
                throw new Error('Failed to link device');
            }

            navigation.navigate('LinkDevicesScreen');
        } catch (error) {
            console.error('Error linking device:', error);
            resetScan();
        } finally {
            setIsLoading(false);
        }
    }

    const resetScan = () => {
        setIsActive(true);
        setScannedData(null);
        setIsLoading(false);
    }

    // Code scanner configuration
    const codeScanner = useCodeScanner({
        codeTypes: ['qr', 'ean-13'],
        onCodeScanned: (codes) => {
            if (codes.length > 0 && isActive) {
                const qrData = codes[0]?.value;
                if (qrData) {
                    setIsActive(false);
                    Vibration.vibrate(200);
                    sendLinkDevice(qrData);
                }
            }
        },
    });

    // Request camera permission
    useEffect(() => {
        (async () => {
            const status = await Camera.requestCameraPermission();
            setHasPermission(status === 'granted' || status === 'authorized');
        })();
    }, []);

    if (!hasPermission) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" />
                <Text style={styles.text}>Camera permission required</Text>
                <TouchableOpacity
                    style={styles.button}
                    onPress={async () => {
                        const status = await Camera.requestCameraPermission();
                        setHasPermission(status === 'granted' || status === 'authorized');
                    }}
                >
                    <Text style={styles.buttonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!device) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" />
                <Text style={styles.text}>No camera device found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={isActive}
                codeScanner={codeScanner}
            />

            {/* Overlay */}
            <View style={styles.overlay}>
                <View style={styles.topOverlay}>
                    <Text style={styles.headerText}>Scan QR Code</Text>
                </View>

                <View style={styles.middleRow}>
                    <View style={styles.sideOverlay} />
                    <View style={styles.scanArea}>
                        <View style={[styles.corner, styles.topLeft]} />
                        <View style={[styles.corner, styles.topRight]} />
                        <View style={[styles.corner, styles.bottomLeft]} />
                        <View style={[styles.corner, styles.bottomRight]} />
                    </View>
                    <View style={styles.sideOverlay} />
                </View>

                {/* Bottom Overlay */}
                <View style={styles.bottomOverlay}>
                    {!scannedData ? (
                        <Text style={styles.instructionText}>
                            Point your camera at a QR code to link your device
                        </Text>
                    ) : (
                        <View style={styles.resultContainer}>
                            <Text style={styles.resultText}>
                                ✓ Device linked successfully!{`\n`}
                                ID: {scannedData}
                            </Text>
                            <TouchableOpacity
                                style={styles.scanAgainButton}
                                onPress={resetScan}
                                disabled={isLoading}
                            >
                                <Text style={styles.scanAgainText}>
                                    {isLoading ? 'Linking...' : 'Scan Again'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    text: {
        color: '#fff',
        fontSize: 18,
        marginBottom: 20,
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 10,
        alignSelf: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    topOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 40,
    },
    middleRow: {
        flexDirection: 'row',
        height: 280,
    },
    sideOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    scanArea: {
        width: 280,
        height: 280,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: '#4CAF50',
    },
    topLeft: {
        top: -2,
        left: -2,
        borderTopWidth: 5,
        borderLeftWidth: 5,
        borderTopLeftRadius: 8,
    },
    topRight: {
        top: -2,
        right: -2,
        borderTopWidth: 5,
        borderRightWidth: 5,
        borderTopRightRadius: 8,
    },
    bottomLeft: {
        bottom: -2,
        left: -2,
        borderBottomWidth: 5,
        borderLeftWidth: 5,
        borderBottomLeftRadius: 8,
    },
    bottomRight: {
        bottom: -2,
        right: -2,
        borderBottomWidth: 5,
        borderRightWidth: 5,
        borderBottomRightRadius: 8,
    },
    bottomOverlay: {
        flex: 1.5,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingTop: 30,
        alignItems: 'center',
    },
    instructionText: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
        marginHorizontal: 40,
    },
    resultContainer: {
        marginTop: 20,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    resultText: {
        color: '#4CAF50',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 15,
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    scanAgainButton: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 25,
        marginTop: 10,
    },
    scanAgainText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default QRScanner;