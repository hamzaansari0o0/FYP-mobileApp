import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import tw from 'twrnc';
import { AuthProvider, useAuth } from '../context/AuthContext';

function RootLayoutNav() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments(); 

  // --- 🔔 NOTIFICATION LISTENER (Same as before) ---
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.url) {
        setTimeout(() => router.push(data.url), 500);
      }
    });
    return () => subscription.remove();
  }, []);

  // --- 🚦 SECURITY ROUTING LOGIC (UPDATED) ---
  useEffect(() => {
    if (loading) return; 

    // 🔥 1. Check karein ke kya banda 'howItWorks' page par hai?
    // Segments array check karta hai URL ke parts (e.g., ['(player)', 'home', 'howItWorks'])
    const isPublicPage = segments.includes('howItWorks');

    // 🔥 2. Agar ye Public Page hai, to Security Check mat lagao. Return kar jao.
    if (isPublicPage) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inPlayerGroup = segments[0] === '(player)';
    const inOwnerGroup = segments[0] === '(owner)';
    const inAdminGroup = segments[0] === '(admin)';

    if (user) {
      // ✅ USER LOGGED IN:
      if (inAuthGroup) {
        if (role === 'player') router.replace('/(player)/home');
        else if (role === 'owner') router.replace('/(owner)/dashboard');
        else if (role === 'admin') router.replace('/(admin)/dashboard');
      }
      
      // OPTIONAL: Agar Owner ghalti se Player folder me ghus jaye (sivaye howItWorks ke), to wapis bhejo
      if (role === 'owner' && inPlayerGroup) router.replace('/(owner)/dashboard');

    } else {
      // ❌ USER LOGGED OUT:
      // Agar wo Protected Routes par jaye, to wapis Index par phek do
      if (inPlayerGroup || inOwnerGroup || inAdminGroup) {
        router.replace('/');
      }
    }
  }, [user, role, loading, segments]); 

  if (loading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color={tw.color('blue-500')} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" /> 
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(player)" />
      <Stack.Screen name="(owner)" />
      <Stack.Screen name="(admin)" />
    </Stack>
  );
}

export default function Layout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}