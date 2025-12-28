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
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
// Imports adjusted based on your folder structure
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase/firebaseConfig";
import { notifyUser } from "../../../utils/notifications";

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

      const q = query(collection(db, "users"), where("role", "==", "admin"));
      const adminSnapshot = await getDocs(q);

      if (!adminSnapshot.empty) {
        adminSnapshot.forEach(async (doc) => {
          const adminId = doc.id;
          await notifyUser(
            adminId,
            "New Support Ticket 📩",
            `${name} reported an issue: ${subject}`,
            "support",
            { url: '/(admin)/support' }
          );
        });
      }

      Alert.alert(
        "Request Sent",
        "We have received your message. Our team will contact you shortly.",
        [
          { text: "OK", onPress: () => router.back() },
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
    // SafeAreaView Dark Green for Header continuity
    <SafeAreaView style={tw`flex-1 bg-green-800`}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#166534" /> 

      {/* --- Dark Green Header --- */}
      <View style={tw`flex-row items-center px-4 py-4 bg-green-800 shadow-sm`}>
        <Pressable
          onPress={() => router.back()}
          style={tw`p-2 bg-white/20 rounded-full mr-3`} // Semi-transparent white circle
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text style={tw`text-xl font-bold text-white`}>Contact Support</Text>
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        {/* Main Body Background White */}
        <View style={tw`flex-1 bg-white`}>
            <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={tw`flex-1`}
            >
            <ScrollView 
                contentContainerStyle={tw`p-6 pb-40`} // ✅ Extra Bottom Padding
                showsVerticalScrollIndicator={false}
            >
                
                {/* Info Box */}
                <View style={tw`bg-green-50 p-4 rounded-xl border border-green-100 mb-6 flex-row items-start`}>
                <Ionicons name="headset" size={24} color="#15803d" style={tw`mt-1`} />
                <Text style={tw`text-green-800 text-sm ml-3 flex-1 leading-5`}>
                    Facing an issue with a booking or app? Fill out the form below and we will help you out.
                </Text>
                </View>

                <View style={tw`gap-5`}>
                {/* Name */}
                <View>
                    <Text style={tw`text-sm font-bold text-gray-700 mb-2 ml-1`}>Your Name</Text>
                    <View style={tw`flex-row items-center bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm`}>
                    <Ionicons name="person" size={20} color="#15803d" />
                    <TextInput
                        style={tw`flex-1 ml-3 text-base text-gray-900`}
                        placeholder="John Doe"
                        placeholderTextColor="#9ca3af"
                        value={name}
                        onChangeText={setName}
                    />
                    </View>
                </View>

                {/* Email */}
                <View>
                    <Text style={tw`text-sm font-bold text-gray-700 mb-2 ml-1`}>Email Address</Text>
                    <View style={tw`flex-row items-center bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm`}>
                    <Ionicons name="mail" size={20} color="#15803d" />
                    <TextInput
                        style={tw`flex-1 ml-3 text-base text-gray-900`}
                        placeholder="name@example.com"
                        placeholderTextColor="#9ca3af"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                    />
                    </View>
                </View>

                {/* Subject */}
                <View>
                    <Text style={tw`text-sm font-bold text-gray-700 mb-2 ml-1`}>Subject</Text>
                    <View style={tw`flex-row items-center bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm`}>
                    <Ionicons name="pricetag" size={20} color="#15803d" />
                    <TextInput
                        style={tw`flex-1 ml-3 text-base text-gray-900`}
                        placeholder="e.g. Booking Issue, Payment Error"
                        placeholderTextColor="#9ca3af"
                        value={subject}
                        onChangeText={setSubject}
                    />
                    </View>
                </View>

                {/* Message */}
                <View>
                    <Text style={tw`text-sm font-bold text-gray-700 mb-2 ml-1`}>Message</Text>
                    <View style={tw`bg-white border border-gray-200 rounded-xl px-4 py-3 h-36 shadow-sm`}>
                    <TextInput
                        style={tw`flex-1 text-base text-gray-900 text-justify`}
                        placeholder="Describe your issue here..."
                        placeholderTextColor="#9ca3af"
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
                    tw`mt-12 py-4 rounded-2xl items-center justify-center shadow-lg flex-row`, // Margin Top increased
                    loading || pressed ? tw`bg-green-900` : tw`bg-green-800`
                ]}
                >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <>
                    <Ionicons name="paper-plane" size={20} color="white" style={tw`mr-2`} />
                    <Text style={tw`text-white font-bold text-lg`}>Submit Ticket</Text>
                    </>
                )}
                </Pressable>

            </ScrollView>
            </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}