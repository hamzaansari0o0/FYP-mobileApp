import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useAuth } from '../../../context/AuthContext';
import { useRouter, Stack } from 'expo-router';
import CourtRegistrationForm from '../../../components/specific/CourtRegistrationForm'; 

export default function AddCourtScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const handleSuccess = (newId, newData) => {
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