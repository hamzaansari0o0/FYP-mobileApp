import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StatusBar,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { db } from "../../../firebase/firebaseConfig";

// --- IMPORTS (Components & Utils) ---
import ArenaCard from "../../../components/specific/ArenaCard.jsx";
import FilterModal from "../../../components/specific/FilterModal.jsx";
import { getDistanceFromLatLonInKm } from "../../../utils/distanceCalculator";

// 🔥 HELPER: Smart Search (Spaces aur Case remove)
const normalizeText = (text) => {
  if (!text) return "";
  return text.toLowerCase().replace(/\s+/g, '');
};

export default function AllOwnersScreen() {
  const router = useRouter();

  // Data State
  const [arenas, setArenas] = useState([]);
  const [allCourts, setAllCourts] = useState([]); // Filter ke liye zaroori
  const [loading, setLoading] = useState(true);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    sport: "All",
    maxPrice: null,
    userLocation: null
  });

  useFocusEffect(useCallback(() => { fetchAllData(); }, []));

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch All Owners
      const q = query(
        collection(db, "users"),
        where("role", "==", "owner"),
        where("status", "==", "approved")
      );
      const userSnaps = await getDocs(q);
      const arenasList = userSnaps.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 2. Fetch All Courts (Filters check karne ke liye)
      const courtsQuery = query(
        collection(db, "courts"),
        where("status", "==", "approved")
      );
      const courtSnaps = await getDocs(courtsQuery);
      const courtsList = courtSnaps.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setArenas(arenasList);
      setAllCourts(courtsList);

    } catch (error) {
      console.error("Error fetching data: ", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ SMART FILTER LOGIC (Same as Home, but NO LIMIT)
  const filteredArenas = useMemo(() => {
    let result = arenas;

    // --- STEP 1: Smart Search ---
    if (searchQuery) {
      const cleanQuery = normalizeText(searchQuery);
      result = result.filter(arena => {
        const cleanName = normalizeText(arena.arenaName);
        const cleanAddress = normalizeText(arena.arenaAddress);
        return cleanName.includes(cleanQuery) || cleanAddress.includes(cleanQuery);
      });
    }

    // --- STEP 2: Filter by Sport & Price ---
    if (activeFilters.sport !== "All" || activeFilters.maxPrice) {
      result = result.filter(arena => {
        const arenaCourts = allCourts.filter(court => court.ownerId === arena.id);

        let matchesSport = true;
        if (activeFilters.sport !== "All") {
          matchesSport = arenaCourts.some(court => 
            court.sportType?.toLowerCase() === activeFilters.sport.toLowerCase()
          );
        }

        let matchesPrice = true;
        if (activeFilters.maxPrice) {
          matchesPrice = arenaCourts.some(court => 
            (court.pricePerHour || 0) <= activeFilters.maxPrice
          );
        }
        return matchesSport && matchesPrice;
      });
    }

    // --- STEP 3: Location Filter (10km) & Sort ---
    if (activeFilters.userLocation) {
      const arenasWithDistance = result.map(arena => {
        let dist = 99999;
        if (arena.location?.latitude && arena.location?.longitude) {
           dist = getDistanceFromLatLonInKm(
              activeFilters.userLocation.latitude,
              activeFilters.userLocation.longitude,
              arena.location.latitude,
              arena.location.longitude
           );
        } 
        return { ...arena, distance: dist };
      });

      // Filter: Show ONLY arenas under 10 KM
      const nearbyArenas = arenasWithDistance.filter(arena => arena.distance <= 10);

      // Sort: Nearest first
      nearbyArenas.sort((a, b) => a.distance - b.distance);
      result = nearbyArenas;
    }

    // ❌ NO LIMIT HERE (We want to see ALL)
    return result;

  }, [searchQuery, arenas, allCourts, activeFilters]);

  // Badge Logic
  const activeFilterCount = (activeFilters.sport !== "All" ? 1 : 0) 
                          + (activeFilters.maxPrice ? 1 : 0) 
                          + (activeFilters.userLocation ? 1 : 0);

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />

      {/* Filter Modal */}
      <FilterModal 
        visible={isFilterVisible} 
        onClose={() => setIsFilterVisible(false)}
        onApply={(filters) => setActiveFilters(filters)}
        currentFilters={activeFilters}
      />

      {/* --- Header --- */}
      <View style={tw`px-4 py-3 flex-row items-center border-b border-gray-200 bg-white`}>
        <Pressable onPress={() => router.back()} style={tw`p-2 bg-gray-100 rounded-full mr-3`}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </Pressable>
        <Text style={tw`text-xl font-bold text-gray-800`}>All Arenas</Text>
      </View>

      {/* --- Search & Filter Row --- */}
      <View style={tw`px-4 py-3 bg-white`}>
        <View style={tw`flex-row gap-2`}>
            {/* Search Bar */}
            <View style={tw`flex-1 flex-row items-center bg-gray-100 px-4 py-3 rounded-xl border border-gray-200`}>
              <Ionicons name="search" size={20} color={tw.color('gray-400')} />
              <TextInput
                style={tw`flex-1 ml-3 text-base text-gray-800`}
                placeholder="Search arenas..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={tw.color('gray-400')} />
                  </Pressable>
              )}
            </View>

            {/* Filter Button */}
            <Pressable 
              onPress={() => setIsFilterVisible(true)}
              style={tw`bg-green-700 w-14 rounded-xl items-center justify-center`}
            >
              <Ionicons name="options-outline" size={24} color="white" />
              {activeFilterCount > 0 && (
                  <View style={tw`absolute -top-1 -right-1 bg-red-500 w-5 h-5 rounded-full items-center justify-center border-2 border-white`}>
                      <Text style={tw`text-[10px] text-white font-bold`}>{activeFilterCount}</Text>
                  </View>
              )}
            </Pressable>
        </View>

        {/* Active Filter Tags */}
        {activeFilterCount > 0 && (
            <View style={tw`mt-3 flex-row flex-wrap gap-2`}>
                {activeFilters.sport !== "All" && (
                      <View style={tw`bg-green-100 px-3 py-1 rounded-lg border border-green-200`}>
                        <Text style={tw`text-green-800 text-xs font-bold`}>{activeFilters.sport}</Text>
                      </View>
                )}
                {activeFilters.maxPrice && (
                      <View style={tw`bg-green-100 px-3 py-1 rounded-lg border border-green-200`}>
                        <Text style={tw`text-green-800 text-xs font-bold`}>≤ {activeFilters.maxPrice} PKR</Text>
                      </View>
                )}
                {activeFilters.userLocation && (
                      <View style={tw`bg-blue-100 px-3 py-1 rounded-lg border border-blue-200 flex-row items-center`}>
                        <Ionicons name="location" size={10} color={tw.color('blue-700')} style={tw`mr-1`} />
                        <Text style={tw`text-blue-800 text-xs font-bold`}>Within 10 km</Text>
                      </View>
                )}
                <Pressable onPress={() => setActiveFilters({ sport: "All", maxPrice: null, userLocation: null })} style={tw`justify-center ml-2`}>
                      <Text style={tw`text-xs text-red-500 font-bold underline`}>Clear</Text>
                </Pressable>
            </View>
        )}
      </View>

      {/* --- List Section --- */}
      {loading ? (
        <ActivityIndicator size="large" color={tw.color("green-600")} style={tw`mt-20`} />
      ) : (
        <FlatList
          data={filteredArenas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={tw`p-4 pb-20`}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={tw`mb-4`}>
              <ArenaCard arena={item} />
              
              {/* Distance Badge */}
              {activeFilters.userLocation && item.distance !== undefined && (
                  <View style={tw`absolute top-3 right-3 bg-white/95 px-2 py-1 rounded-md shadow-sm flex-row items-center`}>
                      <Ionicons name="walk" size={12} color="green" />
                      <Text style={tw`text-[10px] font-bold text-green-800 ml-1`}>
                        {item.distance < 1 
                          ? `${Math.round(item.distance * 1000)} m` 
                          : `${item.distance.toFixed(1)} km`}
                      </Text>
                  </View>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={tw`items-center justify-center mt-20`}>
              <View style={tw`bg-gray-100 p-6 rounded-full mb-4`}>
                 <Ionicons name="search-outline" size={40} color={tw.color('gray-400')} />
              </View>
              <Text style={tw`text-lg text-gray-500 font-bold`}>No arenas found</Text>
              <Text style={tw`text-gray-400 text-sm mt-1 text-center px-10`}>
                 We couldn't find any arenas matching your search or filters.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}