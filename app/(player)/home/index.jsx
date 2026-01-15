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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import tw from "twrnc";
import { db } from "../../../firebase/firebaseConfig";

// --- IMPORTS ---
import ArenaCard from "../../../components/specific/ArenaCard.jsx";
import FilterModal from "../../../components/specific/FilterModal.jsx";
import HeroSection from "../../../components/specific/home/HeroSection";
import HomeHeader from "../../../components/specific/home/HomeHeader";
import { getDistanceFromLatLonInKm } from "../../../utils/distanceCalculator";

// 🔥 HELPER: Text ko saaf karne ke liye (Spaces aur Case remove)
const normalizeText = (text) => {
  if (!text) return "";
  return text.toLowerCase().replace(/\s+/g, ''); // "Green Arena " -> "greenarena"
};

export default function PlayerHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // State
  const [arenas, setArenas] = useState([]);
  const [allCourts, setAllCourts] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter States
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    sport: "All",
    maxPrice: null,
    userLocation: null
  });

  useFocusEffect(useCallback(() => { fetchMethods(); }, []));

  const fetchMethods = async () => {
    setLoading(true);
    try {
      // 1. Fetch Arenas (Thore zyada layenge taake filter hone ke baad bhi data bache)
      const usersQuery = query(
        collection(db, "users"),
        where("role", "==", "owner"),
        where("status", "==", "approved"),
        limit(50) // Database se 50 layenge, lekin screen par sirf 6 dikhayenge
      );
      const userSnaps = await getDocs(usersQuery);
      const arenasList = userSnaps.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 2. Fetch All Approved Courts
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

  // ✅ SMART FILTER & LIMIT LOGIC
  const displayedArenas = useMemo(() => {
    let result = arenas;

    // --- STEP 1: Smart Search (Spaces/Case Ignore) ---
    if (searchQuery) {
      const cleanQuery = normalizeText(searchQuery);
      
      result = result.filter(arena => {
        const cleanName = normalizeText(arena.arenaName);
        const cleanAddress = normalizeText(arena.arenaAddress);
        
        // Agar name ya address mein query match ho jaye
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

    // --- STEP 3: Filter & Sort by Location ---
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

      // Show arenas under 10 KM
      const nearbyArenas = arenasWithDistance.filter(arena => arena.distance <= 10);
      
      // Sort: Nearest first
      nearbyArenas.sort((a, b) => a.distance - b.distance);
      result = nearbyArenas;
    }

    // 🔥 LAST STEP: Limit to 6 items only (Chahe search ho ya normal)
    return result.slice(0, 6);

  }, [searchQuery, arenas, allCourts, activeFilters]);

  // Badge Counter
  const activeFilterCount = (activeFilters.sport !== "All" ? 1 : 0) 
                          + (activeFilters.maxPrice ? 1 : 0) 
                          + (activeFilters.userLocation ? 1 : 0);

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#14532d" />

      {/* Filter Modal */}
      <FilterModal 
        visible={isFilterVisible} 
        onClose={() => setIsFilterVisible(false)}
        onApply={(filters) => setActiveFilters(filters)}
        currentFilters={activeFilters}
      />

      <View style={{ height: insets.top, backgroundColor: '#14532d' }} />
      
      {/* Navbar */}
      <View style={tw`bg-green-900`}>
         <HomeHeader />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={tw`pb-36`} 
        bounces={false}
      >
        
        {/* Header Section */}
        <View style={tw`px-6 pt-1 pb-8 bg-green-900`}>
          <View style={tw`mb-4 mt-1`}>
            <Text style={tw`text-green-100 text-[10px] font-bold uppercase tracking-widest mb-0.5`}>
              Welcome Player 👋
            </Text>
            <Text style={tw`text-2xl font-black text-white`}>
              Find Your <Text style={tw`text-green-400 italic`}>Game</Text>
            </Text>
          </View>

          {/* Search & Filter Button */}
          <View style={tw`flex-row gap-2`}>
              <View style={tw`flex-1 flex-row items-center bg-white px-4 py-2 rounded-2xl shadow-lg shadow-green-900`}>
                <Ionicons name="search" size={20} color={tw.color('green-700')} />
                <TextInput
                  style={tw`flex-1 ml-3 text-sm text-gray-800 font-medium`}
                  placeholder="Search courts..."
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

              <Pressable 
                onPress={() => setIsFilterVisible(true)}
                style={tw`bg-green-800 w-12 rounded-2xl items-center justify-center border border-green-700`}
              >
                <Ionicons name="options-outline" size={22} color="white" />
                {activeFilterCount > 0 && (
                    <View style={tw`absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full items-center justify-center border border-green-900`}>
                        <Text style={tw`text-[9px] text-white font-bold`}>{activeFilterCount}</Text>
                    </View>
                )}
              </Pressable>
          </View>
        </View>

        {/* Content Section */}
        <View style={tw`bg-gray-50 flex-1 rounded-t-[40px] -mt-5 min-h-screen overflow-hidden px-5 pt-6`}>
            
            {/* Show Hero only when NOT searching and NO filters */}
            {(!searchQuery && activeFilterCount === 0) && (
              <View style={tw`mb-4`}> 
                  <HeroSection /> 
              </View>
            )}

            <View style={tw`flex-row justify-between items-center mb-4 mt-1`}>
              <View style={tw`flex-row items-center`}>
                <View style={tw`w-1 h-5 bg-green-700 rounded-full mr-2`} />
                <Text style={tw`text-lg font-bold text-gray-800`}>
                    {(searchQuery || activeFilterCount > 0) ? "Top Results" : "Popular Arenas"}
                </Text>
              </View>
              
              {/* See All Button - Hamesha visible rakhein ya logic ke hisab se */}
              <Pressable 
                onPress={() => router.push('/(player)/home/allOwners')}
                style={tw`flex-row items-center`}
              >
                <Text style={tw`text-xs font-bold text-green-700 mr-1`}>See All</Text>
                <Ionicons name="arrow-forward" size={12} color={tw.color('green-700')} />
              </Pressable>
            </View>

            {/* Filter Tags */}
            {activeFilterCount > 0 && (
                <View style={tw`mb-4 flex-row flex-wrap gap-2`}>
                    {activeFilters.sport !== "All" && (
                         <View style={tw`bg-green-100 px-3 py-1 rounded-lg border border-green-200`}>
                            <Text style={tw`text-green-800 text-xs font-bold`}>{activeFilters.sport}</Text>
                         </View>
                    )}
                    {activeFilters.maxPrice && (
                         <View style={tw`bg-green-100 px-3 py-1 rounded-lg border border-green-200`}>
                            <Text style={tw`text-green-800 text-xs font-bold`}>Price ≤ {activeFilters.maxPrice}</Text>
                         </View>
                    )}
                    {activeFilters.userLocation && (
                         <View style={tw`bg-blue-100 px-3 py-1 rounded-lg border border-blue-200 flex-row items-center`}>
                            <Ionicons name="location" size={10} color={tw.color('blue-700')} style={tw`mr-1`} />
                            <Text style={tw`text-blue-800 text-xs font-bold`}>Within 10 km</Text>
                         </View>
                    )}
                    <Pressable onPress={() => setActiveFilters({ sport: "All", maxPrice: null, userLocation: null })} style={tw`justify-center ml-1`}>
                         <Text style={tw`text-xs text-red-500 font-bold underline`}>Clear</Text>
                    </Pressable>
                </View>
            )}

            {/* List */}
            {loading ? (
              <ActivityIndicator size="large" color={tw.color("green-600")} style={tw`mt-10`} />
            ) : (
              <View>
                {displayedArenas.length > 0 ? (
                  displayedArenas.map((item) => (
                    <View key={item.id} style={tw`mb-4`}>
                      <ArenaCard arena={item} />
                      
                      {/* Show Distance Badge */}
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
                  ))
                ) : (
                  <View style={tw`items-center justify-center mt-6 py-10 bg-white rounded-3xl border border-gray-100 border-dashed mx-2`}>
                    <View style={tw`bg-gray-50 p-4 rounded-full mb-3`}>
                        <Ionicons name="search" size={28} color={tw.color('gray-400')} />
                    </View>
                    <Text style={tw`text-gray-500 text-sm font-bold`}>No arenas found</Text>
                    <Text style={tw`text-gray-400 text-xs mt-1 text-center px-6`}>
                       Try changing filters or search keywords.
                    </Text>
                    {(activeFilterCount > 0 || searchQuery.length > 0) && (
                        <Pressable 
                            onPress={() => {
                                setActiveFilters({ sport: "All", maxPrice: null, userLocation: null });
                                setSearchQuery('');
                            }}
                            style={tw`mt-4 bg-green-50 px-5 py-2.5 rounded-full`}
                        >
                            <Text style={tw`text-green-700 text-xs font-bold`}>Clear All</Text>
                        </Pressable>
                    )}
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