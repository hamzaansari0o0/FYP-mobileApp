import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { db } from '../../firebase/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ApprovalsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('arenas'); // 'arenas' or 'courts'
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data Fetch Logic
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
      
      // Arenas filter (Valid data only)
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

  // Navigate to Detail Screen
  const handleReview = (item) => {
    // Hum ID pass karenge detail screen ko
    const type = activeTab === 'arenas' ? 'arena' : 'court';
    // NOTE: Yeh route hum agle step mein banayenge
    router.push({ pathname: `/(admin)/approvalDetails`, params: { id: item.id, type } });
  };

  // --- Components ---

  const TabButton = ({ title, value }) => (
    <Pressable
      onPress={() => setActiveTab(value)}
      style={tw`flex-1 py-4 items-center border-b-2 ${
        activeTab === value ? 'border-purple-600' : 'border-transparent'
      }`}
    >
      <Text style={tw`font-bold text-base ${activeTab === value ? 'text-purple-600' : 'text-gray-500'}`}>
        {title}
      </Text>
    </Pressable>
  );

  const renderCard = ({ item }) => {
    const isArena = activeTab === 'arenas';
    const imageUrl = isArena ? item.arenaImageUrl : item.courtImageURL;
    const title = isArena ? item.arenaName : item.courtName;
    const subTitle = isArena ? item.arenaAddress : `Rs. ${item.pricePerHour} / hr`;

    return (
      <View style={tw`bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4`}>
        <View style={tw`flex-row`}>
          {/* Thumbnail */}
          <Image
            source={imageUrl ? { uri: imageUrl } : { uri: 'https://via.placeholder.com/150' }}
            style={tw`w-20 h-20 rounded-lg bg-gray-200 mr-4`}
            resizeMode="cover"
          />
          
          {/* Info */}
          <View style={tw`flex-1 justify-center`}>
            <Text style={tw`text-lg font-bold text-gray-800 mb-1`} numberOfLines={1}>
              {title}
            </Text>
            <Text style={tw`text-sm text-gray-500 mb-2`} numberOfLines={2}>
              {subTitle}
            </Text>
            
            {/* Tag */}
            <View style={tw`self-start bg-yellow-100 px-2 py-1 rounded`}>
              <Text style={tw`text-xs font-bold text-yellow-700`}>WAITING REVIEW</Text>
            </View>
          </View>
        </View>

        {/* Action Button */}
        <Pressable
          onPress={() => handleReview(item)}
          style={tw`mt-4 bg-purple-50 py-3 rounded-lg border border-purple-100 flex-row justify-center items-center`}
        >
          <Text style={tw`text-purple-700 font-bold mr-2`}>Review Details</Text>
          <Ionicons name="arrow-forward" size={16} color={tw.color('purple-700')} />
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <View style={tw`px-5 pt-4 pb-2 bg-white shadow-sm z-10`}>
        <Text style={tw`text-2xl font-bold text-gray-900`}>Approvals</Text>
      </View>

      {/* Tabs */}
      <View style={tw`flex-row bg-white mb-2 shadow-sm`}>
        <TabButton title="Pending Arenas" value="arenas" />
        <TabButton title="Pending Courts" value="courts" />
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color={tw.color('purple-600')} style={tw`mt-20`} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          contentContainerStyle={tw`p-4`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={tw`items-center justify-center mt-20`}>
              <View style={tw`bg-green-50 p-6 rounded-full mb-4`}>
                <Ionicons name="checkmark-done" size={40} color={tw.color('green-500')} />
              </View>
              <Text style={tw`text-gray-500 text-lg font-medium`}>All caught up!</Text>
              <Text style={tw`text-gray-400 text-sm mt-1`}>No pending requests found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}