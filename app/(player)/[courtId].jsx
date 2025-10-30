import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router'; // 'Stack' ko import karein header ke liye
import tw from 'twrnc';
import { db } from '../../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function CourtDetailScreen() {
  const { courtId } = useLocalSearchParams(); // URL se 'courtId' hasil karein
  const [court, setCourt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courtId) return;

    const fetchCourtDetails = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'courts', courtId); // Us ek court ka reference
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setCourt(docSnap.data());
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
      <SafeAreaView style={tw`flex-1 items-center justify-center`}>
        <Text style={tw`text-lg text-red-500`}>Court details not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      {/* Header (Stack.Screen) ta ke back button milay */}
      <Stack.Screen options={{ headerShown: true, title: court.courtName }} />
      
      <ScrollView contentContainerStyle={tw`p-5`}>
        <View style={tw`bg-white p-5 rounded-lg shadow-md`}>
          <Text style={tw`text-2xl font-bold text-gray-800`}>{court.courtName}</Text>
          <Text style={tw`text-base text-gray-600 mt-2`}>{court.address}</Text>
          <Text style={tw`text-2xl font-bold text-green-700 mt-4`}>
            Rs. {court.pricePerHour} / hour
          </Text>
        </View>

        {/* --- Booking Slots --- */}
        <View style={tw`mt-6 bg-white p-5 rounded-lg shadow-md`}>
          <Text style={tw`text-xl font-bold text-gray-800 mb-4`}>
            Book Your Slot
          </Text>
          <View style={tw`items-center justify-center h-40 border border-dashed border-gray-300 rounded-lg`}>
            <Ionicons name="calendar-outline" size={32} color={tw.color('gray-400')} />
            <Text style={tw`mt-2 text-gray-500`}>
              (Yahan par Time Slot Picker component aye ga)
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}