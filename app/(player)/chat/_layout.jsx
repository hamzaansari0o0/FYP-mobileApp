import { Stack, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

export default function ChatsLayout() {
  const router = useRouter();

  return (
    <Stack>
      {/* 1. Recent Chats List (Yeh hum Kadam 2 mein banayein ge) */}
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Chats',
          headerTitleAlign: 'left',
          // Header mein '+' button add karein
          headerRight: () => (
            <Pressable onPress={() => router.push('/(player)/chat/new')}>
              <Ionicons 
                name="add-circle-outline" 
                size={30} 
                color={tw.color('blue-600')} 
                style={tw`mr-4`}
              />
            </Pressable>
          ),
        }} 
      />
      
      {/* 2. Chat Room Screen (waisi hi) */}
      <Stack.Screen 
        name="[chatId]" 
        options={{ 
          title: 'Chat',
        }} 
      />

      {/* 3. NAYI "New Chat" Screen (jiska naam humne badla hai) */}
      <Stack.Screen
        name="new" // Yeh app/(player)/chat/new.jsx ko point kar rahi hai
        options={{
          title: 'New Chat',
          headerTitleAlign: 'left',
          presentation: 'modal', // Yeh screen oopar se slide ho kar aayegi
        }}
      />
    </Stack>
  );
}