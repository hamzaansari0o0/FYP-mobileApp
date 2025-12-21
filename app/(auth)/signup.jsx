import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useAuth } from '../../context/AuthContext';

// --- NEW PACKAGES ---
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

// --- IMAGE IMPORT ---
const bgImage = require('../../assets/images/loginForm-image.jpg');

// --- YAHAN APNI API KEY PASTE KAREIN ---
const GOOGLE_API_KEY = "AIzaSyB32Zst4td-KdZcEXpzHL-nedXtIdBz1bw"; 

// Role Button Component
const RoleButton = ({ title, onPress, isSelected }) => (
  <Pressable
    style={tw.style(
      `border-2 p-4 rounded-xl w-[48%] items-center`,
      isSelected ? 'bg-blue-600 border-blue-600' : 'bg-gray-50 border-gray-300'
    )}
    onPress={onPress}
  >
    <Text
      style={tw.style(
        `font-bold`,
        isSelected ? 'text-white' : 'text-gray-600'
      )}
    >
      {title}
    </Text>
  </Pressable>
);

export default function Signup() {
  const [selectedRole, setSelectedRole] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    mobileNumber: '',
  });
  
  // Location States
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [coordinates, setCoordinates] = useState(null); 

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  
  const googleRef = useRef(); 
  
  const { signup } = useAuth(); 
  const router = useRouter(); 

  // --- UPDATED INPUT HANDLER (Mobile Logic Added) ---
  const handleInputChange = (field, value) => {
    if (field === 'mobileNumber') {
      // 1. Sirf Numbers allow karein (No alphabets/symbols)
      const numericValue = value.replace(/[^0-9]/g, '');
      
      // 2. Limit: Exact 11 digits
      if (numericValue.length > 11) return;
      
      setFormData((prev) => ({ ...prev, [field]: numericValue }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  // --- 1. CURRENT LOCATION LOGIC ---
  const handleCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied');
        setLoadingLocation(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setCoordinates({ lat: latitude, lng: longitude });

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        
        let foundArea = '';
        let foundCity = '';
        
        // --- STEP A: City Dhoondo ---
        const mainComponents = data.results[0].address_components;
        mainComponents.forEach(c => {
            if (c.types.includes('locality') || c.types.includes('administrative_area_level_2')) {
                foundCity = c.long_name;
            }
        });
        if (!foundCity) foundCity = "Lahore"; 

        // --- STEP B: Area Dhoondo ---
        mainComponents.forEach(c => {
             if (c.types.includes('sublocality') || 
                 c.types.includes('sublocality_level_1') || 
                 c.types.includes('neighborhood')) {
                 foundArea = c.long_name;
             }
        });

        // --- STEP C: Fallback Logic ---
        if (!foundArea || foundArea.includes('+')) {
            const formattedAddress = data.results[0].formatted_address;
            const parts = formattedAddress.split(',').map(part => part.trim()); 
            const cityIndex = parts.findIndex(part => part === foundCity);
            
            if (cityIndex > 0) {
                let candidate = parts[cityIndex - 1]; 
                if (candidate.includes('+') && cityIndex > 1) {
                    candidate = parts[cityIndex - 2];
                }
                if (!candidate.includes('+')) {
                    foundArea = candidate;
                }
            } else if (parts.length >= 3) {
                foundArea = parts[parts.length - 3];
            }
        }

        // --- STEP D: Final Check ---
        if ((!foundArea || foundArea.includes('+')) && data.results[1]) {
            const secondComponents = data.results[1].address_components;
            secondComponents.forEach(c => {
                if (c.types.includes('sublocality') || c.types.includes('neighborhood')) {
                    foundArea = c.long_name;
                }
            });
        }

        if (!foundArea || foundArea.includes('+')) {
             foundArea = ""; 
             Alert.alert("Exact Area Not Found", "Please type your area manually in the search bar.");
        }

        // State Update
        setArea(foundArea);
        setCity(foundCity);
        
        const cleanAddress = foundArea ? `${foundArea}, ${foundCity}` : foundCity;
        setFullAddress(data.results[0].formatted_address); 
        
        if (googleRef.current) {
            googleRef.current.setAddressText(cleanAddress);
        }
        
      } else {
        Alert.alert("Error", "Could not fetch address details.");
      }

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to get current location.");
    } finally {
      setLoadingLocation(false);
    }
  };

  // --- 2. SIGNUP SUBMIT LOGIC ---
  const handleSignup = async () => {
    if (!selectedRole) {
      setError('Please select a role');
      return;
    }
    
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword || !formData.mobileNumber || !city || !area) {
      setError('Please fill in all required fields including location.');
      return;
    }
    
    // --- MOBILE VALIDATION (Must start with 03 and be 11 digits) ---
    const phoneRegex = /^03\d{9}$/; 
    if (!phoneRegex.test(formData.mobileNumber)) {
      setError('Invalid Mobile Number. Use format: 03001234567 (Must start with 03).');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const finalData = {
          ...formData,
          city: city,
          area: area,
          fullAddress: fullAddress,
          coordinates: coordinates
      };

      await signup(finalData, selectedRole); 
      
      Alert.alert(
        'Signup Successful',
        'A verification email has been sent. Please verify your email, then login.',
        [
          { text: 'OK', onPress: () => router.replace('/(auth)/login') },
        ]
      );
      
    } catch (err) {
      console.error('Signup Error:', err.code); 
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered.');
      } else if (err.code === 'auth/invalid-email') {
        setError('That email address is not valid.');
      } else {
        setError('Signup failed. Please try again.');
      }
    } finally {
      setLoading(false); 
    }
  };

  return (
    // 1. Background Image Container (As per your request - simple style)
    <ImageBackground source={bgImage} style={tw`flex-1`} resizeMode="cover">
      
      {/* 2. Overlay to make text readable */}
      <View style={tw`flex-1 bg-black/50`}>
        
        <SafeAreaView style={tw`flex-1`}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={tw`flex-1`}>
            
            <ScrollView
              style={tw`flex-1`}
              contentContainerStyle={tw`p-6 pb-12`}
              keyboardShouldPersistTaps='handled'
            >
              {/* 3. White Box Container */}
              <View style={tw`bg-white/95 p-5 rounded-2xl shadow-xl`}>

                  <Text style={tw`text-3xl font-bold text-center mb-6 text-gray-800`}>
                    Create Account
                  </Text>

                  <Text style={tw`text-lg font-semibold mb-3 text-gray-700`}>Select Your Role:</Text>
                  <View style={tw`flex-row justify-between mb-5`}>
                    <RoleButton
                      title="Player"
                      onPress={() => setSelectedRole('player')}
                      isSelected={selectedRole === 'player'}
                    />
                    <RoleButton
                      title="Court Owner"
                      onPress={() => setSelectedRole('owner')}
                      isSelected={selectedRole === 'owner'}
                    />
                  </View>

                  {selectedRole && (
                    <>
                      <Text style={tw`text-base font-semibold mb-2 text-gray-700`}>Full Name</Text>
                      <TextInput
                        style={tw`border border-gray-300 p-4 rounded-xl mb-4 text-base bg-gray-50`}
                        placeholder="Your Name"
                        value={formData.name}
                        onChangeText={(val) => handleInputChange('name', val)}
                      />
                      
                      <Text style={tw`text-base font-semibold mb-2 text-gray-700`}>Email</Text>
                      <TextInput
                        style={tw`border border-gray-300 p-4 rounded-xl mb-4 text-base bg-gray-50`}
                        placeholder="Email"
                        value={formData.email}
                        onChangeText={(val) => handleInputChange('email', val)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                      
                      <Text style={tw`text-base font-semibold mb-2 text-gray-700`}>Mobile Number (PK)</Text>
                      <TextInput
                        style={tw`border border-gray-300 p-4 rounded-xl mb-4 text-base bg-gray-50`}
                        placeholder="03001234567" // Updated Placeholder
                        value={formData.mobileNumber}
                        onChangeText={(val) => handleInputChange('mobileNumber', val)}
                        keyboardType="number-pad" // Enforces numeric keyboard
                        maxLength={11} // Enforces 11 digits
                      />
                      
                      {/* --- LOCATION SECTION --- */}
                      <Text style={tw`text-base font-semibold mb-2 text-gray-700`}>Your Location (City & Area)</Text>
                      
                      {/* Google Autocomplete Container */}
                      <View style={tw`flex-row z-50 h-14 relative`}> 
                          <View style={tw`flex-1 absolute top-0 left-0 right-0 z-50`}>
                              <GooglePlacesAutocomplete
                              ref={googleRef}
                              placeholder='Search Area (e.g. Johar Town)'
                              minLength={2}
                              fetchDetails={true}
                              onPress={(data, details = null) => {
                                  const description = data.description; 
                                  const parts = description.split(',');
                                  setArea(parts[0]?.trim());
                                  setCity(parts[1]?.trim() || parts[0]?.trim());
                                  setFullAddress(description);
                                  if(details) {
                                      setCoordinates({
                                          lat: details.geometry.location.lat,
                                          lng: details.geometry.location.lng
                                      });
                                  }
                              }}
                              query={{
                                  key: GOOGLE_API_KEY,
                                  language: 'en',
                                  components: 'country:pk', 
                              }}
                              styles={{
                                  textInputContainer: tw`bg-gray-50 border border-gray-300 rounded-xl`,
                                  textInput: tw`h-12 text-gray-700 text-base bg-transparent`,
                                  listView: tw`absolute top-14 left-0 right-0 bg-white z-50 shadow-lg rounded-xl border border-gray-200 max-h-60`,
                              }}
                              enablePoweredByContainer={false}
                              />
                          </View>
                      </View>

                      {/* Spacer View to ensure list opens properly */}
                      <View style={tw`h-2`} /> 

                      {/* Current Location Button with GAP (mt-6) */}
                      <Pressable 
                          onPress={handleCurrentLocation}
                          disabled={loadingLocation}
                          style={tw`flex-row items-center justify-center bg-blue-50 p-3 rounded-xl border border-blue-100 mb-4 mt-6`}
                      >
                          {loadingLocation ? (
                              <ActivityIndicator size="small" color={tw.color('blue-600')} />
                          ) : (
                              <>
                                  <Ionicons name="navigate-circle" size={24} color={tw.color('blue-600')} />
                                  <Text style={tw`text-blue-700 font-bold ml-2`}>Use Current Location</Text>
                              </>
                          )}
                      </Pressable>

                      {/* Display Selection */}
                      {city ? (
                          <View style={tw`bg-green-50 p-3 rounded-xl mb-4 border border-green-200`}>
                              <Text style={tw`text-green-800 font-bold`}>
                                  Selected: <Text style={tw`font-normal`}>{area}, {city}</Text>
                              </Text>
                          </View>
                      ) : null}
                      
                      <Text style={tw`text-base font-semibold mb-2 text-gray-700`}>Password</Text>
                      <TextInput
                        style={tw`border border-gray-300 p-4 rounded-xl mb-4 text-base bg-gray-50`}
                        placeholder="Password (min. 6 characters)"
                        value={formData.password}
                        onChangeText={(val) => handleInputChange('password', val)}
                        secureTextEntry
                      />
                      
                      <Text style={tw`text-base font-semibold mb-2 text-gray-700`}>Confirm Password</Text>
                      <TextInput
                        style={tw`border border-gray-300 p-4 rounded-xl mb-4 text-base bg-gray-50`}
                        placeholder="Confirm Password"
                        value={formData.confirmPassword}
                        onChangeText={(val) => handleInputChange('confirmPassword', val)}
                        secureTextEntry
                      />
                      
                      {error && <Text style={tw`text-red-600 font-bold text-center mb-4`}>{error}</Text>}

                      <Pressable
                        style={tw.style(
                          `bg-blue-600 py-4 rounded-xl shadow-md mt-2`,
                          loading && `bg-blue-400`
                        )}
                        onPress={handleSignup}
                        disabled={loading}
                      >
                        {loading ? (
                          <ActivityIndicator color={tw.color('white')} />
                        ) : (
                          <Text style={tw`text-white text-center text-lg font-bold`}>
                            {`Register as ${selectedRole}`}
                          </Text>
                        )}
                      </Pressable>
                    </>
                  )}

                  <Link href="/(auth)/login" asChild>
                    <Pressable style={tw`mt-6`}>
                      <Text style={tw`text-blue-600 text-center text-base font-semibold`}>
                        Already have an account? Login
                      </Text>
                    </Pressable>
                  </Link>
                  
              </View> 
              {/* End White Box */}
              
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}