// /home/nearby-players.jsx
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref } from 'firebase/storage';
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
import { getDistanceFromLatLonInKm } from '../../../utils/distanceCalculator';

// === COMPONENT: Player Card ===
const PlayerCard = ({ player, openChat }) => {
  const [avatarUrl, setAvatarUrl] = useState(
    player.profileUrl || player.profileImage || player.photoURL || null
  );

  useEffect(() => {
    if (avatarUrl) return;
    const fetchImage = async () => {
        try {
            const storage = getStorage();
            const url = await getDownloadURL(ref(storage, `profile_pictures/${player.id}`));
            setAvatarUrl(url);
        } catch (e) {
            // Image fetch fail or not found
        }
    };
    fetchImage();
  }, [player.id]);

  return (
    <Pressable 
      onPress={() => openChat(player)}
      android_ripple={{ color: '#dcfce7' }}
      style={tw`bg-white p-4 rounded-xl shadow-sm mb-3 flex-row items-center justify-between border border-gray-100`}
    >
      <View style={tw`flex-row items-center flex-1`}>
        {/* Avatar */}
        <View style={tw`w-12 h-12 rounded-full mr-3 bg-gray-200 overflow-hidden items-center justify-center border border-gray-300`}>
            {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={tw`w-full h-full`} resizeMode="cover"/>
            ) : (
                <Text style={tw`text-lg font-bold text-gray-500`}>{player.name ? player.name[0].toUpperCase() : '?'}</Text>
            )}
        </View>

        <View style={tw`flex-1`}>
            <Text style={tw`text-base font-bold text-gray-800`}>{player.name}</Text>
            <View style={tw`flex-row items-center mt-1`}>
                <Ionicons name="location-sharp" size={12} color="#15803d" />
                <Text style={tw`text-xs text-gray-500 ml-1`}>
                    {player.distance < 1 
                        ? `${Math.round(player.distance * 1000)}m from Arena` 
                        : `${player.distance.toFixed(1)} km from Arena`}
                </Text>
            </View>
        </View>
      </View>
      
      {/* Action: Chat */}
      <View style={tw`bg-green-50 p-2 rounded-full border border-green-100`}>
        <Ionicons name="chatbubble-ellipses" size={22} color="#15803d" />
      </View>
    </Pressable>
  );
};

// === MAIN SCREEN ===
export default function ArenaPlayersScreen() {
  const { user } = useAuth();
  const router = useRouter();
  
  // Retrieve Params
  const { arenaLat, arenaLng, arenaName } = useLocalSearchParams();
  
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlayersNearArena();
  }, [arenaLat, arenaLng]); 

  const fetchPlayersNearArena = async () => {
    if (!arenaLat || !arenaLng) {
        setLoading(false);
        return;
    }

    try {
        setLoading(true);
        const q = query(collection(db, 'users'), where('role', '==', 'player'));
        const querySnapshot = await getDocs(q);

        const arenaLocation = { 
            lat: parseFloat(arenaLat), 
            lng: parseFloat(arenaLng) 
        };

        const sortedPlayers = querySnapshot.docs
            .map(doc => {
                const data = doc.data();
                if (doc.id === user.uid) return null;
                if (!data.coordinates?.lat || !data.coordinates?.lng) return null;

                const dist = getDistanceFromLatLonInKm(
                    arenaLocation.lat,
                    arenaLocation.lng,
                    data.coordinates.lat,
                    data.coordinates.lng
                );

                return { id: doc.id, ...data, distance: dist };
            })
            .filter(item => item !== null)
            .sort((a, b) => a.distance - b.distance);

        setPlayers(sortedPlayers);
    } catch (error) {
        console.error("Error fetching arena players:", error);
    } finally {
        setLoading(false);
    }
  };

  const handleOpenChat = (targetPlayer) => {
    const chatId = [user.uid, targetPlayer.id].sort().join('_');
    
    // FIX: Push to the specific path.
    // Note: The stack behavior depends on the _layout settings (see Step 2 & 3 below)
    router.push({
      pathname: '/(player)/chat/[chatId]', 
      params: { 
        chatId: chatId,
        receiverName: targetPlayer.name,
        receiverId: targetPlayer.id,
        context: `Hi! Are you near ${arenaName}?` 
      }
    });
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-green-800`}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#166534" />

      {/* Header */}
      <View style={tw`px-5 py-4 bg-green-800 flex-row items-center shadow-md pb-6`}>
        <Pressable onPress={() => router.back()} style={tw`p-2 bg-white/20 rounded-full mr-3`}>
           <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <View style={tw`flex-1`}>
            <Text style={tw`text-green-200 text-xs font-medium uppercase tracking-wide`}>Players Near</Text>
            <Text style={tw`text-xl font-bold text-white`} numberOfLines={1}>{arenaName || "Arena"}</Text>
        </View>
      </View>

      {/* List Body */}
      <View style={tw`flex-1 bg-gray-50 rounded-t-3xl overflow-hidden pt-4`}>
        {loading ? (
            <View style={tw`mt-10 items-center`}>
                <ActivityIndicator size="large" color="#15803d" />
                <Text style={tw`text-green-800 mt-2`}>Finding players near arena...</Text>
            </View>
        ) : (
            <FlatList 
                data={players}
                keyExtractor={item => item.id}
                contentContainerStyle={tw`p-5 pb-20`}
                initialNumToRender={10}
                renderItem={({ item }) => (
                    <PlayerCard 
                        player={item} 
                        openChat={handleOpenChat}
                    />
                )}
                ListEmptyComponent={
                    <View style={tw`items-center justify-center mt-10 p-5`}>
                        <Ionicons name="people-outline" size={50} color="#9ca3af" />
                        <Text style={tw`text-center text-gray-500 mt-2 font-bold`}>
                            No players found nearby
                        </Text>
                    </View>
                }
            />
        )}
      </View>
    </SafeAreaView>
  );
}