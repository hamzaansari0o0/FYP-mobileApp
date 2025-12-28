import { Ionicons } from '@expo/vector-icons';
import { Link, Stack, useRouter } from 'expo-router';
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore'; // Added doc, getDoc
import { getDownloadURL, getStorage, ref } from 'firebase/storage'; // Added Storage imports
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image // Added Image import
  ,

  Pressable,
  StatusBar,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../firebase/firebaseConfig';

// === COMPONENT: Chat List Item ===
const ChatRow = ({ chat, currentUserId }) => {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState(null); // State for image
  
  // 1. Identify the other user
  const otherUser = chat.usersData?.find(u => u.id !== currentUserId);

  // 2. Fetch User Image Logic (Database -> Storage -> Fallback)
  useEffect(() => {
    if (!otherUser) return;

    const fetchProfileImage = async () => {
        try {
            // Step A: Check Database (Faster)
            const userDoc = await getDoc(doc(db, 'users', otherUser.id));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const dbUrl = userData.profileUrl || userData.profileImage || userData.photoURL;
                
                if (dbUrl) {
                    setAvatarUrl(dbUrl);
                    return; // Mil gaya, yahi ruk jao
                }
            }

            // Step B: Check Storage (Backup)
            const storage = getStorage();
            const storageRef = ref(storage, `profile_pictures/${otherUser.id}`);
            const storageUrl = await getDownloadURL(storageRef);
            setAvatarUrl(storageUrl);

        } catch (error) {
            // Image nahi mili, koi baat nahi, default initial dikhega
        }
    };

    fetchProfileImage();
  }, [otherUser?.id]);

  if (!otherUser) return null;

  // 3. Open Chat Room
  const openChat = () => {
    router.push({
      pathname: `/(player)/chat/${chat.id}`,
      params: { 
        receiverName: otherUser.name,
        receiverId: otherUser.id 
      }
    });
  };

  // 4. Format Date (e.g., "10:30 AM" or "Yesterday")
  const getLastMessageTime = () => {
    if (!chat.lastMessage?.createdAt) return '';
    const msgDate = chat.lastMessage.createdAt.toDate();
    if (moment(msgDate).isSame(new Date(), 'day')) {
      return moment(msgDate).format('h:mm A');
    }
    return moment(msgDate).format('MMM D');
  };

  return (
    <Pressable 
      onPress={openChat}
      android_ripple={{ color: '#dcfce7' }}
      style={tw`flex-row items-center p-4 bg-white border-b border-gray-100`}
    >
      {/* Avatar Section */}
      <View style={tw`w-14 h-14 rounded-full mr-4 border border-green-200 overflow-hidden bg-green-100 items-center justify-center`}>
        {avatarUrl ? (
            // Agar Image hai to Image dikhao
            <Image 
                source={{ uri: avatarUrl }} 
                style={tw`w-full h-full`}
                resizeMode="cover"
            />
        ) : (
            // Agar Image nahi hai to First Letter (Initial) dikhao
            <Text style={tw`text-xl font-bold text-green-800`}>
                {otherUser.name ? otherUser.name[0].toUpperCase() : '?'}
            </Text>
        )}
      </View>
      
      {/* Name & Last Message */}
      <View style={tw`flex-1 justify-center`}>
        <View style={tw`flex-row justify-between items-center mb-1`}>
            <Text style={tw`font-bold text-base text-gray-900`} numberOfLines={1}>
                {otherUser.name}
            </Text>
            <Text style={tw`text-xs text-gray-400 font-medium`}>
                {getLastMessageTime()}
            </Text>
        </View>
        
        <Text style={tw`text-gray-500 text-sm`} numberOfLines={1}>
          {chat.lastMessage?.text || 'No messages yet...'}
        </Text>
      </View>
      
      {/* Chevron Arrow */}
      <Ionicons name="chevron-forward" size={18} color="#d1d5db" style={tw`ml-2`} />
    </Pressable>
  );
};

// === MAIN SCREEN ===
export default function RecentChatsScreen() {
  const { user, loading: authLoading } = useAuth(); 
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // --- Realtime Chat Listener ---
  useEffect(() => {
    if (!user || authLoading) {
      if (!authLoading) setLoading(false);
      return; 
    }
    
    setLoading(true);

    const chatsQuery = query(
      collection(db, 'chats'),
      where('users', 'array-contains', user.uid),
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
      console.error("Error fetching chats: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  // --- Loading State ---
  if (authLoading || loading) {
    return (
      <View style={tw`flex-1 bg-green-800 justify-center items-center`}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  // --- No User State ---
  if (!user) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50 justify-center items-center p-5`}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="lock-closed-outline" size={50} color="#9ca3af" />
        <Text style={tw`text-lg text-gray-500 mt-4 text-center`}>
          Please log in to see your messages.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-green-800`}>
      {/* Hide Default Header */}
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#166534" />

      {/* --- Custom Header --- */}
      <View style={tw`px-5 py-4 bg-green-800 flex-row items-center justify-between`}>
        <View style={tw`flex-row items-center`}>
            {/* Back Arrow */}
            <Pressable 
                onPress={() => router.back()} 
                style={tw`p-2 bg-white/20 rounded-full mr-3`}
            >
            <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            <Text style={tw`text-xl font-bold text-white`}>Messages</Text>
        </View>
      </View>

      {/* --- Body --- */}
      <View style={tw`flex-1 bg-gray-50 rounded-t-3xl overflow-hidden`}>
        <FlatList
          data={chats}
          keyExtractor={item => item.id}
          contentContainerStyle={tw`pb-32`} 
          renderItem={({ item }) => (
            <ChatRow chat={item} currentUserId={user.uid} />
          )}
          ListEmptyComponent={
            <View style={tw`items-center justify-center mt-20 p-8`}>
              <View style={tw`bg-gray-100 p-6 rounded-full mb-4`}>
                  <Ionicons name="chatbubbles-outline" size={50} color="#9ca3af" />
              </View>
              <Text style={tw`text-lg font-bold text-gray-600`}>No messages yet</Text>
              <Text style={tw`text-sm text-gray-400 mt-2 text-center leading-5`}>
                Start a conversation with players or tournament organizers!
              </Text>
            </View>
          }
        />

        {/* --- FAB (Floating Action Button) --- */}
        <Link href="/(player)/chat/new" asChild>
            <Pressable 
                style={tw`absolute bottom-24 right-6 bg-green-700 w-14 h-14 rounded-full items-center justify-center shadow-lg border border-green-600 z-50`}
            >
                <Ionicons name="add" size={32} color="white" />
            </Pressable>
        </Link>

      </View>
    </SafeAreaView>
  );
}