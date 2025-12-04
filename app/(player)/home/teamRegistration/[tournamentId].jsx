import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import tw from 'twrnc';
import { db } from '../../../../firebase/firebaseConfig';
import { doc, runTransaction, collection, increment, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../../../context/AuthContext';

export default function TeamRegistrationScreen() {
  const { tournamentId } = useLocalSearchParams();
  const { user, userData } = useAuth();
  const router = useRouter();

  const [teamName, setTeamName] = useState("");
  const [captainName, setCaptainName] = useState(userData?.name || ""); // Auto-fill
  const [captainPhone, setCaptainPhone] = useState(userData?.mobileNumber || ""); // Auto-fill
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

    try {
      // Hum Transaction istemal karein ge (Team limit check karne ke liye)
      await runTransaction(db, async (transaction) => {
        const tournamentDoc = await transaction.get(tournamentRef);
        if (!tournamentDoc.exists()) {
          throw new Error("Tournament not found!");
        }

        const tournament = tournamentDoc.data();

        // 1. Check karein ke teams full to nahi
        if (tournament.teamLimit && tournament.registeredTeamCount >= tournament.teamLimit) {
          throw new Error("Sorry, this tournament is already full.");
        }

        // 2. Nayi registration document banayein
        transaction.set(newRegistrationRef, {
          tournamentId: tournamentId,
          ownerId: tournament.ownerId,
          teamName: teamName,
          captainName: captainName,
          captainPhone: captainPhone,
          playerId: user.uid, // Player jisne register kiya
          status: "paid",
          registeredAt: serverTimestamp(),
        });

        // 3. Tournament mein count barhayein
        transaction.update(tournamentRef, {
          registeredTeamCount: increment(1)
        });
      });

      // (Simulated Payment Delay)
      await new Promise(resolve => setTimeout(resolve, 1500));

      Alert.alert(
        "Registration Successful!",
        "Your team is registered. The owner will contact you."
      );
      router.replace(`/home/tournamentDetails/${tournamentId}`); // Details screen par wapas bhej dein

    } catch (error) {
      console.error("Registration Transaction Failed: ", error);
      Alert.alert("Registration Failed", error.message);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <Stack.Screen options={{ title: "Register Your Team" }} />
      <ScrollView contentContainerStyle={tw`p-5`}>
        <Text style={tw`text-lg font-semibold mb-2 text-gray-700`}>Team Name</Text>
        <TextInput
          style={tw`border border-gray-300 p-3 rounded-lg text-base bg-white mb-4`}
          placeholder="e.g., The Avengers"
          value={teamName}
          onChangeText={setTeamName}
        />
        
        <Text style={tw`text-lg font-semibold mb-2 text-gray-700`}>Captain's Name</Text>
        <TextInput
          style={tw`border border-gray-300 p-3 rounded-lg text-base bg-white mb-4`}
          placeholder="Your name"
          value={captainName}
          onChangeText={setCaptainName}
        />
        
        <Text style={tw`text-lg font-semibold mb-2 text-gray-700`}>Captain's Phone</Text>
        <TextInput
          style={tw`border border-gray-300 p-3 rounded-lg text-base bg-white mb-6`}
          placeholder="Your phone number"
          value={captainPhone}
          onChangeText={setCaptainPhone}
          keyboardType="phone-pad"
        />

        <Pressable
          style={tw.style(
            `bg-green-600 py-4 rounded-lg shadow-md`,
            isRegistering && `bg-green-400`
          )}
          onPress={handleRegister}
          disabled={isRegistering}
        >
          {isRegistering ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={tw`text-white text-center text-lg font-bold`}>
              Register & Pay (Simulated)
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}