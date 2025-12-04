import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import {
  collection,
  doc,
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
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../firebase/firebaseConfig';

import MatchChallengeModal from '../../../components/specific/chat/MatchChallengeModal';
import MatchRequestBubble from '../../../components/specific/chat/MatchRequestBubble';

export default function ChatRoom() {
  const navigation = useNavigation();
  const { chatId, receiverName, receiverId } = useLocalSearchParams();
  const { user, userData, loading: authLoading } = useAuth(); 
  
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true); 
  const [modalVisible, setModalVisible] = useState(false);

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

  const onChallengeSubmit = (details) => {
    setModalVisible(false);
    sendSpecialMessage('match_request', null, details);
  };

  const sendSpecialMessage = async (type, text = null, details = null) => {
    if (!user || !userData) return;

    const matchId = `match_${Date.now()}_${user.uid}`;
    
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
      
      // Details Save with Address
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
      users: [user.uid, receiverId],
      usersData: [
        { id: user.uid, name: userData.name || 'User' },
        { id: receiverId, name: receiverName || 'User' }
      ]
    };

    try {
      const chatRef = doc(db, 'chats', chatId);
      const messageRef = doc(db, 'chats', chatId, 'messages', matchId);
      await setDoc(chatRef, chatData, { merge: true });
      await setDoc(messageRef, messageData);
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Error", "Could not send.");
    }
  };

  // --- MAIN LOGIC: Accept Match & Save to Schedule ---
  const handleAcceptMatch = useCallback(async (messageId) => {
    try {
      const messageRef = doc(db, 'chats', chatId, 'messages', messageId);

      // 1. Transaction to Update Chat Status
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

      // 2. SAVE TO SCHEDULE ('matches' collection)
      const matchDocRef = doc(db, 'matches', messageId); 
      
      // Fetch message data specifically to copy details
      const msgSnap = await getDocs(query(collection(db, 'chats', chatId, 'messages'), where('_id', '==', messageId)));
      
      if (!msgSnap.empty) {
          const msgData = msgSnap.docs[0].data();
          
          await setDoc(matchDocRef, {
              matchId: messageId,
              chatId: chatId,
              
              // Players
              challengerId: msgData.user._id,
              challengerName: msgData.user.name,
              acceptorId: user.uid,
              acceptorName: userData.name,
              participants: [msgData.user._id, user.uid], 
              
              // Match Info
              arenaName: msgData.matchDetails.arenaName,
              arenaAddress: msgData.matchDetails.arenaAddress || '',
              courtName: msgData.matchDetails.courtName,
              matchDate: msgData.matchDetails.matchDate, 
              
              status: 'scheduled',
              createdAt: serverTimestamp()
          });
      }

      // 3. Cleanup other requests
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
  }, [chatId, user, userData]); 

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

  if (authLoading || loading) {
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
          _id: user.uid, 
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