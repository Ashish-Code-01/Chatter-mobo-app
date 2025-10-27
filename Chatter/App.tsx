import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
enableScreens();

import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';


import WelcomeScreen from './src/screens/auth/WelcomeScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import OTPScreen from './src/screens/auth/OtpScreen';
import EditDetailsScreen from './src/screens/auth/EditDetails';
import HomeScreen from './src/screens/dashbord/Home';
import AddContact from './src/screens/dashbord/AddContact';

const Stack = createNativeStackNavigator();
export default function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem('token');
      if (token == null) {
        setInitialRoute('Welcome');
        return;
      }
      setInitialRoute(token ? 'Home' : 'Welcome');
    };

    checkToken();
  }, []);

  // Show a loading screen while checking for token
  if (initialRoute === null) {
    return "Welcome";
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Otp" component={OTPScreen} options={{ headerShown: false }} />
        <Stack.Screen name="EditDetails" component={EditDetailsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AddContact" component={AddContact} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// How to build release APK

// cd android
// ./gradlew clean
// ./gradlew assembleRelease