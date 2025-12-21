import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, increment, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useAuth } from '../../../../context/AuthContext';
import { db } from '../../../../firebase/firebaseConfig';
import { notifyUser } from '../../../../utils/notifications'; // Import Notification Helper

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

    // Variables to store data for notification outside transaction
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

        // Store data for later notification
        ownerIdToNotify = tournament.ownerId;
        tournamentNameToNotify = tournament.tournamentName;

        // Create Registration
        transaction.set(newRegistrationRef, {
          tournamentId: tournamentId,
          ownerId: tournament.ownerId,
          teamName: teamName,
          captainName: captainName,
          captainPhone: captainPhone,
          playerId: user.uid, // Note: We use 'playerId' here
          status: "paid",
          registeredAt: serverTimestamp(),
        });

        // Update Count
        transaction.update(tournamentRef, {
          registeredTeamCount: increment(1)
        });
      });

      // --- 🔥 NOTIFY OWNER: New Team Registered ---
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
      router.replace(`/home/tournamentDetails/${tournamentId}`); 

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