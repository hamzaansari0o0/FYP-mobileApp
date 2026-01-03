import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View
} from "react-native";
import tw from "twrnc";

export default function PaymentModal({
  visible,
  onClose, // Yeh function parent se aayega jo slot ko UNLOCK karega
  bookingDetails,
  onConfirmPayment, // Yeh function parent se aayega jo BOOKED status final karega
}) {
  const [isPaying, setIsPaying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false); // New state for cancelling

  // Handle Cancel (Close Modal)
  const handleClose = async () => {
    if (isPaying) return; // Payment ke dauran band na karein
    
    setIsCancelling(true);
    try {
        // Parent ka onClose function call karo jo DB me status wapis 'available' karega
        await onClose(); 
    } catch (error) {
        console.error("Error unlocking slot", error);
    } finally {
        setIsCancelling(false);
    }
  };

  const handlePayment = async () => {
    try {
      setIsPaying(true);
      
      // 1.5 seconds ka delay taake user ko lage payment process ho rahi hai (PayFast simulation)
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Direct success call
      await onConfirmPayment(); 
      
    } catch (error) {
      Alert.alert("Error", error?.message || "Payment failed.");
      setIsPaying(false); // Only stop loading on error, success pe parent close karega
    } 
  };

  if (!bookingDetails) return null;

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={handleClose} // Android back button handle
    >
      <View style={tw`flex-1 justify-end bg-black/60`}>
        <View style={tw`bg-white rounded-t-3xl p-6 shadow-2xl`}>
          
          <View style={tw`flex-row justify-between items-center mb-6`}>
            <Text style={tw`text-xl font-bold text-gray-900`}>Confirm Booking</Text>
            
            {/* Close Button with Loading Spinner if cancelling */}
            <Pressable onPress={handleClose} disabled={isCancelling || isPaying} style={tw`p-1 bg-gray-100 rounded-full`}>
              {isCancelling ? (
                  <ActivityIndicator size="small" color="#374151" />
              ) : (
                  <Ionicons name="close" size={24} color="#374151" />
              )}
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Ticket Summary */}
            <View style={tw`bg-gray-50 p-4 rounded-xl border border-gray-100 mb-8`}>
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

            {/* Pay Button */}
            <Pressable
                style={tw.style(
                  `bg-green-600 py-4 rounded-xl items-center shadow-md mb-6`,
                  isPaying && `bg-green-400`
                )}
                onPress={handlePayment}
                disabled={isPaying || isCancelling}
            >
                {isPaying ? (
                  <View style={tw`flex-row items-center`}>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={tw`text-white font-bold ml-2`}>Processing Payment...</Text>
                  </View>
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