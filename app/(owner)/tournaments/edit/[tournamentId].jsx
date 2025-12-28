import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StatusBar,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import TournamentRegistrationForm from '../../../../components/specific/TournamentRegistrationForm';
import { db } from '../../../../firebase/firebaseConfig';
import { notifyAllPlayers, notifyUser } from '../../../../utils/notifications';

export default function EditTournamentScreen() {
  const router = useRouter();
  const { tournamentId } = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState(null);

  // --- FETCH DATA ---
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

  // --- HANDLE SUCCESS & NOTIFICATIONS ---
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
        <View style={tw`flex-1 justify-center items-center bg-gray-50`}>
            <Stack.Screen options={{ headerShown: false }} />
            <ActivityIndicator size="large" color={tw.color('green-700')} />
        </View>
    );
  }

  if (!initialData) {
    return (
        <View style={tw`flex-1 justify-center items-center bg-gray-50`}>
            <Stack.Screen options={{ headerShown: false }} />
            <Text style={tw`text-gray-500`}>No data found.</Text>
        </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* 🛑 Hide Default Header */}
      <Stack.Screen options={{ headerShown: false }} />
      
      <StatusBar barStyle="light-content" backgroundColor="#14532d" />

      {/* 🟢 CUSTOM GREEN HEADER */}
      <View style={{ backgroundColor: '#14532d' }}>
        <SafeAreaView edges={['top', 'left', 'right']} style={tw`px-4 pb-4 pt-2`}>
          <View style={tw`flex-row items-center`}>
            {/* Back Button */}
            <Pressable 
              onPress={() => router.back()}
              style={tw`mr-4 p-1 rounded-full`}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>

            {/* Title */}
            <View>
                <Text style={tw`text-xl font-bold text-white`}>Edit Tournament</Text>
                <Text style={tw`text-xs text-green-200`}>{initialData.tournamentName}</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* 📝 FORM CONTAINER */}
      <View style={tw`flex-1`}>
        <TournamentRegistrationForm 
          isEditMode={true}
          initialData={initialData}
          onSuccess={handleSuccess} 
        />
      </View>
    </View>
  );
}