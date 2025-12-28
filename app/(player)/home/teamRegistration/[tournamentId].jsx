import { Ionicons } from '@expo/vector-icons'; // Icon import
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, increment, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import {
  ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
  Pressable, ScrollView,
  StatusBar,
  Text, TextInput, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useAuth } from '../../../../context/AuthContext';
import { db } from '../../../../firebase/firebaseConfig';
import { notifyUser } from '../../../../utils/notifications';

export default function TeamRegistrationScreen() {
  const { tournamentId } = useLocalSearchParams();
  const { user, userData } = useAuth();
  const router = useRouter();

  const [teamName, setTeamName] = useState("");
  const [captainName, setCaptainName] = useState(userData?.name || ""); 
  const [captainPhone, setCaptainPhone] = useState(userData?.mobileNumber || ""); 
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegister = async () => {
    if (!teamName || !captainName || !captainPhone) {
      Alert.alert("Missing Fields", "Please fill all fields.");
      return;
    }
    if (!user) {
      Alert.alert("Error", "You must be logged in.");
      return;
    }

    setIsRegistering(true);
    
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const newRegistrationRef = doc(collection(db, 'tournamentRegistrations'));

    let ownerIdToNotify = null;
    let tournamentNameToNotify = "";

    try {
      await runTransaction(db, async (transaction) => {
        const tournamentDoc = await transaction.get(tournamentRef);
        if (!tournamentDoc.exists()) {
          throw new Error("Tournament not found!");
        }

        const tournament = tournamentDoc.data();

        // Check Limit
        if (tournament.teamLimit && tournament.registeredTeamCount >= tournament.teamLimit) {
          throw new Error("Sorry, this tournament is already full.");
        }

        ownerIdToNotify = tournament.ownerId;
        tournamentNameToNotify = tournament.tournamentName;

        // Create Registration
        transaction.set(newRegistrationRef, {
          tournamentId: tournamentId,
          ownerId: tournament.ownerId,
          teamName: teamName,
          captainName: captainName,
          captainPhone: captainPhone,
          playerId: user.uid,
          status: "paid",
          registeredAt: serverTimestamp(),
        });

        // Update Count
        transaction.update(tournamentRef, {
          registeredTeamCount: increment(1)
        });
      });

      // --- Notify Owner ---
      if (ownerIdToNotify) {
          await notifyUser(
              ownerIdToNotify,
              "New Team Registered 🏏",
              `${teamName} has registered for ${tournamentNameToNotify}.`,
              "info",
              { url: `/(owner)/tournaments/details/${tournamentId}` }
          );
      }

      Alert.alert(
        "Registration Successful!",
        "Your team is registered. The owner will contact you."
      );
      // Wapis details screen par bhejein
      router.replace(`/home/tournamentDetails/${tournamentId}`); 

    } catch (error) {
      console.error("Registration Transaction Failed: ", error);
      Alert.alert("Registration Failed", error.message);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-green-800`}>
      {/* Default Header Hide */}
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#166534" />

      {/* --- Custom Header --- */}
      <View style={tw`px-5 py-4 bg-green-800 flex-row items-center`}>
        <Pressable 
            onPress={() => router.back()} 
            style={tw`p-2 bg-white/20 rounded-full mr-3`}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text style={tw`text-xl font-bold text-white flex-1`}>
          Register Your Team
        </Text>
      </View>

      {/* --- Body (White Card Style) --- */}
      <View style={tw`flex-1 bg-gray-50 rounded-t-3xl overflow-hidden`}>
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={tw`flex-1`}
        >
          <ScrollView contentContainerStyle={tw`p-6`}>
            
            {/* Icon Header in Body */}
            <View style={tw`items-center mb-6`}>
                <View style={tw`bg-green-100 p-4 rounded-full mb-3`}>
                    <Ionicons name="shield-checkmark-outline" size={40} color="#15803d" />
                </View>
                <Text style={tw`text-gray-500 text-center text-sm px-4`}>
                    Enter your team details below to join the tournament.
                </Text>
            </View>

            {/* Input 1: Team Name */}
            <View style={tw`mb-5`}>
                <Text style={tw`text-sm font-bold text-gray-700 mb-2 ml-1`}>Team Name</Text>
                <View style={tw`flex-row items-center border border-gray-300 bg-white rounded-xl px-3 py-3`}>
                    <Ionicons name="people-outline" size={20} color="gray" style={tw`mr-3`} />
                    <TextInput
                        style={tw`flex-1 text-base text-gray-800`}
                        placeholder="e.g. The Avengers"
                        value={teamName}
                        onChangeText={setTeamName}
                        placeholderTextColor="#9ca3af"
                    />
                </View>
            </View>

            {/* Input 2: Captain Name */}
            <View style={tw`mb-5`}>
                <Text style={tw`text-sm font-bold text-gray-700 mb-2 ml-1`}>Captain's Name</Text>
                <View style={tw`flex-row items-center border border-gray-300 bg-white rounded-xl px-3 py-3`}>
                    <Ionicons name="person-outline" size={20} color="gray" style={tw`mr-3`} />
                    <TextInput
                        style={tw`flex-1 text-base text-gray-800`}
                        placeholder="Your Name"
                        value={captainName}
                        onChangeText={setCaptainName}
                        placeholderTextColor="#9ca3af"
                    />
                </View>
            </View>

            {/* Input 3: Captain Phone */}
            <View style={tw`mb-8`}>
                <Text style={tw`text-sm font-bold text-gray-700 mb-2 ml-1`}>Captain's Phone</Text>
                <View style={tw`flex-row items-center border border-gray-300 bg-white rounded-xl px-3 py-3`}>
                    <Ionicons name="call-outline" size={20} color="gray" style={tw`mr-3`} />
                    <TextInput
                        style={tw`flex-1 text-base text-gray-800`}
                        placeholder="0300-1234567"
                        value={captainPhone}
                        onChangeText={setCaptainPhone}
                        keyboardType="phone-pad"
                        placeholderTextColor="#9ca3af"
                    />
                </View>
            </View>

            {/* Submit Button */}
            <Pressable
              style={tw.style(
                `bg-green-700 py-4 rounded-xl shadow-md flex-row justify-center items-center`,
                isRegistering && `bg-green-500`
              )}
              onPress={handleRegister}
              disabled={isRegistering}
            >
              {isRegistering ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                    <Text style={tw`text-white text-center text-lg font-bold mr-2`}>
                    Confirm Registration
                    </Text>
                    <Ionicons name="arrow-forward-circle-outline" size={24} color="white" />
                </>
              )}
            </Pressable>

          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}