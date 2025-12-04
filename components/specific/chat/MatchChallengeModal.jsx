import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import moment from 'moment';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import tw from 'twrnc';
import { db } from '../../../firebase/firebaseConfig';

export default function MatchChallengeModal({ visible, onClose, onSubmit }) {
  const [loadingArenas, setLoadingArenas] = useState(false);
  const [arenas, setArenas] = useState([]);
  const [selectedArena, setSelectedArena] = useState(null); 

  const [loadingCourts, setLoadingCourts] = useState(false);
  const [courts, setCourts] = useState([]);
  const [selectedCourt, setSelectedCourt] = useState(null);

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]); 
  const [selectedSlot, setSelectedSlot] = useState(null); 

  useEffect(() => {
    if (visible) {
      fetchArenas();
      setSelectedArena(null);
      setSelectedCourt(null);
      setSelectedSlot(null);
      setCourts([]);
      setAvailableSlots([]);
    }
  }, [visible]);

  const fetchArenas = async () => {
    setLoadingArenas(true);
    try {
      const q = query(
        collection(db, "users"),
        where("role", "==", "owner"),
        where("status", "==", "approved")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        label: doc.data().arenaName || doc.data().name, 
        value: doc.id, 
        // === 1. ADDRESS CAPTURE KAREIN ===
        address: doc.data().arenaAddress || doc.data().city || "Location not found" 
      }));
      setArenas(data);
    } catch (error) {
      console.error("Error fetching arenas:", error);
    } finally {
      setLoadingArenas(false);
    }
  };

  const handleArenaChange = async (item) => {
    setSelectedArena(item);
    setSelectedCourt(null);
    setSelectedSlot(null);
    setAvailableSlots([]);
    
    setLoadingCourts(true);
    try {
      const q = query(
        collection(db, "courts"),
        where("ownerId", "==", item.value), 
        where("status", "==", "approved")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        label: doc.data().courtName,
        value: doc.id,
        price: doc.data().pricePerHour
      }));
      setCourts(data);
    } catch (error) {
      console.error("Error fetching courts:", error);
    } finally {
      setLoadingCourts(false);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
      setSelectedSlot(null); 
      if (selectedCourt) {
        fetchSlots(selectedCourt.value, selectedDate);
      }
    }
  };

  const fetchSlots = async (courtId, selectedDate) => {
    setLoadingSlots(true);
    try {
      const allHours = Array.from({ length: 24 }, (_, i) => i); 
      const dateString = moment(selectedDate).format("YYYY-MM-DD");
      const slotDocId = `${courtId}_${dateString}`; 
      
      const slotDocRef = doc(db, "court_slots", slotDocId);
      const slotDocSnap = await getDoc(slotDocRef);

      let bookedHours = [];
      if (slotDocSnap.exists()) {
        const data = slotDocSnap.data();
        if (data.slots) {
          bookedHours = Object.keys(data.slots).map(Number);
        }
      }

      const currentHour = new Date().getHours();
      const isToday = moment(selectedDate).isSame(new Date(), 'day');

      const freeSlots = allHours.filter(hour => {
        if (bookedHours.includes(hour)) return false; 
        if (isToday && hour <= currentHour) return false; 
        return true;
      });

      setAvailableSlots(freeSlots);

    } catch (error) {
      console.error("Error fetching slots:", error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleCourtChange = (item) => {
    setSelectedCourt(item);
    fetchSlots(item.value, date);
  };

  const handleSubmit = () => {
    if (!selectedArena || !selectedCourt || selectedSlot === null) {
      Alert.alert("Missing Details", "Please select Arena, Court, Date and Time.");
      return;
    }

    const finalDate = new Date(date);
    finalDate.setHours(selectedSlot);
    finalDate.setMinutes(0);
    finalDate.setSeconds(0);

    onSubmit({
      arenaName: selectedArena.label,
      // === 2. ADDRESS PASS KAREIN ===
      arenaAddress: selectedArena.address, 
      courtName: selectedCourt.label,
      matchDate: finalDate, 
    });
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={tw`flex-1 justify-end bg-black/60`}>
        <View style={tw`bg-white rounded-t-3xl p-6 h-[85%]`}>
          
          <View style={tw`flex-row justify-between items-center mb-6`}>
            <Text style={tw`text-xl font-bold text-gray-800`}>Setup Challenge 🏆</Text>
            <Pressable onPress={onClose} style={tw`p-2 bg-gray-100 rounded-full`}>
              <Ionicons name="close" size={20} color="gray" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            
            {/* Arena Dropdown */}
            <Text style={tw`text-sm font-bold text-gray-500 mb-2 uppercase`}>Select Arena</Text>
            <Dropdown
              style={tw`bg-gray-100 p-3 rounded-xl mb-4 border border-gray-200`}
              placeholderStyle={tw`text-gray-500 text-base`}
              selectedTextStyle={tw`text-gray-800 text-base font-bold`}
              data={arenas}
              labelField="label"
              valueField="value"
              placeholder={loadingArenas ? "Loading Arenas..." : "Select Arena"}
              value={selectedArena}
              onChange={handleArenaChange}
              renderLeftIcon={() => (
                <Ionicons name="location" size={20} color={tw.color('blue-600')} style={tw`mr-2`} />
              )}
            />

            {/* Court Dropdown */}
            {selectedArena && (
              <>
                <Text style={tw`text-sm font-bold text-gray-500 mb-2 uppercase`}>Select Court</Text>
                <Dropdown
                  style={tw`bg-gray-100 p-3 rounded-xl mb-4 border border-gray-200`}
                  placeholderStyle={tw`text-gray-500 text-base`}
                  selectedTextStyle={tw`text-gray-800 text-base font-bold`}
                  data={courts}
                  labelField="label"
                  valueField="value"
                  placeholder={loadingCourts ? "Loading Courts..." : "Select Court"}
                  value={selectedCourt}
                  onChange={handleCourtChange}
                  renderLeftIcon={() => (
                    <Ionicons name="tennisball" size={20} color={tw.color('green-600')} style={tw`mr-2`} />
                  )}
                />
              </>
            )}

            {/* Date Picker */}
            {selectedCourt && (
              <>
                <Text style={tw`text-sm font-bold text-gray-500 mb-2 uppercase`}>Select Date</Text>
                <Pressable 
                  onPress={() => setShowDatePicker(true)}
                  style={tw`bg-gray-100 p-4 rounded-xl flex-row items-center border border-gray-200 mb-4`}
                >
                  <Ionicons name="calendar" size={20} color="gray" />
                  <Text style={tw`ml-3 text-gray-800 font-bold text-base`}>
                    {moment(date).format("dddd, MMMM Do YYYY")}
                  </Text>
                </Pressable>
                {showDatePicker && (
                  <DateTimePicker 
                    value={date} 
                    mode="date" 
                    display="default" 
                    onChange={handleDateChange} 
                    minimumDate={new Date()} 
                  />
                )}
              </>
            )}

            {/* Slot Grid */}
            {selectedCourt && (
              <>
                <Text style={tw`text-sm font-bold text-gray-500 mb-2 uppercase`}>Available Slots</Text>
                
                {loadingSlots ? (
                  <ActivityIndicator size="small" color="blue" />
                ) : availableSlots.length === 0 ? (
                  <View style={tw`bg-red-50 p-4 rounded-lg`}>
                    <Text style={tw`text-red-500 text-center`}>No slots available for this date.</Text>
                  </View>
                ) : (
                  <View style={tw`flex-row flex-wrap`}>
                    {availableSlots.map((hour) => (
                      <Pressable
                        key={hour}
                        onPress={() => setSelectedSlot(hour)}
                        style={tw.style(
                          `px-4 py-3 rounded-lg mr-2 mb-2 border`,
                          selectedSlot === hour 
                            ? `bg-blue-600 border-blue-600` 
                            : `bg-white border-gray-300`
                        )}
                      >
                        <Text style={tw.style(
                          `font-bold`,
                          selectedSlot === hour ? `text-white` : `text-gray-700`
                        )}>
                          {moment().hour(hour).minute(0).format("h:00 A")}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            )}

          </ScrollView>

          <View style={tw`mt-4 pt-4 border-t border-gray-100`}>
            <Pressable 
                onPress={handleSubmit}
                style={tw.style(
                    `py-4 rounded-xl items-center shadow-lg`,
                    (!selectedSlot) ? `bg-gray-300` : `bg-blue-600`
                )}
                disabled={!selectedSlot}
            >
                <Text style={tw`text-white font-bold text-lg`}>Send Challenge 🚀</Text>
            </Pressable>
          </View>

        </View>
      </View>
    </Modal>
  );
}