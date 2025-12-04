import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../firebase/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TournamentsListScreen() {
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter(); 

  const [tournaments, setTournaments] = useState([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);

  const isArenaApproved = userData?.status === 'approved';

  useFocusEffect(
    useCallback(() => {
      if (isArenaApproved) {
        fetchOwnerTournaments();
      } else {
        setLoadingTournaments(false);
      }
    }, [isArenaApproved, userData]) // userData ko bhi add karein
  );

  const fetchOwnerTournaments = async () => {
    setLoadingTournaments(true);
    try {
      const q = query(
        collection(db, 'tournaments'),
        where('ownerId', '==', userData.uid)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTournaments(list);
    } catch (error) {
      console.error('Error fetching tournaments: ', error);
    } finally {
      setLoadingTournaments(false);
    }
  };

  if (authLoading) {
    return <ActivityIndicator size="large" style={tw`mt-20`} />;
  }

  // --- UI 1: Arena Not Approved ---
  if (!isArenaApproved) {
    return (
      <SafeAreaView style={tw`flex-1 items-center justify-center bg-gray-100 p-5`}>
        <Ionicons name="lock-closed-outline" size={50} color={tw.color("gray-400")} />
        <Text style={tw`text-2xl font-bold text-center text-gray-700 mt-4`}>
          Arena Not Approved
        </Text>
        <Text style={tw`text-base text-center text-gray-500 mt-2`}>
          You must register and get your Arena approved by Admin before you can create tournaments.
        </Text>
      </SafeAreaView>
    );
  }

  // --- UI 2: Tournaments List ---
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      {loadingTournaments ? (
        <ActivityIndicator size="large" style={tw`mt-20`} />
      ) : (
        <FlatList
          data={tournaments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={tw`p-4`}
          renderItem={({ item }) => (
            // === CARD AB CLICKABLE HAI ===
            <Pressable 
              style={tw`bg-white p-4 rounded-lg shadow-md mb-4`}
              // Details screen par navigate karein
              onPress={() => router.push(`/(owner)/tournaments/details/${item.id}`)}
            >
              <View style={tw`flex-row justify-between items-center`}>
                <Text style={tw`text-lg font-bold`}>{item.tournamentName}</Text>
                <Ionicons name="chevron-forward-outline" size={20} color={tw.color("gray-500")} />
              </View>
              <Text style={tw`text-base text-gray-600`}>Status: {item.status}</Text>
              <Text style={tw`text-base text-gray-600`}>Teams: {item.registeredTeamCount} / {item.teamLimit || 'Unlimited'}</Text>
            </Pressable>
            // === CLICKABLE CARD KHATAM ===
          )}
          ListEmptyComponent={
             <View style={tw`items-center justify-center mt-20 p-5`}>
              <Ionicons name="trophy-outline" size={40} color={tw.color("gray-400")} />
              <Text style={tw`text-lg text-gray-500 mt-2 text-center`}>
                You haven't created any tournaments yet. Press '+' to create one.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}