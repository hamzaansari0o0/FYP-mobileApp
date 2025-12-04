import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { db } from '../../../firebase/firebaseConfig';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment'; // Time dikhane ke liye

// === NAYA "Recent Chat" Card ===
const ChatRow = ({ chat, currentUserId }) => {
  const router = useRouter();
  
  // 1. Dosre user ka naam aur ID dhoondein
  const otherUser = chat.usersData.find(u => u.id !== currentUserId);

  if (!otherUser) {
    // Agar kisi wajah se dosra user nahi milta (data issue)
    return null; 
  }

  // 2. Chat room kholne ka function
  const openChat = () => {
    router.push({
      pathname: `/(player)/chat/${chat.id}`, // Chat ID pehle se pata hai
      params: { 
        receiverName: otherUser.name,
        receiverId: otherUser.id 
      }
    });
  };

  return (
    <Pressable 
      onPress={openChat}
      style={tw`flex-row items-center p-4 border-b border-gray-200 bg-white`}
    >
      {/* Avatar Placeholder */}
      <View style={tw`w-12 h-12 bg-gray-200 rounded-full items-center justify-center mr-3`}>
        <Text style={tw`text-lg font-bold text-gray-600`}>
          {otherUser.name ? otherUser.name[0].toUpperCase() : '?'}
        </Text>
      </View>
      
      {/* Chat Details */}
      <View style={tw`flex-1`}>
        <Text style={tw`font-semibold text-lg text-gray-800`}>{otherUser.name}</Text>
        <Text style={tw`text-gray-500 text-sm`} numberOfLines={1}>
          {chat.lastMessage?.text || 'No messages yet'}
        </Text>
      </View>
      
      {/* Time */}
      {chat.lastMessage?.createdAt && (
        <Text style={tw`text-xs text-gray-400 pl-2`}>
          {moment(chat.lastMessage.createdAt.toDate()).format('LT')}
        </Text>
      )}
    </Pressable>
  );
};

// === NAYI "Recent Chats" Screen ===
export default function RecentChatsScreen() {
  const { user, loading: authLoading } = useAuth(); 
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || authLoading) {
      setLoading(false);
      return; 
    }
    
    setLoading(true);

    // Hum 'chats' collection ko sunein ge
    const chatsQuery = query(
      collection(db, 'chats'),
      // Sirf woh chats jismein humara user shamil hai
      where('users', 'array-contains', user.uid),
      // Latest message ke hisab se sort karein
      orderBy('lastMessage.createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const chatsList = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      setChats(chatsList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching recent chats: ", error);
      Alert.alert("Error", "Could not load chats.");
      setLoading(false);
    });

    // Cleanup listener
    return () => unsubscribe();
  }, [user, authLoading]); // User badalne par listener update karein

  // Auth ya local loading
  if (authLoading || loading) {
    return (
      <SafeAreaView style={tw`flex-1 justify-center items-center bg-gray-100`}>
        <ActivityIndicator size="large" color={tw.color('blue-600')} />
      </SafeAreaView>
    );
  }

  // User login nahi hai
  if (!user) {
    return (
      <SafeAreaView style={tw`flex-1 justify-center items-center p-5 bg-gray-100`}>
        <Ionicons name="log-out-outline" size={40} color={tw.color('gray-400')} />
        <Text style={tw`text-lg text-gray-500 mt-2 text-center`}>
          Please log in to see your chats.
        </Text>
      </SafeAreaView>
    );
  }

  // User login hai
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <FlatList
        data={chats}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ChatRow chat={item} currentUserId={user.uid} />
        )}
        ListEmptyComponent={
          <View style={tw`items-center justify-center mt-20 p-5`}>
            <Ionicons name="chatbubbles-outline" size={40} color={tw.color("gray-400")} />
            <Text style={tw`text-lg text-gray-500 mt-2 text-center`}>
              No recent chats
            </Text>
            <Text style={tw`text-sm text-gray-400 mt-1 text-center`}>
              Press the '+' icon to start a new chat.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}