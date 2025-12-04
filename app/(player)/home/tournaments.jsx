import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { db } from '../../../firebase/firebaseConfig';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore'; 
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import TournamentCard from '../../../components/specific/TournamentCard';

export default function TournamentsScreen() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchActiveTournaments();
    }, [])
  );

  const fetchActiveTournaments = async () => {
    setLoading(true);
    try {
      // 1 din pehle ka time calculate karein
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      // Query A: 'live' aur 'registration_open' tournaments
      const q1 = query(
        collection(db, 'tournaments'),
        where('status', 'in', ['registration_open', 'live'])
      );

      // Query B: 'completed' tournaments (jo 24 ghante pehle khatam hue)
      const q2 = query(
        collection(db, 'tournaments'),
        where('status', '==', 'completed'),
        where('completedAt', '>', Timestamp.fromDate(oneDayAgo)) // <-- Automatic filter
      );

      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

      // Results ko combine (merge) karein
      const tournamentMap = new Map();
      snap1.docs.forEach(doc => tournamentMap.set(doc.id, { id: doc.id, ...doc.data() }));
      snap2.docs.forEach(doc => tournamentMap.set(doc.id, { id: doc.id, ...doc.data() }));

      let list = Array.from(tournamentMap.values());
      list.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate()); 

      setTournaments(list);

    } catch (error) {
      console.error("Error fetching tournaments: ", error);
      if (error.code === 'failed-precondition') {
          Alert.alert(
            "Database Error", 
            "Query requires an index. Please check the console log for a link to create it."
          );
      } else {
          Alert.alert('Error', 'Could not fetch tournaments.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      {loading ? (
        <ActivityIndicator
          size="large"
          color={tw.color("blue-600")}
          style={tw`mt-20`}
        />
      ) : (
        <FlatList
          data={tournaments}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <TournamentCard tournament={item} />}
          contentContainerStyle={tw`p-4`}
          ListEmptyComponent={
            <View style={tw`items-center justify-center mt-20`}>
              <Ionicons name="trophy-outline" size={40} color={tw.color("gray-400")} />
              <Text style={tw`text-lg text-gray-500 mt-2`}>
                No active or upcoming tournaments found.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}