import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View
} from "react-native";
import tw from "twrnc";
import { db } from "../../../firebase/firebaseConfig";

// --- IMPORTS ---
import ArenaCard from "../../../components/specific/ArenaCard.jsx";
import HeroSection from "../../../components/specific/home/HeroSection";
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
    <View style={tw`flex-1 bg-gray-50`}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* 1. Navbar */}
      <HomeHeader />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`pb-32`}>
        
        {/* 2. Welcome & Search Section (White Background with Curves) */}
        <View style={tw`bg-white px-5 pt-3 pb-6 rounded-b-3xl shadow-sm z-10`}>
          
          {/* Greeting Text */}
          <View style={tw`mb-4`}>
            <Text style={tw`text-gray-400 text-xs font-bold uppercase tracking-widest`}>
              Welcome Player 👋
            </Text>
            <Text style={tw`text-2xl font-black text-gray-900 mt-1`}>
              Find Your <Text style={tw`text-green-600`}>Game</Text>
            </Text>
          </View>

          {/* Improved Search Bar */}
          <View style={tw`flex-row items-center bg-gray-50 px-4 py-3 rounded-2xl border border-gray-200`}>
            <Ionicons name="search" size={20} color={tw.color('gray-400')} />
            <TextInput
              style={tw`flex-1 ml-3 text-base text-gray-800 font-medium`}
              placeholder="Search courts, areas..."
              placeholderTextColor={tw.color('gray-400')}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
               <Pressable onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={tw.color('gray-400')} />
               </Pressable>
            )}
          </View>
        </View>

        {/* 3. HERO SECTION */}
        {/* Thoda margin-top diya hai taake search bar se chipka hua na lage */}
        {!searchQuery && (
          <View style={tw`mt-5 mb-2`}> 
             <HeroSection /> 
          </View>
        )}

        {/* 4. List Header */}
        <View style={tw`flex-row justify-between items-center px-5 mb-3 mt-4`}>
          <Text style={tw`text-lg font-bold text-gray-800`}>
            {searchQuery ? "Search Results" : "Popular Arenas"}
          </Text>
          {!searchQuery && (
            <Pressable 
              onPress={() => router.push('/(player)/home/allOwners')}
              style={tw`bg-green-50 px-3 py-1.5 rounded-full`}
            >
              <Text style={tw`text-xs font-bold text-green-700`}>See All</Text>
            </Pressable>
          )}
        </View>

        {/* 5. List Content */}
        {loading ? (
          <ActivityIndicator size="large" color={tw.color("green-600")} style={tw`mt-10`} />
        ) : (
          <View style={tw`px-5`}>
            {filteredArenas.length > 0 ? (
              filteredArenas.map((item) => (
                <View key={item.id} style={tw`mb-4`}>
                  <ArenaCard arena={item} />
                </View>
              ))
            ) : (
              <View style={tw`items-center justify-center mt-10 py-10 bg-white rounded-2xl border border-gray-100 border-dashed mx-5`}>
                <Ionicons name="search-outline" size={40} color={tw.color('gray-300')} />
                <Text style={tw`text-gray-400 text-sm mt-3 font-medium`}>No arenas found</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}