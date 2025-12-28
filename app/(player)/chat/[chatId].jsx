import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';
import { getDownloadURL, getStorage, ref } from 'firebase/storage';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert,
  Image,
  Keyboard, Modal,
  Platform, Pressable,
  StatusBar,
  Text, View
} from 'react-native';
import { Bubble, Composer, GiftedChat, InputToolbar, Send } from 'react-native-gifted-chat';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import MatchChallengeModal from '../../../components/specific/chat/MatchChallengeModal';
import MatchRequestBubble from '../../../components/specific/chat/MatchRequestBubble';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../firebase/firebaseConfig';
import { notifyUser, sendPushNotification } from '../../../utils/notifications';

// --- HELPER FUNCTION ---
const getAvatarUrl = (data) => {
    if (!data) return null;
    return data.profileUrl || data.profileImage || data.profilePicture || data.photoURL || null;
};

// === COMPONENT: User Profile Modal ===
const UserProfileModal = ({ visible, onClose, userData }) => {
    if (!userData) return null;
    
    const avatarUrl = getAvatarUrl(userData);
    
    // FIX: Added 'userData.mobileNumber' to the check list
    const mobileNumber = userData.mobileNumber || userData.phoneNumber || userData.phone || userData.mobile || 'Not available';
  
    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
      >
        <Pressable onPress={onClose} style={tw`flex-1 bg-black/60 justify-center items-center p-5`}>
          <Pressable style={tw`bg-white w-full max-w-sm rounded-3xl p-6 items-center shadow-xl`}>
             
             {/* Close Button */}
             <Pressable onPress={onClose} style={tw`absolute top-4 right-4 z-10`}>
                <Ionicons name="close-circle" size={30} color="#9ca3af" />
             </Pressable>
  
             {/* --- AVATAR --- */}
             {avatarUrl ? (
                <Image 
                    source={{ uri: avatarUrl }} 
                    style={tw`w-32 h-32 rounded-full mb-4 border-4 border-green-500 bg-gray-200`}
                    resizeMode="cover"
                />
             ) : (
                <View style={tw`w-32 h-32 bg-green-100 rounded-full items-center justify-center mb-4 border-4 border-green-200`}>
                    <Text style={tw`text-5xl font-bold text-green-800`}>
                    {userData.name ? userData.name[0].toUpperCase() : '?'}
                    </Text>
                </View>
             )}
  
             {/* Name & Badge */}
             <Text style={tw`text-2xl font-bold text-gray-800 text-center mb-1`}>
                {userData.name}
             </Text>
             <View style={tw`bg-green-100 px-3 py-1 rounded-full mb-6`}>
                <Text style={tw`text-green-800 text-xs font-bold uppercase tracking-wide`}>
                    Player
                </Text>
             </View>
  
             {/* Details Section */}
             <View style={tw`w-full bg-gray-50 rounded-xl p-4`}>
                
                {/* 1. Location */}
                <View style={tw`flex-row items-center mb-4 border-b border-gray-100 pb-2`}>
                    <View style={tw`w-8 h-8 bg-white rounded-full items-center justify-center mr-3 shadow-sm`}>
                        <Ionicons name="location" size={18} color="#15803d" />
                    </View>
                    <View style={tw`flex-1`}>
                        <Text style={tw`text-xs text-gray-400 font-bold uppercase`}>Location</Text>
                        <Text style={tw`text-gray-700 font-medium`}>
                             {userData.area ? `${userData.area}, ` : ''}{userData.city || 'Unknown City'}
                        </Text>
                    </View>
                </View>
                
                {/* 2. Mobile Number */}
                <View style={tw`flex-row items-center mb-4 border-b border-gray-100 pb-2`}>
                    <View style={tw`w-8 h-8 bg-white rounded-full items-center justify-center mr-3 shadow-sm`}>
                        <Ionicons name="call" size={18} color="#15803d" />
                    </View>
                    <View style={tw`flex-1`}>
                        <Text style={tw`text-xs text-gray-400 font-bold uppercase`}>Mobile</Text>
                        <Text style={tw`text-gray-700 font-medium`}>
                             {mobileNumber}
                        </Text>
                    </View>
                </View>

                {/* 3. Email */}
                <View style={tw`flex-row items-center`}>
                    <View style={tw`w-8 h-8 bg-white rounded-full items-center justify-center mr-3 shadow-sm`}>
                        <Ionicons name="mail" size={16} color="#15803d" />
                    </View>
                    <View style={tw`flex-1`}>
                        <Text style={tw`text-xs text-gray-400 font-bold uppercase`}>Email</Text>
                        <Text style={tw`text-gray-700 font-medium`} numberOfLines={1}>
                             {userData.email || 'No email available'}
                        </Text>
                    </View>
                </View>

             </View>
  
          </Pressable>
        </Pressable>
      </Modal>
    );
};

