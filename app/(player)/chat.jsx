import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { db } from '../../firebase/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect } from 'expo-router';

// Player card ke liye chota component
const PlayerCard = ({ player }) => (
  <Pressable style={tw`bg-white p-4 rounded-lg shadow-md mb-3 flex-row items-center justify-between`}>
    <View>
      <Text style={tw`text-lg font-bold text-gray-800`}>{player.name}</Text>
      <Text style={tw`text-sm text-gray-500`}>{player.city}</Text>
    </View>
    <Text style={tw`text-xs bg-blue-100 text-blue-800 font-bold px-2 py-1 rounded-full`}>Chat</Text>
  </Pressable>
);

export default function ChatScreen() {
  const { user } = useAuth(); // Ta ke khud ko list se nikal sakein
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchPlayers();
    }, [])
  );

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'player'));
      const querySnapshot = await getDocs(q);
      const playersList = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(p => p.id !== user.uid); // Khud ko list se hatayein
      
      setPlayers(playersList);
    } catch (error) {
      console.error("Error fetching players: ", error);
      Alert.alert('Error', 'Could not fetch players list.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <View style={tw`p-5`}>
        <Text style={tw`text-3xl font-bold text-blue-800 mb-5`}>Chat with Players</Text>
        {loading ? (
          <ActivityIndicator size="large" color={tw.color('blue-600')} style={tw`mt-20`} />
        ) : (
          <FlatList
            data={players}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <PlayerCard player={item} />}
            ListEmptyComponent={
              <View style={tw`items-center justify-center mt-20`}>
                <Text style={tw`text-lg text-gray-500`}>No other players found.</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}