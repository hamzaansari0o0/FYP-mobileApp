import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation } from 'expo-router';
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
  where,
  writeBatch
} from 'firebase/firestore';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable } from 'react-native';
import { Bubble, GiftedChat } from 'react-native-gifted-chat';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import MatchChallengeModal from '../../../components/specific/chat/MatchChallengeModal';
import MatchRequestBubble from '../../../components/specific/chat/MatchRequestBubble';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../firebase/firebaseConfig';
import { notifyUser, sendPushNotification } from '../../../utils/notifications'; // Updated Import

export default function ChatRoom() {
  const navigation = useNavigation();
  const { chatId, receiverName: paramName, receiverId: paramId } = useLocalSearchParams();
  const { user, userData, loading: authLoading } = useAuth(); 
  
  const [receiverId, setReceiverId] = useState(paramId);
  const [receiverName, setReceiverName] = useState(paramName);
  const [receiverToken, setReceiverToken] = useState(null); // Store Token for fast chat push

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true); 
  const [modalVisible, setModalVisible] = useState(false);

  // 1. Fetch Chat Metadata & Receiver Token
  useEffect(() => {
    if (!user) return;

    const fetchChatData = async () => {
      let targetId = receiverId;
      let targetName = receiverName;

      // If params missing (e.g. opened via notification), fetch from Firestore
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
        } catch (error) {
          console.error("Error fetching chat metadata:", error);
        }
      }

      // Fetch Receiver's Push Token (One time fetch for efficiency)
      if (targetId) {
        const userDoc = await getDoc(doc(db, 'users', targetId));
        if (userDoc.exists()) {
          setReceiverToken(userDoc.data().pushToken);
        }
      }
    };

    fetchChatData();
  }, [chatId, receiverId, receiverName, user]);

  // Update Header Title dynamically
  useLayoutEffect(() => {
    navigation.setOptions({
      title: receiverName || 'Chat',
      headerRight: () => (
        <Pressable onPress={() => setModalVisible(true)} style={tw`mr-4`}>
          <Ionicons name="game-controller-outline" size={26} color={tw.color('blue-600')} />
        </Pressable>
      ),
    });
  }, [navigation, receiverName]);

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
    setModalVisible(false);
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
      user: {
        _id: user.uid,
        name: userData.name || user.email,
      },
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
      const chatRef = doc(db, 'chats', chatId);
      const messageRef = doc(db, 'chats', chatId, 'messages', matchId);
      
      await setDoc(chatRef, chatData, { merge: true });
      await setDoc(messageRef, messageData);

      // --- NOTIFICATION LOGIC ---
      if (receiverId) {
        if (type === 'match_request') {
           // Important Event: Save to History + Push (Use notifyUser)
           await notifyUser(
             receiverId, 
             notificationTitle, 
             notificationBody, 
             notificationType, 
             { url: `/chat/${chatId}`, chatId: chatId }
           );
        } else {
           // Normal Text: Just Push (No History) to avoid spam
           if (receiverToken) {
             await sendPushNotification(
               receiverToken, 
               userData.name, 
               text, 
               { url: `/chat/${chatId}`, chatId: chatId }
             );
           }
        }
      }

    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Could not send.");
    }
  };

  const handleAcceptMatch = useCallback(async (messageId) => {
    try {
      const messageRef = doc(db, 'chats', chatId, 'messages', messageId);

      await runTransaction(db, async (transaction) => {
        const messageDoc = await transaction.get(messageRef);
        if (!messageDoc.exists()) throw "Message not found.";
        const data = messageDoc.data();

        if (data.status !== 'pending') {
          throw "Match no longer available.";
        }

        transaction.update(messageRef, { 
          status: 'accepted',
          acceptedBy: user.uid,
          acceptedByName: userData.name
        });
      });

      // Create Match Document
      const matchDocRef = doc(db, 'matches', messageId); 
      const msgSnap = await getDocs(query(collection(db, 'chats', chatId, 'messages'), where('_id', '==', messageId)));
      
      if (!msgSnap.empty) {
          const msgData = msgSnap.docs[0].data();
          
          await setDoc(matchDocRef, {
              matchId: messageId,
              chatId: chatId,
              challengerId: msgData.user._id,
              challengerName: msgData.user.name,
              acceptorId: user.uid,
              acceptorName: userData.name,
              participants: [msgData.user._id, user.uid], 
              arenaName: msgData.matchDetails.arenaName,
              arenaAddress: msgData.matchDetails.arenaAddress || '',
              courtName: msgData.matchDetails.courtName,
              matchDate: msgData.matchDetails.matchDate, 
              status: 'scheduled',
              createdAt: serverTimestamp()
          });

          // --- NOTIFICATION LOGIC (Acceptance) ---
          // Notify the Challenger (Important Event -> History + Push)
          await notifyUser(
            msgData.user._id,
            "Match Accepted! 🤝",
            `${userData.name} accepted your challenge!`,
            "booking", // Using 'booking' type so it shows green/prominent
            { url: `/schedule` }
          );
      }

      cleanupOtherRequests(messageId);
      Alert.alert("Match Locked! 🔒", "Added to your schedule.");

    } catch (error) {
      Alert.alert("Failed", typeof error === 'string' ? error : "Transaction failed.");
    }
  }, [chatId, user, userData]);

  const cleanupOtherRequests = async (currentAcceptedId) => {
    try {
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const q = query(messagesRef, where('messageType', '==', 'match_request'), where('status', '==', 'pending'));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        const batch = writeBatch(db);
        snapshot.docs.forEach((docSnap) => {
            if (docSnap.id !== currentAcceptedId) {
                batch.update(docSnap.ref, { status: 'expired' });
            }
        });
        await batch.commit();
    } catch (error) { console.error("Cleanup error", error); }
  };

  const onSend = useCallback((messages = []) => {
    sendSpecialMessage('text', messages[0].text);
  }, [chatId, user, userData, receiverId, receiverName, receiverToken]); // Added receiverToken dependency

  const renderBubble = (props) => {
    const { currentMessage } = props;
    if (currentMessage.messageType === 'match_request') {
      return (
        <MatchRequestBubble 
          currentMessage={currentMessage} 
          user={user} 
          onAccept={handleAcceptMatch} 
        />
      );
    }
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          right: { backgroundColor: '#2563EB' }, 
          left: { backgroundColor: '#F3F4F6' }, 
        }}
        textStyle={{ left: { color: '#1F2937' } }}
      />
    );
  };

  // --- FIX: Add !user check here ---
  if (authLoading || loading || !user) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white justify-center items-center`}>
          <ActivityIndicator size="large" color={tw.color('blue-600')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <GiftedChat
        messages={messages}
        showAvatarForEveryMessage={false}
        showUserAvatar={false}
        onSend={messages => onSend(messages)}
        user={{
          _id: user.uid, // This was crashing because user was null
          name: userData?.name || user.email, 
        }}
        renderBubble={renderBubble}
        placeholder="Type a message..."
        alwaysShowSend
        scrollToBottom
        bottomOffset={Platform.OS === 'ios' ? 30 : 0}
      />
      
      <MatchChallengeModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)}
        onSubmit={onChallengeSubmit}
      />
    </SafeAreaView>
  );
}