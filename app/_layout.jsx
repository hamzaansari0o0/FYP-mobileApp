import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext'; // Apni AuthProvider ko import karein
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import tw from 'twrnc';

function RootLayoutNav() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments(); 

  useEffect(() => {
    if (loading) return; 

    const inAuthGroup = segments[0] === '(auth)';

    // Naya, Saada Logic:
    if (user) {
      // User login hai (aur verified bhi, context ke mutabiq)
      // Check karein ke role ke mutabiq sahi group mein hai ya nahi
      const inPlayerGroup = segments[0] === '(player)';
      const inOwnerGroup = segments[0] === '(owner)';
      const inAdminGroup = segments[0] === '(admin)';

      if (role === 'player' && !inPlayerGroup) {
        router.replace('/(player)/home');
      } else if (role === 'owner' && !inOwnerGroup) {
        router.replace('/(owner)/dashboard');
      }else if (role === 'admin' && !inAdminGroup) { // <-- Ye block add karein
        router.replace('/(admin)/dashboard');
      }
      // (Admin logic yahan add ho sakta hai)
      
    } else if (!user) {
      // User login nahi hai
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    }

    // "user && !user.emailVerified" wala case yahan se hata diya
    // kyunke AuthContext ab usay handle kar raha hai.

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
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(player)" />
      <Stack.Screen name="(owner)" />
      <Stack.Screen name="(admin)" />
      {/* Agar index.jsx rakha hai to wo bhi yahan ayega */}
      <Stack.Screen name="index" /> 
    </Stack>
  );
}

// Main Layout component
export default function Layout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}