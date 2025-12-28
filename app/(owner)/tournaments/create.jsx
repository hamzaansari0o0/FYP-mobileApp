import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import TournamentRegistrationForm from '../../../components/specific/TournamentRegistrationForm';
import { notifyAllPlayers } from '../../../utils/notifications'; // Notification Import

export default function CreateTournamentScreen() {
  const router = useRouter();

  // Jab naya tournament ban jaye
  const handleSuccess = async (newId, newData) => {
    console.log("🏆 Tournament Created:", newId);

    // 🔥 NOTIFY ALL PLAYERS: New Tournament
    if (newData && newData.tournamentName) {
      try {
        await notifyAllPlayers(
          "New Tournament Alert! 🏆",
          `Registration is now open for ${newData.tournamentName}. Join now!`,
          { url: '/(player)/tournaments' } // Link to player tournament list
        );
        console.log("✅ Broadcast notification sent to all players.");
      } catch (error) {
        // Notification fail hone par bhi process rukna nahi chahiye
        console.error("❌ Failed to send broadcast:", error);
      }
    }

    router.back(); // Screen close karein
  };

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* 🛑 Default Header Hide karein */}
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
                <Text style={tw`text-xl font-bold text-white`}>Create Tournament</Text>
                <Text style={tw`text-xs text-green-200`}>Setup details & format</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* 📝 FORM CONTAINER */}
      <View style={tw`flex-1`}>
        <TournamentRegistrationForm 
          onSuccess={handleSuccess} 
        />
      </View>
    </View>
  );
}