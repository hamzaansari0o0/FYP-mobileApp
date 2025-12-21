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

  if (loading) return <View style={tw`flex-1 items-center justify-center bg-white`}><ActivityIndicator size="large" color={tw.color("green-600")} /></View>;
  if (!court) return null;

  // Image Logic (Same as fixed before)
  let imageUri = "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2836&auto=format&fit=crop"; 
  if (court?.images && Array.isArray(court.images) && court.images.length > 0) imageUri = court.images[0];
  else if (court?.image) imageUri = court.image;
  else if (court?.imageUrl) imageUri = court.imageUrl;
  
  const totalSlots = selectedSlots.length;
  const totalPrice = totalSlots * court.pricePerHour;

  return (
    <View style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <ScrollView contentContainerStyle={tw`pb-32`}> 
        
        {/* Court Image Header */}
        <ImageBackground
            source={{ uri: imageUri }} 
            style={tw`h-72 w-full justify-end bg-gray-900`} // Size h-80 se h-72 wapis kar diya (Compact)
            resizeMode="cover"
        >
            <View style={tw`absolute inset-0 bg-black/50`} /> 
            
            <View style={tw`p-5 pb-8`}>
                <Pressable 
                    onPress={() => router.back()} 
                    style={tw`absolute -top-52 left-5 bg-white/20 p-2 rounded-full backdrop-blur-md`}
                >
                    <Ionicons name="arrow-back" size={20} color="white" />
                </Pressable>

                <View style={tw`bg-green-600 self-start px-2 py-0.5 rounded mb-2`}>
                   <Text style={tw`text-white font-bold text-[10px] uppercase tracking-wider`}>
                       {court.arenaName}
                   </Text>
                </View>
                
                {/* Font Size Reduced: text-3xl -> text-2xl */}
                <Text style={tw`text-white text-2xl font-extrabold mb-1 shadow-md`}>
                    {court.courtName}
                </Text>
                
                <View style={tw`flex-row items-center mt-0.5`}>
                    <Ionicons name="location" size={14} color="#e5e7eb" />
                    {/* Address Text Reduced: text-sm -> text-xs */}
                    <Text style={tw`text-gray-200 ml-1 text-xs font-medium`}>
                        {court.displayAddress}
                    </Text>
                </View>
            </View>
        </ImageBackground>

        <View style={tw`px-4 pt-6 -mt-6 bg-white rounded-t-3xl shadow-lg`}>
            <SlotPicker
                courtId={courtId}
                courtData={{...court, image: imageUri}}
                onSlotsChange={handleSlotsChange}
                refreshKey={refreshKey}
            />
        </View>

      </ScrollView>

      {/* Sticky Footer */}
      <View style={tw`absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 pb-6 shadow-2xl`}>
        <View style={tw`flex-row items-center justify-between`}>
            <View>
                {totalSlots > 0 ? (
                    <>
                    <Text style={tw`text-gray-500 text-[10px] uppercase font-bold`}>Total ({totalSlots} Slots)</Text>
                    {/* Price Font Reduced: text-2xl -> text-xl */}
                    <Text style={tw`text-xl font-extrabold text-green-700`}>
                        Rs. {totalPrice}
                    </Text>
                    </>
                ) : (
                    <>
                    <Text style={tw`text-gray-500 text-[10px] uppercase font-bold`}>Price per hour</Text>
                    <Text style={tw`text-xl font-extrabold text-gray-800`}>
                        Rs. {court.pricePerHour}
                    </Text>
                    </>
                )}
            </View>

            <Pressable
                onPress={() => setIsPaymentModalVisible(true)}
                disabled={totalSlots === 0 || !user}
                style={tw.style(
                    `bg-gray-900 px-6 py-3 rounded-xl shadow-lg flex-row items-center`,
                    (totalSlots === 0 || !user) && `opacity-50 bg-gray-400`
                )}
            >
                <Text style={tw`text-white font-bold text-base mr-2`}>
                    {user ? "Book Now" : "Login"}
                </Text>
                {user && <Ionicons name="arrow-forward" size={18} color="white" />}
            </Pressable>
        </View>
      </View>

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