import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
} from 'react-native';
import tw from 'twrnc';
import { Calendar } from 'react-native-calendars';
import { db } from '../../../firebase/firebaseConfig';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { useAuth } from '../../../context/AuthContext';
import { useLocalSearchParams } from 'expo-router';
import moment from 'moment';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

// 🕒 Helper: Get today's date as string
const getTodayString = () => moment().format('YYYY-MM-DD');

// 🕓 Helper: Generate 24-hour slots
const generateTimeSlots = (existingSlotsMap = {}, dateStr) => {
  const slotsArray = [];
  let currentMoment = moment(dateStr, 'YYYY-MM-DD').startOf('day');
  const endMoment = currentMoment.clone().add(1, 'day');

  while (currentMoment.isBefore(endMoment)) {
    const hourKey = currentMoment.format('HH');
    const status = existingSlotsMap[hourKey] || 'available';
    slotsArray.push({
      hour: hourKey,
      timeDisplay: currentMoment.format('h:00 A'),
      status,
    });
    currentMoment.add(1, 'hour');
  }

  return slotsArray;
};

// 🧩 Main Component: Court Slot Maintenance
export default function MaintenanceScreen() {
  const { user } = useAuth();
  const { courtId } = useLocalSearchParams();

  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [toggledSlots, setToggledSlots] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && courtId) fetchSlots(selectedDate);
  }, [selectedDate, courtId, user]);

  // 🔹 Fetch slots for selected date
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
      Alert.alert('Error', 'Could not fetch time slots.');
    } finally {
      setLoadingSlots(false);
    }
  };

  // 🔸 Toggle slot (block/unblock)
  const handleToggleSlot = (hour, currentStatus) => {
    if (currentStatus !== 'available' && currentStatus !== 'unavailable') {
      Alert.alert(
        'Slot Booked',
        'This slot is booked by a player. You must cancel it from the dashboard.'
      );
      return;
    }

    setToggledSlots((prev) => {
      const updated = { ...prev };
      if (updated[hour]) delete updated[hour];
      else updated[hour] = true;
      return updated;
    });
  };

  // 💾 Save blocked/unblocked changes
  const handleSaveChanges = async () => {
    const slotsToUpdate = Object.keys(toggledSlots);
    if (slotsToUpdate.length === 0) {
      Alert.alert('No Changes', "You haven't selected any slots to block/unblock.");
      return;
    }

    setIsSaving(true);
    const slotDocId = `${courtId}_${selectedDate}`;
    const slotRef = doc(db, 'court_slots', slotDocId);

    try {
      await runTransaction(db, async (transaction) => {
        const slotDoc = await transaction.get(slotRef);
        const slotsMap = slotDoc.exists() ? slotDoc.data().slots : {};

        for (const hour of slotsToUpdate) {
          const currentStatus = slotsMap[hour] || 'available';
          slotsMap[hour] =
            currentStatus === 'available' ? 'unavailable' : 'available';
        }

        transaction.set(
          slotRef,
          {
            courtId,
            ownerId: user.uid,
            date: selectedDate,
            slots: slotsMap,
          },
          { merge: true }
        );
      });

      Alert.alert('Success', 'Slot availability updated successfully.');
      fetchSlots(selectedDate);
    } catch (error) {
      console.error('Transaction failed:', error);
      Alert.alert('Error', 'Could not save slot changes.');
    } finally {
      setIsSaving(false);
    }
  };

  // 🎨 Render individual slot
  const renderSlot = ({ item }) => {
    const { hour, status, timeDisplay } = item;
    const isBooked = status !== 'available' && status !== 'unavailable';
    const isToggled = toggledSlots[hour];

    let slotStyle = tw`py-3 px-2 w-[30%] items-center rounded-lg border m-1`;
    let statusText = '';
    let iconName = '';

    if (isBooked) {
      slotStyle = tw.style(slotStyle, `bg-gray-300 border-gray-400 opacity-60`);
      statusText = 'Booked';
      iconName = 'lock-closed-outline';
    } else if (status === 'unavailable') {
      slotStyle = tw.style(slotStyle, `bg-red-100 border-red-300`);
      statusText = 'Blocked';
      iconName = 'close-circle-outline';
    } else {
      slotStyle = tw.style(slotStyle, `bg-green-100 border-green-300`);
      statusText = 'Available';
      iconName = 'checkmark-circle-outline';
    }

    if (isToggled) {
      slotStyle = tw.style(slotStyle, `bg-yellow-400 border-yellow-600`);
      statusText = status === 'available' ? 'Blocking...' : 'Unblocking...';
    }

    return (
      <Pressable
        style={slotStyle}
        onPress={() => handleToggleSlot(hour, status)}
        disabled={isBooked || isSaving}
      >
        <Ionicons name={iconName} size={18} color={tw.color('gray-700')} />
        <Text style={tw`font-bold text-sm text-gray-800 mt-1`}>{timeDisplay}</Text>
        <Text style={tw`text-xs text-gray-600`}>{statusText}</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <ScrollView>
        {/* 📅 Date Selector */}
        <View style={tw`bg-white p-5 m-3 rounded-lg shadow-md`}>
          <Text style={tw`text-lg font-bold text-gray-800 mb-2`}>Select Date</Text>
          <Calendar
            current={selectedDate}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            minDate={getTodayString()}
            markedDates={{
              [selectedDate]: {
                selected: true,
                selectedColor: tw.color('green-600'),
              },
            }}
            theme={{
              todayTextColor: tw.color('green-600'),
              arrowColor: tw.color('green-600'),
            }}
          />
        </View>

        {/* ⏰ Slot Grid */}
        <View style={tw`bg-white p-5 m-3 rounded-lg shadow-md`}>
          <Text style={tw`text-lg font-bold text-gray-800 mb-3`}>
            Tap slots to block/unblock
          </Text>
          {loadingSlots ? (
            <ActivityIndicator
              size="large"
              color={tw.color('gray-400')}
              style={tw`h-24`}
            />
          ) : (
            <FlatList
              data={slots}
              keyExtractor={(item) => item.hour}
              renderItem={renderSlot}
              numColumns={3}
              columnWrapperStyle={tw`justify-start`}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      {/* 💾 Save Button (Sticky bottom) */}
      <View style={tw`p-4 bg-white border-t border-gray-200`}>
        <Pressable
          style={tw.style(
            `bg-green-600 py-3 rounded-lg shadow-md`,
            isSaving && `bg-green-300`,
            Object.keys(toggledSlots).length === 0 && `bg-gray-300`
          )}
          onPress={handleSaveChanges}
          disabled={isSaving || Object.keys(toggledSlots).length === 0}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={tw`text-white text-center text-lg font-bold`}>
              Save {Object.keys(toggledSlots).length} Changes
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
