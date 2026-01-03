import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, getDoc, increment, runTransaction, serverTimestamp } from 'firebase/firestore'; // getDoc added
import { useEffect, useState } from 'react'; // useEffect added
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
  const [entryFee, setEntryFee] = useState(0); // State for Fee
  const [isRegistering, setIsRegistering] = useState(false);

  // --- 1. Tournament Data (Fee) Fetch Karein ---
  useEffect(() => {
    const fetchTournamentDetails = async () => {
        try {
            const docRef = doc(db, 'tournaments', tournamentId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setEntryFee(docSnap.data().entryFee || 0);
            }
        } catch (error) {
            console.log("Error fetching fee:", error);
        }
    };
    fetchTournamentDetails();
  }, [tournamentId]);

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

        if (tournament.teamLimit && tournament.registeredTeamCount >= tournament.teamLimit) {
          throw new Error("Sorry, this tournament is already full.");
        }

        ownerIdToNotify = tournament.ownerId;
        tournamentNameToNotify = tournament.tournamentName;

        transaction.set(newRegistrationRef, {
          tournamentId: tournamentId,
          ownerId: tournament.ownerId,
          teamName: teamName,
          captainName: captainName,
          captainPhone: captainPhone,
          playerId: user.uid,
          status: "paid", // Status Paid set ho raha hai
          amountPaid: entryFee, // Amount bhi save kar rahe hain
          registeredAt: serverTimestamp(),
        });

        transaction.update(tournamentRef, {
          registeredTeamCount: increment(1)
        });
      });

      if (ownerIdToNotify) {
          await notifyUser(
              ownerIdToNotify,
              "New Team Registered 🏏",
              `${teamName} has registered for ${tournamentNameToNotify}.`,
              "info",
              { url: `/(owner)/tournaments/details/${tournamentId}` }
          );
      }

      // --- 2. Success Message Update ---
      Alert.alert(
        "Payment Successful! 🎉", 
        `Entry fee of ₹${entryFee} received. Your team is officially registered.`
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
    <SafeAreaView style={tw`flex-1 bg-green-800`}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#166534" />

      {/* --- Header --- */}
      <View style={tw`px-5 py-4 bg-green-800 flex-row items-center`}>
        <Pressable onPress={() => router.back()} style={tw`p-2 bg-white/20 rounded-full mr-3`}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text style={tw`text-xl font-bold text-white flex-1`}>Register Your Team</Text>
      </View>

      {/* --- Body --- */}
      <View style={tw`flex-1 bg-gray-50 rounded-t-3xl overflow-hidden`}>
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={tw`flex-1`}
        >
          <ScrollView 
            contentContainerStyle={tw`p-6 pb-40`} 
            showsVerticalScrollIndicator={false}
          >
            
            {/* Intro Text */}
            <View style={tw`items-center mb-6`}>
                <View style={tw`bg-green-100 p-4 rounded-full mb-3`}>
                    <Ionicons name="shield-checkmark-outline" size={40} color="#15803d" />
                </View>
                <Text style={tw`text-gray-500 text-center text-sm px-4`}>
                    Enter details & pay entry fee to join.
                </Text>
            </View>

            {/* Inputs */}
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

            <View style={tw`mb-6`}>
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

            {/* --- 3. Payment Summary Box (New) --- */}
            <View style={tw`bg-green-50 border border-green-200 p-4 rounded-xl mb-6 flex-row justify-between items-center`}>
                <View>
                    <Text style={tw`text-green-800 font-bold text-base`}>Entry Fee</Text>
                    <Text style={tw`text-green-600 text-xs`}>Payable Now</Text>
                </View>
                <Text style={tw`text-2xl font-extrabold text-green-700`}>₹{entryFee}</Text>
            </View>

            {/* Button */}
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
                        {/* Button text changed to reflect payment */}
                        Pay ₹{entryFee} & Register
                    </Text>
                    <Ionicons name="card-outline" size={24} color="white" />
                </>
              )}
            </Pressable>

          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}