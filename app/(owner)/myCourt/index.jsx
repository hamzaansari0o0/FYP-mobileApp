import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../firebase/firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'; // 'doc', 'getDoc' add kiya
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ArenaRegistrationForm from '../../../components/specific/ArenaRegistrationForm'; 

// --- Mini Court Card ---
const OwnerCourtCard = ({ court, onEdit, onManageSlots }) => {
  return (
    <View style={tw`bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4`}>
      {court.courtImageURL && (
        <Image
          source={{ uri: court.courtImageURL }}
          style={tw`w-full h-36 rounded-md mb-3`}
          resizeMode="cover"
        />
      )}
      <View style={tw`flex-row justify-between items-center mb-1`}>
         <Text style={tw`text-lg font-bold text-gray-800`}>{court.courtName}</Text>
         <View style={tw`px-2 py-1 rounded-full ${court.status === 'approved' ? 'bg-green-100' : 'bg-yellow-100'}`}>
            <Text style={tw`text-xs font-bold ${court.status === 'approved' ? 'text-green-700' : 'text-yellow-700'}`}>
                {court.status ? court.status.toUpperCase() : 'PENDING'}
            </Text>
         </View>
      </View>
      
      <Text style={tw`text-base text-gray-600 mb-3`}>Rs. {court.pricePerHour} / hr</Text>
      
      <View style={tw`flex-row pt-3 border-t border-gray-100`}>
        <Pressable 
          onPress={() => onEdit(court.id)}
          style={tw`flex-1 bg-blue-50 py-2 rounded-lg mr-2 border border-blue-100`}
        >
          <Text style={tw`text-blue-700 text-center font-semibold`}>Edit</Text>
        </Pressable>
        <Pressable 
          onPress={() => onManageSlots(court.id)}
          style={tw`flex-1 bg-gray-50 py-2 rounded-lg ml-2 border border-gray-200`}
        >
          <Text style={tw`text-gray-700 text-center font-semibold`}>Manage Slots</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default function MyCourtScreen() {
  const { user, userData: initialUserData } = useAuth(); // Context data sirf initial load ke liye
  const router = useRouter();
  
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true); // Single loading state for screen
  
  // Local state for immediate UI updates
  const [arenaData, setArenaData] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true; // Cleanup handle karne ke liye

      const loadScreenData = async () => {
        if (!user) return;
        
        try {
          // 1. Hamesha Fresh User Data Fetch karein (Stale data fix)
          const userDocRef = doc(db, 'users', user.uid);
          const userSnapshot = await getDoc(userDocRef);
          
          if (userSnapshot.exists()) {
            const freshUserData = userSnapshot.data();
            
            if (isActive) {
              setArenaData(freshUserData);
            }

            // 2. Agar Arena registered hai, to Courts fetch karein
            if (freshUserData.arenaName) {
              const q = query(
                collection(db, 'courts'),
                where('ownerId', '==', user.uid)
              );
              const courtsSnapshot = await getDocs(q);
              const courtsList = courtsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              
              if (isActive) {
                setCourts(courtsList);
              }
            }
          }
        } catch (error) {
          console.error("Error loading dashboard:", error);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      setLoading(true);
      loadScreenData();

      return () => { isActive = false; };
    }, [user]) // Sirf 'user' par depend karein, userData par nahi
  );

  const handleArenaRegistrationSuccess = (newArenaData) => {
    // Local update taake refresh ki zaroorat na pare
    setArenaData(prev => ({ ...prev, ...newArenaData }));
    // Hum dubara fetch bhi trigger kar sakte hain agar chahein
  };

  // --- Navigation ---
  const handleEditCourt = (courtId) => {
    router.push({ pathname: '/myCourt/edit', params: { courtId } });
  };
  const handleManageSlots = (courtId) => {
    router.push({ pathname: '/myCourt/maintenance', params: { courtId } });
  };
  const handleAddCourt = () => {
    router.push('/myCourt/addCourt');
  };

  // --- UI STATES ---

  // 1. Loading
  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 items-center justify-center bg-gray-100`}>
        <ActivityIndicator size="large" color={tw.color('green-600')} />
      </SafeAreaView>
    );
  }

  // 2. Show Registration Form (If Arena not registered)
  if (!arenaData?.arenaName) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-100`}>
        <Stack.Screen options={{ headerShown: false }} />
        <ArenaRegistrationForm
          user={user}
          onRegistrationSuccess={handleArenaRegistrationSuccess}
        />
      </SafeAreaView>
    );
  }

  // 3. Show Dashboard (If Arena Registered - Pending or Approved)
  const status = arenaData.status || 'pending';
  const statusColor =
    status === 'approved' ? 'bg-green-100 border-green-300'
    : status === 'pending' ? 'bg-yellow-50 border-yellow-300'
    : 'bg-red-100 border-red-300';

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <Stack.Screen options={{ headerShown: true, title: arenaData.arenaName || 'My Arena' }} />
      
      <FlatList
        data={courts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OwnerCourtCard
            court={item}
            onEdit={handleEditCourt}
            onManageSlots={handleManageSlots}
          />
        )}
        contentContainerStyle={tw`p-5 pb-20`}
        ListHeaderComponent={
          <>
            {/* Arena Status Banner */}
            <View style={tw`p-4 border border-l-4 rounded-md ${statusColor} mb-6 bg-white shadow-sm`}>
              <View style={tw`flex-row items-center mb-1`}>
                 <Ionicons 
                    name={status === 'approved' ? "checkmark-circle" : "time"} 
                    size={24} 
                    color={tw.color(status === 'approved' ? 'green-600' : 'yellow-600')} 
                    style={tw`mr-2`}
                 />
                 <Text style={tw`text-lg font-bold text-gray-800`}>
                   Status: {status.toUpperCase()}
                 </Text>
              </View>
              {status === 'pending' && (
                <Text style={tw`text-sm text-gray-600 ml-8`}>
                   Your arena details are under review.
                </Text>
              )}
            </View>
            
            {/* Add Court Button */}
            <Pressable
              style={tw`bg-green-600 py-3 rounded-lg shadow-md mb-6 flex-row items-center justify-center`}
              onPress={handleAddCourt}
            >
              <Ionicons name="add-circle" size={24} color="white" style={tw`mr-2`} />
              <Text style={tw`text-white text-center text-lg font-bold`}>
                Add New Court
              </Text>
            </Pressable>
            
            <Text style={tw`text-xl font-bold text-gray-800 mb-4 ml-1`}>
              Registered Courts
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={tw`items-center justify-center mt-4 p-8 bg-white rounded-lg border border-dashed border-gray-300`}>
            <Image 
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/7486/7486744.png' }} 
                style={tw`w-16 h-16 opacity-50 mb-3`} 
            />
            <Text style={tw`text-lg font-semibold text-gray-400 mt-2`}>
              No courts added yet
            </Text>
            <Text style={tw`text-sm text-gray-400 text-center mt-1`}>
              Tap "Add New Court" to get started.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}