import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Timestamp,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  where
} from "firebase/firestore";
import moment from "moment";
import { useCallback, useEffect, useState } from "react";
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
import { notifyUser } from "../../utils/notifications";

// --- Owner ki booking card ---
const OwnerBookingCard = ({ booking, onCancel, isCancelling }) => {
  const formattedTime = moment(booking.slotTime, "HH").format("h:00 A");
  const bookingStatus = booking.status || "upcoming";

  const refundAccountDisplay = booking.playerRefundAccount
    ? `...${booking.playerRefundAccount.slice(-4)}`
    : "[No Account]";

  return (
    <View style={tw`bg-white p-4 rounded-lg shadow-md mb-4`}>
      <Text style={tw`text-lg font-bold text-gray-800`}>
        Booking by: {booking.playerName}
      </Text>

      <View style={tw`flex-row justify-between items-center mt-2`}>
        <Text style={tw`text-base text-gray-600`}>
          <Ionicons name="calendar-outline" size={16} /> {booking.date}
        </Text>
        <Text style={tw`text-base font-bold text-blue-600`}>
          <Ionicons name="time-outline" size={16} /> {formattedTime}
        </Text>
      </View>

      <View
        style={tw`flex-row justify-between items-center mt-3 pt-2 border-t border-gray-100`}
      >
        <Text style={tw`text-lg font-bold text-green-700`}>
          Paid: Rs. {booking.amountPaid}
        </Text>
        <Text
          style={tw.style(
            `text-sm font-semibold px-2 py-1 rounded-full`,
            bookingStatus.startsWith("cancelled")
              ? "bg-red-100 text-red-600"
              : "bg-green-100 text-green-600"
          )}
        >
          {bookingStatus === "upcoming"
            ? "CONFIRMED"
            : bookingStatus.toUpperCase()}
        </Text>
      </View>

      {/* Cancel Button (Owner) */}
      {bookingStatus === "upcoming" && (
        <Pressable
          style={tw.style(
            `bg-red-500 py-2 rounded-lg mt-3`,
            isCancelling && `bg-red-300`
          )}
          onPress={() => onCancel(booking)}
          disabled={isCancelling}
        >
          {isCancelling ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={tw`text-white text-center font-bold`}>
              Cancel Booking (Owner)
            </Text>
          )}
        </Pressable>
      )}

      {bookingStatus === "cancelled_by_owner" && (
        <Text style={tw`text-center text-sm text-red-500 mt-2`}>
          You cancelled. Player refund (simulated) to {refundAccountDisplay}.
        </Text>
      )}
    </View>
  );
};

export default function OwnerDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  
  // Notification Badge Logic
  const [unreadCount, setUnreadCount] = useState(0);

  // 1. Fetch Unread Notifications Count (Real-time)
  useEffect(() => {
    if (!user) return;
    const q = query(
        collection(db, 'notifications'), 
        where('userId', '==', user.uid),
        where('read', '==', false)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
        setUnreadCount(snap.size);
    });
    return () => unsubscribe();
  }, [user]);

  // 2. Fetch Bookings
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchOwnerBookings();
      }
    }, [user])
  );

  const fetchOwnerBookings = async () => {
    setLoading(true);
    setBookings([]);

    try {
      const q = query(
        collection(db, "bookings"),
        where("ownerId", "==", user.uid),
        where("slotEndDateTime", ">", Timestamp.now()),
        orderBy("slotEndDateTime", "asc")
      );

      const querySnapshot = await getDocs(q);
      const bookingsList = querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((booking) => booking.status !== "completed_and_paid");

      setBookings(bookingsList);
    } catch (error) {
      console.error("Error fetching owner bookings:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Owner Cancellation Logic ---
  const handleOwnerCancel = (booking) => {
    const refundAccountDisplay = booking.playerRefundAccount
      ? `...${booking.playerRefundAccount.slice(-4)}`
      : "[No Account]";

    Alert.alert(
      "Owner Cancellation (Maintenance)",
      `Are you sure? This will cancel the booking, block the slot, AND issue a FULL (Simulated) REFUND of Rs. ${booking.amountPaid} to the player's account (${refundAccountDisplay}).`,
      [
        { text: "Go Back", style: "cancel" },
        {
          text: "Confirm Cancel & Refund",
          style: "destructive",
          onPress: () => performOwnerCancellation(booking),
        },
      ]
    );
  };

  const performOwnerCancellation = async (booking) => {
    setCancellingId(booking.id);
    const bookingRef = doc(db, "bookings", booking.id);
    const slotRef = doc(db, "court_slots", `${booking.courtId}_${booking.date}`);
    const refundAccountDisplay = booking.playerRefundAccount
      ? `...${booking.playerRefundAccount.slice(-4)}`
      : "[No Account]";

    try {
      await runTransaction(db, async (transaction) => {
        const slotDoc = await transaction.get(slotRef);
        if (slotDoc.exists()) {
          const slotsMap = slotDoc.data().slots || {};
          slotsMap[booking.slotTime] = "unavailable"; 
          transaction.update(slotRef, { slots: slotsMap });
        }
        transaction.update(bookingRef, {
          status: "cancelled_by_owner",
          cancellationReason: "Maintenance",
        });
      });

      const notificationBody = `Your booking on ${booking.date} at ${booking.slotTime}:00 has been cancelled by the arena owner. Refund initiated.`;
      
      await notifyUser(
        booking.playerId,
        "Booking Cancelled ⚠️",
        notificationBody,
        "alert", 
        { url: '/(player)/history' }
      );

      Alert.alert(
        "Success",
        `Booking cancelled. Refund to ${refundAccountDisplay} processed.`
      );
      fetchOwnerBookings();
    } catch (error) {
      console.error("Owner cancellation failed:", error);
      Alert.alert("Error", "Failed to cancel booking.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
        {/* --- CUSTOM HEADER (Left: Title, Right: Notification) --- */}
        <View style={tw`flex-row justify-between items-center px-5 py-4 bg-white shadow-sm mb-2`}>
            {/* 1. Left Side: Dashboard Title */}
            <Text style={tw`text-2xl font-bold text-gray-800`}>
                Bookings
            </Text>

            {/* 2. Right Side: Notification Icon */}
            <Pressable 
                onPress={() => router.push('/(owner)/notifications')}
                style={tw`relative p-2`}
            >
                <Ionicons name="notifications-outline" size={28} color="black" />
                {unreadCount > 0 && (
                    <View style={tw`absolute top-1 right-1 bg-red-500 w-5 h-5 rounded-full justify-center items-center`}>
                        <Text style={tw`text-white text-xs font-bold`}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                    </View>
                )}
            </Pressable>
        </View>

      <View style={tw`flex-1 px-5`}>
        {/* <Text style={tw`text-lg font-semibold text-gray-600 mb-3`}>
          
        </Text> */}

        {loading ? (
          <ActivityIndicator
            size="large"
            color={tw.color("green-600")}
            style={tw`mt-20`}
          />
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <OwnerBookingCard
                booking={item}
                onCancel={handleOwnerCancel}
                isCancelling={cancellingId === item.id}
              />
            )}
            contentContainerStyle={tw`pb-20`}
            ListEmptyComponent={
              <View style={tw`items-center justify-center mt-20`}>
                <Ionicons
                  name="sad-outline"
                  size={40}
                  color={tw.color("gray-400")}
                />
                <Text style={tw`text-lg text-gray-500 mt-2`}>
                  You have no upcoming bookings.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}