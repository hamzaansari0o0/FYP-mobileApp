import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ImageBackground, Linking, Platform, Pressable, StatusBar, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import tw from 'twrnc';

// Imports
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import CourtCard from '../../../../components/CourtCard';
import { db } from '../../../../firebase/firebaseConfig';

// --- Helper: Open Google Maps ---
const openMapsForDirections = (lat, lng, label) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lng}`;
    const labelEncoded = encodeURIComponent(label);
    
    const url = Platform.select({
        ios: `${scheme}${labelEncoded}@${latLng}`,
        android: `${scheme}${latLng}(${labelEncoded})`
    });

    Linking.openURL(url).catch(err => {
        Linking.openURL(`http://googleusercontent.com/maps.google.com/maps?q=${lat},${lng}`);
    });
};

// --- Header Component (Fixed Styles) ---
const ArenaHeader = ({ arena }) => {
  const router = useRouter();
  
  const imageSource = arena.arenaImageUrl
    ? { uri: arena.arenaImageUrl }
    : { uri: 'https://via.placeholder.com/600x400?text=Arena' }; 

  const location = arena.location || { latitude: 31.5204, longitude: 74.3587 };

  return (
    <View style={tw`bg-gray-50 mb-4`}>
      {/* 1. Top Image Section */}
      <View style={tw`h-80 w-full bg-green-900 relative`}>
        <ImageBackground
          source={imageSource}
          resizeMode="cover"
          style={tw`flex-1`}
        >
          {/* Simple Dark Overlay (Replaces Gradient) */}
          <View style={tw`absolute inset-0 bg-black/40`} />
          
          {/* Back Button */}
          <Pressable 
            onPress={() => router.back()} 
            style={tw`absolute top-12 left-5 bg-black/30 p-2.5 rounded-full z-10 border border-white/20`}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>

          {/* Bottom Content */}
          <View style={tw`absolute bottom-0 left-0 right-0 p-6`}>
            <View style={tw`flex-row items-center mb-2`}>
                <View style={tw`bg-green-600 px-2.5 py-1 rounded-md mr-2`}>
                    <Text style={tw`text-white text-xs font-bold tracking-wider`}>OPEN 24/7</Text>
                </View>
                <View style={tw`bg-yellow-500 px-2.5 py-1 rounded-md`}>
                    <Text style={tw`text-black text-xs font-bold`}>⭐ 4.8</Text>
                </View>
            </View>

            <Text style={tw`text-3xl font-black text-white shadow-sm mb-1`}>
              {arena.arenaName || arena.name}
            </Text>
            
            <View style={tw`flex-row items-center opacity-90`}>
              <Ionicons name="location" size={16} color="#4ade80" />
              <Text style={tw`text-base text-gray-100 ml-1 font-medium`}>
                {arena.arenaAddress || "Address not available"}
              </Text>
            </View>
          </View>
        </ImageBackground>
      </View>

      {/* 2. Map & Directions Section */}
      <View style={tw`px-5 mt-6`}>
          <Text style={tw`text-lg font-bold text-green-900 mb-3`}>Location & Directions</Text>
          
          <View style={tw`rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white elevation-3`}>
              <MapView
                  provider={PROVIDER_GOOGLE}
                  style={tw`w-full h-48`}
                  initialRegion={{
                      latitude: location.latitude,
                      longitude: location.longitude,
                      latitudeDelta: 0.005,
                      longitudeDelta: 0.005,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
              >
                  <Marker 
                      coordinate={{ latitude: location.latitude, longitude: location.longitude }}
                      title={arena.arenaName}
                      pinColor="green"
                  />
              </MapView>

              <Pressable 
                  onPress={() => openMapsForDirections(location.latitude, location.longitude, arena.arenaName)}
                  style={({pressed}) => tw.style(
                      `flex-row items-center justify-center py-3.5`,
                      pressed ? `bg-green-800` : `bg-green-700`
                  )}
              >
                  <MaterialIcons name="directions" size={22} color="white" style={tw`mr-2`} />
                  <Text style={tw`text-white font-bold text-base tracking-wide`}>Get Directions</Text>
              </Pressable>
          </View>
      </View>

      <Text style={tw`text-xl font-bold text-green-900 px-5 mt-8 mb-2`}>
        Available Courts
      </Text>
    </View>
  );
};

export default function OwnerDetailsScreen() {
  // `courtId` param receive kar rahe hain taake us par scroll kar sakein
  const { ownerId, courtId } = useLocalSearchParams();
  const [arena, setArena] = useState(null);
  const [courts, setCourts] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // Reference for Auto Scrolling
  const flatListRef = useRef(null);

  useEffect(() => {
    if (!ownerId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const arenaDocRef = doc(db, "users", ownerId);
        const arenaDocSnap = await getDoc(arenaDocRef);
        
        if (arenaDocSnap.exists()) {
          setArena(arenaDocSnap.data());
        } else {
          Alert.alert("Error", "Arena not found.");
          return;
        }

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
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ownerId]);

  // 🔥 AUTO SCROLL EFFECT
  useEffect(() => {
    // Jab loading khatam ho, courts aa jayen, aur hamare paas 'courtId' ho
    if (!loading && courts.length > 0 && courtId && flatListRef.current) {
        const index = courts.findIndex(c => c.id === courtId);
        
        if (index !== -1) {
            // Thoda sa delay taake list render ho chuki ho
            setTimeout(() => {
                flatListRef.current.scrollToIndex({ 
                    index: index, 
                    animated: true, 
                    viewPosition: 0 // 0 means top of the screen
                });
            }, 500); 
        }
    }
  }, [loading, courts, courtId]);

  // Handle scroll failure (sometimes needed for lists with headers)
  const onScrollToIndexFailed = (info) => {
    const wait = new Promise(resolve => setTimeout(resolve, 500));
    wait.then(() => {
      flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
    });
  };

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-50`}>
        <ActivityIndicator size="large" color="#15803d" />
      </View>
    );
  }

  if (!arena) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-50`}>
        <Ionicons name="alert-circle-outline" size={48} color="#9ca3af" />
        <Text style={tw`text-gray-500 mt-2`}>Arena data not available.</Text>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <Stack.Screen options={{ headerShown: false }} /> 
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <FlatList
        ref={flatListRef} // Ref joda
        data={courts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          // Agar ye wo specific court hai, to highlight border dikha sakte hain (Optional)
          <View style={tw.style(
             `px-5 mb-4`,
             item.id === courtId ? `border-2 border-green-500 rounded-xl p-1 bg-green-50` : ``
          )}>
             <CourtCard court={item} /> 
          </View>
        )}
        contentContainerStyle={tw`pb-32`} 
        ListHeaderComponent={() => <ArenaHeader arena={arena} />}
        onScrollToIndexFailed={onScrollToIndexFailed} // Error handling for scroll
        ListEmptyComponent={
          <View style={tw`items-center justify-center mt-10 p-5`}>
            <View style={tw`bg-green-100 p-4 rounded-full mb-3`}>
                <Ionicons name="tennisball" size={40} color="#15803d" />
            </View>
            <Text style={tw`text-lg text-green-900 mt-2 font-bold`}>
              No Courts Available
            </Text>
            <Text style={tw`text-sm text-gray-500 text-center mt-1`}>
              This arena hasn't added any approved courts yet.
            </Text>
          </View>
        }
      />
    </View>
  );
}