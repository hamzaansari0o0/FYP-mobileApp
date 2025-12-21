import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, getDocs, orderBy, query, where, writeBatch } from 'firebase/firestore';
import moment from 'moment';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/firebaseConfig';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      // Fetch notifications for current user
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(data);

      // Mark all as read when screen opens
      markAllAsRead(snapshot.docs);
    } catch (error) {
      console.log("Error fetching notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAllAsRead = async (docs) => {
    const batch = writeBatch(db);
    let hasUnread = false;

    docs.forEach(docSnap => {
      if (docSnap.data().read === false) {
        batch.update(doc(db, 'notifications', docSnap.id), { read: true });
        hasUnread = true;
      }
    });

    if (hasUnread) {
      await batch.commit();
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const renderItem = ({ item }) => (
    <View style={tw.style(`p-4 border-b border-gray-100 bg-white`, !item.read && `bg-blue-50`)}>
      <View style={tw`flex-row justify-between items-start`}>
        <View style={tw`flex-row flex-1`}>
          <View style={tw`bg-green-100 p-2 rounded-full mr-3 h-10 w-10 items-center justify-center`}>
            <Ionicons name="notifications" size={20} color={tw.color('green-700')} />
          </View>
          <View style={tw`flex-1`}>
            <Text style={tw`text-gray-900 font-bold text-base`}>{item.title}</Text>
            <Text style={tw`text-gray-600 text-sm mt-1`}>{item.body}</Text>
            <Text style={tw`text-gray-400 text-xs mt-2`}>
              {item.createdAt ? moment(item.createdAt.toDate()).fromNow() : ''}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {/* Header */}
      <View style={tw`flex-row items-center p-4 border-b border-gray-100`}>
        <Pressable onPress={() => router.back()} style={tw`p-2 -ml-2`}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </Pressable>
        <Text style={tw`text-xl font-bold ml-2`}>Notifications</Text>
      </View>

      {loading ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color={tw.color('green-600')} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={tw`flex-1 items-center justify-center mt-20`}>
              <Ionicons name="notifications-off-outline" size={50} color={tw.color('gray-300')} />
              <Text style={tw`text-gray-500 mt-4`}>No notifications yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}