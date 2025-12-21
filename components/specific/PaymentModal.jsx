import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";
import tw from "twrnc";

export default function PaymentModal({
  visible,
  onClose,
  bookingDetails,
  onConfirmPayment,
}) {
  const [isPaying, setIsPaying] = useState(false);
  const [refundAccountNumber, setRefundAccountNumber] = useState("");

  const handlePayment = async () => {
    if (!refundAccountNumber.trim() || refundAccountNumber.length !== 11) {
      Alert.alert("Invalid Number", "Please enter a valid 11-digit JazzCash number.");
      return;
    }

    try {
      setIsPaying(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await onConfirmPayment(refundAccountNumber);
      setRefundAccountNumber(""); 
    } catch (error) {
      Alert.alert("Error", error?.message || "Payment failed.");
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
      <View style={tw`flex-1 justify-end bg-black/60`}>
        <View style={tw`bg-white rounded-t-3xl p-6 shadow-2xl h-[70%]`}>
          
          <View style={tw`flex-row justify-between items-center mb-6`}>
            <Text style={tw`text-xl font-bold text-gray-900`}>Confirm Booking</Text>
            <Pressable onPress={onClose} style={tw`p-1 bg-gray-100 rounded-full`}>
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Ticket Summary */}
            <View style={tw`bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6`}>
                <View style={tw`flex-row justify-between mb-2`}>
                <Text style={tw`text-gray-500`}>Arena</Text>
                <Text style={tw`font-bold text-gray-800`}>{bookingDetails.arenaName}</Text>
                </View>
                <View style={tw`flex-row justify-between mb-2`}>
                <Text style={tw`text-gray-500`}>Court</Text>
                <Text style={tw`font-bold text-gray-800`}>{bookingDetails.courtName}</Text>
                </View>
                <View style={tw`flex-row justify-between mb-2`}>
                <Text style={tw`text-gray-500`}>Date</Text>
                <Text style={tw`font-bold text-gray-800`}>{bookingDetails.date}</Text>
                </View>
                
                <View style={tw`mb-2`}>
                    <Text style={tw`text-gray-500 mb-1`}>Selected Slots ({bookingDetails.slotCount})</Text>
                    <Text style={tw`font-bold text-blue-600 text-sm leading-5`}>
                        {bookingDetails.timeDisplay}
                    </Text>
                </View>

                <View style={tw`h-[1px] bg-gray-200 my-3`} />
                
                <View style={tw`flex-row justify-between items-center`}>
                <Text style={tw`text-lg font-bold text-gray-900`}>Total Amount</Text>
                <Text style={tw`text-2xl font-extrabold text-green-700`}>Rs. {bookingDetails.totalPrice}</Text>
                </View>
            </View>

            {/* Input Field */}
            <Text style={tw`text-sm font-bold text-gray-700 mb-2 ml-1`}>Refund JazzCash Number</Text>
            <View style={tw`flex-row items-center border border-gray-300 rounded-xl px-3 py-3 mb-1 bg-white`}>
                <Ionicons name="wallet-outline" size={20} color="gray" />
                <TextInput
                style={tw`flex-1 ml-3 text-base text-gray-900`}
                placeholder="03XXXXXXXXX"
                keyboardType="phone-pad"
                maxLength={11}
                value={refundAccountNumber}
                onChangeText={setRefundAccountNumber}
                />
            </View>
            <Text style={tw`text-xs text-gray-400 mb-6 ml-1`}>Required for refunds in case of cancellation.</Text>

            {/* Pay Button */}
            <Pressable
                style={tw.style(
                `bg-green-600 py-4 rounded-xl items-center shadow-md mb-6`,
                isPaying && `bg-green-400`
                )}
                onPress={handlePayment}
                disabled={isPaying}
            >
                {isPaying ? (
                <ActivityIndicator color="#fff" />
                ) : (
                <Text style={tw`text-white text-center text-lg font-bold`}>
                    Pay Rs. {bookingDetails.totalPrice}
                </Text>
                )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}