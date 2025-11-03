import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, FlatList } from 'react-native';
import tw from 'twrnc';
import { Calendar } from 'react-native-calendars';
import { db } from '../../firebase/firebaseConfig';
import { doc, getDoc, serverTimestamp, collection, runTransaction } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import moment from 'moment'; 

// Helper function: Today ki date string (YYYY-MM-DD) banata hai
const getTodayString = () => {
  return moment().format('YYYY-MM-DD');
};

// Function: Owner ke open/close time ke mutabiq slots generate karta hai
const generateTimeSlots = (openTimeStr, closeTimeStr, existingSlotsMap = {}) => {
  const slotsArray = [];
  
  // Format: "17:00"
  const [openHour, openMinute] = openTimeStr.split(':').map(Number);
  const [closeHour, closeMinute] = closeTimeStr.split(':').map(Number);
  
  let currentMoment = moment().hour(openHour).minute(openMinute).seconds(0).milliseconds(0);
  let endMoment = moment().hour(closeHour).minute(closeMinute).seconds(0).milliseconds(0);
  
  // Agar closing time opening time se chota hai (e.g., 5 PM se 4 AM), to closing time ko agle din ka samjhein
  if (endMoment.isBefore(currentMoment)) {
    endMoment.add(1, 'days');
  }
  
  // Ye loop har 1 ghante ke slot ke liye chalta hai
  while (currentMoment.isBefore(endMoment)) {
    const hourKey = currentMoment.format('HH'); // "17", "18", ... "03", "04"
    
    // Status check karein: pehle se booked hai, ya available
    const status = existingSlotsMap[hourKey] || 'available';

    slotsArray.push({
      hour: hourKey,
      timeDisplay: currentMoment.format('h:00 A'), // 5:00 PM, 6:00 PM
      status: status,
    });

    currentMoment.add(1, 'hours'); // Agle ghante par jayein
  }

  return slotsArray;
};


