import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase/firebaseConfig";
import { notifyUser } from "../../../utils/notifications"; // Notification helper import kiya

export default function ContactUsScreen() {
  const router = useRouter();
  const { user, userData } = useAuth();

  // Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-fill Data
  useEffect(() => {
    if (userData) {
      setName(userData.name || "");
      setEmail(userData.email || user?.email || "");
    }
  }, [userData, user]);

  // --- SUBMIT FUNCTION ---
  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      Alert.alert("Missing Fields", "Please fill in all the details.");
      return;
    }

    setLoading(true);

    try {
      // 1. Save Ticket to Database
      const ticketData = {
        userId: user?.uid || "guest",
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
        read: false,
      };

      await addDoc(collection(db, "support_tickets"), ticketData);

      // 2. Notify Admin (NEW LOGIC)
      // Hum database se check karenge ke 'role' == 'admin' kiska hai
      const q = query(collection(db, "users"), where("role", "==", "admin"));
      const adminSnapshot = await getDocs(q);

      if (!adminSnapshot.empty) {
        // Har admin ko notification bhejein (agar 1 se zyada admin hon)
        adminSnapshot.forEach(async (doc) => {
          const adminId = doc.id;
          await notifyUser(
            adminId,
            "New Support Ticket 📩", // Title
            `${name} reported an issue: ${subject}`, // Body
            "support", // Type
            { url: '/(admin)/support' } // Admin click kare to seedha support page par jaye
          );
        });
        console.log("Admin notified successfully.");
      }

      // 3. Success Alert
      Alert.alert(
        "Request Sent",
        "We have received your message. Our team will contact you shortly.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error("Error submitting ticket:", error);
      Alert.alert("Error", "Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={tw`flex-row items-center px-4 py-3 border-b border-gray-100`}>
        <Pressable onPress={() => router.back()} style={tw`p-2 bg-gray-50 rounded-full mr-3`}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </Pressable>
        <Text style={tw`text-xl font-bold text-gray-900`}>Contact Support</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={tw`flex-1`}
      >
        <ScrollView contentContainerStyle={tw`p-6 pb-10`} showsVerticalScrollIndicator={false}>
          
          <Text style={tw`text-gray-500 text-base mb-6`}>
            Facing an issue with a booking or app? Fill out the form below and we will help you out.
          </Text>

          <View style={tw`gap-4`}>
            {/* Name */}
            <View>
              <Text style={tw`text-sm font-bold text-gray-700 mb-1 ml-1`}>Your Name</Text>
              <View style={tw`flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3`}>
                <Ionicons name="person-outline" size={20} color="gray" />
                <TextInput
                  style={tw`flex-1 ml-3 text-base text-gray-800`}
                  placeholder="John Doe"
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            {/* Email */}
            <View>
              <Text style={tw`text-sm font-bold text-gray-700 mb-1 ml-1`}>Email Address</Text>
              <View style={tw`flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3`}>
                <Ionicons name="mail-outline" size={20} color="gray" />
                <TextInput
                  style={tw`flex-1 ml-3 text-base text-gray-800`}
                  placeholder="name@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* Subject */}
            <View>
              <Text style={tw`text-sm font-bold text-gray-700 mb-1 ml-1`}>Subject</Text>
              <View style={tw`flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3`}>
                <Ionicons name="pricetag-outline" size={20} color="gray" />
                <TextInput
                  style={tw`flex-1 ml-3 text-base text-gray-800`}
                  placeholder="e.g. Booking Issue, Payment Error"
                  value={subject}
                  onChangeText={setSubject}
                />
              </View>
            </View>

            {/* Message */}
            <View>
              <Text style={tw`text-sm font-bold text-gray-700 mb-1 ml-1`}>Message</Text>
              <View style={tw`bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 h-32`}>
                <TextInput
                  style={tw`flex-1 text-base text-gray-800 text-justify`}
                  placeholder="Describe your issue here..."
                  multiline
                  textAlignVertical="top"
                  value={message}
                  onChangeText={setMessage}
                />
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={({ pressed }) => [
              tw`mt-8 py-4 rounded-xl items-center justify-center shadow-sm`,
              loading || pressed ? tw`bg-green-700` : tw`bg-green-600`
            ]}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={tw`text-white font-bold text-lg`}>Submit Ticket</Text>
            )}
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}