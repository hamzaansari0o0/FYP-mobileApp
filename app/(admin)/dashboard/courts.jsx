import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { db } from '../../../firebase/firebaseConfig';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'; // deleteDoc hata diya
import { useFocusEffect, useRouter } from 'expo-router'; 
import { Ionicons } from '@expo/vector-icons'; 

// --- Reusable Admin Header (ye waisa hi hai) ---
const AdminHeader = ({ title, onBack }) => (
  <View style={tw`flex-row items-center mb-5`}>
    <Pressable onPress={onBack} style={tw`p-2`}>
      <Ionicons name="arrow-back-outline" size={28} color={tw.color('purple-800')} />
    </Pressable>
    <Text style={tw`text-3xl font-bold text-purple-800 ml-3`}>{title}</Text>
  </View>
);

// --- Court Card Component (UPDATE HUA HAI) ---
const CourtCard = ({ court, onDisable, onEnable }) => { // 'onDelete' prop hata diya
  const isEnabled = court.status !== 'disabled';
  
  const getStatusStyle = (status) => {
    switch (status) {
      case 'approved': return `bg-green-100 text-green-800`;
      case 'pending': return `bg-yellow-100 text-yellow-800`;
      case 'disabled': return `bg-gray-100 text-gray-800`;
      case 'rejected': return `bg-red-100 text-red-800`;
      default: return `bg-gray-100 text-gray-800`;
    }
  };

  return (
    <View style={tw`bg-white p-4 rounded-lg shadow-md mb-4`}>
      <View style={tw`flex-row justify-between items-start`}>
        <View>
          <Text style={tw`text-xl font-bold text-gray-800`}>{court.courtName}</Text>
          <Text style={tw`text-base text-gray-600 mt-1`}>{court.address}</Text>
        </View>
        <Text style={tw`text-xs font-bold px-2 py-1 rounded-full ${getStatusStyle(court.status)}`}>
          {court.status.toUpperCase()}
        </Text>
      </View>
      
      <View style={tw`flex-row justify-end mt-4 pt-3 border-t border-gray-200`}>
        {/* --- DELETE BUTTON YAHAN SE HATA DIYA GAYA HAI --- */}
        
        {/* --- Disable/Enable Button --- */}
        <Pressable
          style={tw`py-2 px-5 rounded-lg ${isEnabled ? 'bg-yellow-500' : 'bg-green-500'}`}
          onPress={() => isEnabled ? onDisable(court.id) : onEnable(court.id)}
        >
          <Text style={tw`text-white font-bold`}>{isEnabled ? 'Disable' : 'Enable'}</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default function ManageCourtsScreen() {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter(); 

  useFocusEffect(
    useCallback(() => {
      fetchCourts();
    }, [])
  );

  const fetchCourts = async () => { /* ... (waisa hi) ... */ 
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'courts'));
      const courtsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourts(courtsList);
    } catch (error) {
      console.error("Error fetching courts: ", error);
      Alert.alert('Error', 'Could not fetch courts.');
    } finally {
      setLoading(false);
    }
  };
  const handleDisable = async (courtId) => { /* ... (waisa hi) ... */ 
    try {
      await updateDoc(doc(db, 'courts', courtId), { status: 'disabled' });
      Alert.alert('Success', 'Court has been disabled.');
      setCourts(prev => prev.map(c => c.id === courtId ? { ...c, status: 'disabled' } : c));
    } catch (error) {
      Alert.alert('Error', 'Failed to disable court.');
    }
  };
  const handleEnable = async (courtId) => { /* ... (waisa hi) ... */ 
    try {
      await updateDoc(doc(db, 'courts', courtId), { status: 'pending' });
      Alert.alert('Success', 'Court status set to Pending. Please approve it from the Approvals tab.');
      setCourts(prev => prev.map(c => c.id === courtId ? { ...c, status: 'pending' } : c));
    } catch (error) {
      Alert.alert('Error', 'Failed to enable court.');
    }
  };
  
  // --- "handleDelete" FUNCTION YAHAN SE MUKAMMAL HATA DIYA GAYA HAI ---

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <View style={tw`p-5`}>
        <AdminHeader title="Manage Courts" onBack={() => router.back()} />
        
        {loading ? (
          <ActivityIndicator size="large" color={tw.color('purple-600')} />
        ) : (
          <FlatList
            data={courts}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <CourtCard 
                court={item} 
                onDisable={handleDisable} 
                onEnable={handleEnable} 
                // 'onDelete' prop yahan se hata diya
              />
            )}
            ListEmptyComponent={<Text>No courts found.</Text>}
          />
        )}
      </View>
    </SafeAreaView>
  );
}