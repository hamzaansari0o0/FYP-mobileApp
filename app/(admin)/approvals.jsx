import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { db } from '../../firebase/firebaseConfig';

export default function ApprovalsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('arenas'); // 'arenas' | 'courts'
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- Data Fetch Logic ---
  const fetchData = async () => {
    setLoading(true);
    try {
      let q;
      let fetchedData = [];

      if (activeTab === 'arenas') {
        // Fetch Pending Arenas
        q = query(
          collection(db, 'users'),
          where('role', '==', 'owner'),
          where('status', '==', 'pending')
        );
      } else {
        // Fetch Pending Courts
        q = query(
          collection(db, 'courts'),
          where('status', '==', 'pending')
        );
      }

      const querySnapshot = await getDocs(q);
      fetchedData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Safety Check: Arenas must have a name
      if (activeTab === 'arenas') {
        fetchedData = fetchedData.filter(user => user.arenaName);
      }

      setData(fetchedData);
    } catch (error) {
      console.error("Error fetching approvals:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [activeTab])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // --- Navigate to Detail Screen ---
  const handleReview = (item) => {
    const type = activeTab === 'arenas' ? 'arena' : 'court';
    // ID aur Type pass kar rahe hain detail screen ko
    router.push({ pathname: `/(admin)/approvalDetails`, params: { id: item.id, type } });
  };

  // --- Render Functions ---

  const renderCard = ({ item }) => {
    const isArena = activeTab === 'arenas';
    // Fallback Image handling
    const imageUrl = isArena ? item.arenaImageUrl : item.courtImageURL;
    const title = isArena ? item.arenaName : item.courtName || "Unnamed Court";
    const subTitle = isArena ? (item.city || "No City") : `${item.sportType || "Sport"} • Rs. ${item.pricePerHour || 0}/hr`;
    const details = isArena ? item.arenaAddress : "New Court Addition";

    return (
      <View style={tw`bg-white p-4 rounded-3xl mb-4 shadow-sm border border-purple-50`}>
        <View style={tw`flex-row`}>
          {/* Image */}
          <Image
            source={imageUrl ? { uri: imageUrl } : { uri: 'https://via.placeholder.com/150' }}
            style={tw`w-20 h-20 rounded-2xl bg-gray-100 mr-4 border border-gray-100`}
            resizeMode="cover"
          />
          
          {/* Info */}
          <View style={tw`flex-1 justify-center`}>
            <View style={tw`flex-row justify-between items-start`}>
                <Text style={tw`text-lg font-bold text-gray-900 flex-1 mr-2`} numberOfLines={1}>
                {title}
                </Text>
                <View style={tw`bg-amber-100 px-2 py-0.5 rounded text-xs`}>
                    <Text style={tw`text-[10px] font-bold text-amber-700`}>PENDING</Text>
                </View>
            </View>
            
            <Text style={tw`text-purple-600 font-bold text-xs mb-0.5`}>{subTitle}</Text>
            <Text style={tw`text-gray-400 text-xs`} numberOfLines={1}>{details}</Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          onPress={() => handleReview(item)}
          style={tw`mt-4 bg-purple-50 py-3 rounded-xl border border-purple-100 flex-row justify-center items-center active:bg-purple-100`}
        >
          <Text style={tw`text-purple-700 font-bold mr-2 text-sm`}>Review Request</Text>
          <Ionicons name="arrow-forward" size={16} color="#7e22ce" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* --- HEADER (UPDATED ICON STYLE) --- */}
      <View style={tw`px-6 pt-6 pb-4 bg-white border-b border-gray-100 flex-row items-center`}>
        {/* Purple Background + White Icon */}
        <View style={tw`bg-purple-600 p-3 rounded-2xl mr-4 shadow-md shadow-purple-300`}>
            <MaterialIcons name="verified-user" size={26} color="white" />
        </View>
        <View>
            <Text style={tw`text-3xl font-extrabold text-purple-900`}>Approvals</Text>
            <Text style={tw`text-gray-500 text-xs font-medium tracking-wide`}>MANAGE REQUESTS</Text>
        </View>
      </View>

      {/* --- TABS --- */}
      <View style={tw`flex-row px-6 mt-6 mb-2`}>
          <TouchableOpacity 
            onPress={() => setActiveTab('arenas')}
            style={tw`flex-1 py-3 items-center rounded-xl mr-2 ${activeTab === 'arenas' ? 'bg-purple-600 shadow-md shadow-purple-200' : 'bg-gray-50'}`}
          >
              <Text style={tw`font-bold text-sm ${activeTab === 'arenas' ? 'text-white' : 'text-gray-400'}`}>Arenas</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => setActiveTab('courts')}
            style={tw`flex-1 py-3 items-center rounded-xl ml-2 ${activeTab === 'courts' ? 'bg-purple-600 shadow-md shadow-purple-200' : 'bg-gray-50'}`}
          >
              <Text style={tw`font-bold text-sm ${activeTab === 'courts' ? 'text-white' : 'text-gray-400'}`}>Courts</Text>
          </TouchableOpacity>
      </View>

      {/* --- LIST --- */}
      {loading ? (
        <ActivityIndicator size="large" color="#7e22ce" style={tw`mt-20`} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          contentContainerStyle={tw`px-6 py-4 pb-20`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7e22ce']} />}
          ListEmptyComponent={
            <View style={tw`items-center justify-center mt-20`}>
              <View style={tw`bg-green-50 p-6 rounded-full mb-4`}>
                <Ionicons name="checkmark-done-circle" size={60} color="#22c55e" />
              </View>
              <Text style={tw`text-gray-900 text-xl font-bold`}>All Caught Up!</Text>
              <Text style={tw`text-gray-400 text-sm mt-2 text-center px-10`}>
                There are no pending {activeTab} requests at the moment.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}