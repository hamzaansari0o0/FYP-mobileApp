//////////////////////////////////////////////////////////////////
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, FlatList } from 'react-native';
import tw from 'twrnc';
import { Calendar } from 'react-native-calendars';
import { db } from '../../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore'; 
import { useAuth } from '../../context/AuthContext';
import moment from 'moment'; 
import { Ionicons } from '@expo/vector-icons'; 

// Helper function: Today ki date string
const getTodayString = () => {
  return moment().format('YYYY-MM-DD');
};

// --- YEH FUNCTION UPDATE HUA HAI ---
// Ab yeh 'dateStr' (selected date) ko parameter ke tor par le raha hai
const generateTimeSlots = (existingSlotsMap = {}, dateStr) => {
  const slotsArray = [];
  
  // FIX: Ab yeh 'moment()' (aaj) ke bajaye 'moment(dateStr)' (selected date) se shuru hoga
  let currentMoment = moment(dateStr, 'YYYY-MM-DD').hour(0).minute(0).seconds(0).milliseconds(0);
  
  // Agle din ki 12:00 AM tak
  let endMoment = currentMoment.clone().add(1, 'days');
  
  while (currentMoment.isBefore(endMoment)) {
    const hourKey = currentMoment.format('HH'); 
    const status = existingSlotsMap[hourKey] || 'available';
    
    // Ab yeh slotDateTime object bilkul sahih date (e.g., 6 Nov) ka banega
    const slotDateTime = currentMoment.clone(); 
    
    slotsArray.push({
      hour: hourKey,
      timeDisplay: currentMoment.format('h:00 A'), 
      status: status,
      slotDateTime: slotDateTime, // Yeh object ab [courtId].jsx ko pass hoga
    });
    
    currentMoment.add(1, 'hours');
  }
  return slotsArray;
};


// --- SlotPicker Component Shuru ---
export default function SlotPicker({ 
  courtId, 
  pricePerHour, 
  onSlotSelect, 
  refreshKey 
}) { 
  const { user } = useAuth(); 
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);

  useEffect(() => {
    fetchSlots(selectedDate);
  }, [selectedDate, courtId, user, refreshKey]); 

  // --- YEH FUNCTION BHI UPDATE HUA HAI ---
  const fetchSlots = async (dateStr) => {
    if (!user) {
        setSlots([]); 
        setLoadingSlots(false);
        return;
    }
    
    setLoadingSlots(true);
    setSlots([]);
    try {
      const docId = `${courtId}_${dateStr}`; // e.g., ..._2025-11-06
      const slotDocRef = doc(db, 'court_slots', docId);
      const docSnap = await getDoc(slotDocRef);
      let daySlotsMap = {};
      if (docSnap.exists()) {
        daySlotsMap = docSnap.data().slots;
      }
      
      // FIX: Ab hum 'dateStr' (selected date) ko generateTimeSlots mein pass kar rahe hain
      const slotsArray = generateTimeSlots(daySlotsMap, dateStr); 
      setSlots(slotsArray);
      
    } catch (error) {
      console.error("Error fetching slots: ", error);
      Alert.alert('Error', 'Could not fetch time slots.');
    } finally {
      setLoadingSlots(false);
    }
  };

  // --- Render Slot Function (UPDATE HUA) ---
  const renderSlot = ({ item }) => {
    const currentUserId = user?.uid; 
    const isAvailable = item.status === 'available';
    const isBookedByMe = currentUserId ? item.status === currentUserId : false; 
    
    // --- REAL-TIME PAST SLOT CHECK ---
    const isToday = selectedDate === getTodayString();
    
    // FIX: Ab 'item.slotDateTime' (jo generateTimeSlots se aa raha hai) 
    // hamesha sahih date (e.g., 6 Nov) ka hoga.
    const slotTime = item.slotDateTime; 
    
    const isPastSlot = isToday && slotTime.isBefore(moment()); 

    const hourInt = parseInt(item.hour);
    const isDay = hourInt >= 6 && hourInt < 18;
    const iconName = isDay ? 'sunny-outline' : 'moon-outline';
    const iconColor = isDay ? tw.color('orange-500') : tw.color('purple-500');
    
    const isDisabled = !currentUserId || !isAvailable || isPastSlot;

    return (
      <Pressable
        style={tw.style(
          `py-3 px-2 w-[30%] items-center rounded-lg border m-1`,
          isAvailable && !isPastSlot ? `bg-green-100 border-green-300` : `bg-gray-200 border-gray-300`,
          isBookedByMe && !isPastSlot && `bg-blue-100 border-blue-300`,
          isPastSlot && `opacity-50`
        )}
        // Ab yeh 'item' (jis mein sahih 6 Nov ki date hai) ko parent ko bheje ga
        onPress={() => onSlotSelect(item)} 
        disabled={isDisabled} 
      >
        <View style={tw`flex-row items-center mb-1`}>
            <Ionicons name={iconName} size={14} color={iconColor} style={tw`mr-1`} />
            <Text style={tw.style(
                `font-bold text-sm`,
                isDisabled ? `text-gray-500` : (isBookedByMe ? `text-blue-800` : `text-gray-800`)
            )}>
                {item.timeDisplay}
            </Text>
        </View>
        
        <Text style={tw.style(
          `text-xs`,
          isPastSlot ? `text-red-600` : (isAvailable ? `text-green-600` : (isBookedByMe ? `text-blue-600` : `text-gray-500`))
        )}>
          {isPastSlot ? 'Expired' : (isAvailable ? 'Available' : (isBookedByMe ? 'You Booked' : 'Booked'))}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={tw`bg-white p-5 rounded-lg shadow-md mt-6`}>
      <Text style={tw`text-xl font-bold text-gray-800 mb-4`}>Book Your Slot</Text>
      
      <Calendar
        current={selectedDate}
        onDayPress={(day) => { setSelectedDate(day.dateString); }}
        minDate={getTodayString()} 
        markedDates={{ [selectedDate]: { selected: true, selectedColor: tw.color('blue-600') } }}
        theme={{
          todayTextColor: tw.color('blue-600'),
          arrowColor: tw.color('blue-600'),
        }}
      />
      
      <View style={tw`mt-5`}>
        {!user && (
            <Text style={tw`text-center text-red-500 p-2 border border-red-200 rounded-lg mb-4`}>
                Please log in to book a slot.
            </Text>
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