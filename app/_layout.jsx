import * as Notifications from 'expo-notifications';
import { Stack, useGlobalSearchParams, usePathname, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import tw from 'twrnc';
import { AuthProvider, useAuth } from '../context/AuthContext';

// Default Handler (Backup ke liye)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function RootLayoutNav() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  
  // Track current screen info
  const pathname = usePathname(); 
  const params = useGlobalSearchParams(); 

  // --- 🔔 SMART NOTIFICATION HANDLER ---
  useEffect(() => {
    // Ye function har notification aane par chalega
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = notification.request.content.data;
        
        // 1. Check karein ke ye CHAT notification hai?
        const isChat = data?.type === 'chat';
        const senderId = data?.senderId;

        // 2. Check: Kya hum abhi chat screen par hain?
        const isOnChatScreen = pathname.includes('/chat') || pathname.includes('chat/'); 
        
        // Logic: Agar hum usi banday se baat kar rahe hain jisne msg bheja -> Hide Notification
        let shouldHide = false;
        
        if (isChat && isOnChatScreen) {
             // Logic: Agar notification bhejne wala wahi hai jo screen par khula hai
             if (params.receiverId === senderId || params.id?.includes(senderId)) {
                 shouldHide = true;
             }
        }

        // 3. Final Decision
        if (shouldHide) {
            return {
                shouldShowAlert: false, // 🤫 Chup raho
                shouldPlaySound: false,
                shouldSetBadge: false,
            };
        }

        // Warna shor machao (Booking, Admin Alert, etc.)
        return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
        };
      },
    });
  }, [pathname, params]); // Jab screen change ho, logic update karo


  // --- 🔗 DEEP LINK LISTENER ---
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.url) {
        // Agar chat ki notification hai, to url bhejen '/(player)/chat/123_456'
        router.push(data.url);
      }
    });
    return () => subscription.remove();
  }, []);


  // --- 🚦 SECURITY ROUTING ---
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