import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router'; 
import tw from 'twrnc';
import { db } from '../../../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import SlotPicker from '../../../components/specific/SlotPicker'; // SlotPicker component
import { Ionicons } from '@expo/vector-icons'; // Court details ke liye

export default function CourtDetailScreen() {
  const { courtId } = useLocalSearchParams(); 
  const [court, setCourt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courtId) return;

    const fetchCourtDetails = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'courts', courtId); 
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const courtData = docSnap.data();
          if (courtData.status !== 'approved') {
              // Agar court approved nahi hai to error dikhayein
              Alert.alert('Not Available', 'This court is currently not approved or is disabled.');
              setCourt(null);
          } else {
              setCourt(courtData);
          }
        } else {
          Alert.alert('Error', 'Court not found.');
        }
      } catch (error) {
        console.error("Error fetching court details: ", error);
        Alert.alert('Error', 'Could not fetch details.');
      } finally {
        setLoading(false);
      }
    };

    fetchCourtDetails();
  }, [courtId]);

  if (loading) {
    return (
      <View style={tw`flex-1 items-center justify-center`}>
        <ActivityIndicator size="large" color={tw.color('blue-600')} />
      </View>
    );
  }

  if (!court) {
    return (
      <SafeAreaView style={tw`flex-1 items-center justify-center bg-gray-100`}>
        <Text style={tw`text-lg text-red-500`}>Court is not available or details not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <Stack.Screen options={{ headerShown: true, title: court.courtName }} />
      
      {/* ScrollView is fine now because SlotPicker's FlatList has scrollEnabled={false} */}
      <ScrollView contentContainerStyle={tw`p-5`}>
        {/* Court Info Box */}
        <View style={tw`bg-white p-5 rounded-lg shadow-md`}>
          <Text style={tw`text-2xl font-bold text-gray-800`}>{court.courtName}</Text>
          
          <View style={tw`flex-row items-center mt-3`}>
            <Ionicons name="location-outline" size={18} color={tw.color('gray-600')} />
            <Text style={tw`text-base text-gray-600 ml-2`}>{court.address}</Text>
          </View>
          
          <View style={tw`flex-row items-center mt-2`}>
            <Ionicons name="time-outline" size={18} color={tw.color('gray-600')} />
            <Text style={tw`text-base text-gray-600 ml-2`}>
              {court.openTime} to {court.closeTime}
            </Text>
          </View>
          
          <Text style={tw`text-3xl font-bold text-green-700 mt-4`}>
            Rs. {court.pricePerHour} 
            <Text style={tw`text-lg text-gray-500`}> / hour</Text>
          </Text>
        </View>

        {/* Slot Picker Component (Naye Props ke Sath) */}
        <SlotPicker 
          courtId={courtId}
          ownerId={court.ownerId}
          pricePerHour={court.pricePerHour}
          openTime={court.openTime} 
          closeTime={court.closeTime}
        />
        
      </ScrollView>
    </SafeAreaView>
  );
}