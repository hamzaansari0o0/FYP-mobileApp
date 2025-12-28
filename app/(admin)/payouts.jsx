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
  where,
} from "firebase/firestore";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StatusBar,
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
  const totalBookingPrice = booking.totalPrice || booking.amountPaid || 0;
  const adminCommission = Math.round(totalBookingPrice * 0.05); // 5% Commission
  const ownerPayout = totalBookingPrice - adminCommission; // 95% to Owner

  // Time Display Logic
  let timeDisplay = "N/A";
  if (booking.timeDisplayRange) {
      timeDisplay = booking.timeDisplayRange;
  } else if (booking.bookedHours && Array.isArray(booking.bookedHours) && booking.bookedHours.length > 0) {
      const start = Math.min(...booking.bookedHours);
      const end = Math.max(...booking.bookedHours) + 1;
      timeDisplay = `${start}:00 - ${end}:00`;
  } else if (booking.slotTime) {
      timeDisplay = `${booking.slotTime}:00`;
  }

  return (
    <View style={tw`bg-white p-4 rounded-3xl shadow-sm border border-purple-50 mb-4`}>
      <View style={tw`flex-row justify-between items-start mb-2`}>
        <View>
          <Text style={tw`text-xs font-bold text-purple-800 tracking-wider`}>ID: {booking.id.slice(-6).toUpperCase()}</Text>
          <Text style={tw`text-lg font-bold text-gray-900 mt-1`}>
            {booking.playerName}
          </Text>
        </View>
        <View style={tw`bg-purple-100 px-3 py-1 rounded-full`}>
          <Text style={tw`text-[10px] font-bold text-purple-700`}>NEEDS PAYOUT</Text>
        </View>
      </View>

      <Text style={tw`text-sm text-gray-500 mb-4 flex-row items-center`}>
        <Ionicons name="calendar-outline" size={14} style={tw`mr-1`} /> {booking.date}  •  
        <Ionicons name="time-outline" size={14} style={tw`mr-1 ml-2`} /> {timeDisplay}
      </Text>

      <View style={tw`bg-gray-50 p-3 rounded-xl mb-4`}>
        <View style={tw`flex-row justify-between mb-1`}>
            <Text style={tw`text-xs text-gray-500`}>Total Booking:</Text>
            <Text style={tw`text-xs font-bold text-gray-800`}>Rs. {totalBookingPrice}</Text>
        </View>
        <View style={tw`flex-row justify-between mb-1`}>
            <Text style={tw`text-xs text-green-600 font-medium`}>Admin (5%):</Text>
            <Text style={tw`text-xs font-bold text-green-600`}>Rs. {adminCommission}</Text>
        </View>
        <View style={tw`h-[1px] bg-gray-200 my-1`} />
        <View style={tw`flex-row justify-between`}>
            <Text style={tw`text-sm text-purple-700 font-bold`}>Owner Payout (95%):</Text>
            <Text style={tw`text-sm font-extrabold text-purple-700`}>Rs. {ownerPayout}</Text>
        </View>
      </View>

      <Pressable
        style={tw.style(
          `bg-purple-600 py-3 rounded-xl shadow-md shadow-purple-200 flex-row justify-center items-center active:bg-purple-700`,
          isProcessing && `bg-gray-400 shadow-none`
        )}
        onPress={() => onApprove(booking, adminCommission, ownerPayout)}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="cash-outline" size={18} color="white" style={tw`mr-2`} />
            <Text style={tw`text-white text-center font-bold text-sm`}>
              Approve & Release
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
        where("status", "==", "completed_pending_payout"),
        orderBy("date", "asc")
      );

      const querySnapshot = await getDocs(q);
      const bookingsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setBookings(bookingsList);
    } catch (error) {
      console.error("Error fetching payouts: ", error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- 🔥 TRANSACTION LOGIC ---
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

        // 1. Update status to SETTLED
        transaction.update(bookingRef, { status: "completed_settled" });

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

      // --- 🔥 NOTIFICATION TO OWNER ---
      await notifyUser(
        booking.ownerId,
        "Payout Released! 💰",
        `Rs. ${ownerPayout} has been transferred to your account (${accountDisplay}) for booking at ${booking.arenaName}.`,
        "success",
        { url: '/(owner)/transactions' } 
      );

      Alert.alert(
        "Success ✅",
        `Payout of Rs. ${ownerPayout} has been processed. The owner has been notified.`
      );
      
      fetchPendingPayouts(); // List refresh
    } catch (error) {
      console.error("Payout Failed: ", error);
      Alert.alert("Error", "Failed to process payout. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* --- HEADER (MATCHING APPROVALS STYLE) --- */}
      <View style={tw`px-6 pt-6 pb-4 bg-white border-b border-gray-100 flex-row items-center`}>
        {/* Updated Icon Style */}
        <View style={tw`bg-purple-600 p-3 rounded-2xl mr-4 shadow-md shadow-purple-300`}>
           <Ionicons name="wallet" size={26} color="white" />
        </View>
        <View>
           <Text style={tw`text-3xl font-extrabold text-purple-900`}>Payouts</Text>
           <Text style={tw`text-gray-500 text-xs font-medium tracking-wide`}>MANAGE PAYMENTS</Text>
        </View>
      </View>

      {/* --- CONTENT --- */}
      {loading ? (
        <ActivityIndicator size="large" color={tw.color("purple-600")} style={tw`mt-20`} />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={tw`px-6 py-6 pb-20`}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <PayoutCard
              booking={item}
              onApprove={handleApprovePayout}
              isProcessing={processingId === item.id}
            />
          )}
          ListEmptyComponent={
            <View style={tw`items-center justify-center mt-20`}>
              <View style={tw`bg-green-50 p-6 rounded-full mb-4`}>
                <Ionicons name="checkmark-done-circle" size={60} color="#22c55e" />
              </View>
              <Text style={tw`text-xl font-bold text-gray-900`}>All Clear!</Text>
              <Text style={tw`text-sm text-gray-400 mt-2 text-center px-10`}>
                  No completed bookings waiting for payout.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}