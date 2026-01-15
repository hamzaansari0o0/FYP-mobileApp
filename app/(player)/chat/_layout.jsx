// app/(player)/chat/_layout.jsx
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import tw from 'twrnc';

export default function ChatsLayout() {
  const router = useRouter();

  return (
    <Stack screenOptions={{ headerStyle: tw`bg-white`, headerShadowVisible: false }}>
      {/* 1. Chat List */}
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Chats',
          headerTitleAlign: 'left',
          headerRight: () => (
            <Pressable onPress={() => router.push('/(player)/chat/new')}>
              <Ionicons name="add-circle-outline" size={30} color={tw.color('blue-600')} style={tw`mr-4`} />
            </Pressable>
          ),
        }} 
      />
      
      {/* 2. Individual Chat Room */}
      <Stack.Screen 
        name="[chatId]" 
        options={{ 
          title: 'Chat',
          // Back button automatically handled by Stack
        }} 
      />

      {/* 3. New Chat Modal */}
      <Stack.Screen
        name="new"
        options={{
          title: 'New Chat',
          headerTitleAlign: 'left',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}