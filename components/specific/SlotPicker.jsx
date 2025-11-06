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

// Helper function: 24-hour slots generate karna
const generateTimeSlots = (existingSlotsMap = {}, dateStr) => {
  const slotsArray = [];
  
  let currentMoment = moment(dateStr, 'YYYY-MM-DD').hour(0).minute(0).seconds(0).milliseconds(0);
  let endMoment = currentMoment.clone().add(1, 'days');
  
  while (currentMoment.isBefore(endMoment)) {
    const hourKey = currentMoment.format('HH'); 
    const status = existingSlotsMap[hourKey] || 'available';
    const slotDateTime = currentMoment.clone(); 
    
    slotsArray.push({
      hour: hourKey,
      timeDisplay: currentMoment.format('h:00 A'), 
      status: status,
      slotDateTime: slotDateTime, 
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

  const fetchSlots = async (dateStr) => {
    if (!user) {
        setSlots([]); 
        setLoadingSlots(false);
        return;
    }
    
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
      
      const slotsArray = generateTimeSlots(daySlotsMap, dateStr); 
      setSlots(slotsArray);
      
    } catch (error) {
      console.error("Error fetching slots: ", error);
      Alert.alert('Error', 'Could not fetch time slots.');
    } finally {
      setLoadingSlots(false);
    }
  };

  // --- RENDER SLOT FUNCTION (UPDATED) ---
  const renderSlot = ({ item }) => {
    const currentUserId = user?.uid; 
    
    // 1. Tamam possible states ko define karein
    const isAvailable = item.status === 'available';
    const isBookedByMe = currentUserId ? item.status === currentUserId : false; 
    const isUnavailable = item.status === 'unavailable'; // <-- NAYI STATE
    
    // 2. Past slot check karein
    const isToday = selectedDate === getTodayString();
    const slotTime = item.slotDateTime; 
    const isPastSlot = isToday && slotTime.isBefore(moment()); 

    // 3. Icons
    const hourInt = parseInt(item.hour);
    const isDay = hourInt >= 6 && hourInt < 18;
    const iconName = isDay ? 'sunny-outline' : 'moon-outline';
    const iconColor = isDay ? tw.color('orange-500') : tw.color('purple-500');
    
    // 4. Disable logic update karein
    // Slot disable hoga agar: User login nahi, Slot available nahi, Waqt guzar gaya, YA Slot unavailable hai
    const isDisabled = !currentUserId || !isAvailable || isPastSlot || isUnavailable; 

    // --- 5. Style aur Text logic (Priority ke sath) ---
    let slotStyle = tw`py-3 px-2 w-[30%] items-center rounded-lg border m-1`;
    let timeColor = tw`text-gray-800`;
    let statusText = 'Booked'; // Default (agar booked by others hai)
    let statusColor = tw`text-gray-500`;

    if (isPastSlot) {
      slotStyle = tw.style(slotStyle, `opacity-50 bg-gray-200 border-gray-300`);
      timeColor = tw`text-gray-500`;
      statusText = 'Expired';
      statusColor = tw`text-red-600`;
    } else if (isUnavailable) { // <-- NAYA LOGIC
      slotStyle = tw.style(slotStyle, `bg-red-100 border-red-300`); // Red style
      timeColor = tw`text-red-700`; // Red time
      statusText = 'Unavailable'; // Red text
      statusColor = tw`text-red-700`;
    } else if (isBookedByMe) {
      slotStyle = tw.style(slotStyle, `bg-blue-100 border-blue-300`);
      timeColor = tw`text-blue-800`;
      statusText = 'You Booked';
      statusColor = tw`text-blue-600`;
    } else if (isAvailable) {
      slotStyle = tw.style(slotStyle, `bg-green-100 border-green-300`);
      timeColor = tw`text-green-800`;
      statusText = 'Available';
      statusColor = tw`text-green-600`;
    } else {
      // Booked by others
      slotStyle = tw.style(slotStyle, `bg-gray-200 border-gray-300`);
      timeColor = tw`text-gray-500`;
    }
    // ---------------------------------------------------

    return (
      <Pressable
        style={slotStyle}
        // Sirf 'available' slots par hi 'onSlotSelect' call hoga
        onPress={() => isAvailable && !isPastSlot && onSlotSelect(item)} 
        disabled={isDisabled} 
      >
        <View style={tw`flex-row items-center mb-1`}>
            <Ionicons name={iconName} size={14} color={iconColor} style={tw`mr-1`} />
            <Text style={tw.style(`font-bold text-sm`, timeColor)}>
                {item.timeDisplay}
            </Text>
        </View>
        
        <Text style={tw.style(`text-xs`, statusColor)}>
          {statusText}
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