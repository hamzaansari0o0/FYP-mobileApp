import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { doc, onSnapshot } from "firebase/firestore"; // 🔥 getDoc hata kar onSnapshot lagaya
import moment from "moment";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  Text,
  View
} from "react-native";
import { Calendar } from "react-native-calendars";
import tw from "twrnc";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase/firebaseConfig";

// --- Skeleton Component ---
const SkeletonSlot = () => (
  <View style={tw`w-[31%] h-12 bg-gray-200 rounded-lg mb-2 mx-[1%] animate-pulse`} />
);

export default function SlotPicker({
  courtId,
  onSlotsChange,
  refreshKey,
}) {
  const { user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState(moment());
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [selectedSlotIds, setSelectedSlotIds] = useState([]); 
  const [showCalendar, setShowCalendar] = useState(false);

  const datesList = Array.from({ length: 14 }, (_, i) => moment().add(i, "days"));

  useEffect(() => {
    // 🔥 Real-time Listener Function
    const unsubscribe = subscribeToSlots(selectedDate);
    // Cleanup function jab component unmount ho ya date change ho
    return () => {
        if (unsubscribe) unsubscribe();
    };
  }, [selectedDate, courtId, refreshKey]);

  // 🔥 New Logic: Subscribe to Real-time Changes
  const subscribeToSlots = (dateMoment) => {
    setLoadingSlots(true);
    // Reset selection jab date change ho
    setSelectedSlotIds([]); 
    onSlotsChange([]); 

    const dateStr = dateMoment.format("YYYY-MM-DD");
    const docId = `${courtId}_${dateStr}`;
    const slotDocRef = doc(db, "court_slots", docId);

    // onSnapshot real-time updates dega
    const unsubscribe = onSnapshot(slotDocRef, (docSnap) => {
      let existingSlotsMap = {};
      if (docSnap.exists()) {
        existingSlotsMap = docSnap.data().slots || {};
      }

      const slotsArray = [];
      const now = moment();

      for (let i = 0; i < 24; i++) {
        const hourKey = i < 10 ? `0${i}` : `${i}`;
        const simpleKey = `${i}`;
        
        const slotTime = moment(dateStr, "YYYY-MM-DD").hour(i).minute(0);
        const diffMinutes = slotTime.diff(now, 'minutes');

        // Check status
        let status = existingSlotsMap[hourKey] || existingSlotsMap[simpleKey] || "available";
        
        // 🛑 Logic Update: Check for 'pending_payment'
        // Agar status 'pending_payment' hai, toh usse 'booked' ki tarah treat karein User B ke liye
        // Lekin hum display ke liye alag logic rakhenge niche
        
        if (diffMinutes < 10) {
            status = "expired";
        }

        slotsArray.push({
            id: hourKey,
            hour: i,
            timeDisplay: slotTime.format("h:00 A"),
            status: status, 
            fullDate: slotTime.toDate(),
            dateStr: dateStr 
        });
      }
      setSlots(slotsArray);
      setLoadingSlots(false);
    }, (error) => {
        console.error("Error listening to slots:", error);
        setLoadingSlots(false);
    });

    return unsubscribe;
  };

  const handlePress = (item) => {
    const now = moment();
    const slotTime = moment(item.fullDate);
    const diffMinutes = slotTime.diff(now, 'minutes');

    if (diffMinutes < 10) {
        Alert.alert("Slot Expired", "This slot is no longer available.");
        return;
    }

    // 🔥 Agar slot pending_payment hai (kisi aur ka modal khula hai), toh select mat karne do
    if (item.status === 'pending_payment') {
        Alert.alert("Hold on", "Someone is currently booking this slot. Try again in a moment.");
        return;
    }

    if (item.status !== 'available') return;
    
    let newSelectedIds;
    if (selectedSlotIds.includes(item.id)) {
        newSelectedIds = selectedSlotIds.filter(id => id !== item.id);
    } else {
        newSelectedIds = [...selectedSlotIds, item.id];
    }
    setSelectedSlotIds(newSelectedIds);
    const selectedObjects = slots.filter(slot => newSelectedIds.includes(slot.id));
    onSlotsChange(selectedObjects);
  };

  const renderSlot = ({ item }) => {
    const isSelected = selectedSlotIds.includes(item.id);
    
    // Status Checks
    const isAvailable = item.status === 'available';
    const isExpired = item.status === 'expired';
    const isUnavailable = item.status === 'unavailable';
    
    // 🔥 PENDING PAYMENT LOGIC:
    // Agar 'pending_payment' hai, toh usse 'Booked' jaisa dikhao (Lock icon)
    const isPending = item.status === 'pending_payment';
    
    const isBooked = (!isAvailable && !isExpired && !isUnavailable) || isPending;
    
    const isNight = item.hour >= 18 || item.hour < 6;

    let iconName = isNight ? "weather-night" : "weather-sunny"; 
    let iconColor = isNight ? "#4f46e5" : "#f59e0b"; 
    
    let bgStyle = `bg-white border-gray-200`;
    let textStyle = `text-gray-700`;
    let subTextStyle = `text-gray-400`;

    if (isSelected) {
        bgStyle = `bg-green-600 border-green-600 shadow-sm`;
        textStyle = `text-white`;
        subTextStyle = `text-green-100`;
        iconName = "check-circle";
        iconColor = "white";
    } else if (isPending) {
        // 🔥 Show Orange/Yellow for Pending Payment (Someone is trying to book)
        bgStyle = `bg-orange-50 border-orange-200 opacity-80`;
        textStyle = `text-orange-400 line-through`;
        iconColor = "#fbbf24"; 
        iconName = "clock-alert"; // New Icon for pending
    } else if (isBooked) {
        bgStyle = `bg-gray-100 border-gray-200 opacity-60`;
        textStyle = `text-gray-400 line-through`;
        iconColor = "#9ca3af"; 
        iconName = "lock";
    } else if (isUnavailable) {
        bgStyle = `bg-red-50 border-red-100`;
        textStyle = `text-red-300`;
        subTextStyle = `text-red-200`;
        iconName = "close-circle";
        iconColor = "#fca5a5";
    } else if (isExpired) {
        bgStyle = `bg-gray-50 border-gray-100`;
        textStyle = `text-gray-300`;
        iconColor = "#e5e7eb";
    }

    return (
      <Pressable
        onPress={() => handlePress(item)}
        // Disable click if pending or not available
        disabled={!isAvailable} 
        style={tw.style(
          `w-[31%] py-2.5 mb-2 rounded-lg border items-center justify-center mx-[1%] shadow-sm`,
          bgStyle
        )}
      >
        <View style={tw`flex-row items-center mb-0.5`}>
            <MaterialCommunityIcons name={iconName} size={14} color={iconColor} style={tw`mr-1`} />
            <Text style={tw.style(`font-bold text-xs`, textStyle)}>
                {item.timeDisplay}
            </Text>
        </View>

        <Text style={tw.style(`text-[9px] capitalize font-bold`, subTextStyle)}>
           {isSelected ? 'Selected' : isPending ? 'Holding...' : isBooked ? 'Booked' : isUnavailable ? 'Closed' : isExpired ? 'Past' : (isNight ? 'Night' : 'Day')}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={tw`mt-2`}>
      
      {/* --- Date Header --- */}
      <View style={tw`flex-row justify-between items-end mb-3`}>
        <View>
            <Text style={tw`text-gray-900 font-bold text-base`}>Select Date</Text>
            <Text style={tw`text-gray-500 text-[10px]`}>{selectedDate.format("MMMM YYYY")}</Text>
        </View>
        <Pressable 
            onPress={() => setShowCalendar(true)}
            style={tw`flex-row items-center bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100`}
        >
            <Text style={tw`text-indigo-600 font-bold text-[10px] mr-1`}>See More</Text>
            <Ionicons name="calendar" size={10} color={tw.color('indigo-600')} />
        </Pressable>
      </View>

      {/* Date Strip */}
      <View style={tw`h-20 mb-4`}>
        <FlatList
            horizontal
            data={datesList}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.toString()}
            renderItem={({ item }) => {
            const isSelected = item.isSame(selectedDate, "day");
            return (
                <Pressable
                onPress={() => setSelectedDate(item)}
                style={tw.style(
                    `items-center justify-center w-14 h-18 rounded-xl mr-2 border`,
                    isSelected ? `bg-green-700 border-green-700 shadow-sm` : `bg-white border-gray-200`
                )}
                >
                <Text style={tw.style(`text-[10px] uppercase mb-0.5 font-medium`, isSelected ? `text-green-100` : `text-gray-400`)}>
                    {item.format("ddd")}
                </Text>
                <Text style={tw.style(`text-lg font-bold`, isSelected ? `text-white` : `text-gray-800`)}>
                    {item.format("DD")}
                </Text>
                </Pressable>
            );
            }}
        />
      </View>

      {/* Slots Header */}
      <View style={tw`mb-2`}>
        <Text style={tw`text-gray-900 font-bold text-base`}>
            Available Slots
        </Text>
      </View>
      
      {!user && (
        <Text style={tw`text-red-500 bg-red-50 p-2 rounded-lg mb-3 text-center text-xs font-medium`}>
              Please log in to book.
        </Text>
      )}

      {loadingSlots ? (
        <View style={tw`flex-row flex-wrap justify-between`}>
          {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonSlot key={i} />)}
        </View>
      ) : (
        <FlatList
          data={slots}
          keyExtractor={(item) => item.id}
          renderItem={renderSlot}
          numColumns={3}
          scrollEnabled={false}
          columnWrapperStyle={tw`justify-start`}
          ListEmptyComponent={
              <View style={tw`items-center py-8 w-full`}>
                <MaterialCommunityIcons name="calendar-remove" size={32} color="#d1d5db" />
                <Text style={tw`text-center text-gray-400 text-xs mt-1`}>No slots available.</Text>
              </View>
          }
        />
      )}

      {/* Calendar Modal */}
      <Modal visible={showCalendar} transparent animationType="fade">
          <View style={tw`flex-1 bg-black/60 justify-center items-center p-5`}>
              <View style={tw`bg-white w-full rounded-2xl p-4 shadow-2xl`}>
                  <View style={tw`flex-row justify-between items-center mb-4`}>
                      <Text style={tw`text-base font-bold text-gray-800`}>Select Booking Date</Text>
                      <Pressable onPress={() => setShowCalendar(false)}>
                          <Ionicons name="close-circle" size={24} color="#9ca3af" />
                      </Pressable>
                  </View>
                  <Calendar
                    current={selectedDate.format('YYYY-MM-DD')}
                    minDate={moment().format('YYYY-MM-DD')}
                    onDayPress={(day) => {
                        setSelectedDate(moment(day.dateString));
                        setShowCalendar(false);
                    }}
                    markedDates={{
                        [selectedDate.format('YYYY-MM-DD')]: {selected: true, selectedColor: tw.color('green-600')}
                    }}
                  />
              </View>
          </View>
      </Modal>

    </View>
  );
}