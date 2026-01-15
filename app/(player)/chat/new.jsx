import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Stack, useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref } from 'firebase/storage';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StatusBar,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../firebase/firebaseConfig';
import { getDistanceFromLatLonInKm } from '../../../utils/distanceCalculator';

// 🔥 HELPER: Text Normalizer (Spaces & Case remover)
const normalizeText = (text) => {
  if (!text) return "";
  return text.toLowerCase().replace(/\s+/g, '');
};

// === COMPONENT: Player Card ===
const PlayerCard = ({ player, currentUserId, distance }) => {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState(
    player.profileUrl || player.profileImage || player.photoURL || null
  );

  useEffect(() => {
    if (avatarUrl) return;
    const fetchImageFromStorage = async () => {
        try {
            const storage = getStorage();
            const storageRef = ref(storage, `profile_pictures/${player.id}`);
            const url = await getDownloadURL(storageRef);
            setAvatarUrl(url);
        } catch (error) {
            // No image found
        }
    };
    fetchImageFromStorage();
  }, [player.id]);

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

  // ✅ 10KM Logic
  const isNearby = distance !== null && distance !== undefined && distance <= 10;

  return (
    <Pressable 
      onPress={openChat} 
      android_ripple={{ color: '#dcfce7' }}
      style={tw`bg-white p-4 rounded-xl shadow-sm mb-3 flex-row items-center justify-between border-2 ${isNearby ? 'border-green-500 bg-green-50' : 'border-gray-100'}`}
    >
      <View style={tw`flex-row items-center flex-1`}>
        {/* Avatar */}
        <View style={tw`w-12 h-12 rounded-full mr-3 border border-green-200 overflow-hidden bg-green-100 items-center justify-center`}>
            {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={tw`w-full h-full`} resizeMode="cover"/>
            ) : (
                <Text style={tw`text-lg font-bold text-green-800`}>
                    {player.name ? player.name[0].toUpperCase() : '?'}
                </Text>
            )}
        </View>

        <View style={tw`flex-1`}>
            <View style={tw`flex-row items-center flex-wrap`}>
                <Text style={tw`text-base font-bold text-gray-800 mr-2`}>{player.name}</Text>
                {distance !== null && distance !== undefined && (
                    <View style={tw`px-2 py-0.5 rounded-full ${isNearby ? 'bg-green-600' : 'bg-gray-200'} mt-0.5`}>
                        <Text style={tw`text-[10px] font-bold ${isNearby ? 'text-white' : 'text-gray-600'}`}>
                           {distance < 1 ? `📍 ${Math.round(distance * 1000)} m` : `📍 ${distance.toFixed(1)} km`}
                        </Text>
                    </View>
                )}
            </View>
            <View style={tw`flex-row items-center mt-1`}>
                <Ionicons name="location-sharp" size={12} color={isNearby ? "#15803d" : "#9ca3af"} />
                <Text style={tw`text-xs text-gray-500 ml-1 font-medium`} numberOfLines={1}>{locationText}</Text>
            </View>
        </View>
      </View>
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
  const [searchQuery, setSearchQuery] = useState("");
  const [myLocation, setMyLocation] = useState(null);
  
  // Filter States
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedArea, setSelectedArea] = useState(null); // e.g. "Dha Rahbar"
  const [availableAreas, setAvailableAreas] = useState([]);

  const router = useRouter();

  useEffect(() => {
    if (user && !authLoading) initializeData();
  }, [user, authLoading]);

  const initializeData = async () => {
    setLoading(true);
    try {
        // 1. Get GPS
        let currentLoc = null;
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({});
                currentLoc = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                setMyLocation(currentLoc);
            }
        } catch (err) { console.log("GPS Error:", err); }

        // 2. Fetch Players (Only Same City)
        // Note: 1000 players fetch krna Firestore se fast hai, rendering slow hoti hai.
        // Hum FlatList optimization use karenge.
        let q;
        if (userData?.city) {
            q = query(collection(db, 'users'), where('role', '==', 'player'), where('city', '==', userData.city));
        } else {
            q = query(collection(db, 'users'), where('role', '==', 'player'));
        }

        const querySnapshot = await getDocs(q);
        const areasSet = new Set(); // To collect unique areas

        const playersList = querySnapshot.docs
            .map(doc => {
                const data = doc.data();
                
                // Collect Area for Filter
                if (data.area) areasSet.add(data.area.trim());

                // Calculate Distance (Using new 'coordinates' field)
                let dist = null;
                // CHECK: data.coordinates.lat exist krta ha?
                if (currentLoc && data.coordinates?.lat && data.coordinates?.lng) {
                    dist = getDistanceFromLatLonInKm(
                        currentLoc.latitude,
                        currentLoc.longitude,
                        data.coordinates.lat,
                        data.coordinates.lng
                    );
                }
                return { id: doc.id, ...data, distance: dist };
            })
            .filter(p => p.id !== user.uid);

        setPlayers(playersList);
        setAvailableAreas(Array.from(areasSet).sort()); // Sort areas alphabetically

    } catch (error) {
        console.error("Error fetching players:", error);
    } finally {
        setLoading(false);
    }
  };

  // 3. Filter & Sort Logic
  const displayedPlayers = useMemo(() => {
    let result = players;

    // A. AREA FILTER
    if (selectedArea) {
        // Exact match for area filter
        result = result.filter(p => p.area === selectedArea);
    }

    // B. SEARCH (Smart Search)
    if (searchQuery) {
        const cleanQuery = normalizeText(searchQuery);
        result = result.filter(p => {
            const cleanName = normalizeText(p.name);
            const cleanArea = normalizeText(p.area);
            const cleanCity = normalizeText(p.city);
            return cleanName.includes(cleanQuery) || cleanArea.includes(cleanQuery) || cleanCity.includes(cleanQuery);
        });
    }

    // C. SORT (Nearest First)
    result.sort((a, b) => {
        if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
        if (a.distance !== null) return -1;
        if (b.distance !== null) return 1;
        return 0;
    });

    return result;
  }, [players, searchQuery, selectedArea]);

  // Loading View
  if (authLoading || loading) {
    return (
      <View style={tw`flex-1 bg-green-800 justify-center items-center`}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="white" />
        <Text style={tw`text-green-100 text-xs mt-3`}>Finding local players...</Text>
      </View>
    );
  }

  // Auth View
  if (!user) return (<SafeAreaView><Text>Login Required</Text></SafeAreaView>);

  return (
    <SafeAreaView style={tw`flex-1 bg-green-800`}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#166534" />

      {/* --- Filter Modal --- */}
      <Modal visible={filterModalVisible} animationType="slide" transparent={true} onRequestClose={() => setFilterModalVisible(false)}>
        <View style={tw`flex-1 justify-end bg-black/50 `}>
            <View style={tw`bg-white rounded-t-3xl p-5 max-h-[60%]`}>
                <View style={tw`flex-row justify-between items-center mb-4`}>
                    <Text style={tw`text-lg font-bold text-gray-800`}>Select Area</Text>
                    <Pressable onPress={() => setFilterModalVisible(false)}>
                        <Ionicons name="close" size={24} color="gray" />
                    </Pressable>
                </View>
                <FlatList 
                    data={availableAreas}
                    keyExtractor={(item) => item}
                    renderItem={({item}) => (
                        <Pressable 
                            style={tw`py-3 border-b border-gray-100 flex-row justify-between items-center`}
                            onPress={() => {
                                setSelectedArea(item);
                                setFilterModalVisible(false);
                            }}
                        >
                            <Text style={tw`text-base text-gray-700 ${selectedArea === item ? 'font-bold text-green-700' : ''}`}>{item}</Text>
                            {selectedArea === item && <Ionicons name="checkmark" size={20} color="green" />}
                        </Pressable>
                    )}
                />
                <Pressable 
                    onPress={() => { setSelectedArea(null); setFilterModalVisible(false); }}
                    style={tw`mt-4 mb-5 bg-gray-200 p-3 rounded-xl items-center`}
                >
                    <Text style={tw`font-bold text-gray-700`}>Clear Filter</Text>
                </Pressable>
            </View>
        </View>
      </Modal>

      {/* --- Header --- */}
      <View style={tw`px-5 pt-4 pb-2 bg-green-800`}>
        <View style={tw`flex-row items-center mb-4`}>
            <Pressable onPress={() => router.back()} style={tw`p-2 bg-white/20 rounded-full mr-3`}>
                <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            <Text style={tw`text-xl font-bold text-white`}>New Chat</Text>
        </View>

        {/* --- SEARCH BAR & FILTER BUTTON --- */}
        <View style={tw`flex-row gap-2`}>
            <View style={tw`flex-1 bg-green-700/50 rounded-xl flex-row items-center px-4 py-3 border border-green-600`}>
                <Ionicons name="search" size={20} color={tw.color('green-100')} />
                <TextInput 
                    style={tw`flex-1 ml-3 text-white text-base font-medium`}
                    placeholder="Name, area or city..."
                    placeholderTextColor={tw.color('green-300')}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={18} color={tw.color('green-200')} />
                    </Pressable>
                )}
            </View>
            
            <Pressable 
                onPress={() => setFilterModalVisible(true)}
                style={tw`bg-green-700/50 w-12 rounded-xl items-center justify-center border border-green-600 ${selectedArea ? 'bg-green-600 border-green-400' : ''}`}
            >
                <Ionicons name="filter" size={20} color="white" />
                {selectedArea && <View style={tw`absolute top-2 right-3 w-2 h-2 bg-red-500 rounded-full`} />}
            </Pressable>
        </View>
      </View>

      {/* --- Body --- */}
      <View style={tw`flex-1 bg-gray-50 rounded-t-3xl overflow-hidden mt-2`}>
        <View style={tw`px-5 py-3 bg-gray-100 border-b border-gray-200 flex-row items-center justify-between`}>
             <View style={tw`flex-row items-center flex-1`}>
                <Ionicons name="navigate" size={14} color="#15803d" />
                <Text style={tw`text-xs text-gray-500 ml-1`} numberOfLines={1}>
                    {selectedArea ? `Filtered: ${selectedArea}` : `All players in ${userData?.city || "Area"}`}
                </Text>
             </View>
             {myLocation && <Text style={tw`text-[10px] text-green-600 bg-green-100 px-2 py-0.5 rounded-full ml-2`}>GPS Active</Text>}
        </View>

        <FlatList
            data={displayedPlayers}
            keyExtractor={item => item.id}
            contentContainerStyle={tw`p-5 pt-4 pb-10`}
            keyboardShouldPersistTaps="handled"
            // 🔥 PERFORMANCE OPTIMIZATION PROPS FOR 1000+ LIST
            initialNumToRender={10}   // Start mein sirf 10 render karo
            maxToRenderPerBatch={10}  // Scroll krte waqt 10-10 krke render karo
            windowSize={5}            // Sirf 5 screen barabar content memory me rakho
            removeClippedSubviews={true} // Jo screen se bahar hai usay memory se hata do (Android mainly)
            
            renderItem={({ item }) => (
                <PlayerCard player={item} currentUserId={user.uid} distance={item.distance} />
            )}
            ListEmptyComponent={
                <View style={tw`items-center justify-center mt-10`}>
                    <Ionicons name="search" size={48} color="#d1d5db" />
                    <Text style={tw`text-gray-400 mt-2 font-bold`}>No players found</Text>
                    {selectedArea && (
                        <Pressable onPress={() => setSelectedArea(null)} style={tw`mt-2`}>
                            <Text style={tw`text-green-600 font-bold`}>Clear Area Filter</Text>
                        </Pressable>
                    )}
                </View>
            }
        />
      </View>
    </SafeAreaView>
  );
}