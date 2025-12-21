import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { collection, doc, onSnapshot, orderBy, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import moment from 'moment';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/firebaseConfig';

export default function NotificationScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Real-time Fetch Notifications ---
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(notifs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // --- Mark All as Read ---
  const handleMarkAllRead = async () => {
    const unreadDocs = notifications.filter(n => !n.read);
    if (unreadDocs.length === 0) return;

    const batch = writeBatch(db);
    unreadDocs.forEach(notif => {
      const ref = doc(db, 'notifications', notif.id);
      batch.update(ref, { read: true });
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error("Error marking all read:", error);
    }
  };

  // --- Handle Click ---
  const handleNotificationClick = async (notification) => {
    // 1. Mark as read if unread
    if (!notification.read) {
      try {
        await updateDoc(doc(db, 'notifications', notification.id), { read: true });
      } catch (error) {
        console.error("Error updating read status:", error);
      }
    }

    // 2. Navigate based on data
    if (notification.data?.url) {
        router.push(notification.data.url);
    } else if (notification.link) {
        router.push(notification.link);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'booking': return 'calendar';
      case 'alert': return 'alert-circle';
      case 'match_request': return 'trophy';
      case 'broadcast': return 'megaphone';
      default: return 'notifications';
    }
  };

  const getColor = (type) => {
    switch (type) {
      case 'booking': return 'green-600';
      case 'alert': return 'red-600';
      case 'match_request': return 'blue-600';
      default: return 'gray-600';
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <Stack.Screen options={{ title: 'Notifications', headerRight: () => (
          <Pressable onPress={handleMarkAllRead}>
             <Text style={tw`text-blue-600 font-bold`}>Mark all read</Text>
          </Pressable>
      )}} />

      {loading ? (
        <View style={tw`flex-1 justify-center items-center`}>
            <ActivityIndicator size="large" color={tw.color('green-600')} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          contentContainerStyle={tw`p-4`}
          ListEmptyComponent={
            <View style={tw`items-center justify-center mt-20`}>
              <Ionicons name="notifications-off-outline" size={48} color="gray" />
              <Text style={tw`text-gray-500 mt-2`}>No notifications yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable 
              onPress={() => handleNotificationClick(item)}
              style={tw`bg-white p-4 mb-3 rounded-lg shadow-sm border-l-4 ${item.read ? 'border-gray-300 opacity-70' : 'border-green-500'}`}
            >
              <View style={tw`flex-row items-start`}>
                <View style={tw`bg-gray-100 p-2 rounded-full mr-3`}>
                  <Ionicons name={getIcon(item.type)} size={24} color={tw.color(getColor(item.type))} />
                </View>
                <View style={tw`flex-1`}>
                   <View style={tw`flex-row justify-between`}>
                      <Text style={tw`font-bold text-gray-800 flex-1`}>{item.title}</Text>
                      <Text style={tw`text-xs text-gray-400 ml-2`}>
                        {item.createdAt ? moment(item.createdAt.toDate()).fromNow() : ''}
                      </Text>
                   </View>
                   <Text style={tw`text-gray-600 mt-1 text-sm`}>{item.body}</Text>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}