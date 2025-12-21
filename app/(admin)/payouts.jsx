import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import {
  collection,
  doc,
  getDocs,
  increment,
  orderBy,
  query,
  runTransaction,
  Timestamp,
  where,
} from "firebase/firestore";
import moment from "moment";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase/firebaseConfig";
// 🔥 Notification Helper
import { notifyUser } from "../../utils/notifications";

// --- Payout Card Component ---
const PayoutCard = ({ booking, onApprove, isProcessing }) => {
  // --- NAYA HISAB (5% Admin Commission Model) ---
  const totalBookingPrice = booking.totalPrice || 0;
  const adminCommission = Math.round(totalBookingPrice * 0.05); // 5% Commission
  const ownerPayout = totalBookingPrice - adminCommission; // 95% to Owner

  return (
    <View style={tw`bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4`}>
      <View style={tw`flex-row justify-between items-start mb-2`}>
        <View>
          <Text style={tw`text-sm font-bold text-purple-800`}>BOOKING ID: {booking.id.slice(-6).toUpperCase()}</Text>
          <Text style={tw`text-base font-semibold text-gray-800 mt-1`}>
            {booking.playerName}
          </Text>
        </View>
        <View style={tw`bg-purple-100 px-2 py-1 rounded`}>
          <Text style={tw`text-xs font-bold text-purple-700`}>PENDING PAYOUT</Text>
        </View>
      </View>

      <Text style={tw`text-sm text-gray-600 mb-3`}>
        <Ionicons name="calendar-outline" size={14} /> {booking.date} | 
        <Ionicons name="time-outline" size={14} /> {moment(booking.slotTime, "HH").format("h:00 A")}
      </Text>

      <View style={tw`border-t border-gray-100 my-2 pt-2`} />

      <View style={tw`flex-row justify-between mb-1`}>
        <Text style={tw`text-sm text-gray-500`}>Total Booking Price:</Text>
        <Text style={tw`text-sm font-bold text-gray-800`}>Rs. {totalBookingPrice}</Text>
      </View>

      <View style={tw`flex-row justify-between mb-1`}>
        <Text style={tw`text-sm text-blue-600 font-medium`}>Owner Payout (95%):</Text>
        <Text style={tw`text-sm font-bold text-blue-600`}>Rs. {ownerPayout}</Text>
      </View>

      <View style={tw`flex-row justify-between mb-3`}>
        <Text style={tw`text-sm text-green-600 font-medium`}>Admin Commission (5%):</Text>
        <Text style={tw`text-sm font-bold text-green-600`}>Rs. {adminCommission}</Text>
      </View>

      <Pressable
        style={tw.style(
          `bg-purple-600 py-3 rounded-lg shadow-sm flex-row justify-center items-center`,
          isProcessing && `bg-gray-400`
        )}
        onPress={() => onApprove(booking, adminCommission, ownerPayout)}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="cash-outline" size={18} color="white" style={tw`mr-2`} />
            <Text style={tw`text-white text-center font-bold text-base`}>
              Approve & Release Payout
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
};

// --- Main Payouts Screen ---
export default function PayoutsScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchPendingPayouts();
      }
    }, [user])
  );

  const fetchPendingPayouts = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "bookings"),
        where("status", "==", "upcoming"),
        where("slotEndDateTime", "<", Timestamp.now()),
        orderBy("slotEndDateTime", "asc")
      );

      const querySnapshot = await getDocs(q);
      const bookingsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setBookings(bookingsList);
    } catch (error) {
      console.error("Error fetching payouts: ", error.message);
      Alert.alert("Error", "Could not load pending payouts.");
    } finally {
      setLoading(false);
    }
  };

  // --- 🔥 UPDATED: Transaction Logic with Professional Notification ---
  const handleApprovePayout = async (booking, adminCommission, ownerPayout) => {
    setProcessingId(booking.id);

    const bookingRef = doc(db, "bookings", booking.id);
    const ownerUserRef = doc(db, "users", booking.ownerId); 
    const adminRevenueRef = doc(db, "admin_revenue", "main");

    try {
      const accountDisplay = await runTransaction(db, async (transaction) => {
        const adminRevDoc = await transaction.get(adminRevenueRef);
        const ownerUserDoc = await transaction.get(ownerUserRef);

        let ownerPayoutAccount = null;
        if (ownerUserDoc.exists() && ownerUserDoc.data().payoutAccount) {
          ownerPayoutAccount = ownerUserDoc.data().payoutAccount;
        }

        const display = ownerPayoutAccount
          ? `...${ownerPayoutAccount.slice(-4)}`
          : "[No Account]";

        // 1. Update status to prevent double payout
        transaction.update(bookingRef, { status: "completed_and_paid" });

        // 2. Update Admin Revenue
        if (!adminRevDoc.exists()) {
          transaction.set(adminRevenueRef, { totalRevenue: adminCommission });
        } else {
          transaction.update(adminRevenueRef, {
            totalRevenue: increment(adminCommission),
          });
        }
        
        return display; 
      });

      // --- 🔥 PROFESSIONAL NOTIFICATION TO OWNER ---
      await notifyUser(
        booking.ownerId,
        "Payout Released! 💰",
        `Rs. ${ownerPayout} has been transferred to your account (${accountDisplay}) for booking at ${booking.arenaName}.`,
        "info",
        { url: '/(owner)/profile' } // Payout history dekhne ke liye
      );

      Alert.alert(
        "Success ✅",
        `Payout of Rs. ${ownerPayout} has been processed. The owner has been notified.`
      );
      
      fetchPendingPayouts();
    } catch (error) {
      console.error("Payout Failed: ", error);
      Alert.alert("Error", "Failed to process payout. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <View style={tw`p-5`}>
        <View style={tw`flex-row items-center mb-6`}>
           <View style={tw`bg-purple-600 p-2 rounded-lg mr-3`}>
              <Ionicons name="wallet" size={24} color="white" />
           </View>
           <Text style={tw`text-3xl font-bold text-gray-900`}>Payouts</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={tw.color("purple-600")} style={tw`mt-20`} />
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={(item) => item.id}
            contentContainerStyle={tw`pb-20`}
            renderItem={({ item }) => (
              <PayoutCard
                booking={item}
                onApprove={handleApprovePayout}
                isProcessing={processingId === item.id}
              />
            )}
            ListEmptyComponent={
              <View style={tw`items-center justify-center mt-20`}>
                <View style={tw`bg-gray-100 p-6 rounded-full mb-4`}>
                  <Ionicons name="checkmark-done" size={50} color={tw.color("gray-400")} />
                </View>
                <Text style={tw`text-xl font-bold text-gray-500`}>All Clear!</Text>
                <Text style={tw`text-sm text-gray-400 mt-1`}>No pending payouts at the moment.</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}