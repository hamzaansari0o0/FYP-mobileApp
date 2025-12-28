import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref } from 'firebase/storage'; // Added Storage Imports
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList,
  Image // Added Image Import
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

// === COMPONENT: Player Card ===
const PlayerCard = ({ player, currentUserId, isNearest }) => {
  const router = useRouter();
  // Initialize with DB URL if available
  const [avatarUrl, setAvatarUrl] = useState(
    player.profileUrl || player.profileImage || player.photoURL || null
  );

  // Fetch from Storage if not in DB
  useEffect(() => {
    if (avatarUrl) return; // Agar DB se mil gaya to Storage check mat kro

    const fetchImageFromStorage = async () => {
        try {
            const storage = getStorage();
            const storageRef = ref(storage, `profile_pictures/${player.id}`);
            const url = await getDownloadURL(storageRef);
            setAvatarUrl(url);
        } catch (error) {
            // Image nahi mili, Initials show honge
        }
    };

    fetchImageFromStorage();
  }, [player.id]);

  const openChat = () => {
    if (!currentUserId) return;
    // Chat ID format: userId1_userId2 (sorted)
    const chatId = [currentUserId, player.id].sort().join('_');
    
    router.push({
      pathname: `/(player)/chat/${chatId}`,
      params: { 
        receiverName: player.name,
        receiverId: player.id 
      }
    });
  };

  const locationText = player.area 
    ? `${player.area}, ${player.city}` 
    : player.city || "Location Unknown"; 

  return (
    <Pressable 
      onPress={openChat} 
      android_ripple={{ color: '#dcfce7' }}
      style={tw`bg-white p-4 rounded-xl shadow-sm mb-3 flex-row items-center justify-between border ${isNearest ? 'border-green-500 bg-green-50' : 'border-gray-100'}`}
    >
      {/* Left Side: Avatar & Info */}
      <View style={tw`flex-row items-center flex-1`}>
        
        {/* Avatar Section */}
        <View style={tw`w-12 h-12 rounded-full mr-3 border border-green-200 overflow-hidden bg-green-100 items-center justify-center`}>
            {avatarUrl ? (
                <Image 
                    source={{ uri: avatarUrl }}
                    style={tw`w-full h-full`}
                    resizeMode="cover"
                />
            ) : (
                <Text style={tw`text-lg font-bold text-green-800`}>
                    {player.name ? player.name[0].toUpperCase() : '?'}
                </Text>
            )}
        </View>

        <View style={tw`flex-1`}>
            <View style={tw`flex-row items-center`}>
                <Text style={tw`text-base font-bold text-gray-800 mr-2`} numberOfLines={1}>
                    {player.name}
                </Text>
                {isNearest && (
                    <View style={tw`bg-green-200 px-2 py-0.5 rounded-full`}>
                        <Text style={tw`text-[10px] text-green-800 font-bold uppercase`}>Nearby</Text>
                    </View>
                )}
            </View>
            
            <View style={tw`flex-row items-center mt-1`}>
                <Ionicons 
                    name="location-sharp" 
                    size={12} 
                    color={isNearest ? "#15803d" : "#9ca3af"} 
                />
                <Text style={tw`text-xs text-gray-500 ml-1 font-medium`} numberOfLines={1}>
                    {locationText}
                </Text>
            </View>
        </View>
      </View>

      {/* Right Side: Chat Icon */}
      <View style={tw`p-2`}>
         <Ionicons name="chatbubble-ellipses-outline" size={24} color="#15803d" />
      </View>
    </Pressable>
  );
};

