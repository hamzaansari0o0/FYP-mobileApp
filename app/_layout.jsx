// import * as Notifications from 'expo-notifications';
// // ❌ NavigationBar ko hata diya taake crash na ho
// import { Stack, useRouter, useSegments } from 'expo-router';
// import { useEffect } from 'react';
// import { ActivityIndicator, View } from 'react-native';
// import tw from 'twrnc';
// import { AuthProvider, useAuth } from '../context/AuthContext';

// function RootLayoutNav() {
//   const { user, role, loading } = useAuth();
//   const router = useRouter();
//   const segments = useSegments(); 

//   // --- 🔔 NOTIFICATION LISTENER ---
//   useEffect(() => {
//     const subscription = Notifications.addNotificationResponseReceivedListener(response => {
//       const data = response.notification.request.content.data;
//       if (data?.url) {
//         setTimeout(() => router.push(data.url), 500);
//       }
//     });
//     return () => subscription.remove();
//   }, []);

//   // --- 🚦 SECURITY ROUTING LOGIC ---
//   useEffect(() => {
//     if (loading) return; 

//     // 1. Check Public Page
//     const isPublicPage = segments.includes('howItWorks');
//     if (isPublicPage) return;

//     const inAuthGroup = segments[0] === '(auth)';
//     const inPlayerGroup = segments[0] === '(player)';
//     const inOwnerGroup = segments[0] === '(owner)';
//     const inAdminGroup = segments[0] === '(admin)';

//     if (user) {
//       // ✅ USER LOGGED IN:
//       if (inAuthGroup) {
//         if (role === 'player') router.replace('/(player)/home');
//         else if (role === 'owner') router.replace('/(owner)/dashboard');
//         else if (role === 'admin') router.replace('/(admin)/dashboard');
//       }
      
//       // Role Protection
//       if (role === 'owner' && inPlayerGroup) router.replace('/(owner)/dashboard');

//     } else {
//       // ❌ USER LOGGED OUT:
//       if (inPlayerGroup || inOwnerGroup || inAdminGroup) {
//         router.replace('/');
//       }
//     }
//   }, [user, role, loading, segments]); 

//   if (loading) {
//     return (
//       <View style={tw`flex-1 items-center justify-center bg-white`}>
//         <ActivityIndicator size="large" color={tw.color('green-600')} />
//       </View>
//     );
//   }

//   return (
//     <Stack screenOptions={{ headerShown: false }}>
//       <Stack.Screen name="index" /> 
//       <Stack.Screen name="(auth)" />
//       <Stack.Screen name="(player)" />
//       <Stack.Screen name="(owner)" />
//       <Stack.Screen name="(admin)" />
//     </Stack>
//   );
// }

// export default function Layout() {
//   return (
//     <AuthProvider>
//       <RootLayoutNav />
//     </AuthProvider>
//   );
// }
////////////////////////////////////////////////////////////////////////////////////////

import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import tw from 'twrnc';
import { AuthProvider, useAuth } from '../context/AuthContext';

// 👇 1. Ye Import Add Karein
import { testGenkitConnection } from '../services/aiService';

function RootLayoutNav() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments(); 

  // 👇 2. Ye naya useEffect add karein (Sirf Testing ke liye)
  useEffect(() => {
    // Jaise hi App khulegi, ye server check karega
    testGenkitConnection();
  }, []);

  // --- 🔔 NOTIFICATION LISTENER (Baaki code waisa hi rahega) ---
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.url) {
        setTimeout(() => router.push(data.url), 500);
      }
    });
    return () => subscription.remove();
  }, []);

  // --- 🚦 SECURITY ROUTING LOGIC (Baaki code same rahega) ---
  useEffect(() => {
    if (loading) return; 

    const isPublicPage = segments.includes('howItWorks');
    if (isPublicPage) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inPlayerGroup = segments[0] === '(player)';
    const inOwnerGroup = segments[0] === '(owner)';
    const inAdminGroup = segments[0] === '(admin)';

    if (user) {
      if (inAuthGroup) {
        if (role === 'player') router.replace('/(player)/home');
        else if (role === 'owner') router.replace('/(owner)/dashboard');
        else if (role === 'admin') router.replace('/(admin)/dashboard');
      }
      
      if (role === 'owner' && inPlayerGroup) router.replace('/(owner)/dashboard');

    } else {
      if (inPlayerGroup || inOwnerGroup || inAdminGroup) {
        router.replace('/');
      }
    }
  }, [user, role, loading, segments]); 

  if (loading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color={tw.color('green-600')} />
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