import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { db } from "../../firebase/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  runTransaction,
  Timestamp,
  increment,
} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { useFocusEffect } from "expo-router";
import moment from "moment";
import { Ionicons } from "@expo/vector-icons";

/* 🧾 Booking Card Component (Player Side) */
const BookingCard = ({ booking, onCancel, isCancelling }) => {
  const formattedTime = moment(booking.slotTime, "HH").format("h:00 A");
  const bookingStartTime = moment(booking.slotDateTime.toDate());
  const now = moment();

  const hoursRemaining = bookingStartTime.diff(now, "hours");
  const canCancel = hoursRemaining > 3 && booking.status === "upcoming";

  return (
    <View style={tw`bg-white p-4 rounded-lg shadow-md mb-4`}>
      <Text style={tw`text-lg font-bold text-gray-800`}>
        Booking for: {booking.playerName}
      </Text>
      <Text style={tw`text-base text-gray-600 mt-1`}>Date: {booking.date}</Text>
      <Text style={tw`text-base text-gray-600`}>Time: {formattedTime}</Text>

      {/* Payment details */}
      <Text style={tw`text-base text-gray-600 mt-2`}>
        Amount Paid:{" "}
        <Text style={tw`font-bold text-green-700`}>
          Rs. {booking.amountPaid}
        </Text>
      </Text>

      {/* --- Cancellation Button --- */}
      {booking.status === "upcoming" && (
        <View style={tw`mt-4 pt-3 border-t border-gray-100`}>
          {canCancel ? (
            <Pressable
              style={tw.style(
                `bg-red-500 py-2 rounded-lg`,
                isCancelling && `bg-red-300`
              )}
              onPress={() => onCancel(booking)}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={tw`text-white text-center font-bold`}>
                  Cancel Booking
                </Text>
              )}
            </Pressable>
          ) : (
            <View style={tw`bg-gray-200 py-2 rounded-lg`}>
              <Text style={tw`text-sm text-center text-gray-500`}>
                Cancellation locked (Less than 3 hours left)
              </Text>
            </View>
          )}
        </View>
      )}

      {/* --- Cancelled Booking Info --- */}
      {booking.status.startsWith("cancelled") && (
        <View style={tw`mt-4 pt-3 border-t border-gray-100 items-center`}>
          <Text style={tw`text-lg font-bold text-red-600`}>
            Booking Cancelled
          </Text>
          {booking.status === "cancelled_by_player" && (
            <Text style={tw`text-sm text-gray-600`}>
              (Full refund of Rs. {booking.amountPaid} added to wallet)
            </Text>
          )}
          {booking.status === "cancelled_by_owner" && (
            <Text style={tw`text-sm text-gray-600`}>
              (Cancelled by Court Owner)
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

/* 🏠 Player History Screen */
export default function HistoryScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  useFocusEffect(
    useCallback(() => {
      if (user) fetchMyBookings();
    }, [user])
  );

  /* 🔹 Fetch Player's Bookings */
  const fetchMyBookings = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "bookings"),
        where("playerId", "==", user.uid),
        orderBy("slotDateTime", "desc")
      );

      const querySnapshot = await getDocs(q);
      const now = Timestamp.now();

      const bookingsList = querySnapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((booking) => {
          // Skip completed bookings
          if (booking.status === "completed_and_paid") return false;

          // Show only upcoming / active bookings
          if (booking.slotEndDateTime) {
            return booking.slotEndDateTime.toMillis() > now.toMillis();
          }
          return true;
        });

      setBookings(bookingsList);
    } catch (error) {
      console.error("Error fetching bookings:", error.message);
      if (error.code === "failed-precondition") {
        Alert.alert(
          "Index Required",
          "Please check your terminal for the Firestore index link."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /* 🔹 Cancel Booking Confirmation */
  const handleCancelBooking = (booking) => {
    Alert.alert(
      "Confirm Cancellation",
      `Are you sure you want to cancel? The full amount of Rs. ${booking.amountPaid} will be refunded to your app wallet.`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () => performCancellation(booking),
        },
      ]
    );
  };

  /* 🔹 Perform Firestore Transaction (Full Refund) */
  const performCancellation = async (booking) => {
    setCancellingId(booking.id);

    const bookingRef = doc(db, "bookings", booking.id);
    const slotRef = doc(db, "court_slots", `${booking.courtId}_${booking.date}`);
    const playerRef = doc(db, "users", booking.playerId);

    const refundAmount = booking.amountPaid;

    try {
      await runTransaction(db, async (transaction) => {
        // Step 1: Free the court slot
        const slotDoc = await transaction.get(slotRef);
        if (slotDoc.exists()) {
          const slotsMap = slotDoc.data().slots;
          slotsMap[booking.slotTime] = "available";
          transaction.update(slotRef, { slots: slotsMap });
        }

        // Step 2: Mark booking as cancelled
        transaction.update(bookingRef, { status: "cancelled_by_player" });

        // Step 3: Refund full amount to user's wallet
        transaction.update(playerRef, {
          walletCredit: increment(refundAmount),
        });
      });

      Alert.alert(
        "Success",
        `Your booking has been cancelled. Rs. ${refundAmount} has been added to your in-app wallet.`
      );

      fetchMyBookings();
    } catch (error) {
      console.error("Cancellation Transaction Failed:", error);
      Alert.alert("Error", "Failed to cancel booking. Please try again.");
    } finally {
      setCancellingId(null);
    }
  };

  /* 🔹 UI */
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <View style={tw`p-5`}>
        <Text style={tw`text-3xl font-bold text-blue-800 mb-5`}>
          My Bookings
        </Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={tw.color("blue-600")}
            style={tw`mt-20`}
          />
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <BookingCard
                booking={item}
                onCancel={handleCancelBooking}
                isCancelling={cancellingId === item.id}
              />
            )}
            ListEmptyComponent={
              <View style={tw`items-center justify-center mt-20`}>
                <Ionicons
                  name="sad-outline"
                  size={40}
                  color={tw.color("gray-400")}
                />
                <Text style={tw`text-lg text-gray-500`}>
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
