import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../firebase/firebaseConfig';

const PlayerCard = ({ player, currentUserId, isNearest }) => {
  const router = useRouter();

  const openChat = () => {
    if (!currentUserId) return;
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
      style={tw`bg-white p-4 rounded-xl shadow-sm mb-3 flex-row items-center justify-between border ${isNearest ? 'border-green-400 bg-green-50' : 'border-gray-100'}`}
    >
      <View style={tw`flex-1`}>
        <View style={tw`flex-row items-center`}>
            <Text style={tw`text-lg font-bold text-gray-800 mr-2`}>{player.name}</Text>
            {isNearest && (
                <View style={tw`bg-green-200 px-2 py-0.5 rounded-full`}>
                    <Text style={tw`text-xs text-green-800 font-bold`}>Nearby</Text>
                </View>
            )}
        </View>
        
        <View style={tw`flex-row items-center mt-1`}>
            <Ionicons 
              name="location-sharp" 
              size={14} 
              color={isNearest ? tw.color('green-600') : tw.color('gray-400')} 
            />
            <Text style={tw`text-sm text-gray-500 ml-1 font-medium`} numberOfLines={1}>
                {locationText}
            </Text>
        </View>
      </View>

      <View style={tw`bg-white p-3 rounded-full border border-gray-100 shadow-sm`}>
         <Ionicons name="chatbubble-ellipses" size={22} color={tw.color('blue-600')} />
      </View>
    </Pressable>
  );
};

export default function NewChatScreen() {
  const { user, userData, loading: authLoading } = useAuth(); 
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const fetchAndSortPlayers = async (currentUserId) => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'player'));
      const querySnapshot = await getDocs(q);
      
      let playersList = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(p => p.id !== currentUserId); 

      // SORTING LOGIC
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

  if (authLoading || loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50 justify-center items-center`}>
        <ActivityIndicator size="large" color={tw.color('blue-600')} />
      </SafeAreaView>
    );
  }
  
  if (!user) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50 justify-center items-center p-5`}>
        <Text style={tw`text-lg text-gray-500 mt-2 text-center`}>
          Please log in to start a chat.
        </Text>
      </SafeAreaView>
    );
  }

  const isPlayerNearest = (player) => {
      if (!userData || !userData.city || !userData.area) return false;
      const myCity = userData.city.trim().toLowerCase();
      const myArea = userData.area.trim().toLowerCase();
      const pCity = player.city ? player.city.trim().toLowerCase() : "";
      const pArea = player.area ? player.area.trim().toLowerCase() : "";
      return (myCity === pCity && myArea === pArea);
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <View style={tw`px-4 pt-4 pb-2 bg-white border-b border-gray-100 mb-2`}>
         <Text style={tw`text-2xl font-bold text-gray-800`}>Find Players</Text>
         {userData?.area ? (
             <Text style={tw`text-sm text-gray-500 mb-2`}>
                Showing players near <Text style={tw`font-bold text-blue-600`}>{userData.area}</Text> first.
             </Text>
         ) : (
             <Text style={tw`text-sm text-gray-500 mb-2`}>
                Start chatting to challenge players.
             </Text>
         )}
      </View>

      <FlatList
        data={players}
        keyExtractor={item => item.id}
        contentContainerStyle={tw`p-4 pt-2`}
        renderItem={({ item }) => (
          <PlayerCard 
            player={item} 
            currentUserId={user.uid} 
            isNearest={isPlayerNearest(item)}
          />
        )}
        ListEmptyComponent={
          <View style={tw`items-center justify-center mt-20`}>
            <Ionicons name="people-outline" size={50} color={tw.color("gray-300")} />
            <Text style={tw`text-lg text-gray-500 mt-2 font-bold`}>No Players Found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}