import React, { useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { db } from '../../firebase/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useFocusEffect } from 'expo-router'; // Jab bhi screen par wapis ayein to refresh ho
import CourtCard from '../../components/CourtCard'; // Apna naya card component
import { Ionicons } from '@expo/vector-icons';

export default function PlayerHome() {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);

  // useFocusEffect tab chalta hai jab bhi user is screen par ata hai
  useFocusEffect(
    React.useCallback(() => {
      fetchApprovedCourts();
    }, [])
  );

  const fetchApprovedCourts = async () => {
    setLoading(true);
    try {
      // Query: 'courts' collection se woh data lao jahan status 'approved' ho
      const q = query(collection(db, 'courts'), where('status', '==', 'approved'));
      const querySnapshot = await getDocs(q);
      
      const courtsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourts(courtsList);
      
    } catch (error) {
      console.error("Error fetching approved courts: ", error);
      Alert.alert('Error', 'Could not fetch courts.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <View style={tw`p-5`}>
        <Text style={tw`text-3xl font-bold text-blue-800`}>Find a Court</Text>
        <Text style={tw`text-lg text-gray-600 mb-5`}>Book your next game</Text>

        {/* Search Bar (Future ke liye) */}
        <View style={tw`flex-row items-center bg-white p-3 rounded-lg shadow-sm mb-5`}>
          <Ionicons name="search" size={20} color={tw.color('gray-400')} />
          <TextInput
            style={tw`flex-1 ml-2 text-base`}
            placeholder="Search by name or area..."
            // (onChangeText logic yahan add hoga)
          />
        </View>

        {/* --- Court List --- */}
        {loading ? (
          <ActivityIndicator size="large" color={tw.color('blue-600')} style={tw`mt-20`} />
        ) : (
          <FlatList
            data={courts}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <CourtCard court={item} />}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={tw`flex-1 items-center justify-center mt-20`}>
                <Ionicons name="sad-outline" size={40} color={tw.color('gray-400')} />
                <Text style={tw`text-lg text-gray-500 mt-2`}>
                  No approved courts found.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}