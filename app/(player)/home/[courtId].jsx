import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp
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

  const handleConfirmPayment = async (refundAccount) => {
    if (!user || selectedSlots.length === 0 || !court) return;

    const bookingDateStr = selectedSlots[0].dateStr;
    const slotDocId = `${courtId}_${bookingDateStr}`;
    const slotRef = doc(db, "court_slots", slotDocId);
    const bookingCollectionRef = collection(db, "bookings");
    const totalCost = selectedSlots.length * court.pricePerHour;

    try {
      await runTransaction(db, async (transaction) => {
        const slotDoc = await transaction.get(slotRef);
        let slotsMap = slotDoc.exists() ? slotDoc.data().slots || {} : {};
        const hoursToBook = [];
        const timeDisplays = [];

        for (const slot of selectedSlots) {
            if (slotsMap[slot.hour] && slotsMap[slot.hour] !== "available") {
                throw new Error(`Slot ${slot.timeDisplay} is no longer available.`);
            }
            hoursToBook.push(slot.hour);
            timeDisplays.push(slot.timeDisplay);
            slotsMap[slot.hour] = user.uid; 
        }

        transaction.set(slotRef, {
            courtId: courtId,
            ownerId: court.ownerId,
            date: bookingDateStr,
            slots: slotsMap,
          }, { merge: true });

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
          playerRefundAccount: refundAccount,
          createdAt: serverTimestamp(),
          slotCount: selectedSlots.length
        };
        transaction.set(doc(bookingCollectionRef), newBookingData);
      });
      setIsPaymentModalVisible(false);
      setSelectedSlots([]); 
      setRefreshKey((prev) => prev + 1);
      Alert.alert("Success", "Booking confirmed successfully!");
    } catch (error) {
      Alert.alert("Booking Failed", error.message);
    }
  };

  if (loading) return <View style={tw`flex-1 items-center justify-center bg-gray-50`}><ActivityIndicator size="large" color="#15803d" /></View>;
  if (!court) return null;

  // Image Logic
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
      
      {/* 🔥 ScrollView contains EVERYTHING now */}
      <ScrollView 
        style={tw`flex-1`} 
        // 🔥 Extra padding bottom (pb-40) taake button tab bar ke upar clear nazar aaye
        contentContainerStyle={tw`pb-40`} 
      > 
        
        {/* Court Image Header */}
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

        {/* Slot Picker Content */}
        <View style={tw`px-4 pt-6 -mt-8 bg-gray-50 rounded-t-3xl shadow-lg min-h-[300px]`}>
            <SlotPicker
                courtId={courtId}
                courtData={{...court, image: imageSource.uri}} 
                onSlotsChange={handleSlotsChange}
                refreshKey={refreshKey}
            />
        </View>

        {/* 🔥 BOOKING SECTION (Moved INSIDE ScrollView) */}
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

                <Pressable
                    onPress={() => setIsPaymentModalVisible(true)}
                    disabled={totalSlots === 0 || !user}
                    style={({pressed}) => tw.style(
                        `px-6 py-3.5 rounded-xl flex-row items-center shadow-sm`,
                        (totalSlots === 0 || !user) ? `bg-gray-300` : (pressed ? `bg-green-900` : `bg-green-800`)
                    )}
                >
                    <Text style={tw`text-white font-bold text-base mr-2`}>
                        {user ? "Book Now" : "Login"}
                    </Text>
                    {user && <Ionicons name="arrow-forward" size={18} color="white" />}
                </Pressable>
            </View>
        </View>

      </ScrollView>

      {/* Payment Modal */}
      {selectedSlots.length > 0 && (
        <PaymentModal
          visible={isPaymentModalVisible}
          onClose={() => setIsPaymentModalVisible(false)}
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