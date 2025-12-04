import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput, // {/* === 1. IMPORTED TextInput === */}
} from "react-native";
import tw from "twrnc";
import { Ionicons } from "@expo/vector-icons";

export default function PaymentModal({
  visible,
  onClose,
  bookingDetails,
  onConfirmPayment,
}) {
  const [isPaying, setIsPaying] = useState(false);
  // {/* === 2. ADDED STATE FOR JAZZCASH NUMBER === */}
  const [refundAccountNumber, setRefundAccountNumber] = useState("");

  const handlePayment = async () => {
    // {/* === 3. ADDED VALIDATION === */}
    if (!refundAccountNumber.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter your JazzCash number for any potential refunds."
      );
      return;
    }
    // Optional: Simple validation for 11 digits
    if (refundAccountNumber.length !== 11 || !/^[0-9]+$/.test(refundAccountNumber)) {
       Alert.alert(
        "Invalid Number",
        "Please enter a valid 11-digit JazzCash number (e.g., 03001234567)."
      );
      return;
    }

    try {
      setIsPaying(true);

      // 🧾 Simulated Payment Delay (for UX)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // {/* === 4. PASSING THE NUMBER TO THE CONFIRM FUNCTION === */}
      await onConfirmPayment(refundAccountNumber); // Pass the number back
      
    } catch (error) {
      Alert.alert(
        "Booking Failed",
        error?.message || "An error occurred during booking."
      );
    } finally {
      setIsPaying(false);
    }
  };

  if (!bookingDetails) return null;

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 justify-end bg-black/50`}>
        <View style={tw`bg-white rounded-t-2xl p-6 shadow-lg`}>
          {/* Header */}
          <View style={tw`flex-row justify-between items-center mb-4`}>
            <Text style={tw`text-2xl font-bold text-gray-800`}>
              Confirm Booking
            </Text>
            <Pressable onPress={onClose} style={tw`p-1`}>
              <Ionicons
                name="close-circle"
                size={28}
                color={tw.color("gray-400")}
              />
            </Pressable>
          </View>

          {/* Booking Details */}
          <View style={tw`mb-5`}>
            <Text style={tw`text-base text-gray-600 mb-1`}>
              Court: {bookingDetails.courtName}
            </Text>
            <Text style={tw`text-base text-gray-600 mb-1`}>
              Date: {bookingDetails.date}
            </Text>
            <Text style={tw`text-base text-gray-600 mb-3`}>
              Slot: {bookingDetails.timeDisplay}
            </Text>

            {/* === 5. NEW JAZZCASH INPUT FIELD === */}
            <View style={tw`mt-4`}>
              <Text style={tw`text-sm font-medium text-gray-700 mb-1`}>
                Refund JazzCash Number
              </Text>
              <View
                style={tw`flex-row items-center bg-gray-100 border border-gray-300 rounded-lg p-3`}
              >
                <Ionicons
                  name="wallet-outline"
                  size={20}
                  color={tw.color("gray-500")}
                />
                <TextInput
                  style={tw`flex-1 ml-2 text-base text-gray-900`}
                  placeholder="e.g., 03001234567"
                  placeholderTextColor={tw.color("gray-400")}
                  keyboardType="phone-pad"
                  value={refundAccountNumber}
                  onChangeText={setRefundAccountNumber}
                  maxLength={11}
                />
              </View>
              <Text style={tw`text-xs text-gray-500 mt-1`}>
                This number will be used for any potential refunds.
              </Text>
            </View>
            {/* === END OF NEW FIELD === */}

            <View style={tw`border-t border-gray-200 pt-3 mt-5`}>
              {/* Added mt-5 for spacing */}
              <View style={tw`flex-row justify-between`}>
                <Text style={tw`text-lg font-bold text-blue-600`}>
                  Full Amount to Pay:
                </Text>
                <Text style={tw`text-lg font-bold text-blue-600`}>
                  Rs. {bookingDetails.amountPaid}
                </Text>
              </View>
            </View>
          </View>

          {/* Payment Button */}
          <Pressable
            style={tw.style(
              `bg-green-600 py-4 rounded-lg shadow-md`,
              isPaying && `bg-green-400`
            )}
            onPress={handlePayment}
            disabled={isPaying}
          >
            {isPaying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={tw`text-white text-center text-lg font-bold`}>
                Pay Rs. {bookingDetails.amountPaid} (Simulated)
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}