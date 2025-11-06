import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, Stack } from "expo-router";
import tw from "twrnc";
import { db } from "../../../firebase/firebaseConfig";
import {
  doc,
  getDoc,
  runTransaction,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import SlotPicker from "../../../components/specific/SlotPicker";
import PaymentModal from "../../../components/specific/PaymentModal";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../context/AuthContext";
import moment from "moment";

export default function CourtDetailScreen() {
  const { courtId } = useLocalSearchParams();
  const { user, userData } = useAuth();

  const [court, setCourt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // --- Fetch Court Details ---
  useEffect(() => {
    if (!courtId) return;

    const fetchCourtDetails = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "courts", courtId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const courtData = docSnap.data();
          if (courtData.status !== "approved") {
            Alert.alert(
              "Not Available",
              "This court is currently not approved or is disabled."
            );
            setCourt(null);
          } else {
            setCourt(courtData);
          }
        } else {
          Alert.alert("Error", "Court not found.");
        }
      } catch (error) {
        console.error("Error fetching court details: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourtDetails();
  }, [courtId]);

  // --- 100% PAYMENT SLOT SELECTION ---
  const handleSlotSelect = (slot) => {
    const totalPrice = court.pricePerHour;

    setSelectedSlot({
      ...slot,
      date: moment(slot.slotDateTime).format("YYYY-MM-DD"),
      totalPrice: totalPrice,
      amountPaid: totalPrice, // Full payment
      pendingBalance: 0, // No pending amount
    });

    setIsPaymentModalVisible(true);
  };

  // --- CONFIRM PAYMENT (Full Payment) ---
  const handleConfirmPayment = async () => {
    if (!user || !selectedSlot || !court) {
      throw new Error("User or slot data is missing.");
    }

    const {
      hour,
      date,
      slotDateTime,
      totalPrice,
      amountPaid,
    } = selectedSlot;

    // Ensure valid timestamps
    let slotStartDateTime;
    if (slotDateTime?.toDate) {
      slotStartDateTime = slotDateTime.toDate();
    } else {
      slotStartDateTime = moment(slotDateTime).toDate();
    }
    const slotEndDateTime = moment(slotStartDateTime).add(1, "hour").toDate();

    const slotDocId = `${courtId}_${date}`;
    const slotRef = doc(db, "court_slots", slotDocId);
    const bookingCollectionRef = collection(db, "bookings");

    try {
      await runTransaction(db, async (transaction) => {
        const slotDoc = await transaction.get(slotRef);
        let slotsMap = slotDoc.exists() ? slotDoc.data().slots || {} : {};

        // Slot already booked check
        if (slotsMap[hour] && slotsMap[hour] !== "available") {
          throw new Error(
            "Sorry, this slot was just booked while you were paying."
          );
        }

        // Mark slot as booked
        slotsMap[hour] = user.uid;
        transaction.set(
          slotRef,
          {
            courtId: courtId,
            ownerId: court.ownerId,
            date: date,
            slots: slotsMap,
          },
          { merge: true }
        );

        // --- NEW BOOKING DOCUMENT (Full Payment) ---
        const newBookingData = {
          playerId: user.uid,
          playerName: userData?.name || "Player",
          courtId: courtId,
          ownerId: court.ownerId,

          slotDateTime: slotStartDateTime,
          slotEndDateTime: slotEndDateTime,

          date: date,
          slotTime: hour,

          status: "upcoming",
          paymentStatus: "paid_full", // ✅ Full payment
          totalPrice: totalPrice,
          amountPaid: amountPaid,
          pendingBalance: 0,

          createdAt: serverTimestamp(),
        };

        transaction.set(doc(bookingCollectionRef), newBookingData);
      });

      Alert.alert("Booking Confirmed!", "Your slot is fully paid and confirmed.");
      setIsPaymentModalVisible(false);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Booking Transaction Error: ", error);
      throw error;
    }
  };

  // --- LOADING STATE ---
  if (loading) {
    return (
      <View style={tw`flex-1 items-center justify-center`}>
        <ActivityIndicator size="large" color={tw.color("blue-600")} />
      </View>
    );
  }

  // --- COURT NOT AVAILABLE ---
  if (!court) {
    return (
      <SafeAreaView style={tw`flex-1 items-center justify-center bg-gray-100`}>
        <Text style={tw`text-lg text-red-500`}>Court is not available.</Text>
      </SafeAreaView>
    );
  }

  // --- MAIN UI ---
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <Stack.Screen options={{ headerShown: true, title: court.courtName }} />

      <ScrollView contentContainerStyle={tw`p-5`}>
        {/* Court Info Box */}
        <View style={tw`bg-white p-5 rounded-lg shadow-md`}>
          <Text style={tw`text-2xl font-bold text-gray-800`}>
            {court.courtName}
          </Text>

          <View style={tw`flex-row items-center mt-3`}>
            <Ionicons
              name="location-outline"
              size={18}
              color={tw.color("gray-600")}
            />
            <Text style={tw`text-base text-gray-600 ml-2`}>
              {court.address}
            </Text>
          </View>

          <View style={tw`flex-row items-center mt-2`}>
            <Ionicons
              name="time-outline"
              size={18}
              color={tw.color("gray-600")}
            />
            <Text style={tw`text-base text-gray-600 ml-2`}>
              24/7 Booking Available
            </Text>
          </View>

          <Text style={tw`text-3xl font-bold text-green-700 mt-4`}>
            Rs. {court.pricePerHour}
            <Text style={tw`text-lg text-gray-500`}> / hour</Text>
          </Text>
        </View>

        {/* Slot Picker */}
        <SlotPicker
          courtId={courtId}
          ownerId={court.ownerId}
          pricePerHour={court.pricePerHour}
          onSlotSelect={handleSlotSelect}
          refreshKey={refreshKey}
        />
      </ScrollView>

      {/* Payment Modal */}
      {selectedSlot && (
        <PaymentModal
          visible={isPaymentModalVisible}
          onClose={() => setIsPaymentModalVisible(false)}
          onConfirmPayment={handleConfirmPayment}
          bookingDetails={{
            courtName: court.courtName,
            date: selectedSlot.date,
            timeDisplay: selectedSlot.timeDisplay,
            totalPrice: selectedSlot.totalPrice,
            amountPaid: selectedSlot.amountPaid,
            pendingBalance: selectedSlot.pendingBalance,
          }}
        />
      )}
    </SafeAreaView>
  );
}
