import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { db } from '../../firebase/firebaseConfig';
import { collection, query, where, getDocs, orderBy, doc, runTransaction, Timestamp } from 'firebase/firestore'; // Imports update karein
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment'; 

// --- Owner ki booking card (UPDATE HUA HAI) ---
const OwnerBookingCard = ({ booking, onCancel }) => {
  const formattedTime = moment(booking.slotTime, 'HH').format('h:00 A');
  const bookingStatus = booking.status || 'upcoming';

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
        {/* Status dikhayein */}
        <Text style={tw.style(
          `text-sm font-semibold px-2 py-1 rounded-full`,
          bookingStatus.startsWith('cancelled') ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
        )}>
          {bookingStatus.toUpperCase()}
        </Text>
      </View>

      {/* Owner ke liye "Cancel" button (ye 3-ghante ka rule follow nahi karta) */}
      {bookingStatus === 'upcoming' && (
        <Pressable 
          style={tw`bg-yellow-500 py-2 rounded-lg mt-3`}
          onPress={() => onCancel(booking)}
        >
          <Text style={tw`text-white text-center font-bold`}>Cancel Booking (Owner)</Text>
        </Pressable>
      )}
    </View>
  );
};

export default function OwnerDashboard() {
  const { user } = useAuth();
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
    setBookings([]); 

    try {
      // Nayi Query: Sirf woh bookings jinka END TIME abhi se bara hai
      const q = query(
        collection(db, 'bookings'),
        where('ownerId', '==', user.uid),               
        where('slotEndDateTime', '>', Timestamp.now()), 
        orderBy('slotEndDateTime', 'asc')                 
      );
      
      const querySnapshot = await getDocs(q);
      const bookingsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(bookingsList);
      
    } catch (error) {
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

  // --- Owner ka Cancellation Logic ---
  const handleOwnerCancel = (booking) => {
    Alert.alert(
      "Owner Cancellation",
      "Aap is booking ko cancel karna chahte hain? (Player ko notification chala jayega)",
      [
        { text: "Go Back", style: "cancel" },
        { 
          text: "Confirm Cancel", 
          style: "destructive",
          onPress: () => performOwnerCancellation(booking) 
        },
      ]
    );
  };

  const performOwnerCancellation = async (booking) => {
    const bookingRef = doc(db, 'bookings', booking.id);
    const slotRef = doc(db, 'court_slots', `${booking.courtId}_${booking.date}`);

    try {
      await runTransaction(db, async (transaction) => {
        const slotDoc = await transaction.get(slotRef);
        if (slotDoc.exists()) {
           const slotsMap = slotDoc.data().slots;
           slotsMap[booking.slotTime] = 'available'; // Slot free karein
           transaction.update(slotRef, { slots: slotsMap });
        }
        
        transaction.update(bookingRef, {
          status: 'cancelled_by_owner' // Naya status
        });
      });
      Alert.alert('Success', 'Booking has been cancelled.');
      fetchOwnerBookings(); // List refresh karein
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel booking.');
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
            renderItem={({ item }) => (
              <OwnerBookingCard 
                booking={item} 
                onCancel={handleOwnerCancel}
              />
            )}
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