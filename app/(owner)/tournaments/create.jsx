import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import TournamentRegistrationForm from '../../../components/specific/TournamentRegistrationForm';
import { notifyAllPlayers } from '../../../utils/notifications'; // Import Notification Helper

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
        console.error("❌ Failed to send broadcast:", error);
      }
    }

    router.back(); // Form (modal) ko band karein
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <TournamentRegistrationForm 
        onSuccess={handleSuccess} 
      />
    </SafeAreaView>
  );
}