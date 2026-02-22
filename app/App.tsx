import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
enableScreens();

import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';

import { SocketProvider } from './src/context/socketcontext';

import WelcomeScreen from './src/screens/auth/WelcomeScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import OTPScreen from './src/screens/auth/OtpScreen';
import HomeScreen from './src/screens/dashbord/Home';
import AddContact from './src/screens/dashbord/AddContact';
import ChatToContact from './src/screens/dashbord/chatToContact';
import ProfileScreen from './src/screens/auth/updateUserDetails';
import LinkDevicesScreen from './src/screens/dashbord/linkdevice';
import PreviewDocuments from './src/screens/dashbord/previewDocs';
import QrScannerScreen from './src/screens/dashbord/qr-scanner';

const Stack = createNativeStackNavigator();

function RootNavigator({ initialRoute }: { initialRoute: string }) {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Otp" component={OTPScreen} options={{ headerShown: false }} />
        <Stack.Screen name="EditDetails" component={ProfileScreen} options={{ headerShown: false }} />
        <Stack.Screen name="home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AddContact" component={AddContact} options={{ headerShown: false }} />
        <Stack.Screen name="ChatToContact" component={ChatToContact} options={{ headerShown: false }} />
        <Stack.Screen name="updateUserDetails" component={ProfileScreen} options={{ headerShown: false }} />
        <Stack.Screen name="LinkDevicesScreen" component={LinkDevicesScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PreviewDocuments" component={PreviewDocuments} options={{ headerShown: false }} />
        <Stack.Screen name="QrScannerScreen" component={QrScannerScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem('token');
      if (token == null) {
        setInitialRoute('Welcome');
        return;
      }
      setInitialRoute(token ? 'home' : 'Welcome');
    };

    checkToken();
  }, []);

  // Show a loading screen while checking for token
  if (initialRoute === null) {
    return null;
  }

  return (
    <SocketProvider>
      <RootNavigator initialRoute={initialRoute} />
    </SocketProvider>
  );
}