export default function SlotPicker({ courtId, ownerId, pricePerHour, openTime, closeTime }) { 
  // --- All Hooks must be at the top level and called unconditionally ---
  const { user, userData } = useAuth(); // Context Hook
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  // -------------------------------------------------------------------

  // FIX: Early return (if (!user)) has been removed to maintain hooks count, 
  // preventing the "Rendered fewer hooks than expected" error.

  useEffect(() => {
    // Agar user null hai, to slots fetch na karein
    if (!user) {
        setSlots([]); 
        setLoadingSlots(false);
        return;
    }
    
    if (openTime && closeTime) {
      fetchSlots(selectedDate);
    }
  }, [selectedDate, courtId, openTime, closeTime, user]); 

  const fetchSlots = async (dateStr) => {
    if (!user) return; // Defensive check for async call
    
    setLoadingSlots(true);
    setSlots([]);

    try {
      const docId = `${courtId}_${dateStr}`;
      const slotDocRef = doc(db, 'court_slots', docId);
      const docSnap = await getDoc(slotDocRef);

      let daySlotsMap = {};

      if (docSnap.exists()) {
        daySlotsMap = docSnap.data().slots;
      }

      // Generate slots using Owner ka time aur existing data
      const slotsArray = generateTimeSlots(openTime, closeTime, daySlotsMap);
      setSlots(slotsArray);

    } catch (error) {
      console.error("Error fetching slots: ", error);
      Alert.alert('Error', 'Could not fetch time slots.');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBookSlot = async (hour) => {
    // Action ko sirf logged in user ke liye allowed karein
    if (!user) return Alert.alert("Error", "Please log in to book a slot.");

    Alert.alert(
      "Confirm Booking",
      `Book ${moment(hour, 'HH').format('h:00 A')} on ${selectedDate} for Rs. ${pricePerHour}?`,
      [
        { text: "Cancel", style: "cancel" },
        { onPress: () => confirmBooking(hour), text: "Confirm" },
      ]
    );
  };
  
  const confirmBooking = async (hour) => {
    setBookingLoading(true);
    if (!user) { // Final check
      setBookingLoading(false);
      return; 
    }
    
    try {
      const slotDocId = `${courtId}_${selectedDate}`;
      const slotDocRef = doc(db, 'court_slots', slotDocId);
      const bookingCollectionRef = collection(db, 'bookings');
      const currentUserId = user.uid;
      const currentUserName = userData?.name || 'Player'; 

      await runTransaction(db, async (transaction) => {
        const slotDoc = await transaction.get(slotDocRef);
        
        let slotsMap = slotDoc.exists() ? slotDoc.data().slots : {};

        // Agar slot available nahi hai to error dein
        if (slotsMap[hour] && slotsMap[hour] !== 'available') {
          throw new Error("Sorry, this slot was just booked.");
        }
        
        // Slot ko book karein
        slotsMap[hour] = currentUserId; 
        
        // court_slots document ko update (ya create) karein
        transaction.set(slotDocRef, { 
          courtId: courtId,
          ownerId: ownerId,
          date: selectedDate,
          slots: slotsMap 
        }, { merge: true });

        // bookings collection mein nayi receipt banayein
        const newBookingData = {
          playerId: currentUserId,
          playerName: currentUserName, 
          courtId: courtId,
          ownerId: ownerId,
          date: selectedDate,
          slotTime: hour,
          pricePaid: pricePerHour,
          paymentStatus: "pending",
          createdAt: serverTimestamp(),
        };
        transaction.set(doc(bookingCollectionRef), newBookingData); 
      });

      Alert.alert('Success!', 'Your booking is confirmed.');
      fetchSlots(selectedDate);

    } catch (error) {
      console.error("Booking Error: ", error);
      Alert.alert('Booking Failed', error.message || "Could not complete booking.");
    } finally {
      setBookingLoading(false);
    }
  };

  const renderSlot = ({ item }) => {
    // user.uid ko safely access karna
    const currentUserId = user?.uid; 
    
    const isAvailable = item.status === 'available';
    // isBookedByMe sirf tabhi true hoga jab user logged in ho
    const isBookedByMe = currentUserId ? item.status === currentUserId : false; 

    return (
      <Pressable
        style={tw.style(
          `py-3 px-2 w-[30%] items-center rounded-lg border m-1`,
          // User ke logout hone par bhi slots ki available/booked status theek dikhegi
          isAvailable ? `bg-green-100 border-green-300` : `bg-gray-200 border-gray-300`,
          isBookedByMe && `bg-blue-100 border-blue-300`
        )}
        // Button ko disable kar dein agar user null hai
        onPress={() => isAvailable && !bookingLoading && currentUserId && handleBookSlot(item.hour)}
        disabled={!currentUserId || !isAvailable || bookingLoading} 
      >
        <Text style={tw.style(
          `font-bold`,
          isAvailable ? `text-green-800` : `text-gray-500`,
          isBookedByMe && `text-blue-800`
        )}>
          {item.timeDisplay}
        </Text>
        <Text style={tw.style(
          `text-xs`,
          isAvailable ? `text-green-600` : `text-gray-500`,
          isBookedByMe && `text-blue-600`
        )}>
          {isAvailable ? 'Available' : (isBookedByMe ? 'You Booked' : 'Booked')}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={tw`bg-white p-5 rounded-lg shadow-md mt-6`}>
      <Text style={tw`text-xl font-bold text-gray-800 mb-4`}>Book Your Slot</Text>
      
      {/* 1. Calendar */}
      <Calendar
        current={selectedDate}
        onDayPress={(day) => {
          setSelectedDate(day.dateString); 
        }}
        minDate={getTodayString()} 
        markedDates={{
          [selectedDate]: { selected: true, selectedColor: tw.color('blue-600') }
        }}
        theme={{
          todayTextColor: tw.color('blue-600'),
          arrowColor: tw.color('blue-600'),
        }}
      />
      
      {/* 2. Slot List */}
      <View style={tw`mt-5`}>
        {/* Agar user logged out hai to aik message dikhayein */}
        {!user && (
            <Text style={tw`text-center text-red-500 p-2 border border-red-200 rounded-lg mb-4`}>
                Please log in to book a slot.
            </Text>
        )}
        
        {bookingLoading && (
          <ActivityIndicator size="small" color={tw.color('blue-600')} style={tw`mb-2`} />
        )}
        {loadingSlots ? (
          <ActivityIndicator size="large" color={tw.color('gray-400')} style={tw`h-24`} />
        ) : (
          <FlatList
            data={slots}
            keyExtractor={item => item.hour}
            renderItem={renderSlot}
            numColumns={3}
            columnWrapperStyle={tw`justify-start`}
            scrollEnabled={false} 
            ListEmptyComponent={
              <Text style={tw`text-center text-gray-500 mt-5`}>
                No slots available on this date.
              </Text>
            }
          />
        )}
      </View>
    </View>
  );
}