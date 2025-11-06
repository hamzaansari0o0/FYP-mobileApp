import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { db } from '../../firebase/firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  doc, 
  runTransaction, 
  Timestamp,
  increment // <-- Refund ke liye
} from 'firebase/firestore'; 
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment'; 

// --- Owner ki booking card (UPDATED) ---
const OwnerBookingCard = ({ booking, onCancel, isCancelling }) => {
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
          Paid: Rs. {booking.amountPaid}
        </Text>
        <Text
          style={tw.style(
            `text-sm font-semibold px-2 py-1 rounded-full`,
            bookingStatus.startsWith('cancelled')
              ? 'bg-red-100 text-red-600'
              : 'bg-green-100 text-green-600'
          )}
        >
          {bookingStatus === 'upcoming' ? 'CONFIRMED' : bookingStatus.toUpperCase()}
        </Text>
      </View>

      {/* Cancel Button (Owner) */}
      {bookingStatus === 'upcoming' && (
        <Pressable
          style={tw.style(
            `bg-red-500 py-2 rounded-lg mt-3`,
            isCancelling && `bg-red-300`
          )}
          onPress={() => onCancel(booking)}
          disabled={isCancelling}
        >
          {isCancelling ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={tw`text-white text-center font-bold`}>
              Cancel Booking (Owner)
            </Text>
          )}
        </Pressable>
      )}

      {/* Owner cancelled message */}
      {bookingStatus === 'cancelled_by_owner' && (
        <Text style={tw`text-center text-sm text-red-500 mt-2`}>
          You cancelled this booking. Player was refunded.
        </Text>
      )}
    </View>
  );
};

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchOwnerBookings();
      }
    }, [user])
  );

  const fetchOwnerBookings = async () => {
    setLoading(true);
    setBookings([]);

    try {
      const q = query(
        collection(db, 'bookings'),
        where('ownerId', '==', user.uid),
        where('slotEndDateTime', '>', Timestamp.now()),
        orderBy('slotEndDateTime', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const bookingsList = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(booking => booking.status !== 'completed_and_paid');

      setBookings(bookingsList);
    } catch (error) {
      console.error('Error fetching owner bookings:', error.message);
      if (error.code === 'failed-precondition') {
        Alert.alert('Index Required', 'Please check console for index link.');
      } else {
        Alert.alert('Error', 'Could not fetch your bookings.');
      }
    } finally {
      setLoading(false);
    }
  };

  // --- Owner Cancellation Logic ---
  const handleOwnerCancel = (booking) => {
    Alert.alert(
      'Owner Cancellation (Maintenance)',
      `Are you sure? This will cancel the booking, block this slot as "unavailable", AND issue a FULL REFUND of Rs. ${booking.amountPaid} to the player's wallet.`,
      [
        { text: 'Go Back', style: 'cancel' },
        {
          text: 'Confirm Cancel & Refund',
          style: 'destructive',
          onPress: () => performOwnerCancellation(booking),
        },
      ]
    );
  };

  // --- Transaction Logic ---
  const performOwnerCancellation = async (booking) => {
    setCancellingId(booking.id);

    const bookingRef = doc(db, 'bookings', booking.id);
    const slotRef = doc(db, 'court_slots', `${booking.courtId}_${booking.date}`);
    const playerUserRef = doc(db, 'users', booking.playerId);
    const refundAmount = booking.amountPaid;

    try {
      await runTransaction(db, async (transaction) => {
        // Step 1: Slot ko 'unavailable' karein
        const slotDoc = await transaction.get(slotRef);
        if (slotDoc.exists()) {
          const slotsMap = slotDoc.data().slots;
          slotsMap[booking.slotTime] = 'unavailable';
          transaction.update(slotRef, { slots: slotsMap });
        }

        // Step 2: Booking status update
        transaction.update(bookingRef, {
          status: 'cancelled_by_owner',
          cancellationReason: 'Maintenance',
        });

        // Step 3: Player refund
        transaction.update(playerUserRef, {
          walletCredit: increment(refundAmount),
        });
      });

      Alert.alert(
        'Success',
        'Booking cancelled. The slot is now blocked and the player has been refunded.'
      );
      fetchOwnerBookings();
    } catch (error) {
      console.error('Owner cancellation failed:', error);
      Alert.alert('Error', 'Failed to cancel booking.');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <View style={tw`p-5`}>
        <Text style={tw`text-3xl font-bold text-green-800 mb-5`}>
          Upcoming Bookings
        </Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={tw.color('green-600')}
            style={tw`mt-20`}
          />
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <OwnerBookingCard
                booking={item}
                onCancel={handleOwnerCancel}
                isCancelling={cancellingId === item.id}
              />
            )}
            ListEmptyComponent={
              <View style={tw`items-center justify-center mt-20`}>
                <Ionicons
                  name="sad-outline"
                  size={40}
                  color={tw.color('gray-400')}
                />
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
