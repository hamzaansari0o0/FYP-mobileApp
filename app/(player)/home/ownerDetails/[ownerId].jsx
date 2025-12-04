import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, Alert, ImageBackground, StatusBar, Pressable } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';

// Imports
import { db } from '../../../../firebase/firebaseConfig'; 
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
// Ensure this path is correct based on your project structure
import CourtCard from '../../../../components/CourtCard'; 

// --- Immersive Header ---
const ArenaHeader = ({ arena }) => {
  const router = useRouter();
  
  // Image safety check
  const imageSource = arena.arenaImageUrl
    ? { uri: arena.arenaImageUrl }
    : { uri: 'https://via.placeholder.com/600x400?text=Arena' }; 

  return (
    <View style={tw`bg-white mb-4`}>
      {/* Image Background */}
      <View style={tw`h-72 w-full bg-gray-900 relative`}>
        <ImageBackground
          source={imageSource}
          resizeMode="cover"
          style={tw`flex-1`}
        >
          {/* Gradient Overlay for Text Readability */}
          <View style={tw`absolute inset-0 bg-black/30`} />
          {/* Simple dark overlay since native gradient might cause issues if package missing */}
          <View style={tw`absolute inset-0 bg-black/20`} /> 
          
          {/* Back Button */}
          <Pressable 
            onPress={() => router.back()} 
            style={tw`absolute top-12 left-5 bg-white/20 p-2 rounded-full`}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>

          {/* Bottom Content */}
          <View style={tw`absolute bottom-0 left-0 right-0 p-6`}>
            <View style={tw`flex-row items-center mb-2`}>
                <View style={tw`bg-green-500 px-2 py-1 rounded-md mr-2`}>
                    <Text style={tw`text-white text-xs font-bold`}>OPEN 24/7</Text>
                </View>
                <View style={tw`bg-yellow-500 px-2 py-1 rounded-md`}>
                    <Text style={tw`text-white text-xs font-bold`}>⭐ 4.8</Text>
                </View>
            </View>

            <Text style={tw`text-3xl font-extrabold text-white shadow-sm mb-1`}>
              {arena.arenaName || arena.name}
            </Text>
            
            <View style={tw`flex-row items-center opacity-90`}>
              <Ionicons name="location" size={16} color={tw.color("gray-200")} />
              <Text style={tw`text-base text-gray-200 ml-1 font-medium`}>
                {arena.arenaAddress || "Address not available"}
              </Text>
            </View>
          </View>
        </ImageBackground>
      </View>

      <Text style={tw`text-xl font-bold text-gray-900 px-6 mt-6 mb-2`}>
        Available Courts
      </Text>
    </View>
  );
};

export default function OwnerDetailsScreen() {
  const { ownerId } = useLocalSearchParams();
  const [arena, setArena] = useState(null);
  const [courts, setCourts] = useState([]); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Arena Details
        const arenaDocRef = doc(db, "users", ownerId);
        const arenaDocSnap = await getDoc(arenaDocRef);
        
        if (arenaDocSnap.exists()) {
          setArena(arenaDocSnap.data());
        } else {
          Alert.alert("Error", "Arena not found.");
          return;
        }

        // 2. Fetch Approved Courts
        const courtsQuery = query(
          collection(db, "courts"),
          where("ownerId", "==", ownerId),
          where("status", "==", "approved")
        );
        
        const courtsSnapshot = await getDocs(courtsQuery);
        const courtsList = courtsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCourts(courtsList);

      } catch (error) {
        console.error("Error fetching details: ", error);
        // Alert removed to prevent loop on error, just log
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ownerId]);

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-white`}>
        <ActivityIndicator size="large" color={tw.color("green-600")} />
      </View>
    );
  }

  if (!arena) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-white`}>
        <Text style={tw`text-gray-500`}>Arena data not available.</Text>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-white`}>
      <Stack.Screen options={{ headerShown: false }} /> 
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <FlatList
        data={courts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={tw`px-6 mb-4`}>
             <CourtCard court={item} /> 
          </View>
        )}
        contentContainerStyle={tw`pb-20`} 
        ListHeaderComponent={() => <ArenaHeader arena={arena} />}
        ListEmptyComponent={
          <View style={tw`items-center justify-center mt-10 p-5`}>
            <Ionicons name="tennisball-outline" size={50} color={tw.color("gray-300")} />
            <Text style={tw`text-lg text-gray-500 mt-2 font-bold`}>
              No Courts Available
            </Text>
            <Text style={tw`text-sm text-gray-400 text-center mt-1`}>
              This arena hasn't added any approved courts yet.
            </Text>
          </View>
        }
      />
    </View>
  );
}