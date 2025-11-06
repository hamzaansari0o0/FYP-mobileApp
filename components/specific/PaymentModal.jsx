import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
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

  const handlePayment = async () => {
    try {
      setIsPaying(true);

      // 🧾 Simulated Payment Delay (for UX)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      await onConfirmPayment();
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

            <View style={tw`border-t border-gray-200 pt-3`}>
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
