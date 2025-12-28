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
// ✅ 1. Import useSafeAreaInsets
import { useSafeAreaInsets } from "react-native-safe-area-context";
import tw from "twrnc";
import { db } from "../../../firebase/firebaseConfig";

// --- IMPORTS ---
import ArenaCard from "../../../components/specific/ArenaCard.jsx";
import HeroSection from "../../../components/specific/home/HeroSection";
import HomeHeader from "../../../components/specific/home/HomeHeader";

export default function PlayerHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets(); // ✅ Get Safe Area Insets
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
    // ✅ 2. Root Background GRAY (Footer Green Issue Fixed)
    <View style={tw`flex-1 bg-gray-50`}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#14532d" />

      {/* ✅ 3. Manual Green Status Bar Area */}
      <View style={{ height: insets.top, backgroundColor: '#14532d' }} />
      
      {/* Navbar (Fixed at Top, Green Background) */}
      <View style={tw`bg-green-900`}>
         <HomeHeader />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={tw`pb-36`} 
        bounces={false} // Prevents seeing gray background at top bounce
      >
        
        {/* Top Section (Green) */}
        <View style={tw`px-6 pt-1 pb-8 bg-green-900`}>
          
          {/* Text Section */}
          <View style={tw`mb-4 mt-1`}>
            <Text style={tw`text-green-100 text-[10px] font-bold uppercase tracking-widest mb-0.5`}>
              Welcome Player 👋
            </Text>
            <Text style={tw`text-2xl font-black text-white`}>
              Find Your <Text style={tw`text-green-400 italic`}>Game</Text>
            </Text>
          </View>

          {/* Search Bar */}
          <View style={tw`flex-row items-center bg-white px-4 py-1.5 rounded-2xl shadow-lg shadow-green-900`}>
            <Ionicons name="search" size={20} color={tw.color('green-700')} />
            <TextInput
              style={tw`flex-1 ml-3 text-sm text-gray-800 font-medium`}
              placeholder="Search courts, areas..."
              placeholderTextColor={tw.color('gray-400')}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
               <Pressable onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={tw.color('gray-400')} />
               </Pressable>
            )}
          </View>
        </View>

        {/* Main Content (Sheet Style) */}
        <View style={tw`bg-gray-50 flex-1 rounded-t-[40px] -mt-5 min-h-screen overflow-hidden px-5 pt-6`}>
            
            {/* HERO SECTION */}
            {!searchQuery && (
              <View style={tw`mb-4`}> 
                  <HeroSection /> 
              </View>
            )}

            {/* List Header */}
            <View style={tw`flex-row justify-between items-center mb-3 mt-1`}>
              <View style={tw`flex-row items-center`}>
                <View style={tw`w-1 h-5 bg-green-700 rounded-full mr-2`} />
                <Text style={tw`text-lg font-bold text-gray-800`}>
                    {searchQuery ? "Search Results" : "Popular Arenas"}
                </Text>
              </View>
              
              {!searchQuery && (
                <Pressable 
                  onPress={() => router.push('/(player)/home/allOwners')}
                  style={tw`flex-row items-center`}
                >
                  <Text style={tw`text-xs font-bold text-green-700 mr-1`}>See All</Text>
                  <Ionicons name="arrow-forward" size={12} color={tw.color('green-700')} />
                </Pressable>
              )}
            </View>

            {/* List Content */}
            {loading ? (
              <ActivityIndicator size="large" color={tw.color("green-600")} style={tw`mt-10`} />
            ) : (
              <View>
                {filteredArenas.length > 0 ? (
                  filteredArenas.map((item) => (
                    <View key={item.id} style={tw`mb-4`}>
                      <ArenaCard arena={item} />
                    </View>
                  ))
                ) : (
                  // Empty State
                  <View style={tw`items-center justify-center mt-6 py-10 bg-white rounded-3xl border border-gray-100 border-dashed mx-2`}>
                    <View style={tw`bg-gray-50 p-4 rounded-full mb-3`}>
                        <Ionicons name="search-outline" size={28} color={tw.color('gray-400')} />
                    </View>
                    <Text style={tw`text-gray-500 text-sm font-bold`}>No arenas found</Text>
                  </View>
                )}
              </View>
            )}
            
            <View style={tw`h-20`} />
        </View>

      </ScrollView>
    </View>
  );
}