import { Ionicons } from '@expo/vector-icons';
import { Link, Stack, useRouter } from 'expo-router';
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref } from 'firebase/storage';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
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
  const [avatarUrl, setAvatarUrl] = useState(null);
  
  // 1. Identify the other user
  const otherUser = chat.usersData?.find(u => u.id !== currentUserId);

  // 2. Check Unread Status (WhatsApp Logic)
  // Agar last message MAINE nahi bheja + wo Read nahi hai -> To ye Unread hai
  const lastMsg = chat.lastMessage;
  const isMe = lastMsg?.senderId === currentUserId;
  const isUnread = !isMe && (lastMsg?.read === false);

  // 3. Fetch User Image
  useEffect(() => {
    if (!otherUser) return;
    const fetchProfileImage = async () => {
        try {
            const userDoc = await getDoc(doc(db, 'users', otherUser.id));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const dbUrl = userData.profileUrl || userData.profileImage || userData.photoURL;
                if (dbUrl) { setAvatarUrl(dbUrl); return; }
            }
            const storage = getStorage();
            const storageRef = ref(storage, `profile_pictures/${otherUser.id}`);
            const storageUrl = await getDownloadURL(storageRef);
            setAvatarUrl(storageUrl);
        } catch (error) {}
    };
    fetchProfileImage();
  }, [otherUser?.id]);

  if (!otherUser) return null;

  const openChat = () => {
    router.push({
      pathname: `/(player)/chat/${chat.id}`,
      params: { 
        receiverName: otherUser.name,
        receiverId: otherUser.id 
      }
    });
  };

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
      // Agar unread hai to background thora highlight (optional) ya white
      style={tw`flex-row items-center p-4 bg-white border-b border-gray-100`}
    >
      {/* Avatar Section */}
      <View style={tw`w-14 h-14 rounded-full mr-4 border border-gray-200 overflow-hidden bg-gray-100 items-center justify-center relative`}>
        {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={tw`w-full h-full`} resizeMode="cover" />
        ) : (
            <Text style={tw`text-xl font-bold text-gray-500`}>
                {otherUser.name ? otherUser.name[0].toUpperCase() : '?'}
            </Text>
        )}
      </View>
      
      {/* Name & Last Message */}
      <View style={tw`flex-1 justify-center`}>
        <View style={tw`flex-row justify-between items-center mb-1`}>
            {/* NAME: Agar unread hai to thora Dark/Bold, werna normal */}
            <Text style={tw`text-base ${isUnread ? 'font-black text-black' : 'font-bold text-gray-800'}`} numberOfLines={1}>
                {otherUser.name}
            </Text>

            {/* TIME: Agar unread hai to Green, werna Gray */}
            <Text style={tw`text-xs font-medium ${isUnread ? 'text-green-600 font-bold' : 'text-gray-400'}`}>
                {getLastMessageTime()}
            </Text>
        </View>
        
        <View style={tw`flex-row justify-between items-center`}>
            {/* MESSAGE TEXT: Unread = Bold Black, Read = Gray */}
            <Text 
                style={tw`text-sm flex-1 mr-2 ${isUnread ? 'font-bold text-gray-900' : 'text-gray-500'}`} 
                numberOfLines={1}
            >
              {isMe && <Ionicons name="checkmark-done-outline" size={14} color="gray" />} 
              {' '}{chat.lastMessage?.text || 'Image'}
            </Text>

            {/* UNREAD BADGE (Green Dot) */}
            {isUnread && (
                <View style={tw`bg-green-600 h-5 w-5 rounded-full items-center justify-center shadow-sm`}>
                    {/* Agar count available ho to number likhein, abhi sirf dot/1 hai */}
                    <Text style={tw`text-white text-[10px] font-bold`}>1</Text>
                </View>
            )}
        </View>
      </View>
    </Pressable>
  );
};

// === MAIN SCREEN ===
export default function RecentChatsScreen() {
  const { user, loading: authLoading } = useAuth(); 
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!user || authLoading) {
      if (!authLoading) setLoading(false);
      return; 
    }
    
    setLoading(true);

    // Initial Query (Sorted by Date)
    const chatsQuery = query(
      collection(db, 'chats'),
      where('users', 'array-contains', user.uid),
      orderBy('lastMessage.createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      let chatsList = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));

      // 🔥 CUSTOM SORTING: Unread wale sabse uper, phir Time wale
      chatsList.sort((a, b) => {
        // Logic: Check Unread Status
        const aUnread = a.lastMessage?.senderId !== user.uid && a.lastMessage?.read === false;
        const bUnread = b.lastMessage?.senderId !== user.uid && b.lastMessage?.read === false;

        // 1. Agar 'a' unread hai aur 'b' read hai -> 'a' uper
        if (aUnread && !bUnread) return -1;
        // 2. Agar 'b' unread hai aur 'a' read hai -> 'b' uper
        if (!aUnread && bUnread) return 1;

        // 3. Agar status same hai (dono read ya dono unread), to Time check karo (Newest First)
        const timeA = a.lastMessage?.createdAt?.seconds || 0;
        const timeB = b.lastMessage?.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setChats(chatsList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching chats: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <View style={tw`flex-1 bg-green-800 justify-center items-center`}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50 justify-center items-center p-5`}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="lock-closed-outline" size={50} color="#9ca3af" />
        <Text style={tw`text-lg text-gray-500 mt-4 text-center`}>Please log in.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-green-800`}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#166534" />

      {/* Header */}
      <View style={tw`px-5 py-4 bg-green-800 flex-row items-center justify-between shadow-md`}>
        <View style={tw`flex-row items-center`}>
            <Pressable onPress={() => router.back()} style={tw`p-2 bg-white/10 rounded-full mr-3`}>
            <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            <Text style={tw`text-xl font-bold text-white tracking-wide`}>Messages</Text>
        </View>
      </View>

      {/* Body */}
      <View style={tw`flex-1 bg-white rounded-t-[30px] overflow-hidden`}>
        <FlatList
          data={chats}
          keyExtractor={item => item.id}
          contentContainerStyle={tw`pb-32 pt-2`} 
          renderItem={({ item }) => (
            <ChatRow chat={item} currentUserId={user.uid} />
          )}
          ListEmptyComponent={
            <View style={tw`items-center justify-center mt-20 p-8`}>
              <View style={tw`bg-green-50 p-6 rounded-full mb-4`}>
                  <Ionicons name="chatbubbles" size={40} color="#16a34a" />
              </View>
              <Text style={tw`text-lg font-bold text-gray-700`}>No messages yet</Text>
              <Text style={tw`text-sm text-gray-400 mt-2 text-center`}>
                Start chatting with venue owners or players!
              </Text>
            </View>
          }
        />

        {/* FAB - Adjusted to avoid Tab Bar */}
        <Link href="/(player)/chat/new" asChild>
            {/* Changed from bottom-8 to bottom-28 */}
            <Pressable style={tw`absolute bottom-28 right-6 bg-green-600 w-14 h-14 rounded-full items-center justify-center shadow-xl elevation-5`}>
                <Ionicons name="add" size={30} color="white" />
            </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}