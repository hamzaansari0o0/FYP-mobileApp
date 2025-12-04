import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import tw from 'twrnc';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import TournamentRegistrationForm from '../../../../components/specific/TournamentRegistrationForm'; 
import { db } from '../../../../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

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

  // Edit karne ke baad wapas Manage screen par
  const handleSuccess = () => {
    router.back(); 
  };

  if (loading) {
    return <SafeAreaView style={tw`flex-1 justify-center`}><ActivityIndicator size="large" /></SafeAreaView>;
  }

  if (!initialData) {
    return <SafeAreaView><Text style={tw`text-center mt-20`}>No data.</Text></SafeAreaView>;
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