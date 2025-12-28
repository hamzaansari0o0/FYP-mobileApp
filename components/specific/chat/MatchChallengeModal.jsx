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
  const [allDaySlots, setAllDaySlots] = useState([]); 
  const [selectedSlot, setSelectedSlot] = useState(null); 

  useEffect(() => {
    if (visible) {
      fetchArenas();
      setSelectedArena(null);
      setSelectedCourt(null);
      setSelectedSlot(null);
      setCourts([]);
      setAllDaySlots([]);
      setDate(new Date());
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
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        const fullAddress = d.arenaAddress || `${d.area || ''}, ${d.city || ''}` || "Location info unavailable";
        return {
            label: d.arenaName || d.name, 
            value: doc.id, 
            address: fullAddress
        };
      });
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
    setAllDaySlots([]);
    
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
      
      const slots = Array.from({ length: 24 }, (_, i) => i).map(hour => {
        let status = 'available';

        if (bookedHours.includes(hour)) {
            status = 'booked';
        } else if (isToday && hour <= currentHour) {
            status = 'expired';
        }

        return { hour, status };
      });
      setAllDaySlots(slots);

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
      arenaAddress: selectedArena.address, 
      courtName: selectedCourt.label,
      matchDate: finalDate, 
    });
  };

  const get3DIcon = (hour, status) => {
      if (status === 'booked') return "🔒"; 
      if (status === 'expired') return "🛑"; 
      if (hour >= 6 && hour < 18) return "☀️"; 
      return "🌙"; 
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={tw`flex-1 justify-end bg-black/70`}>
        <View style={tw`bg-gray-50 rounded-t-3xl h-[92%] overflow-hidden`}>
          
          {/* Header */}
          <View style={tw`bg-white px-6 py-5 flex-row justify-between items-center border-b border-gray-100 shadow-sm z-10`}>
            <View>
                <Text style={tw`text-xl font-bold text-gray-900`}>Setup Challenge 🏆</Text>
                <Text style={tw`text-xs text-gray-400`}>Book a court & challenge your opponent</Text>
            </View>
            <Pressable onPress={onClose} style={tw`p-2 bg-gray-100 rounded-full`}>
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`p-6 pb-32`}>
            
            {/* 1. Arena Selection */}
            <Text style={tw`text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider ml-1`}>Select Arena</Text>
            <Dropdown
              style={tw`bg-white h-14 rounded-xl px-4 border border-gray-200 shadow-sm mb-5`} 
              placeholderStyle={tw`text-gray-400 text-sm`}
              selectedTextStyle={tw`text-gray-800 text-base font-bold`}
              inputSearchStyle={tw`h-10 text-base`}
              iconStyle={tw`w-5 h-5`}
              data={arenas}
              search
              maxHeight={250}
              labelField="label"
              valueField="value"
              placeholder={loadingArenas ? "Loading Arenas..." : "Choose an Arena"}
              searchPlaceholder="Search..."
              value={selectedArena}
              onChange={handleArenaChange}
              renderLeftIcon={() => (
                <Ionicons name="business" size={20} color="#15803d" style={tw`mr-3`} />
              )}
            />

            {/* 2. Court Selection */}
            {selectedArena && (
              <>
                <Text style={tw`text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider ml-1`}>Select Court</Text>
                <Dropdown
                  style={tw`bg-white h-14 rounded-xl px-4 border border-gray-200 shadow-sm mb-5`}
                  placeholderStyle={tw`text-gray-400 text-sm`}
                  selectedTextStyle={tw`text-gray-800 text-base font-bold`}
                  iconStyle={tw`w-5 h-5`}
                  data={courts}
                  maxHeight={200}
                  labelField="label"
                  valueField="value"
                  placeholder={loadingCourts ? "Loading Courts..." : "Choose a Court"}
                  value={selectedCourt}
                  onChange={handleCourtChange}
                  renderLeftIcon={() => (
                    <Ionicons name="tennisball" size={20} color="#15803d" style={tw`mr-3`} />
                  )}
                />
              </>
            )}

            {/* 3. Date Selection */}
            {selectedCourt && (
              <>
                <Text style={tw`text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider ml-1`}>Select Date</Text>
                <Pressable 
                  onPress={() => setShowDatePicker(true)}
                  style={tw`bg-white p-4 rounded-xl flex-row items-center border border-gray-200 shadow-sm mb-5 h-16`}
                >
                  <Ionicons name="calendar" size={22} color="#15803d" />
                  <View style={tw`ml-3`}>
                    <Text style={tw`text-gray-800 font-bold text-base`}>
                        {moment(date).format("dddd, MMM Do")}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color="gray" style={tw`ml-auto`} />
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

            {/* 4. Slot Selection Grid */}
            {selectedCourt && (
              <>
                <Text style={tw`text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider ml-1`}>Available Time Slots</Text>
                
                {loadingSlots ? (
                  <View style={tw`py-10`}>
                      <ActivityIndicator size="large" color="#166534" />
                  </View>
                ) : (
                  <View style={tw`flex-row flex-wrap justify-between`}>
                    {allDaySlots.map(({ hour, status }) => {
                        const isSelected = selectedSlot === hour;
                        const isBooked = status === 'booked';
                        const isExpired = status === 'expired';
                        const isDisabled = isBooked || isExpired;

                        // Styles Logic
                        let containerStyle = `bg-white border-gray-200 shadow-sm elevation-1`; 
                        let textStyle = `text-gray-600`;
                        
                        if (isSelected) {
                            containerStyle = `bg-green-600 border-green-600 shadow-md elevation-4 transform scale-105`; 
                            textStyle = `text-white`;
                        } else if (isBooked) {
                            containerStyle = `bg-red-50 border-red-100 opacity-60`; 
                            textStyle = `text-red-400`;
                        } else if (isExpired) {
                            containerStyle = `bg-gray-100 border-gray-100 opacity-40`; 
                            textStyle = `text-gray-400`;
                        }

                        return (
                          <Pressable
                            key={hour}
                            onPress={() => !isDisabled && setSelectedSlot(hour)}
                            disabled={isDisabled}
                            // Compact Sizing: h-20 (80px), mb-2, p-1.5
                            style={tw.style(
                              `w-[31%] mb-2 p-1.5 rounded-xl border items-center justify-center flex-col h-20`,
                              containerStyle
                            )}
                          >
                            {/* Smaller 3D Icon: text-2xl */}
                            <Text style={tw`text-2xl mb-1`}>
                                {get3DIcon(hour, status)}
                            </Text>

                            {/* Time Text */}
                            <Text style={tw.style(`font-bold text-xs`, textStyle)}>
                              {moment().hour(hour).minute(0).format("h A")}
                            </Text>

                            {/* Status Label (Tiny) */}
                            {isBooked && <Text style={tw`text-[8px] text-red-500 font-bold uppercase mt-0.5`}>Booked</Text>}
                            {isExpired && <Text style={tw`text-[8px] text-gray-500 font-bold uppercase mt-0.5`}>Closed</Text>}
                          </Pressable>
                        );
                    })}
                  </View>
                )}
              </>
            )}

          </ScrollView>

          {/* Fixed Bottom Button Area */}
          <View style={tw`absolute bottom-0 left-0 right-0 bg-white p-5 pt-4 pb-10 border-t border-gray-100 shadow-2xl`}>
            <Pressable 
                onPress={handleSubmit}
                style={tw.style(
                    `py-4 rounded-2xl items-center shadow-lg flex-row justify-center`,
                    (!selectedSlot) ? `bg-gray-200` : `bg-green-700 active:bg-green-800 elevation-5`
                )}
                disabled={!selectedSlot}
            >
                <Text style={tw.style(
                    `font-bold text-lg mr-2`,
                    (!selectedSlot) ? `text-gray-400` : `text-white`
                )}>
                    Send Challenge
                </Text>
                {selectedSlot && <Text style={tw`text-xl`}>🚀</Text>}
            </Pressable>
          </View>

        </View>
      </View>
    </Modal>
  );
}