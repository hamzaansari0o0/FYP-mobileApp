import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { db } from '../../../firebase/firebaseConfig';

// --- Header Component ---
const AdminHeader = ({ title, onBack }) => (
  <View style={tw`flex-row items-center mb-6 pt-2`}>
    <Pressable onPress={onBack} style={tw`bg-gray-50 p-2 rounded-xl mr-3 border border-gray-200`}>
      <Ionicons name="arrow-back" size={20} color="#374151" />
    </Pressable>
    <View style={tw`flex-1 flex-row items-center`}>
        <View style={tw`bg-purple-600 p-2 rounded-lg mr-2`}>
            <MaterialIcons name="sports-tennis" size={18} color="white" />
        </View>
        <Text style={tw`text-xl font-bold text-gray-900`}>{title}</Text>
    </View>
  </View>
);

// --- Court Card Component ---
const CourtCard = ({ court, onDisable, onEnable }) => { 
  const isEnabled = court.status !== 'disabled';
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-50 text-green-700';
      case 'pending': return 'bg-amber-50 text-amber-700';
      case 'disabled': return 'bg-red-50 text-red-700';
      case 'rejected': return 'bg-red-50 text-red-700';
      default: return 'bg-gray-50 text-gray-500';
    }
  };

  return (
    <View style={tw`bg-white p-4 rounded-2xl shadow-sm border border-purple-50 mb-3`}>
      <View style={tw`flex-row justify-between items-start`}>
        <View style={tw`flex-1 mr-2`}>
          <Text style={tw`text-base font-bold text-gray-900`}>{court.courtName}</Text>
          <Text style={tw`text-[11px] text-gray-400 mt-0.5`} numberOfLines={1}>{court.address}</Text>
        </View>
        
        <View style={tw`px-2 py-1 rounded-md ${getStatusColor(court.status).split(' ')[0]}`}>
           <Text style={tw`text-[10px] font-bold uppercase ${getStatusColor(court.status).split(' ')[1]}`}>
             {court.status || 'UNKNOWN'}
           </Text>
        </View>
      </View>
      
      <View style={tw`flex-row justify-end mt-3 pt-3 border-t border-gray-100`}>
        <Pressable
          style={({ pressed }) => tw.style(
            `px-3 py-1.5 rounded-lg border flex-row items-center`,
            isEnabled ? `bg-red-50 border-red-100` : `bg-green-50 border-green-100`,
            pressed && `opacity-70`
          )}
          onPress={() => isEnabled ? onDisable(court.id) : onEnable(court.id)}
        >
          <Text style={tw`text-[10px] font-bold ${isEnabled ? 'text-red-700' : 'text-green-700'}`}>
             {isEnabled ? 'Disable' : 'Enable'}
          </Text>
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

  const fetchCourts = async () => {
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

  const handleDisable = async (courtId) => {
    try {
      await updateDoc(doc(db, 'courts', courtId), { status: 'disabled' });
      Alert.alert('Success', 'Court has been disabled.');
      setCourts(prev => prev.map(c => c.id === courtId ? { ...c, status: 'disabled' } : c));
    } catch (error) {
      Alert.alert('Error', 'Failed to disable court.');
    }
  };

  const handleEnable = async (courtId) => {
    try {
      await updateDoc(doc(db, 'courts', courtId), { status: 'pending' });
      Alert.alert('Success', 'Court status set to Pending. Please approve it from the Approvals tab.');
      setCourts(prev => prev.map(c => c.id === courtId ? { ...c, status: 'pending' } : c));
    } catch (error) {
      Alert.alert('Error', 'Failed to enable court.');
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="dark-content" />
      <View style={tw`flex-1 px-5`}>
        <AdminHeader title="Manage Courts" onBack={() => router.back()} />
        
        {loading ? (
          <ActivityIndicator size="small" color="#9333ea" style={tw`mt-10`} />
        ) : (
          <FlatList
            data={courts}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <CourtCard 
                court={item} 
                onDisable={handleDisable} 
                onEnable={handleEnable} 
              />
            )}
            contentContainerStyle={tw`pb-10`}
            ListEmptyComponent={<Text style={tw`text-center text-gray-400 mt-10 text-sm`}>No courts found.</Text>}
          />
        )}
      </View>
    </SafeAreaView>
  );
}