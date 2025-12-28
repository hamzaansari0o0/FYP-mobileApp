import { Feather, Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import moment from 'moment';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../firebase/firebaseConfig';

// ... (Helpers same as before: getTodayString, getNextDays, generateTimeSlots)
const getTodayString = () => moment().format('YYYY-MM-DD');

const getNextDays = () => {
  const dates = [];
  for (let i = 0; i < 14; i++) {
    dates.push(moment().add(i, 'days').format('YYYY-MM-DD'));
  }
  return dates;
};

const generateTimeSlots = (existingSlotsMap = {}, dateStr) => {
  const slotsArray = [];
  let currentMoment = moment(dateStr, 'YYYY-MM-DD').startOf('day');
  const endMoment = currentMoment.clone().add(1, 'day');
  const now = moment();
  const isToday = dateStr === now.format('YYYY-MM-DD');
  const currentHour = now.hour();

  while (currentMoment.isBefore(endMoment)) {
    const hourKey = currentMoment.format('HH');
    const hourInt = parseInt(hourKey);
    const status = existingSlotsMap[hourKey] || 'available';
    const isNight = hourInt < 6 || hourInt >= 18;
    const isExpired = isToday && hourInt < currentHour;
    slotsArray.push({
      hour: hourKey,
      timeDisplay: currentMoment.format('h A'),
      status,
      isNight,
      isExpired
    });
    currentMoment.add(1, 'hour');
  }
  return slotsArray;
};

export default function MaintenanceScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { courtId } = useLocalSearchParams();

  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [showCalendar, setShowCalendar] = useState(false);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [toggledSlots, setToggledSlots] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  
  const dateList = getNextDays();
  const scrollRef = useRef(null);

  useEffect(() => {
    if (user && courtId) fetchSlots(selectedDate);
  }, [selectedDate, courtId, user]);

  const fetchSlots = async (dateStr) => {
    setLoadingSlots(true);
    setToggledSlots({});
    setSlots([]);
    try {
      const docId = `${courtId}_${dateStr}`;
      const slotDocRef = doc(db, 'court_slots', docId);
      const docSnap = await getDoc(slotDocRef);
      const daySlotsMap = docSnap.exists() ? docSnap.data().slots : {};
      const slotsArray = generateTimeSlots(daySlotsMap, dateStr);
      setSlots(slotsArray);
    } catch (error) {
      console.error('Error fetching slots:', error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleToggleSlot = (hour, currentStatus) => {
    if (currentStatus !== 'available' && currentStatus !== 'unavailable') {
      Alert.alert('Booked', 'Please cancel the booking to free this slot.');
      return;
    }
    setToggledSlots((prev) => {
      const updated = { ...prev };
      if (updated[hour]) delete updated[hour];
      else updated[hour] = true;
      return updated;
    });
  };

  const handleSaveChanges = async () => {
    const slotsToUpdate = Object.keys(toggledSlots);
    if (slotsToUpdate.length === 0) return;
    setIsSaving(true);
    const slotDocId = `${courtId}_${selectedDate}`;
    const slotRef = doc(db, 'court_slots', slotDocId);
    try {
      await runTransaction(db, async (transaction) => {
        const slotDoc = await transaction.get(slotRef);
        const slotsMap = slotDoc.exists() ? slotDoc.data().slots : {};
        for (const hour of slotsToUpdate) {
          const currentStatus = slotsMap[hour] || 'available';
          slotsMap[hour] = currentStatus === 'available' ? 'unavailable' : 'available';
        }
        transaction.set(
          slotRef,
          { courtId, ownerId: user.uid, date: selectedDate, slots: slotsMap },
          { merge: true }
        );
      });
      fetchSlots(selectedDate);
    } catch (error) {
      Alert.alert('Error', 'Update failed.');
    } finally {
      setIsSaving(false);
    }
  };

  // 🟢 1. Save Button Component (Ab yeh footer banega)
  const renderFooter = () => (
    <View style={tw`px-4 pt-6 pb-2`}>
        <Pressable
          style={tw.style(
            `bg-green-700 py-4 rounded-2xl shadow-md flex-row justify-center items-center mb-2`, // Thora margin bottom extra diya
            (isSaving || Object.keys(toggledSlots).length === 0) && `bg-gray-300 shadow-none`
          )}
          onPress={handleSaveChanges}
          disabled={isSaving || Object.keys(toggledSlots).length === 0}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={tw`text-white text-base font-bold`}>
               {Object.keys(toggledSlots).length === 0 ? 'Tap Slots to Change' : `Save Changes`}
            </Text>
          )}
        </Pressable>
        {/* Helper Text */}
        <Text style={tw`text-center text-gray-400 text-xs`}>
            Changes will be reflected instantly in the user app.
        </Text>
    </View>
  );

  const renderSlot = ({ item }) => {
    // ... (Slot rendering logic same as before)
    const { hour, status, timeDisplay, isNight, isExpired } = item;
    const isBooked = status !== 'available' && status !== 'unavailable';
    const isPendingChange = toggledSlots[hour];

    let bgStyle = `bg-white border-gray-200`;
    let iconName = isNight ? 'moon-outline' : 'sunny-outline';
    let iconColor = isNight ? tw.color('indigo-300') : tw.color('orange-300');
    let statusText = 'Open';
    let statusTextColor = `text-gray-400`;
    let timeColor = `text-gray-800`;

    if (isExpired) {
        bgStyle = `bg-gray-100 border-gray-100 opacity-50`;
        statusText = 'Expired';
        timeColor = `text-gray-400`;
    } else if (isPendingChange) {
        bgStyle = `bg-orange-50 border-orange-300`;
        statusText = status === 'available' ? 'Block?' : 'Open?';
        statusTextColor = `text-orange-600 font-bold`;
        iconName = 'save-outline';
        iconColor = tw.color('orange-500');
    } else if (isBooked) {
        bgStyle = `bg-gray-200 border-gray-300`;
        statusText = 'Booked';
        statusTextColor = `text-gray-500 font-semibold`;
        iconName = 'lock-closed';
        iconColor = tw.color('gray-500');
    } else if (status === 'unavailable') {
        bgStyle = `bg-red-50 border-red-200`;
        statusText = 'Blocked';
        statusTextColor = `text-red-600 font-semibold`;
        iconName = 'ban-outline';
        iconColor = tw.color('red-500');
    } else {
        bgStyle = `bg-white border-green-200 shadow-sm`;
        statusText = 'Open';
        statusTextColor = `text-green-700 font-semibold`;
        iconName = isNight ? 'moon' : 'sunny';
        iconColor = isNight ? tw.color('indigo-500') : tw.color('orange-500');
    }

    return (
      <Pressable
        style={tw`w-[23%] m-[1%] aspect-square justify-center items-center rounded-xl border ${bgStyle}`}
        onPress={() => handleToggleSlot(hour, status)}
        disabled={isExpired || isBooked || isSaving}
      >
        <Ionicons name={iconName} size={14} color={iconColor} style={tw`mb-1`} />
        <Text style={tw`text-xs font-bold ${timeColor}`}>{timeDisplay}</Text>
        <Text style={tw`text-[9px] uppercase mt-0.5 ${statusTextColor}`}>{statusText}</Text>
      </Pressable>
    );
  };

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#14532d" translucent={false} />

      {/* HEADER */}
      <View style={{ backgroundColor: '#14532d' }}>
        <SafeAreaView edges={['top', 'left', 'right']} style={tw`pb-4 pt-2`}>
            <View style={tw`px-4 flex-row items-center gap-3 mb-4`}>
                <Pressable onPress={() => router.back()} style={tw`bg-white p-2 rounded-full shadow-sm`}>
                    <Ionicons name="arrow-back" size={20} color={tw.color('green-900')} />
                </Pressable>
                <Text style={tw`text-xl font-bold text-white`}>Manage Schedule</Text>
            </View>

            {/* DATE SCROLL */}
            <View>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={tw`px-4 gap-2 pr-6`}
                    ref={scrollRef}
                >
                    {dateList.map((date) => {
                        const isSelected = selectedDate === date;
                        const dayName = moment(date).format('ddd');
                        const dayNum = moment(date).format('DD');
                        return (
                            <Pressable
                                key={date}
                                onPress={() => setSelectedDate(date)}
                                style={tw`w-14 h-16 rounded-2xl justify-center items-center border ${
                                    isSelected ? 'bg-white border-white' : 'bg-green-800 border-green-700'
                                }`}
                            >
                                <Text style={tw`text-xs font-medium ${isSelected ? 'text-green-800' : 'text-green-200'}`}>
                                    {dayName}
                                </Text>
                                <Text style={tw`text-lg font-bold ${isSelected ? 'text-green-900' : 'text-white'}`}>
                                    {dayNum}
                                </Text>
                            </Pressable>
                        );
                    })}
                    <Pressable
                        onPress={() => setShowCalendar(true)}
                        style={tw`w-14 h-16 rounded-2xl justify-center items-center border border-green-700 bg-green-900 ml-1`}
                    >
                        <Feather name="calendar" size={20} color="white" />
                        <Text style={tw`text-[9px] font-bold text-green-100 mt-1`}>More</Text>
                    </Pressable>
                </ScrollView>
            </View>
            
            {!dateList.includes(selectedDate) && (
                <View style={tw`px-4 pt-2`}>
                    <Text style={tw`text-xs font-bold text-green-200`}>
                        Selected: {moment(selectedDate).format('MMMM Do, YYYY')}
                    </Text>
                </View>
            )}
        </SafeAreaView>
      </View>

      {/* --- GRID & FOOTER --- */}
      {loadingSlots ? (
        <View style={tw`flex-1 justify-center items-center`}>
            <ActivityIndicator size="large" color={tw.color('green-700')} />
        </View>
      ) : (
        <FlatList
            data={slots}
            keyExtractor={(item) => item.hour}
            renderItem={renderSlot}
            numColumns={4}
            columnWrapperStyle={tw`justify-start`}
            showsVerticalScrollIndicator={false}
            
            // 🟢 YAHAN HAI MAGIC:
            // 1. Button ko Footer bana diya (taake wo scroll ke end mein ho)
            ListFooterComponent={renderFooter}
            
            // 2. Padding Bottom itni di ke button floating Tab Bar ke oopar aa jaye
            // Tab Bar = 40 (bottom) + 70 (height) = 110px. 
            // Humne pb-36 (approx 144px) diya hai taake overlap na ho.
            contentContainerStyle={tw`p-2 pt-4 pb-36`} 
        />
      )}

      {/* CALENDAR MODAL */}
      <Modal visible={showCalendar} transparent animationType="fade">
        <Pressable 
            style={tw`flex-1 bg-black/60 justify-center items-center p-6`}
            onPress={() => setShowCalendar(false)}
        >
            <Pressable 
                style={tw`bg-white w-full rounded-2xl overflow-hidden shadow-2xl`} 
                onPress={() => {}} 
            >
                <View style={tw`bg-gray-50 p-4 border-b border-gray-100 flex-row justify-between items-center`}>
                    <Text style={tw`font-bold text-gray-800 text-lg`}>Select Date</Text>
                    <Pressable onPress={() => setShowCalendar(false)}>
                        <Ionicons name="close" size={24} color={tw.color('gray-500')} />
                    </Pressable>
                </View>
                <Calendar
                    current={selectedDate}
                    onDayPress={(day) => {
                        setSelectedDate(day.dateString);
                        setShowCalendar(false);
                    }}
                    minDate={getTodayString()}
                    theme={{
                        todayTextColor: tw.color('green-600'),
                        arrowColor: tw.color('green-700'),
                        selectedDayBackgroundColor: tw.color('green-600'),
                        selectedDayTextColor: 'white',
                    }}
                />
            </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
}