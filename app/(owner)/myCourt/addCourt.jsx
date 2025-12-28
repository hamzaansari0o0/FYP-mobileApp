import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, StatusBar, Text, View } from 'react-native';
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
    router.back();
  };

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* 🟢 1. STATUS BAR (Matches MyCourt Screen) */}
      <StatusBar barStyle="light-content" backgroundColor="#14532d" translucent={false} />
      
      {/* 🟢 2. CUSTOM HEADER (Matches MyCourt Screen) */}
      <View style={{ backgroundColor: '#14532d' }}>
        <SafeAreaView edges={['top', 'left', 'right']} style={tw`px-4 pb-4 pt-2`}>
            <View style={tw`flex-row items-center gap-3`}>
                
                {/* Back Button (White for contrast) */}
                <Pressable 
                    onPress={() => router.back()}
                    style={tw`bg-white p-2 rounded-full shadow-md active:bg-gray-200`}
                >
                    <Ionicons name="arrow-back" size={20} color={tw.color('green-900')} />
                </Pressable>

                {/* Header Text */}
                <View>
                    <Text style={tw`text-xl font-extrabold text-white`}>Add New Court</Text>
                    <Text style={tw`text-xs text-green-300 font-medium`}>Fill details to list a court</Text>
                </View>
            </View>
        </SafeAreaView>
      </View>

      <CourtRegistrationForm
        user={user}
        onRegistrationSuccess={handleSuccess}
      />
    </View>
  );
}