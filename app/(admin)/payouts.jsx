// app/(admin)/payouts.jsx

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
  increment, // {/* === 1. 'increment' AB BHI ZAROORI HAI (Admin Revenue ke liye) === */}
} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import moment from "moment";

// --- Payout Card Component (UPDATED) ---
const PayoutCard = ({ booking, onApprove, isProcessing }) => {
  // --- NAYA HISAB (100% MODEL) ---
  const totalBookingPrice = booking.totalPrice; // e.g., 2000
  const adminCommission = Math.round(totalBookingPrice * 0.05); // 5% of Total (e.g., 100)
  const ownerPayout = totalBookingPrice - adminCommission; // 95% (e.g., 1900)

  return (
    <View style={tw`bg-white p-4 rounded-lg shadow-md mb-4`}>
      <Text style={tw`text-base text-gray-600`}>
        Player: {booking.playerName}
      </Text>
      <Text style={tw`text-base text-gray-600`}>
        Date: {booking.date} @ {moment(booking.slotTime, "HH").format("h:00 A")}
      </Text>

      <View style={tw`border-t border-gray-100 my-2`} />

      <View style={tw`flex-row justify-between`}>
        <Text style={tw`text-sm text-gray-500`}>Total Booking Price:</Text>
        <Text style={tw`text-sm font-bold`}>Rs. {totalBookingPrice}</Text>
      </View>

      <View style={tw`flex-row justify-between`}>
        <Text style={tw`text-sm text-gray-500`}>Amount Paid (100%):</Text>
        <Text style={tw`text-sm font-bold`}>Rs. {booking.amountPaid}</Text>
      </View>

      <View style={tw`flex-row justify-between`}>
        <Text style={tw`text-sm text-blue-600`}>Owner Payout (95%):</Text>
        <Text style={tw`text-sm font-bold text-blue-600`}>Rs. {ownerPayout}</Text>
      </View>

      <View style={tw`flex-row justify-between`}>
        <Text style={tw`text-sm text-green-600`}>Admin Commission (5%):</Text>
        <Text style={tw`text-sm font-bold text-green-600`}>
          Rs. {adminCommission}
        </Text>
      </View>

      <Pressable
        style={tw.style(
          `bg-green-600 py-2 rounded-lg mt-3`,
          isProcessing && `bg-gray-400`
        )}
        onPress={() => onApprove(booking, adminCommission, ownerPayout)}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={tw`text-white text-center font-bold`}>
            Approve Payout
          </Text>
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

  // --- TRANSACTION LOGIC (UPDATED) ---
  const handleApprovePayout = async (
    booking,
    adminCommission,
    ownerPayout
  ) => {
    setProcessingId(booking.id);

    const bookingRef = doc(db, "bookings", booking.id);
    const ownerUserRef = doc(db, "users", booking.ownerId); // {/* === 2. HUMEIN AB BHI YEH CHAHIYE (Owner ka account number parhne k liye) === */}
    const adminRevenueRef = doc(db, "admin_revenue", "main");

    try {
      // {/* === 3. TRANSACTION SE 'accountDisplay' HASIL KAREIN === */}
      const accountDisplay = await runTransaction(db, async (transaction) => {
        const adminRevDoc = await transaction.get(adminRevenueRef);
        // {/* === 4. OWNER KA DOCUMENT PARHEIN === */}
        const ownerUserDoc = await transaction.get(ownerUserRef);

        let ownerPayoutAccount = null;
        if (ownerUserDoc.exists() && ownerUserDoc.data().payoutAccount) {
          ownerPayoutAccount = ownerUserDoc.data().payoutAccount;
        }

        const display = ownerPayoutAccount
          ? `...${ownerPayoutAccount.slice(-4)}`
          : "[No Account Saved]";

        // Step 1: Update booking status
        transaction.update(bookingRef, { status: "completed_and_paid" });

        // {/* === 5. REMOVED: Step 2 (OwnerBalance increment) === */}
        // transaction.update(ownerUserRef, { ownerBalance: increment(ownerPayout) });

        // Step 3: Add 5% to admin revenue
        if (!adminRevDoc.exists()) {
          transaction.set(adminRevenueRef, { totalRevenue: adminCommission });
        } else {
          transaction.update(adminRevenueRef, {
            totalRevenue: increment(adminCommission),
          });
        }
        
        return display; // Return display string for Alert
      });

      // {/* === 6. UPDATED Success Alert (No more ownerBalance) === */}
      Alert.alert(
        "Payout Approved!",
        `A (Simulated) payout of Rs. ${ownerPayout} has been sent to the owner's account (${accountDisplay}). Rs. ${adminCommission} was added to Admin revenue.`
      );
      fetchPendingPayouts();
    } catch (error) {
      console.error("Payout Transaction Failed: ", error);
      Alert.alert("Error", "Failed to approve payout. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <View style={tw`p-5`}>
        <Text style={tw`text-3xl font-bold text-purple-800 mb-5`}>
          Pending Payouts
        </Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={tw.color("purple-600")}
            style={tw`mt-20`}
          />
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PayoutCard
                booking={item}
                onApprove={handleApprovePayout}
                isProcessing={processingId === item.id}
              />
            )}
            ListEmptyComponent={
              <View style={tw`items-center justify-center mt-20`}>
                <Ionicons
                  name="checkmark-done-circle-outline"
                  size={40}
                  color={tw.color("gray-400")}
                />
                <Text style={tw`text-lg text-gray-500 mt-2`}>
                  No payouts pending.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}