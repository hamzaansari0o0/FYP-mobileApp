import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useRouter } from 'expo-router';
// Humara banaya hua form component
import TournamentRegistrationForm from '../../../components/specific/TournamentRegistrationForm'; 

export default function CreateTournamentScreen() {
  const router = useRouter();

  // Jab naya tournament ban jaye
  const handleSuccess = () => {
    router.back(); // Form (modal) ko band karein
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      {/* === YAHAN TABDEELI KI GAYI HAI ===
        Prop ka naam 'onRegistrationSuccess' se badal kar 'onSuccess' kar diya gaya hai.
        Ab yeh TournamentRegistrationForm.jsx ke andar 'onSuccess()' function ko call karega.
      */}
      <TournamentRegistrationForm 
        onSuccess={handleSuccess} 
      />
    </SafeAreaView>
  );
}