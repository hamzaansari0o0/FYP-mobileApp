import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View
} from "react-native";
import tw from "twrnc";

import PaymentModal from "../../../components/specific/PaymentModal";
import SlotPicker from "../../../components/specific/SlotPicker";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase/firebaseConfig";

export default function CourtDetailScreen() {
  const { courtId } = useLocalSearchParams();
  const { user, userData } = useAuth();
  const router = useRouter();

  const [court, setCourt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // 🔥 State: To handle loading when locking slots
  const [isLocking, setIsLocking] = useState(false);

  // --- Fetch Court ---
  useEffect(() => {
    if (!courtId) return;
    const fetchCourtAndOwnerDetails = async () => {
      setLoading(true);
      try {
        const courtRef = doc(db, "courts", courtId);
        const courtSnap = await getDoc(courtRef);

        if (courtSnap.exists()) {
          const courtData = courtSnap.data();
          
          if (courtData.status !== "approved") {
            Alert.alert("Not Available", "This court is disabled.");
            router.back();
            return;
          }
          
          let ownerArenaName = "Sports Arena";
          let ownerArenaAddress = "";
          
          if (courtData.ownerId) {
            const ownerSnap = await getDoc(doc(db, "users", courtData.ownerId));
            if (ownerSnap.exists()) {
              const ownerData = ownerSnap.data();
              ownerArenaName = ownerData.arenaName || ownerArenaName;
              ownerArenaAddress = ownerData.arenaAddress || "";
            }
          }
          
          setCourt({
            ...courtData,
            arenaName: courtData.arenaName || ownerArenaName,
            displayAddress: courtData.address || ownerArenaAddress || "Location Available"
          });
        } else {
          Alert.alert("Error", "Court not found.");
        }
      } catch (error) {
        console.error("Error fetching details: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourtAndOwnerDetails();
  }, [courtId]);

  const handleSlotsChange = (slots) => setSelectedSlots(slots);

  // ==========================================
  // 🔥 LOGIC 1: LOCK SLOTS (Book Now Press) - FIXED
  // ==========================================
  const handleLockAndShowModal = async () => {
    if (!user || selectedSlots.length === 0) return;
    
    setIsLocking(true);
    const bookingDateStr = selectedSlots[0].dateStr;
    const slotDocId = `${courtId}_${bookingDateStr}`;
    const slotRef = doc(db, "court_slots", slotDocId);

    try {
        await runTransaction(db, async (transaction) => {
            const slotDoc = await transaction.get(slotRef);
            
            // ✅ Fix: Agar doc nahi hai to empty object lo, Error mat phenko
            let slotsMap = {};
            if (slotDoc.exists()) {
                slotsMap = slotDoc.data().slots || {};
            }

            // Check availability
            for (const slot of selectedSlots) {
                const currentStatus = slotsMap[slot.hour];
                if (currentStatus && currentStatus !== "available") {
                    throw new Error(`Slot ${slot.timeDisplay} is already taken!`);
                }
            }

            // Update local map to 'pending_payment'
            const newSlotsMap = { ...slotsMap };
            selectedSlots.forEach(slot => {
                newSlotsMap[slot.hour] = "pending_payment"; 
            });

            // ✅ Fix: 'set' use karein with merge: true (Creates new doc if missing)
            transaction.set(slotRef, { 
                courtId: courtId, 
                date: bookingDateStr,
                slots: newSlotsMap 
            }, { merge: true });
        });

        // Transaction Success -> Open Modal
        setIsPaymentModalVisible(true);

    } catch (error) {
        Alert.alert("Slot Unavailable", error.message || "Someone just grabbed this slot.");
        setRefreshKey(prev => prev + 1);
        setSelectedSlots([]);
    } finally {
        setIsLocking(false);
    }
  };

  // ==========================================
  // 🔥 LOGIC 2: UNLOCK SLOTS (Cancel/Close Modal)
  // ==========================================
  const handleUnlockSlots = async () => {
    if (selectedSlots.length === 0) {
        setIsPaymentModalVisible(false);
        return;
    }

    const bookingDateStr = selectedSlots[0].dateStr;
    const slotDocId = `${courtId}_${bookingDateStr}`;
    const slotRef = doc(db, "court_slots", slotDocId);

    try {
        const updates = {};
        selectedSlots.forEach(slot => {
            updates[`slots.${slot.hour}`] = "available";
        });

        await updateDoc(slotRef, updates);
        
    } catch (error) {
        console.error("Error unlocking slots:", error);
    } finally {
        setIsPaymentModalVisible(false);
    }
  };

  // ==========================================
  // 🔥 LOGIC 3: CONFIRM PAYMENT (Final Booking)
  // ==========================================
  const handleConfirmPayment = async () => {
    if (!user || selectedSlots.length === 0 || !court) return;

    const bookingDateStr = selectedSlots[0].dateStr;
    const slotDocId = `${courtId}_${bookingDateStr}`;
    const slotRef = doc(db, "court_slots", slotDocId);
    const bookingCollectionRef = collection(db, "bookings");
    const totalCost = selectedSlots.length * court.pricePerHour;

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Sanity Check
        const slotDoc = await transaction.get(slotRef);
        if (!slotDoc.exists()) throw new Error("Slot data missing."); // Ab doc hona lazmi hai

        let slotsMap = slotDoc.data().slots || {};
        const hoursToBook = [];
        const timeDisplays = [];

        for (const slot of selectedSlots) {
            const status = slotsMap[slot.hour];
            
            // Allow if status is 'available' OR 'pending_payment' (locked by us)
            if (status !== "available" && status !== "pending_payment") {
                throw new Error(`Slot ${slot.timeDisplay} was taken by someone else.`);
            }
            
            hoursToBook.push(slot.hour);
            timeDisplays.push(slot.timeDisplay);
            slotsMap[slot.hour] = user.uid; // Finalize with User ID
        }

        // 2. Update Slots to Booked
        transaction.set(slotRef, {
            courtId: courtId,
            ownerId: court.ownerId,
            date: bookingDateStr,
            slots: slotsMap,
          }, { merge: true });

        // 3. Create Booking Record
        const newBookingData = {
          playerId: user.uid,
          playerName: userData?.name || "Player",
          courtId: courtId,
          ownerId: court.ownerId,
          arenaName: court.arenaName,
          courtName: court.courtName,
          address: court.displayAddress,
          date: bookingDateStr,
          bookedHours: hoursToBook,
          timeDisplayRange: timeDisplays.join(", "),
          status: "upcoming",
          paymentStatus: "paid_full",
          totalPrice: totalCost,
          amountPaid: totalCost,
          pendingBalance: 0,
          playerRefundAccount: "Online Payment (Gateway)",
          createdAt: serverTimestamp(),
          slotCount: selectedSlots.length
        };
        transaction.set(doc(bookingCollectionRef), newBookingData);
      });

      // Success
      setIsPaymentModalVisible(false); 
      setSelectedSlots([]); 
      setRefreshKey((prev) => prev + 1);
      Alert.alert("Success", "Booking confirmed successfully!");

    } catch (error) {
      Alert.alert("Booking Failed", error.message);
      // Agar fail hua, to unlock logic chalega jab user modal close karega
    }
  };

  if (loading) return <View style={tw`flex-1 items-center justify-center bg-gray-50`}><ActivityIndicator size="large" color="#15803d" /></View>;
  if (!court) return null;

  const imageSource = court.courtImageURL 
    ? { uri: court.courtImageURL } 
    : (court.courtImageUrl 
        ? { uri: court.courtImageUrl }
        : (court.image 
            ? { uri: court.image } 
            : { uri: "https://via.placeholder.com/600x400?text=No+Image" }
          )
      );

  const totalSlots = selectedSlots.length;
  const totalPrice = totalSlots * court.pricePerHour;

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <ScrollView 
        style={tw`flex-1`} 
        contentContainerStyle={tw`pb-40`} 
      > 
        {/* Header Image */}
        <ImageBackground
            source={imageSource} 
            style={tw`h-80 w-full justify-end bg-green-900`} 
            resizeMode="cover"
        >
            <View style={tw`absolute inset-0 bg-black/40`} /> 
            
            <Pressable 
                onPress={() => router.back()} 
                style={tw`absolute top-12 left-5 bg-black/30 p-2.5 rounded-full border border-white/20`}
            >
                <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            
            <View style={tw`p-5 pb-8`}>
                <View style={tw`bg-green-600 self-start px-2.5 py-1 rounded-md mb-2 shadow-sm`}>
                   <Text style={tw`text-white font-bold text-[10px] uppercase tracking-wider`}>
                       {court.arenaName}
                   </Text>
                </View>
                
                <Text style={tw`text-white text-3xl font-black mb-1 shadow-sm`}>
                    {court.courtName}
                </Text>
                
                <View style={tw`flex-row items-center mt-0.5 opacity-90`}>
                    <Ionicons name="location" size={16} color="#4ade80" />
                    <Text style={tw`text-gray-100 ml-1 text-sm font-medium`}>
                        {court.displayAddress}
                    </Text>
                </View>
            </View>
        </ImageBackground>

        {/* Slot Picker */}
        <View style={tw`px-4 pt-6 -mt-8 bg-gray-50 rounded-t-3xl shadow-lg min-h-[300px]`}>
            <SlotPicker
                courtId={courtId}
                courtData={{...court, image: imageSource.uri}} 
                onSlotsChange={handleSlotsChange}
                refreshKey={refreshKey}
            />
        </View>

        {/* Booking & Price Section */}
        <View style={tw`mx-4 mt-8 bg-white p-4 rounded-xl shadow-md border border-gray-100`}>
            <View style={tw`flex-row items-center justify-between`}>
                <View>
                    {totalSlots > 0 ? (
                        <>
                        <Text style={tw`text-gray-500 text-[10px] uppercase font-bold tracking-wide`}>Total ({totalSlots} Slots)</Text>
                        <Text style={tw`text-2xl font-black text-green-900`}>
                            Rs. {totalPrice}
                        </Text>
                        </>
                    ) : (
                        <>
                        <Text style={tw`text-gray-500 text-[10px] uppercase font-bold tracking-wide`}>Price per hour</Text>
                        <Text style={tw`text-2xl font-black text-green-900`}>
                            Rs. {court.pricePerHour}
                        </Text>
                        </>
                    )}
                </View>

                {/* Lock Button */}
                <Pressable
                    onPress={handleLockAndShowModal}
                    disabled={totalSlots === 0 || !user || isLocking}
                    style={({pressed}) => tw.style(
                        `px-6 py-3.5 rounded-xl flex-row items-center shadow-sm`,
                        (totalSlots === 0 || !user || isLocking) ? `bg-gray-300` : (pressed ? `bg-green-900` : `bg-green-800`)
                    )}
                >
                    {isLocking ? (
                         <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <View style={tw`flex-row items-center`}>
                            <Text style={tw`text-white font-bold text-base mr-2`}>
                                {user ? "Book Now" : "Login"}
                            </Text>
                            {user && <Ionicons name="arrow-forward" size={18} color="white" />}
                        </View>
                    )}
                </Pressable>
            </View>
        </View>

      </ScrollView>

      {/* Payment Modal */}
      {selectedSlots.length > 0 && (
        <PaymentModal
          visible={isPaymentModalVisible}
          onClose={handleUnlockSlots} // Pass Unlock logic here
          onConfirmPayment={handleConfirmPayment}
          bookingDetails={{
            arenaName: court.arenaName,
            courtName: court.courtName,
            date: selectedSlots[0].dateStr,
            timeDisplay: selectedSlots.map(s => s.timeDisplay).join(", "),
            totalPrice: totalPrice,
            slotCount: totalSlots
          }}
        />
      )}
    </View>
  );
}