// === MAIN SCREEN ===
export default function ChatRoom() {
  const router = useRouter();
  const { chatId, receiverName: paramName, receiverId: paramId } = useLocalSearchParams();
  const { user, userData, loading: authLoading } = useAuth(); 
  
  const [receiverId, setReceiverId] = useState(paramId);
  const [receiverName, setReceiverName] = useState(paramName);
  
  const [receiverData, setReceiverData] = useState(null); 
  const [receiverToken, setReceiverToken] = useState(null);
  
  const headerAvatarUrl = getAvatarUrl(receiverData);

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true); 
  const [matchModalVisible, setMatchModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  // 1. Fetch Chat Data & Receiver Profile
  useEffect(() => {
    if (!user) return;

    const fetchChatData = async () => {
      let targetId = receiverId;
      let targetName = receiverName;

      if (!targetId || !targetName) {
        try {
          const chatDoc = await getDoc(doc(db, 'chats', chatId));
          if (chatDoc.exists()) {
            const data = chatDoc.data();
            const otherUser = data.usersData?.find(u => u.id !== user.uid);
            if (otherUser) {
              targetId = otherUser.id;
              targetName = otherUser.name;
              setReceiverId(targetId);
              setReceiverName(targetName);
            }
          }
        } catch (error) { console.error(error); }
      }

      if (targetId) {
        const userDoc = await getDoc(doc(db, 'users', targetId));
        if (userDoc.exists()) {
          let uData = userDoc.data();
          
          if (!getAvatarUrl(uData)) {
             try {
                const storage = getStorage();
                const storageRef = ref(storage, `profile_pictures/${targetId}`);
                const url = await getDownloadURL(storageRef);
                uData.profileUrl = url; 
             } catch (err) {}
          }

          setReceiverToken(uData.pushToken);
          setReceiverData({ id: targetId, ...uData }); 
        }
      }
    };

    fetchChatData();
  }, [chatId, receiverId, receiverName, user]);

  // Listen to Messages
  useEffect(() => {
    if (!user || authLoading) return;
    setLoading(true);

    const q = query(
        collection(db, 'chats', chatId, 'messages'), 
        orderBy('createdAt', 'desc')
    ); 

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allMessages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          _id: doc.id,
          ...data,
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
        };
      });
      setMessages(allMessages);
      setLoading(false); 
    });

    return () => unsubscribe();
  }, [chatId, user, authLoading]); 

  // --- ACTIONS ---
  const onChallengeSubmit = (details) => {
    setMatchModalVisible(false);
    sendSpecialMessage('match_request', null, details);
  };

  const sendSpecialMessage = async (type, text = null, details = null) => {
    if (!user || !userData) return;
    const matchId = `match_${Date.now()}_${user.uid}`;
    
    let notificationBody = text;
    let notificationTitle = userData.name || "New Message";
    let notificationType = 'info';

    if (type === 'match_request') {
        notificationTitle = "Match Challenge! 🏆";
        notificationBody = `Challenged you to a match at ${details?.arenaName}!`;
        notificationType = 'alert';
    }

    const messageData = {
      _id: matchId,
      createdAt: serverTimestamp(),
      user: { _id: user.uid, name: userData.name || user.email },
      text: type === 'match_request' ? "Match Challenge" : text,
      messageType: type, 
      status: type === 'match_request' ? 'pending' : null, 
      matchDetails: details ? {
        arenaName: details.arenaName,
        arenaAddress: details.arenaAddress || '', 
        courtName: details.courtName,
        matchDate: details.matchDate.toISOString()
      } : null,
      acceptedBy: null,
      acceptedByName: null
    };

    const chatData = {
      lastMessage: {
        text: type === 'match_request' ? '🏆 Match Challenge Sent' : messageData.text,
        createdAt: serverTimestamp(),
      },
    };

    if (receiverId) {
        chatData.users = [user.uid, receiverId];
        chatData.usersData = [
            { id: user.uid, name: userData.name || 'User' },
            { id: receiverId, name: receiverName || 'User' }
        ];
    }

    try {
      await setDoc(doc(db, 'chats', chatId), chatData, { merge: true });
      await setDoc(doc(db, 'chats', chatId, 'messages', matchId), messageData);

      if (receiverId) {
        if (type === 'match_request') {
           await notifyUser(receiverId, notificationTitle, notificationBody, notificationType, { url: `/chat/${chatId}`, chatId: chatId });
        } else if (receiverToken) {
           await sendPushNotification(receiverToken, userData.name, text, { url: `/chat/${chatId}`, chatId: chatId });
        }
      }
    } catch (error) { console.error(error); }
  };

  const handleAcceptMatch = useCallback(async (messageId) => {
     try {
      const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
      await runTransaction(db, async (transaction) => {
        const messageDoc = await transaction.get(messageRef);
        if (!messageDoc.exists()) throw "Message not found.";
        if (messageDoc.data().status !== 'pending') throw "Match no longer available.";
        transaction.update(messageRef, { status: 'accepted', acceptedBy: user.uid, acceptedByName: userData.name });
      });
      const msgSnap = await getDocs(query(collection(db, 'chats', chatId, 'messages'), where('_id', '==', messageId)));
      if (!msgSnap.empty) {
          const msgData = msgSnap.docs[0].data();
          await setDoc(doc(db, 'matches', messageId), {
              matchId: messageId, chatId: chatId, challengerId: msgData.user._id, challengerName: msgData.user.name,
              acceptorId: user.uid, acceptorName: userData.name, participants: [msgData.user._id, user.uid], 
              arenaName: msgData.matchDetails.arenaName, arenaAddress: msgData.matchDetails.arenaAddress || '',
              courtName: msgData.matchDetails.courtName, matchDate: msgData.matchDetails.matchDate, 
              status: 'scheduled', createdAt: serverTimestamp()
          });
          await notifyUser(msgData.user._id, "Match Accepted! 🤝", `${userData.name} accepted your challenge!`, "booking", { url: `/schedule` });
      }
      Alert.alert("Match Locked! 🔒", "Added to your schedule.");
    } catch (error) { Alert.alert("Failed", String(error)); }
  }, [chatId, user, userData]);

  const onSend = useCallback((messages = []) => {
    sendSpecialMessage('text', messages[0].text);
  }, [chatId, user, userData, receiverId, receiverName, receiverToken]);

  // --- RENDER FUNCTIONS ---
  const renderBubble = (props) => {
    const { currentMessage } = props;
    if (currentMessage.messageType === 'match_request') {
      return <MatchRequestBubble currentMessage={currentMessage} user={user} onAccept={handleAcceptMatch} />;
    }
    return (
      <Bubble
        {...props}
        wrapperStyle={{ right: { backgroundColor: '#15803d' }, left: { backgroundColor: '#f3f4f6' } }}
        textStyle={{ left: { color: '#1f2937' } }}
      />
    );
  };

  const renderSend = (props) => (
    <Send {...props}>
      <View style={tw`mr-4 mb-3`}><Ionicons name="send" size={24} color="#15803d" /></View>
    </Send>
  );

  const renderInputToolbar = (props) => (
    <InputToolbar {...props} containerStyle={tw`bg-white border-t border-gray-100 p-1`} primaryStyle={tw`items-center`} />
  );

  const renderComposer = (props) => (
    <Composer {...props} textInputStyle={tw`bg-gray-100 rounded-2xl px-4 py-2 pt-2 text-base text-gray-800 mr-2`} placeholderTextColor="#9ca3af" />
  );

  if (authLoading || loading || !user) {
    return (
      <View style={tw`flex-1 bg-green-800 justify-center items-center`}>
          <Stack.Screen options={{ headerShown: false }} />
          <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-green-800`}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#166534" />

      {/* --- CUSTOM HEADER --- */}
      <View style={tw`px-4 py-3 bg-green-800 flex-row items-center justify-between`}>
         <View style={tw`flex-row items-center flex-1`}>
            <Pressable onPress={() => router.back()} style={tw`p-2 bg-white/20 rounded-full mr-3`}>
               <Ionicons name="arrow-back" size={20} color="white" />
            </Pressable>
            
            <Pressable 
                onPress={() => {
                    Keyboard.dismiss(); 
                    if (receiverData) setProfileModalVisible(true);
                }} 
                style={tw`flex-row items-center flex-1`}
            >
                {headerAvatarUrl ? (
                    <Image 
                        source={{ uri: headerAvatarUrl }} 
                        style={tw`w-10 h-10 rounded-full mr-3 border border-green-300 bg-green-200`}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={tw`w-10 h-10 bg-green-200 rounded-full items-center justify-center mr-3 border border-green-300`}>
                        <Text style={tw`text-lg font-bold text-green-900`}>
                            {receiverName ? receiverName[0].toUpperCase() : '?'}
                        </Text>
                    </View>
                )}
                
                <View style={tw`flex-1 mr-2`}>
                    <Text style={tw`text-lg font-bold text-white`} numberOfLines={1}>
                        {receiverName || 'Chat'}
                    </Text>
                    {receiverData?.area && (
                        <Text style={tw`text-xs text-green-200`} numberOfLines={1}>
                            {receiverData.area}
                        </Text>
                    )}
                </View>
            </Pressable>
         </View>

         <Pressable onPress={() => { Keyboard.dismiss(); setMatchModalVisible(true); }} style={tw`bg-white/20 p-2 rounded-full`}>
            <Ionicons name="trophy-outline" size={24} color="#fbbf24" />
         </Pressable>
      </View>

      <View style={tw`flex-1 bg-white rounded-t-3xl overflow-hidden`}>
        <GiftedChat
          messages={messages}
          onSend={messages => onSend(messages)}
          user={{ _id: user.uid, name: userData?.name || user.email }}
          renderBubble={renderBubble}
          renderSend={renderSend}
          renderInputToolbar={renderInputToolbar}
          renderComposer={renderComposer}
          placeholder="Type a message..."
          alwaysShowSend
          scrollToBottom
          listViewProps={{
            keyboardDismissMode: 'on-drag', 
            keyboardShouldPersistTaps: 'never', 
          }}
          bottomOffset={Platform.OS === 'ios' ? 30 : 0}
        />
        
        <MatchChallengeModal 
          visible={matchModalVisible} 
          onClose={() => setMatchModalVisible(false)}
          onSubmit={onChallengeSubmit}
        />

        <UserProfileModal 
            visible={profileModalVisible}
            onClose={() => setProfileModalVisible(false)}
            userData={receiverData}
        />
      </View>
    </SafeAreaView>
  );
}