// === MAIN SCREEN ===
export default function NewChatScreen() {
  const { user, userData, loading: authLoading } = useAuth(); 
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // --- Logic Same Hai: Fetch & Sort Players ---
  const fetchAndSortPlayers = async (currentUserId) => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'player'));
      const querySnapshot = await getDocs(q);
      
      let playersList = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(p => p.id !== currentUserId); 

      // SORTING LOGIC (Nearest first)
      if (userData && userData.city) {
        const myCity = userData.city.trim().toLowerCase();
        const myArea = userData.area ? userData.area.trim().toLowerCase() : "";

        playersList.sort((a, b) => {
            const cityA = a.city ? a.city.trim().toLowerCase() : "";
            const areaA = a.area ? a.area.trim().toLowerCase() : "";
            const cityB = b.city ? b.city.trim().toLowerCase() : "";
            const areaB = b.area ? b.area.trim().toLowerCase() : "";

            const aIsNearest = (cityA === myCity && areaA === myArea);
            const bIsNearest = (cityB === myCity && areaB === myArea);

            if (aIsNearest && !bIsNearest) return -1;
            if (!aIsNearest && bIsNearest) return 1;

            const aIsSameCity = (cityA === myCity);
            const bIsSameCity = (cityB === myCity);

            if (aIsSameCity && !bIsSameCity) return -1;
            if (!aIsSameCity && bIsSameCity) return 1;

            return 0; 
        });
      }
      setPlayers(playersList);
    } catch (error) {
      console.error("Error fetching players: ", error);
    } finally {
      setLoading(false); 
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (user && !authLoading) {
        setLoading(true);
        fetchAndSortPlayers(user.uid);
      } else if (!user || authLoading) {
        setLoading(false);
        setPlayers([]);
      }
    }, [user, authLoading]) 
  );

  const isPlayerNearest = (player) => {
      if (!userData || !userData.city || !userData.area) return false;
      const myCity = userData.city.trim().toLowerCase();
      const myArea = userData.area.trim().toLowerCase();
      const pCity = player.city ? player.city.trim().toLowerCase() : "";
      const pArea = player.area ? player.area.trim().toLowerCase() : "";
      return (myCity === pCity && myArea === pArea);
  };

  // --- Loading State ---
  if (authLoading || loading) {
    return (
      <View style={tw`flex-1 bg-green-800 justify-center items-center`}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }
  
  // --- Auth Check ---
  if (!user) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50 justify-center items-center p-5`}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={tw`text-lg text-gray-500 mt-2 text-center`}>
          Please log in to start a chat.
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
      <View style={tw`px-5 py-4 bg-green-800 flex-row items-center`}>
        <Pressable 
            onPress={() => router.back()} 
            style={tw`p-2 bg-white/20 rounded-full mr-3`}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text style={tw`text-xl font-bold text-white flex-1`}>
          Start New Chat
        </Text>
      </View>

      {/* --- Body --- */}
      <View style={tw`flex-1 bg-gray-50 rounded-t-3xl overflow-hidden`}>
        
        {/* Info Banner */}
        <View style={tw`px-6 pt-6 pb-2`}>
            {userData?.area ? (
                <View style={tw`flex-row items-center mb-2`}>
                    <Ionicons name="compass-outline" size={18} color="#15803d" />
                    <Text style={tw`text-sm text-gray-600 ml-2`}>
                        Showing players near <Text style={tw`font-bold text-green-700`}>{userData.area}</Text> first.
                    </Text>
                </View>
            ) : (
                <Text style={tw`text-sm text-gray-500 mb-2`}>
                    Start chatting to challenge players.
                </Text>
            )}
        </View>

        {/* Players List */}
        <FlatList
            data={players}
            keyExtractor={item => item.id}
            contentContainerStyle={tw`p-5 pt-0 pb-10`}
            renderItem={({ item }) => (
            <PlayerCard 
                player={item} 
                currentUserId={user.uid} 
                isNearest={isPlayerNearest(item)}
            />
            )}
            ListEmptyComponent={
            <View style={tw`items-center justify-center mt-20`}>
                <Ionicons name="people-outline" size={50} color="#d1d5db" />
                <Text style={tw`text-lg text-gray-400 mt-2 font-bold`}>No Players Found</Text>
            </View>
            }
        />
      </View>
    </SafeAreaView>
  );
}