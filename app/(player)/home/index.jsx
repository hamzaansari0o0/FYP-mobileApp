import React, { useState, useCallback, useMemo } from "react";
import {
  View, Text, ActivityIndicator,
  TextInput, ScrollView, Pressable, StatusBar, Image
} from "react-native";
import tw from "twrnc";
import { db } from "../../../firebase/firebaseConfig";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { useFocusEffect, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// --- IMPORTS ---
import HeroSection from "../../../components/specific/home/HeroSection"; 
import ArenaCard from "../../../components/specific/ArenaCard.jsx"; 
import HomeHeader from "../../../components/specific/home/HomeHeader"; 

export default function PlayerHome() {
  const router = useRouter();
  const [arenas, setArenas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useFocusEffect(useCallback(() => { fetchNearbyArenas(); }, []));

  const fetchNearbyArenas = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "users"),
        where("role", "==", "owner"),
        where("status", "==", "approved"),
        limit(10) 
      );
      
      const querySnapshot = await getDocs(q);
      const arenasList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setArenas(arenasList);
    } catch (error) {
      console.error("Error fetching arenas: ", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredArenas = useMemo(() => {
    if (!searchQuery) return arenas;
    const q = searchQuery.toLowerCase();
    return arenas.filter(arena => 
      arena.arenaName?.toLowerCase().includes(q) || 
      arena.arenaAddress?.toLowerCase().includes(q)
    );
  }, [searchQuery, arenas]);

  return (
    <View style={tw`flex-1 bg-white`}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* 1. Navbar */}
      <HomeHeader />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`pb-24`}>
        
        {/* 2. Welcome & Search (Isme Padding hai) */}
        <View style={tw`px-4 pt-2 pb-4 bg-white`}>
          <Text style={tw`text-gray-500 text-xs font-medium -mt-1`}>Welcome Player 👋</Text>
          <Text style={tw`text-xl font-bold text-gray-900`}>
            Find Your <Text style={tw`text-green-600`}>Game</Text>
          </Text>

          {/* Search Bar */}
          <View style={tw`flex-row items-center bg-gray-100 px-3 py-2 rounded-lg mt-3 border border-gray-200`}>
            <Ionicons name="search" size={18} color={tw.color('gray-400')} />
            <TextInput
              style={tw`flex-1 ml-2 text-sm text-gray-800`}
              placeholder="Search courts..."
              placeholderTextColor={tw.color('gray-400')}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
               <Pressable onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={tw.color('gray-400')} />
               </Pressable>
            )}
          </View>
        </View>

        {/* 3. HERO SECTION (Full Width - Padding ke bahar) */}
        {/* Sirf tab dikhayein jab search na ho raha ho */}
        {!searchQuery && (
          <View style={tw`mb-6`}> 
             {/* Yahan koi px-4 padding nahi hai, isliye full width aayega */}
             <HeroSection /> 
          </View>
        )}

        {/* 4. List Header (Padding wapas) */}
        <View style={tw`flex-row justify-between items-end px-4 mb-3`}>
          <Text style={tw`text-lg font-bold text-gray-800`}>
            {searchQuery ? "Results" : "Popular Arenas"}
          </Text>
          {!searchQuery && (
            <Pressable onPress={() => router.push('/(player)/home/allOwners')}>
              <Text style={tw`text-xs font-bold text-green-600`}>See All</Text>
            </Pressable>
          )}
        </View>

        {/* 5. List Content (Padding ke sath) */}
        {loading ? (
          <ActivityIndicator size="large" color={tw.color("green-600")} style={tw`mt-10`} />
        ) : (
          <View style={tw`px-4`}>
            {filteredArenas.length > 0 ? (
              filteredArenas.map((item) => (
                <View key={item.id} style={tw`mb-3`}>
                  <ArenaCard arena={item} />
                </View>
              ))
            ) : (
              <View style={tw`items-center justify-center mt-5 py-8 bg-gray-50 rounded-lg`}>
                <Ionicons name="search-outline" size={30} color={tw.color('gray-300')} />
                <Text style={tw`text-gray-400 text-sm mt-2`}>No arenas found</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}