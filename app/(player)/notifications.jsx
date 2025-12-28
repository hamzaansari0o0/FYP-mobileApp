import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, getDocs, orderBy, query, where, writeBatch } from 'firebase/firestore';
import moment from 'moment';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StatusBar, Text, View } from 'react-native';
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

  // 1. Fetch Notifications
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(data);

      markAllAsRead(snapshot.docs);
    } catch (error) {
      console.log("Error fetching notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 2. Mark as Read
  const markAllAsRead = async (docs) => {
    const batch = writeBatch(db);
    let hasUnread = false;
    docs.forEach(docSnap => {
      if (docSnap.data().read === false) {
        batch.update(doc(db, 'notifications', docSnap.id), { read: true });
        hasUnread = true;
      }
    });
    if (hasUnread) await batch.commit();
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  // 🔥 3. FIXED NAVIGATION LOGIC (Handles 'broadcast')
  const handleNotificationPress = (item) => {
    const type = item.type || 'general';
    const targetId = item.redirectId || item.matchId || item.tournamentId || item.id;

    console.log("🚀 Navigating -> Type:", type, "| ID:", targetId);

    switch (type) {
        // Agar 'broadcast' hai (jo aapke logs me aa raha hai)
        case 'broadcast':
        case 'announcement':
            // Agar tournamentId hai to Tournament page, nahi to Home
            if (item.tournamentId) {
                router.push('/home/tournaments'); 
            } else {
                // Default fallback for broadcast
                router.push('/(player)/home'); 
            }
            break;

        case 'challenge': 
        case 'match_invite':
            router.push('/(player)/challenges'); 
            break;

        case 'booking_confirmed':
        case 'booking':
            router.push('/(player)/bookings'); 
            break;

        case 'tournament':
            router.push('/home/tournaments');
            break;

        default:
            // Agar type samajh na aaye, to Home par le jao
            console.log("Unknown type, going Home");
            router.push('/(player)/home');
            break;
    }
  };

  // 4. Icon Selector
  const getIconName = (type) => {
      if (type === 'booking') return 'calendar';
      if (type === 'challenge' || type === 'match_invite') return 'trophy';
      if (type === 'broadcast') return 'megaphone'; // Broadcast ke liye naya icon
      if (type === 'payment') return 'wallet';
      return 'notifications';
  };

  const renderItem = ({ item }) => {
    const isUnread = !item.read;

    return (
        <Pressable
            onPress={() => handleNotificationPress(item)}
            // 🔥 Press Animation Effect
            style={({ pressed }) => tw.style(
                `mx-4 mb-3 p-4 rounded-2xl border flex-row items-start shadow-sm transform duration-150`,
                isUnread ? `bg-green-50 border-green-200` : `bg-white border-gray-100`,
                pressed ? `scale-[0.98] opacity-90 bg-gray-50` : `scale-100`
            )}
        >
          {/* Icon Box */}
          <View style={tw.style(
            `h-12 w-12 rounded-full items-center justify-center mr-4`,
            isUnread ? `bg-green-200` : `bg-gray-100`
          )}>
            <Ionicons 
                name={getIconName(item.type)} 
                size={22} 
                color={isUnread ? "#15803d" : "#6b7280"} 
            />
          </View>

          {/* Content */}
          <View style={tw`flex-1`}>
            <View style={tw`flex-row justify-between items-center mb-1`}>
                <Text style={tw.style(`text-base font-bold flex-1`, isUnread ? `text-green-900` : `text-gray-800`)}>
                    {item.title}
                </Text>
                <Text style={tw`text-[10px] text-gray-400 font-medium ml-2`}>
                    {item.createdAt ? moment(item.createdAt.toDate()).fromNow(true) : ''} ago
                </Text>
            </View>
            
            <Text style={tw`text-gray-600 text-sm leading-5`}>
                {item.body}
            </Text>

            {/* Tap to view Label */}
            <View style={tw`flex-row items-center mt-2`}>
                <Text style={tw`text-green-600 text-[10px] font-bold uppercase tracking-wide mr-1`}>
                    Tap to Open
                </Text>
                <Ionicons name="arrow-forward" size={10} color="#16a34a" />
            </View>

            {/* Unread Dot */}
            {isUnread && (
                <View style={tw`absolute -top-2 -right-2 bg-red-500 w-3 h-3 rounded-full border-2 border-green-50`} />
            )}
          </View>
        </Pressable>
    );
  };

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <StatusBar barStyle="light-content" backgroundColor="#14532d" />
      
      {/* 🔥 Themed Header */}
      <SafeAreaView edges={['top']} style={tw`bg-green-900 shadow-md z-10`}>
        <View style={tw`flex-row items-center px-4 py-3 pb-4`}>
          <Pressable 
            onPress={() => router.back()} 
            style={tw`p-2 bg-green-800 rounded-full mr-3 border border-green-700 active:bg-green-700`}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <View>
            <Text style={tw`text-xl font-black text-white tracking-wide`}>Notifications</Text>
            <Text style={tw`text-green-200 text-xs`}>Latest updates for you</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* List Content */}
      {loading ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#166534" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={tw`pt-4 pb-10`}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#166534']} tintColor="#166534" />
          }
          ListEmptyComponent={
            <View style={tw`flex-1 items-center justify-center mt-20 px-10`}>
              <View style={tw`bg-green-100 p-6 rounded-full mb-4`}>
                  <Ionicons name="notifications-off" size={40} color="#166534" />
              </View>
              <Text style={tw`text-gray-900 font-bold text-lg`}>All Caught Up!</Text>
              <Text style={tw`text-gray-500 text-center mt-2`}>
                You have no new notifications.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}