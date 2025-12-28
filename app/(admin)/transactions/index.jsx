import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import tw from 'twrnc';
import { db } from '../../../firebase/firebaseConfig';

export default function ArenasIndex() {
  const router = useRouter();
  const [arenas, setArenas] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchArenas = async () => {
    setLoading(true);
    try {
      // Sirf Owners ko fetch kar rahe hain
      const q = query(collection(db, 'users'), where('role', '==', 'owner'));
      const snapshot = await getDocs(q);
      
      const list = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.arenaName); 

      setArenas(list);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchArenas(); }, []);

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="dark-content" />
      
      {/* --- HEADER --- */}
      <View style={tw`px-6 pt-6 pb-4 bg-white border-b border-gray-100`}>
        <View style={tw`flex-row items-center mb-1`}>
            <View style={tw`bg-purple-100 p-3 rounded-2xl mr-3`}>
                <FontAwesome5 name="file-invoice-dollar" size={24} color="#7e22ce" />
            </View>
            <View>
                <Text style={tw`text-3xl font-extrabold text-purple-900`}>Transactions</Text>
                <Text style={tw`text-gray-500 text-xs font-medium tracking-wide`}>SELECT ARENA TO VIEW LEDGER</Text>
            </View>
        </View>
      </View>

      {loading ? <ActivityIndicator size="large" color="#7e22ce" style={tw`mt-20`} /> : (
        <FlatList
          data={arenas}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchArenas} />}
          contentContainerStyle={tw`px-6 pt-4 pb-20`}
          ListEmptyComponent={
            <View style={tw`mt-20 items-center`}>
                <Text style={tw`text-gray-300 font-bold text-lg`}>No Arenas Found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              onPress={() => router.push(`/(admin)/transactions/${item.id}`)} 
              style={tw`bg-white p-5 rounded-3xl mb-4 flex-row items-center shadow-md shadow-purple-100 border border-purple-50`}
            >
              <View style={tw`w-14 h-14 bg-purple-50 rounded-2xl items-center justify-center mr-4 border border-purple-100`}>
                <MaterialIcons name="stadium" size={28} color="#7e22ce" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`text-lg font-bold text-gray-800`}>{item.arenaName}</Text>
                <Text style={tw`text-xs text-purple-500 font-medium`}>{item.city || "Location N/A"}</Text>
              </View>
              <View style={tw`bg-purple-50 p-2 rounded-full`}>
                <Ionicons name="arrow-forward" size={18} color="#7e22ce" />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}