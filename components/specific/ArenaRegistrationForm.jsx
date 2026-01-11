import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    View
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { db, storage } from '../../firebase/firebaseConfig';

const GOOGLE_API_KEY = "AIzaSyCvS4c7w-SNnMGWtDh-74QUB6rMoy1iDVA"; 

// 🟢 Prop 'existingData' added
export default function ArenaRegistrationForm({ user, onRegistrationSuccess, existingData }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 🟢 CHECK IF REJECTED
  const isRejected = existingData?.status === 'rejected';

  // 🟢 INITIALIZE STATE WITH EXISTING DATA (IF AVAILABLE)
  const [formData, setFormData] = useState({ 
    arenaName: existingData?.arenaName || '', 
    arenaAddress: existingData?.arenaAddress || '' 
  });
  
  const [locationCoords, setLocationCoords] = useState(existingData?.location || null); 
  const [fullAddress, setFullAddress] = useState(existingData?.fullAddress || '');
  
  const [thumbnailImage, setThumbnailImage] = useState(existingData?.arenaImageUrl || null); 
  const [documentImage, setDocumentImage] = useState(existingData?.arenaDocumentUrl || null); 
  
  const [liveAddress, setLiveAddress] = useState(existingData?.arenaAddress || "Move map to select location");

  // --- Map States ---
  const [mapModalVisible, setMapModalVisible] = useState(false);
  
  // Center map on existing location if available
  const [currentRegion, setCurrentRegion] = useState(
    existingData?.location 
    ? { 
        latitude: existingData.location.latitude, 
        longitude: existingData.location.longitude, 
        latitudeDelta: 0.005, 
        longitudeDelta: 0.005 
      }
    : { 
        latitude: 31.5204, 
        longitude: 74.3587, 
        latitudeDelta: 0.005, 
        longitudeDelta: 0.005 
      }
  );

  const [isMapMoving, setIsMapMoving] = useState(false);
  const [listVisible, setListVisible] = useState(true); 
  
  const mapRef = useRef(null);
  const googlePlacesRef = useRef(null); 

  // ... (Address Parsing Helper - Same as before)
  const parseCleanAddress = (results) => {
      const validResults = results.filter(r => {
          const isPlusCode = r.formatted_address.includes('+') && r.formatted_address.split(',')[0].length < 10;
          return !isPlusCode; 
      });
      if (validResults.length === 0) return results[0]?.formatted_address || "Address not found";
      const bestMatch = validResults.find(r => r.types.includes('street_address') || r.types.includes('premise') || r.types.includes('sublocality') || r.types.includes('route'));
      return bestMatch ? bestMatch.formatted_address : validResults[0].formatted_address;
  };

  const fetchAddress = async (lat, lng) => {
    try {
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`);
        const data = await res.json();
        if (data.status === "OK" && data.results.length > 0) {
            const cleanAddress = parseCleanAddress(data.results);
            setLiveAddress(cleanAddress);
        } else {
            setLiveAddress("Location not found");
        }
    } catch (e) {
        setLiveAddress("Address lookup failed");
    }
  };

  const handleManualSearch = async (text) => {
      if (!text) return;
      setListVisible(false);
      Keyboard.dismiss();
      try {
          const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(text)}&components=country:pk&key=${GOOGLE_API_KEY}`;
          const res = await fetch(url);
          const data = await res.json();
          if (data.status === "OK" && data.results.length > 0) {
              const { lat, lng } = data.results[0].geometry.location;
              mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.002, longitudeDelta: 0.002 }, 1000);
          } else {
              Alert.alert("Not Found", "Try adding 'Lahore' or 'Pakistan' to your search.");
          }
      } catch (error) {
          console.error(error);
      }
  };

  const handleCurrentLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      setLiveAddress("Fetching detailed location...");
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
      if (location) {
          const { latitude, longitude } = location.coords;
          mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.002, longitudeDelta: 0.002 }, 1000);
          fetchAddress(latitude, longitude);
      }
  };

  const confirmLocation = () => {
      const { latitude, longitude } = currentRegion;
      setLocationCoords({ latitude, longitude });
      setFullAddress(liveAddress);
      setFormData(prev => ({ ...prev, arenaAddress: liveAddress }));
      setMapModalVisible(false);
  };

  const pickImage = async (type) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: type === 'thumbnail' ? [16, 9] : [4, 3], quality: 0.6,
    });
    if (!result.canceled) {
        type === 'thumbnail' ? setThumbnailImage(result.assets[0].uri) : setDocumentImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri, name) => {
      // 🟢 Logic: Agar image already HTTP link hai (purani image), to upload skip karo
      if (!uri) return null;
      if (uri.startsWith('http')) return uri;

      const response = await fetch(uri);
      const blob = await response.blob();
      const fileRef = ref(storage, `arenas/${user.uid}/${name}_${Date.now()}`);
      const uploadTask = uploadBytesResumable(fileRef, blob);
      return new Promise((resolve, reject) => {
          uploadTask.on('state_changed', null, reject, async () => {
              resolve(await getDownloadURL(uploadTask.snapshot.ref));
          });
      });
  };

  const handleSubmit = async () => {
      if (!formData.arenaName || !locationCoords || !thumbnailImage || !documentImage) {
          Alert.alert("Missing Info", "Please fill all fields and upload images.");
          return;
      }
      setIsSubmitting(true);
      try {
          const tUrl = await uploadImage(thumbnailImage, 'thumbnail');
          const dUrl = await uploadImage(documentImage, 'document');

          const newArenaData = {
              arenaName: formData.arenaName, 
              arenaAddress: formData.arenaAddress, 
              fullAddress,
              arenaImageUrl: tUrl, 
              arenaDocumentUrl: dUrl, 
              location: locationCoords,
              status: 'pending', // 🟢 Reset Status to Pending for Admin Review
              rejectionReason: null, // 🟢 Clear old rejection reason
              updatedAt: serverTimestamp(),
          };

          await updateDoc(doc(db, 'users', user.uid), newArenaData);
          onRegistrationSuccess(newArenaData);

      } catch (e) {
          Alert.alert("Error", e.message);
          console.error(e);
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={tw`flex-1 bg-white`}>
      <StatusBar backgroundColor="#14532d" barStyle="light-content" />

      {/* 🟢 HEADER UPDATED FOR REJECTION */}
      <View style={tw`bg-[#14532d] pt-12 pb-6 px-5 flex-row items-center shadow-lg`}>
          <View style={tw`bg-green-800 p-2 rounded-lg mr-3`}>
            <MaterialIcons name="stadium" size={28} color="white" />
          </View>
          <View>
            <Text style={tw`text-2xl font-bold text-white`}>
                {isRejected ? 'Fix & Resubmit' : 'Register Arena'}
            </Text>
            <Text style={tw`text-green-200 text-xs`}>
                {isRejected ? 'Please correct the issues below' : 'Create your turf profile'}
            </Text>
          </View>
      </View>

      <ScrollView contentContainerStyle={tw`p-5`}>
        
        {/* 🔴 REJECTION REASON ALERT BOX */}
        {isRejected && (
             <View style={tw`bg-red-50 border border-red-200 rounded-xl p-4 mb-6`}>
                 <View style={tw`flex-row items-center mb-2`}>
                    <Ionicons name="warning" size={20} color="#dc2626" />
                    <Text style={tw`text-red-700 font-bold ml-2 text-sm uppercase`}>Registration Rejected</Text>
                 </View>
                 <Text style={tw`text-gray-800 font-semibold mb-1`}>Reason from Admin:</Text>
                 <Text style={tw`text-red-600 italic bg-white p-3 rounded-lg border border-red-100 text-sm leading-5`}>
                    "{existingData.rejectionReason || 'No specific reason provided.'}"
                 </Text>
             </View>
        )}

        {/* --- Arena Name --- */}
        <Text style={tw`text-gray-500 text-xs font-bold uppercase mb-2 mt-2`}>Arena Name</Text>
        <TextInput 
            value={formData.arenaName} 
            onChangeText={t => setFormData({...formData, arenaName: t})}
            style={tw`bg-gray-50 border border-gray-200 p-4 rounded-xl mb-4 text-base`}
            placeholder="e.g. Spartan Turf"
        />

        {/* --- Location Section --- */}
        <Text style={tw`text-gray-500 text-xs font-bold uppercase mb-2`}>Location</Text>
        <View style={tw`flex-row items-center bg-gray-50 border border-gray-200 rounded-xl mb-6`}>
            <TextInput
                value={formData.arenaAddress}
                onChangeText={(text) => setFormData({ ...formData, arenaAddress: text })}
                style={tw`flex-1 p-4 text-base text-gray-800`}
                placeholder="Type address or use map button -->"
            />
            <View style={tw`h-8 w-[1px] bg-gray-300`} />
            <Pressable onPress={() => setMapModalVisible(true)} style={tw`p-4`}>
                <Ionicons name="map" size={24} color="#EA4335" />
            </Pressable>
        </View>

        {/* --- Images --- */}
        <Text style={tw`text-gray-500 text-xs font-bold uppercase mb-2`}>Cover Photo</Text>
        <Pressable onPress={() => pickImage('thumbnail')} style={tw`h-40 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl mb-4 justify-center items-center overflow-hidden`}>
            {thumbnailImage ? <Image source={{uri: thumbnailImage}} style={tw`w-full h-full`} /> : <Ionicons name="image" size={30} color="gray" />}
        </Pressable>
        
        <Text style={tw`text-gray-500 text-xs font-bold uppercase mb-2`}>Official Document</Text>
        <Pressable onPress={() => pickImage('document')} style={tw`h-16 bg-blue-50 border border-blue-100 rounded-xl mb-8 justify-center items-center flex-row`}>
            {documentImage ? <Text style={tw`text-blue-700 font-bold`}>Doc Selected ✅</Text> : <Text style={tw`text-blue-600 font-semibold`}>Upload License/Proof</Text>}
        </Pressable>
        
        <Pressable onPress={handleSubmit} disabled={isSubmitting} style={tw`bg-black py-4 rounded-xl mb-24 shadow-lg`}>
            {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={tw`text-white text-center font-bold text-lg`}>{isRejected ? 'Resubmit Application' : 'Submit Application'}</Text>}
        </Pressable>
      </ScrollView>

      {/* ================= MAP MODAL (No logic changes needed) ================= */}
      <Modal visible={mapModalVisible} animationType="slide" onRequestClose={() => setMapModalVisible(false)}>
          <SafeAreaView style={tw`flex-1 bg-white relative`}>
              <View style={tw`absolute top-12 left-5 right-5 z-50 flex-row items-start`}>
                  <Pressable onPress={() => setMapModalVisible(false)} style={tw`mt-1 mr-3 bg-white w-10 h-10 rounded-full justify-center items-center shadow-md elevation-5`}>
                      <Ionicons name="arrow-back" size={22} color="black" />
                  </Pressable>
                  <View style={tw`flex-1 shadow-xl`}>
                    <GooglePlacesAutocomplete
                        ref={googlePlacesRef}
                        placeholder="Search Area / Block..."
                        fetchDetails={true}
                        debounce={300}
                        minLength={2}
                        listViewDisplayed={listVisible ? 'auto' : false}
                        query={{ key: GOOGLE_API_KEY, language: 'en', components: 'country:pk', location: `${currentRegion.latitude},${currentRegion.longitude}`, radius: 5000 }}
                        onPress={(data, details = null) => {
                            const { lat, lng } = details.geometry.location;
                            mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.002, longitudeDelta: 0.002 }, 1000);
                            setListVisible(false);
                            Keyboard.dismiss();
                        }}
                        textInputProps={{
                            returnKeyType: "search",
                            onFocus: () => setListVisible(true),
                            onChangeText: () => setListVisible(true),
                            onSubmitEditing: (e) => handleManualSearch(e.nativeEvent.text),
                        }}
                        styles={{ container: { flex: 0 }, textInputContainer: tw`bg-white rounded-full h-12 border border-gray-100 pl-2 pr-1 shadow-sm`, textInput: tw`h-12 bg-transparent text-gray-800 text-base font-medium`, listView: { backgroundColor: 'white', marginTop: 8, borderRadius: 10, elevation: 15, zIndex: 1000 } }}
                        enablePoweredByContainer={false}
                    />
                  </View>
              </View>

              <MapView
                ref={mapRef}
                style={tw`flex-1`}
                provider={PROVIDER_GOOGLE}
                initialRegion={currentRegion}
                onPress={() => { Keyboard.dismiss(); setListVisible(false); googlePlacesRef.current?.blur(); }} 
                onPanDrag={() => { Keyboard.dismiss(); setListVisible(false); }} 
                onRegionChange={() => !isMapMoving && setIsMapMoving(true)}
                onRegionChangeComplete={(region) => {
                    setIsMapMoving(false);
                    setCurrentRegion(region); 
                    fetchAddress(region.latitude, region.longitude);
                }}
              />
              
              <View style={tw`absolute top-0 bottom-0 left-0 right-0 justify-center items-center pointer-events-none`}>
                  <View style={tw`z-10 ${isMapMoving ? '-mt-10' : '-mt-5'}`}>
                      <MaterialCommunityIcons name="map-marker" size={50} color="#EA4335" />
                  </View>
                  <View style={tw`bg-black rounded-full absolute mt-1 ${isMapMoving ? 'w-2 h-2 opacity-10' : 'w-4 h-4 opacity-20'}`} />
              </View>

              <View style={tw`absolute bottom-0 left-0 right-0`}>
                  <View style={tw`items-end px-5 mb-4`}>
                    <Pressable onPress={handleCurrentLocation} style={tw`bg-white w-12 h-12 rounded-full justify-center items-center shadow-lg elevation-5 border border-gray-100`}>
                        <MaterialIcons name="my-location" size={24} color="#2563EB" />
                    </Pressable>
                  </View>
                  <View style={tw`bg-white p-6 mb-5 rounded-t-3xl shadow-2xl elevation-20`}>
                      <View style={tw`w-12 h-1 bg-gray-300 rounded-full self-center mb-4`} />
                      <Text style={tw`text-xs font-bold text-gray-400 uppercase tracking-wide`}>Selected Location</Text>
                      <Text style={tw`text-lg font-bold text-gray-900 mt-1 mb-6 leading-6`} numberOfLines={3} ellipsizeMode="tail">
                          {isMapMoving ? "Locating..." : liveAddress}
                      </Text>
                      <Pressable onPress={confirmLocation} disabled={isMapMoving} style={tw.style(`py-4 rounded-xl items-center shadow-md`, isMapMoving ? 'bg-gray-300' : 'bg-red-600')}>
                          <Text style={tw`text-white font-bold text-lg`}>Confirm Location</Text>
                      </Pressable>
                  </View>
              </View>
          </SafeAreaView>
      </Modal>
    </KeyboardAvoidingView>
  );
}