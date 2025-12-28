import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
// 1. 'doc' and 'getDoc' import kiya Owner details ke liye
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import tw from 'twrnc';
import { db } from '../../../firebase/firebaseConfig';

// --- HELPER: Sport Icons ---
const getSportIcon = (sportType) => {
  const type = sportType?.toLowerCase() || '';
  if (type.includes('cricket')) return 'cricket';
  if (type.includes('futsal') || type.includes('football') || type.includes('soccer')) return 'soccer';
  if (type.includes('badminton')) return 'badminton';
  if (type.includes('tennis')) return 'tennis';
  if (type.includes('padel')) return 'tennis-ball';
  return 'stadium-variant';
};

export default function ArenaCourtsScreen() {
  const { arenaId } = useLocalSearchParams(); 
  const router = useRouter();
  
  const [courts, setCourts] = useState([]);
  const [ownerDetails, setOwnerDetails] = useState(null); // Owner/Arena Details State
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!arenaId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Owner/Arena Details (User Collection)
        const userDocRef = doc(db, 'users', arenaId);
        const userSnapshot = await getDoc(userDocRef);
        
        if (userSnapshot.exists()) {
            setOwnerDetails(userSnapshot.data());
        }

        // 2. Fetch Courts (Courts Collection)
        const q = query(collection(db, 'courts'), where('ownerId', '==', arenaId));
        const courtsSnapshot = await getDocs(q);
        const courtsList = courtsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        setCourts(courtsList);

      } catch (e) { 
          console.error("Error fetching data:", e); 
      } finally { 
          setLoading(false); 
      }
    };

    fetchData();
  }, [arenaId]);

  // Function to dial number
  const handleCall = (number) => {
      if(number) Linking.openURL(`tel:${number}`);
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* --- HEADER --- */}
      <View style={tw`px-6 pt-2 pb-4 border-b border-gray-100 flex-row items-center bg-white`}>
        <Pressable 
            onPress={() => router.back()} 
            style={tw`mr-4 bg-gray-50 p-3 rounded-2xl border border-gray-200 active:bg-gray-200`}
        >
            <Ionicons name="arrow-back" size={22} color="#581c87" />
        </Pressable>
        <View>
            <Text style={tw`text-xl font-extrabold text-purple-900`}>Arena Overview</Text>
            <Text style={tw`text-purple-400 text-[10px] font-bold tracking-widest uppercase`}>
                Details & Courts
            </Text>
        </View>
      </View>

      {/* --- CONTENT --- */}
      {loading ? (
          <ActivityIndicator size="large" color="#7e22ce" style={tw`mt-20`} />
      ) : (
        <FlatList
          data={courts}
          keyExtractor={item => item.id}
          contentContainerStyle={tw`px-6 pt-6 pb-20`}
          showsVerticalScrollIndicator={false}
          
          // --- NEW: HEADER COMPONENT (Arena Details yahan ayengi) ---
          ListHeaderComponent={() => (
            <View style={tw`mb-6`}>
                {ownerDetails ? (
                    <View style={tw`bg-purple-900 p-6 rounded-[24px] shadow-lg shadow-purple-300`}>
                        {/* Arena Name & Owner */}
                        <View style={tw`mb-4 border-b border-purple-700/50 pb-4`}>
                            <Text style={tw`text-white text-2xl font-bold mb-1`}>
                                {ownerDetails.arenaName || "Arena Name N/A"}
                            </Text>
                            <View style={tw`flex-row items-center`}>
                                <Ionicons name="person-circle" size={16} color="#d8b4fe" />
                                <Text style={tw`text-purple-200 text-sm ml-1 font-medium`}>
                                    Owner: {ownerDetails.name || "N/A"}
                                </Text>
                            </View>
                        </View>

                        {/* Location */}
                        <View style={tw`flex-row items-start mb-3`}>
                            <Ionicons name="location" size={18} color="#e9d5ff" style={tw`mt-0.5`} />
                            <Text style={tw`text-purple-50 text-xs ml-2 flex-1 leading-5`}>
                                {ownerDetails.arenaAddress || ownerDetails.fullAddress || "No address provided"}
                            </Text>
                        </View>

                        {/* Mobile Number (Clickable) */}
                        <TouchableOpacity 
                            onPress={() => handleCall(ownerDetails.mobileNumber)}
                            style={tw`flex-row items-center bg-white/10 p-3 rounded-xl self-start`}
                        >
                            <Ionicons name="call" size={16} color="#4ade80" />
                            <Text style={tw`text-white font-bold ml-2 text-sm`}>
                                {ownerDetails.mobileNumber || "No Mobile"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <Text style={tw`text-gray-400 text-center mb-4`}>Loading Arena Details...</Text>
                )}

                <Text style={tw`text-gray-800 font-bold text-lg mt-4 mb-2 ml-1`}>
                    Courts ({courts.length})
                </Text>
            </View>
          )}
          
          ListEmptyComponent={
            <View style={tw`items-center justify-center py-10 opacity-70`}>
                <MaterialCommunityIcons name="stadium-variant" size={40} color="#d8b4fe" />
                <Text style={tw`text-gray-400 text-sm mt-2`}>No courts added yet.</Text>
            </View>
          }

          renderItem={({ item }) => {
            const iconName = getSportIcon(item.sportType || item.type);
            const displayName = item.name || item.courtName || item.title || "Unnamed Court";

            return (
                <TouchableOpacity 
                    onPress={() => router.push(`/(admin)/transactions/court/${item.id}`)} 
                    style={tw`bg-white p-4 rounded-3xl mb-4 flex-row items-center shadow-lg shadow-gray-200 border border-purple-50`}
                >
                    <View style={tw`w-14 h-14 bg-purple-600 rounded-2xl items-center justify-center mr-4 shadow-md shadow-purple-300`}>
                        <MaterialCommunityIcons name={iconName} size={28} color="white" />
                    </View>
                    
                    <View style={tw`flex-1`}>
                        <Text style={tw`text-lg font-bold text-gray-800 mb-0.5`}>{displayName}</Text>
                        <View style={tw`flex-row items-center`}>
                            <Text style={tw`text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-md capitalize`}>
                                {item.sportType || "General"}
                            </Text>
                            <Text style={tw`text-xs text-purple-700 font-bold ml-2`}>
                                Rs. {item.pricePerHour || 0}/hr
                            </Text>
                        </View>
                    </View>
                    
                    <View style={tw`bg-gray-50 p-2 rounded-full`}>
                        <Ionicons name="chevron-forward" size={18} color="#9333ea" />
                    </View>
                </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}