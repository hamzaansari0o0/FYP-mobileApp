import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { db } from '../../../firebase/firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const AdminHeader = ({ title, onBack }) => (
  <View style={tw`flex-row items-center mb-5`}>
    <Pressable onPress={onBack} style={tw`p-2`}>
      <Ionicons name="arrow-back-outline" size={28} color={tw.color('purple-800')} />
    </Pressable>
    <Text style={tw`text-3xl font-bold text-purple-800 ml-3`}>{title}</Text>
  </View>
);

const ArenaManageCard = ({ arena, onDisable, onEnable, onViewCourts }) => {
  const isEnabled = arena.status !== 'disabled';
  
  return (
    <Pressable 
      onPress={() => onViewCourts(arena.id)} // Pure card par click se courts khulein
      style={tw`bg-white p-4 rounded-lg shadow-md mb-4 border border-gray-100`}
    >
      <View style={tw`flex-row justify-between items-start`}>
        <View style={tw`flex-1`}>
          <Text style={tw`text-xl font-bold text-gray-800`}>{arena.arenaName}</Text>
          <Text style={tw`text-base text-gray-600 mt-1`}>{arena.arenaAddress}</Text>
          <Text style={tw`text-sm text-gray-500 mt-1`}>Owner: {arena.name}</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={tw.color('gray-400')} />
      </View>
      
      <View style={tw`flex-row justify-between items-center mt-4 pt-3 border-t border-gray-100`}>
        <Text style={tw`font-bold ${isEnabled ? 'text-green-600' : 'text-red-600'}`}>
            Status: {arena.status ? arena.status.toUpperCase() : 'UNKNOWN'}
        </Text>

        <Pressable
          style={tw`py-2 px-4 rounded-lg ${isEnabled ? 'bg-red-100' : 'bg-green-100'}`}
          onPress={() => isEnabled ? onDisable(arena.id) : onEnable(arena.id)}
        >
          <Text style={tw`font-bold ${isEnabled ? 'text-red-700' : 'text-green-700'}`}>
            {isEnabled ? 'Disable Arena' : 'Enable Arena'}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
};

export default function ManageArenasScreen() {
  const [arenas, setArenas] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      fetchArenas();
    }, [])
  );

  const fetchArenas = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'owner'),
        // Hum sirf Approved ya Disabled dikhana chahte hain (Pending nahi)
        where('status', 'in', ['approved', 'disabled']) 
      );
      const querySnapshot = await getDocs(q);
      // Filter out those without arenaName
      const arenasList = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(a => a.arenaName); 
        
      setArenas(arenasList);
    } catch (error) {
      console.error("Error fetching arenas: ", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (id) => {
    Alert.alert(
        "Disable Arena?",
        "This will hide the arena and ALL its courts from players.",
        [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Disable", style: "destructive", 
                onPress: async () => {
                    await updateDoc(doc(db, 'users', id), { status: 'disabled' });
                    setArenas(prev => prev.map(a => a.id === id ? { ...a, status: 'disabled' } : a));
                }
            }
        ]
    );
  };

  const handleEnable = async (id) => {
    await updateDoc(doc(db, 'users', id), { status: 'approved' });
    setArenas(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' } : a));
  };

  const handleViewCourts = (ownerId) => {
    // Navigate to next level
    router.push(`/(admin)/dashboard/arenaCourts/${ownerId}`);
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <View style={tw`p-5`}>
        <AdminHeader title="Manage Arenas" onBack={() => router.back()} />
        
        {loading ? (
          <ActivityIndicator size="large" color={tw.color('purple-600')} />
        ) : (
          <FlatList
            data={arenas}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <ArenaManageCard 
                arena={item} 
                onDisable={handleDisable} 
                onEnable={handleEnable} 
                onViewCourts={handleViewCourts}
              />
            )}
            ListEmptyComponent={<Text>No active arenas found.</Text>}
          />
        )}
      </View>
    </SafeAreaView>
  );
}