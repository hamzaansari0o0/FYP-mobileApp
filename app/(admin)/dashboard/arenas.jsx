import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { db } from '../../../firebase/firebaseConfig';
import { notifyUser } from '../../../utils/notifications';

// --- Header ---
const AdminHeader = ({ title, onBack }) => (
  <View style={tw`flex-row items-center mb-6 pt-2`}>
    <Pressable onPress={onBack} style={tw`bg-gray-50 p-2 rounded-xl mr-3 border border-gray-200`}>
      <Ionicons name="arrow-back" size={20} color="#374151" />
    </Pressable>
    <View style={tw`flex-1 flex-row items-center`}>
        <View style={tw`bg-purple-600 p-2 rounded-lg mr-2`}>
            <MaterialIcons name="stadium" size={18} color="white" />
        </View>
        <Text style={tw`text-xl font-bold text-gray-900`}>{title}</Text>
    </View>
  </View>
);

// --- Arena Card ---
const ArenaManageCard = ({ arena, onDisable, onEnable, onViewCourts }) => {
  const isEnabled = arena.status !== 'disabled';
  return (
    <View style={tw`bg-white p-4 rounded-2xl shadow-sm border border-purple-50 mb-3`}>
      <Pressable onPress={() => onViewCourts(arena.id)} style={tw`flex-row justify-between items-center mb-3`}>
        <View style={tw`flex-1`}>
          <Text style={tw`text-base font-bold text-gray-900`} numberOfLines={1}>{arena.arenaName}</Text>
          <Text style={tw`text-xs text-gray-500 mt-0.5`} numberOfLines={1}>Owner: {arena.name}</Text>
          <Text style={tw`text-[10px] text-gray-400 mt-0.5`} numberOfLines={1}>{arena.arenaAddress}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
      </Pressable>

      <View style={tw`border-t border-gray-100 pt-3 flex-row justify-between items-center`}>
         <View style={tw`bg-gray-50 px-2 py-1 rounded`}>
            <Text style={tw`text-[10px] font-bold text-gray-500 uppercase tracking-wide`}>
                {arena.status || 'UNKNOWN'}
            </Text>
         </View>

        <Pressable
          style={({ pressed }) => tw.style(
            `px-3 py-1.5 rounded-lg border flex-row items-center`,
            isEnabled ? `bg-red-50 border-red-100` : `bg-green-50 border-green-100`,
            pressed && `opacity-70`
          )}
          onPress={() => isEnabled ? onDisable(arena) : onEnable(arena)}
        >
          <Text style={tw`text-[10px] font-bold ${isEnabled ? 'text-red-700' : 'text-green-700'}`}>
            {isEnabled ? 'Disable Arena' : 'Enable Arena'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default function ManageArenasScreen() {
  const [arenas, setArenas] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useFocusEffect(useCallback(() => { fetchArenas(); }, []));

  const fetchArenas = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'owner'), where('status', 'in', ['approved', 'disabled']));
      const querySnapshot = await getDocs(q);
      const arenasList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(a => a.arenaName); 
      setArenas(arenasList);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleDisable = async (arena) => {
    Alert.alert(
        "Disable Arena?",
        `This will hide '${arena.arenaName}' from players.`,
        [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Disable", style: "destructive", 
                onPress: async () => {
                    await updateDoc(doc(db, 'users', arena.id), { status: 'disabled' });
                    await notifyUser(arena.id, "Arena Disabled 🛡️", `Your arena '${arena.arenaName}' is hidden.`, "alert");
                    setArenas(prev => prev.map(a => a.id === arena.id ? { ...a, status: 'disabled' } : a));
                }
            }
        ]
    );
  };

  const handleEnable = async (arena) => {
    await updateDoc(doc(db, 'users', arena.id), { status: 'approved' });
    await notifyUser(arena.id, "Arena Activated! ✅", `Your arena '${arena.arenaName}' is now visible.`, "booking");
    setArenas(prev => prev.map(a => a.id === arena.id ? { ...a, status: 'approved' } : a));
  };

  const handleViewCourts = (ownerId) => {
    // Make sure this route exists in your folder structure
    router.push(`/(admin)/dashboard/arenaCourts/${ownerId}`);
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="dark-content" />
      <View style={tw`flex-1 px-5`}>
        <AdminHeader title="Manage Arenas" onBack={() => router.back()} />
        {loading ? (
          <ActivityIndicator size="small" color="#9333ea" style={tw`mt-10`} />
        ) : (
          <FlatList
            data={arenas}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <ArenaManageCard arena={item} onDisable={handleDisable} onEnable={handleEnable} onViewCourts={handleViewCourts} />
            )}
            contentContainerStyle={tw`pb-10`}
            ListEmptyComponent={<Text style={tw`text-center text-gray-400 mt-10 text-sm`}>No active arenas found.</Text>}
          />
        )}
      </View>
    </SafeAreaView>
  );
}