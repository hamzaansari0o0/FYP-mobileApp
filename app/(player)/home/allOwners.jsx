import React, { useState, useCallback, useMemo } from "react"; // 1. useMemo import karein
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput, // 2. TextInput import karein
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { db } from "../../../firebase/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ArenaCard from "../../../components/specific/ArenaCard.jsx"; 

export default function AllOwnersScreen() {
  const [arenas, setArenas] = useState([]); // Yeh master list hai
  const [loading, setLoading] = useState(true);
  
  // === 3. NAYI STATE (Search ke liye) ===
  const [searchQuery, setSearchQuery] = useState("");

  useFocusEffect(useCallback(() => { fetchAllArenas(); }, []));

  const fetchAllArenas = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "users"),
        where("role", "==", "owner"),
        where("status", "==", "approved")
      );
      const querySnapshot = await getDocs(q);
      const arenasList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setArenas(arenasList); // Master list ko set karein
    } catch (error) {
      console.error("Error fetching all arenas: ", error);
      Alert.alert("Error", "Could not fetch arenas.");
    } finally {
      setLoading(false);
    }
  };

  // === 4. NAYA FILTER LOGIC ===
  // Yeh 'arenas' list ko filter karega jab bhi 'searchQuery' badlega
  const filteredArenas = useMemo(() => {
    if (!searchQuery) {
      return arenas; // Agar search khali hai, to poori list dikhayein
    }

    const query = searchQuery.toLowerCase();

    return arenas.filter(arena => {
      // Hum naam, address, aur city mein search karein ge
      const nameMatch = arena.arenaName?.toLowerCase().includes(query);
      const addressMatch = arena.arenaAddress?.toLowerCase().includes(query);
      const cityMatch = arena.city?.toLowerCase().includes(query);
      
      return nameMatch || addressMatch || cityMatch;
    });
  }, [searchQuery, arenas]); // Yeh logic tab chalega jab search ya arenas list update hogi

  
  // === 5. NAYA UI (Search Bar ke saath) ===
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      
      {/* --- NAYA SEARCH BAR --- */}
      <View style={tw`p-4`}> 
        <View style={tw`flex-row items-center bg-white p-3 rounded-lg shadow-sm border border-gray-200`}>
          <Ionicons name="search" size={20} color={tw.color('gray-400')} />
          <TextInput
            style={tw`flex-1 ml-2 text-base`}
            placeholder="Search by arena name or area..."
            value={searchQuery}
            onChangeText={setSearchQuery} // Har 'type' par state update karein
          />
        </View>
      </View>
      {/* --- SEARCH BAR KHATAM --- */}

      {loading ? (
        <ActivityIndicator
          size="large"
          color={tw.color("blue-600")}
          style={tw`mt-20`}
        />
      ) : (
        <FlatList
          // Data ab 'arenas' ke bajaye 'filteredArenas' se ayega
          data={filteredArenas} 
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ArenaCard arena={item} />} 
          contentContainerStyle={tw`p-4 pt-0`} // oopar ki padding hata di
          ListEmptyComponent={
            <View style={tw`items-center justify-center mt-20`}>
              <Ionicons
                name="sad-outline"
                size={40}
                color={tw.color("gray-400")}
              />
              <Text style={tw`text-lg text-gray-500 mt-2`}>
                {/* Text ko search ke hisab se update karein */}
                {searchQuery ? `No results found for "${searchQuery}"` : "No arenas found."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}