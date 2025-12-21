import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import CourtRegistrationForm from '../../../components/specific/CourtRegistrationForm';
import { useAuth } from '../../../context/AuthContext';
import { notifyAdmins } from '../../../utils/notifications';

export default function AddCourtScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const handleSuccess = async (newId, newData) => {
    // Notify Admins
    try {
        await notifyAdmins(
            "New Court Added 🆕",
            `New court '${newData.courtName}' added by ${user.email}. Status: Pending.`,
            { url: '/(admin)/arenas' }
        );
    } catch (e) {
        console.log("Notification error (ignorable):", e);
    }

    // Success hone par wapas Dashboard par bhej dein
    router.back();
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <Stack.Screen options={{ title: 'Add New Court' }} />
      <CourtRegistrationForm
        user={user}
        onRegistrationSuccess={handleSuccess}
      />
    </SafeAreaView>
  );
}