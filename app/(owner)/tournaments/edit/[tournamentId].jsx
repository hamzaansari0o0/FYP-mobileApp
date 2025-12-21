import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import TournamentRegistrationForm from '../../../../components/specific/TournamentRegistrationForm';
import { db } from '../../../../firebase/firebaseConfig';
import { notifyAllPlayers, notifyUser } from '../../../../utils/notifications'; // Added notifyAllPlayers

export default function EditTournamentScreen() {
  const router = useRouter();
  const { tournamentId } = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState(null);

  useEffect(() => {
    if (!tournamentId) return;
    
    const fetchTournament = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'tournaments', tournamentId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setInitialData({ id: docSnap.id, ...docSnap.data() });
        } else {
          Alert.alert("Error", "Tournament not found.");
          router.back();
        }
      } catch (error) {
        Alert.alert("Error", "Could not load tournament data.");
        router.back();
      } finally {
        setLoading(false);
      }
    };
    
    fetchTournament();
  }, [tournamentId]);

  // Edit karne ke baad notification bhejein
  const handleSuccess = async (newId, updatedData) => {
    const tourName = updatedData?.tournamentName || initialData?.tournamentName || "Tournament";
    console.log(`📝 Tournament Updated: ${tourName} (ID: ${tournamentId})`);

    // Check if Schedule is generated (Status is usually 'live' or 'completed')
    const isScheduleGenerated = initialData?.status === 'live' || initialData?.status === 'completed';

    if (!isScheduleGenerated) {
        // --- CASE 1: Schedule NOT generated (Registration Phase) -> Broadcast to ALL Players ---
        console.log("ℹ️ Schedule not generated yet. Broadcasting update to all players.");
        try {
            await notifyAllPlayers(
                "Tournament Update 📢",
                `Details for '${tourName}' have been updated. Check the latest info!`,
                { url: `/(player)/tournaments` }
            );
            console.log("✅ Broadcast sent to all players.");
        } catch (error) {
            console.error("❌ Error broadcasting update:", error);
        }
    } else {
        // --- CASE 2: Schedule IS Generated -> Notify Registered Teams Only ---
        console.log("ℹ️ Schedule exists. Notifying registered teams only.");
        try {
            const q = query(
                collection(db, 'tournamentRegistrations'), 
                where('tournamentId', '==', tournamentId)
            );
            const snapshot = await getDocs(q);
            
            console.log(`🔎 Found ${snapshot.size} registered teams for notification.`);

            if (!snapshot.empty) {
                const notifications = snapshot.docs.map(async (docSnap) => {
                    const data = docSnap.data();
                    // Captain ID ya User ID uthayein
                    const targetId = data.captainId || data.userId || data.playerId; 
                    
                    if (targetId) {
                        await notifyUser(
                            targetId,
                            "Tournament Update 📢",
                            `Details for '${tourName}' have been updated. Check the schedule/rules.`,
                            "info",
                            { url: `/(player)/tournaments` }
                        );
                    }
                });
                await Promise.all(notifications);
                console.log("✅ Targeted updates sent to registered teams.");
            } else {
                console.log("ℹ️ No registered teams to notify.");
            }
        } catch (error) {
            console.error("❌ Error notifying registered players:", error);
        }
    }

    router.back(); 
  };

  if (loading) {
    return (
        <SafeAreaView style={tw`flex-1 justify-center items-center bg-gray-100`}>
            <ActivityIndicator size="large" color={tw.color('blue-600')} />
        </SafeAreaView>
    );
  }

  if (!initialData) {
    return (
        <SafeAreaView style={tw`flex-1 justify-center items-center bg-gray-100`}>
            <Text style={tw`text-gray-500`}>No data found.</Text>
        </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <Stack.Screen options={{ title: "Edit: " + initialData.tournamentName }} />
      <TournamentRegistrationForm 
        isEditMode={true}
        initialData={initialData}
        onSuccess={handleSuccess} 
      />
    </SafeAreaView>
  );
}