import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { db } from '../../firebase/firebaseConfig';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment'; // Time formatting ke liye import karein

// --- Helper Function: Aaj ki date ko "YYYY-MM-DD" format mein lena ---
const getTodayString = () => {
  return moment().format('YYYY-MM-DD');
};

// --- Owner ki booking card (UPDATE HUA HAI) ---
const OwnerBookingCard = ({ booking }) => {
  // booking.slotTime (e.g., "09", "19") ko "9:00 AM" ya "7:00 PM" mein badlein
  const formattedTime = moment(booking.slotTime, 'HH').format('h:00 A');

  return (
    <View style={tw`bg-white p-4 rounded-lg shadow-md mb-4`}>
      <Text style={tw`text-lg font-bold text-gray-800`}>
        Booking by: {booking.playerName}
      </Text>
      
      <View style={tw`flex-row justify-between items-center mt-2`}>
        <Text style={tw`text-base text-gray-600`}>
          <Ionicons name="calendar-outline" size={16} /> {booking.date}
        </Text>
        <Text style={tw`text-base font-bold text-blue-600`}>
          <Ionicons name="time-outline" size={16} /> {formattedTime}
        </Text>
      </View>
      
      <View style={tw`flex-row justify-between items-center mt-3 pt-2 border-t border-gray-100`}>
        <Text style={tw`text-lg font-bold text-green-700`}>
          Rs. {booking.pricePaid}
        </Text>
        <Text style={tw`text-sm font-semibold text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full`}>
          {booking.paymentStatus.toUpperCase()}
        </Text>
      </View>
    </View>
  );
};

export default function OwnerDashboard() {
  const { user } = useAuth(); // Logged-in owner
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchOwnerBookings();
      }
    }, [user])
  );

  // --- Fetch Logic (UPDATE HUA HAI) ---
  const fetchOwnerBookings = async () => {
    setLoading(true);
    setBookings([]); // Purani list clear karein

    try {
      // 1. Aaj ki date hasil karein (e.g., "2025-11-04")
      const todayDateString = getTodayString();

      // 2. Nayi Query:
      const q = query(
        collection(db, 'bookings'),
        where('ownerId', '==', user.uid),               // 1. Sirf is Owner ka
        where('date', '>=', todayDateString),           // 2. Sirf aaj ka ya future ka
        orderBy('date', 'asc'),                         // 3. Pehle date se sort karo
        orderBy('slotTime', 'asc')                      // 4. Phir time se sort karo
      );
      
      const querySnapshot = await getDocs(q);
      const bookingsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(bookingsList);
      
    } catch (error) {
      // --- NAYA INDEX ERROR AYEGA ---
      console.error("Error fetching owner bookings: ", error.message);
      if (error.code === 'failed-precondition') {
        Alert.alert(
          'Index Required', 
          'Bookings fetch karne ke liye ek naye index ki zaroorat hai. Please terminal mein diye gaye link ko follow karein.'
        );
      } else {
        Alert.alert('Error', 'Could not fetch your bookings.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <View style={tw`p-5`}>
        <Text style={tw`text-3xl font-bold text-green-800 mb-5`}>Upcoming Bookings</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color={tw.color('green-600')} style={tw`mt-20`} />
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <OwnerBookingCard booking={item} />}
            ListEmptyComponent={
              <View style={tw`items-center justify-center mt-20`}>
                <Ionicons name="sad-outline" size={40} color={tw.color('gray-400')} />
                <Text style={tw`text-lg text-gray-500 mt-2`}>
                  You have no upcoming bookings.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}