import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { db } from '../../firebase/firebaseConfig';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect } from 'expo-router';

// Booking card ke liye chota component
const BookingCard = ({ booking }) => (
  <View style={tw`bg-white p-4 rounded-lg shadow-md mb-4`}>
    {/* Hum farz kar rahe hain ke booking mein court ka naam save hai */}
    <Text style={tw`text-lg font-bold text-gray-800`}>Court Name (Placeholder)</Text> 
    <Text style={tw`text-base text-gray-600`}>Date: {booking.date}</Text>
    <Text style={tw`text-base text-gray-600`}>Time: {booking.slotTime}:00</Text>
    <Text style={tw`text-lg font-semibold text-green-700 mt-2`}>
      Paid: Rs. {booking.pricePaid}
    </Text>
  </View>
);

export default function HistoryScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchMyBookings();
      }
    }, [user])
  );

  const fetchMyBookings = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'bookings'),
        where('playerId', '==', user.uid),
        orderBy('createdAt', 'desc') // Sab se nayi booking oopar
      );
      const querySnapshot = await getDocs(q);
      const bookingsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(bookingsList);
    } catch (error) {
      console.error("Error fetching bookings: ", error);
      Alert.alert('Error', 'Could not fetch your booking history.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <View style={tw`p-5`}>
        <Text style={tw`text-3xl font-bold text-blue-800 mb-5`}>Booking History</Text>
        {loading ? (
          <ActivityIndicator size="large" color={tw.color('blue-600')} style={tw`mt-20`} />
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <BookingCard booking={item} />}
            ListEmptyComponent={
              <View style={tw`items-center justify-center mt-20`}>
                <Text style={tw`text-lg text-gray-500`}>You have no past bookings.</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}