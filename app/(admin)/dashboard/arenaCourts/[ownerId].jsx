import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { db } from '../../../../firebase/firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useFocusEffect, useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// --- Header Component ---
const AdminHeader = ({ title, onBack }) => (
  <View style={tw`flex-row items-center mb-5`}>
    <Pressable onPress={onBack} style={tw`p-2`}>
      <Ionicons name="arrow-back-outline" size={28} color={tw.color('purple-800')} />
    </Pressable>
    <Text style={tw`text-2xl font-bold text-purple-800 ml-2 flex-1`} numberOfLines={1}>
      {title}
    </Text>
  </View>
);

// --- Court Card Component ---
const CourtManageCard = ({ court, onDisable, onEnable }) => {
  const isEnabled = court.status === 'approved';
  
  return (
    <View style={tw`bg-white p-4 rounded-lg shadow-md mb-4 border border-gray-100`}>
      <View style={tw`flex-row justify-between items-start`}>
        <View style={tw`flex-1 mr-2`}>
            <Text style={tw`text-lg font-bold text-gray-800`}>{court.courtName}</Text>
            <Text style={tw`text-sm text-gray-600`}>Price: Rs. {court.pricePerHour}/hr</Text>
        </View>
        
        {/* Status Badge */}
        <View style={tw`px-2 py-1 rounded self-start ${isEnabled ? 'bg-green-100' : 'bg-red-100'}`}>
            <Text style={tw`text-xs font-bold ${isEnabled ? 'text-green-700' : 'text-red-700'}`}>
              {court.status ? court.status.toUpperCase() : 'UNKNOWN'}
            </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={tw`flex-row justify-end mt-3 border-t border-gray-100 pt-3`}>
         <Pressable
          style={tw`py-2 px-4 rounded-lg ${isEnabled ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}
          onPress={() => isEnabled ? onDisable(court.id) : onEnable(court.id)}
        >
          <Text style={tw`font-bold text-sm ${isEnabled ? 'text-red-700' : 'text-green-700'}`}>
            {isEnabled ? 'Disable Court' : 'Enable Court'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

// --- Main Screen ---
export default function ArenaCourtsScreen() {
  const { ownerId } = useLocalSearchParams();
  const router = useRouter();
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if(ownerId) fetchCourts();
    }, [ownerId])
  );

  const fetchCourts = async () => {
    setLoading(true);
    try {
      // Us owner ke courts layen
      const q = query(
        collection(db, 'courts'),
        where('ownerId', '==', ownerId)
      );
      const querySnapshot = await getDocs(q);
      const courtsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourts(courtsList);
    } catch (error) {
      console.error("Error fetching courts: ", error);
      Alert.alert("Error", "Could not fetch courts.");
    } finally {
      setLoading(false);
    }
  };

  // Disable Logic
  const handleDisable = async (id) => {
    Alert.alert(
      "Disable Court?",
      "Players won't be able to see or book this court.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Disable", style: "destructive", 
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'courts', id), { status: 'disabled' });
              setCourts(prev => prev.map(c => c.id === id ? { ...c, status: 'disabled' } : c));
              Alert.alert("Success", "Court disabled.");
            } catch (err) {
              Alert.alert("Error", "Failed to update.");
            }
          }
        }
      ]
    );
  };

  // Enable Logic
  const handleEnable = async (id) => {
    try {
      await updateDoc(doc(db, 'courts', id), { status: 'approved' });
      setCourts(prev => prev.map(c => c.id === id ? { ...c, status: 'approved' } : c));
      Alert.alert("Success", "Court enabled.");
    } catch (err) {
      Alert.alert("Error", "Failed to update.");
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={tw`p-5`}>
        <AdminHeader title="Manage Courts" onBack={() => router.back()} />
        
        {loading ? (
          <ActivityIndicator size="large" color={tw.color('purple-600')} style={tw`mt-10`} />
        ) : (
          <FlatList
            data={courts}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <CourtManageCard 
                court={item} 
                onDisable={handleDisable} 
                onEnable={handleEnable} 
              />
            )}
            ListEmptyComponent={
              <View style={tw`items-center justify-center mt-10`}>
                <Ionicons name="folder-open-outline" size={40} color="gray" />
                <Text style={tw`text-center text-gray-500 mt-2`}>No courts found in this arena.</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}