import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router"; // Stack hata dia kyunke header system ka use hoga
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";

export default function TermsPolicyScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("refund");

  // --- CONTENT SECTIONS (Same as before) ---

  const RefundContent = () => (
    <View>
      <Text style={tw`text-lg font-bold text-gray-800 mb-2`}>Return & Refund Policy</Text>
      <Text style={tw`text-gray-500 text-xs mb-4`}>Last Updated: December 2025</Text>
      
      <Text style={tw`text-gray-600 text-sm leading-6 mb-4 text-justify`}>
        At <Text style={tw`font-bold text-green-700`}>CourtChuno</Text>, we strive to provide a fair and seamless booking experience. Below are the rules regarding cancellations and refunds.
      </Text>

      {/* Logic 1: 4 Hours Rule */}
      <View style={tw`bg-green-50 p-4 rounded-xl mb-4 border border-green-100`}>
        <View style={tw`flex-row items-center mb-2`}>
          <Ionicons name="time-outline" size={20} color="green" />
          <Text style={tw`font-bold text-green-800 ml-2`}>Cancellation Policy</Text>
        </View>
        <Text style={tw`text-gray-700 text-sm leading-5`}>
          You will receive a <Text style={tw`font-bold`}>100% Refund</Text> if you cancel your booking at least <Text style={tw`font-bold`}>4 hours</Text> before the scheduled time. Refunds are processed by CourtChuno automatically.
        </Text>
      </View>

      {/* Logic 2: Arena Fault */}
      <View style={tw`bg-blue-50 p-4 rounded-xl mb-4 border border-blue-100`}>
        <View style={tw`flex-row items-center mb-2`}>
          <Ionicons name="alert-circle-outline" size={20} color="#2563EB" />
          <Text style={tw`font-bold text-blue-800 ml-2`}>Arena/Owner Issues</Text>
        </View>
        <Text style={tw`text-gray-700 text-sm leading-5`}>
          If there is an issue on the Arena Owner's side (e.g., court unavailable, facility closed, or on-spot conflict), you are entitled to a <Text style={tw`font-bold`}>100% Refund</Text>. Please report this via 'Contact Us'.
        </Text>
      </View>

      {/* Logic 3: Player Fault */}
      <View style={tw`bg-red-50 p-4 rounded-xl mb-4 border border-red-100`}>
        <View style={tw`flex-row items-center mb-2`}>
          <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
          <Text style={tw`font-bold text-red-800 ml-2`}>No-Show / Late Cancellation</Text>
        </View>
        <Text style={tw`text-gray-700 text-sm leading-5`}>
          If you cancel within 4 hours of the game or fail to show up, <Text style={tw`font-bold`}>No Refund</Text> will be provided.
        </Text>
      </View>

      <Text style={tw`text-gray-500 text-xs mt-4`}>
        For refund related queries, contact: payments@courtchuno.com
      </Text>
    </View>
  );

  const PrivacyContent = () => (
    <View>
      <Text style={tw`text-lg font-bold text-gray-800 mb-2`}>Privacy Policy</Text>
      <Text style={tw`text-gray-500 text-xs mb-4`}>Last Updated: December 2025</Text>

      <Text style={tw`text-gray-600 text-sm leading-6 mb-4 text-justify`}>
        At <Text style={tw`font-bold text-green-700`}>CourtChuno</Text>, we value your privacy. This policy outlines how we collect and protect your data.
      </Text>

      <View style={tw`mb-4`}>
        <Text style={tw`font-bold text-gray-800 mb-1`}>1. Information We Collect</Text>
        <Text style={tw`text-gray-600 text-sm leading-5 ml-2`}>
          • <Text style={tw`font-bold`}>Personal:</Text> Name, email, phone number.{"\n"}
          • <Text style={tw`font-bold`}>Usage:</Text> Booking history, favorite arenas.{"\n"}
          • <Text style={tw`font-bold`}>Payment:</Text> Transaction details (secured).
        </Text>
      </View>

      <View style={tw`mb-4`}>
        <Text style={tw`font-bold text-gray-800 mb-1`}>2. How We Use Data</Text>
        <Text style={tw`text-gray-600 text-sm leading-5 ml-2`}>
          • To confirm court bookings.{"\n"}
          • To process refunds and payments.{"\n"}
          • To improve app performance and user experience.
        </Text>
      </View>
    </View>
  );

  const TermsContent = () => (
    <View>
      <Text style={tw`text-lg font-bold text-gray-800 mb-2`}>Terms & Conditions</Text>
      <Text style={tw`text-gray-500 text-xs mb-4`}>Last Updated: December 2025</Text>

      <Text style={tw`text-gray-600 text-sm leading-6 mb-4 text-justify`}>
        By using CourtChuno, you agree to the following terms. Please read them carefully.
      </Text>

      <View style={tw`mb-4`}>
        <Text style={tw`font-bold text-gray-800 mb-1`}>1. Platform Role</Text>
        <Text style={tw`text-gray-600 text-sm leading-5`}>
          CourtChuno is a booking platform connecting players with arena owners. We are not responsible for the maintenance or physical condition of the courts.
        </Text>
      </View>

      <View style={tw`mb-4`}>
        <Text style={tw`font-bold text-gray-800 mb-1`}>2. User Conduct</Text>
        <Text style={tw`text-gray-600 text-sm leading-5`}>
          Users must respect arena rules and timings. Any damage caused to the property is the sole responsibility of the user.
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="dark-content" />

      {/* --- HEADER REMOVED (System Header will show) --- */}
      
      {/* Tabs */}
      <View style={tw`flex-row px-4 py-4`}>
        {['privacy', 'refund', 'terms'].map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={tw`flex-1 py-2 items-center rounded-lg mx-1 ${
              activeTab === tab ? 'bg-green-600 shadow-sm' : 'bg-gray-100'
            }`}
          >
            <Text
              style={tw`text-xs font-bold capitalize ${
                activeTab === tab ? 'text-white' : 'text-gray-500'
              }`}
            >
              {tab === 'refund' ? 'Refunds' : tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content Area */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`p-5 pb-10`}>
        {activeTab === 'privacy' && <PrivacyContent />}
        {activeTab === 'refund' && <RefundContent />}
        {activeTab === 'terms' && <TermsContent />}

        {/* Footer Contact */}
        <View style={tw`mt-8 border-t border-gray-100 pt-6 items-center`}>
          <Text style={tw`text-gray-400 text-xs mb-2`}>Have questions?</Text>
          <Text style={tw`text-green-700 font-bold`}>support@courtchuno.com</Text>
          <Text style={tw`text-gray-400 text-xs mt-4`}>© 2025 CourtChuno. All Rights Reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}