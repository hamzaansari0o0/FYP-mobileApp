import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useAuth } from '../../context/AuthContext';

// --- NEW PACKAGES ---
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

// --- YAHAN APNI API KEY PASTE KAREIN ---
const GOOGLE_API_KEY = "AIzaSyB32Zst4td-KdZcEXpzHL-nedXtIdBz1bw"; 

// Role Button Component
const RoleButton = ({ title, onPress, isSelected }) => (
  <Pressable
    style={tw.style(
      `border-2 border-blue-500 p-4 rounded-lg w-[48%] items-center`,
      isSelected ? 'bg-blue-500' : 'bg-white'
    )}
    onPress={onPress}
  >
    <Text
      style={tw.style(
        isSelected ? 'text-white font-bold' : 'text-blue-500 font-bold'
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

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // --- 1. CURRENT LOCATION LOGIC (Smart Fallback for Pakistan) ---
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
        if (!foundCity) foundCity = "Lahore"; // Default fallback

        // --- STEP B: Area Dhoondo (Standard Method) ---
        mainComponents.forEach(c => {
             if (c.types.includes('sublocality') || 
                 c.types.includes('sublocality_level_1') || 
                 c.types.includes('neighborhood')) {
                 foundArea = c.long_name;
             }
        });

        // --- STEP C: Agar Area "Code" hai ya missing hai, to String Split karo (Effective for Pakistan) ---
        // Address example: "97M8+JF, Block A Johar Town, Lahore, Pakistan"
        if (!foundArea || foundArea.includes('+')) {
            const formattedAddress = data.results[0].formatted_address;
            const parts = formattedAddress.split(',').map(part => part.trim()); 
            
            // City ka index dhoondo (e.g. "Lahore")
            const cityIndex = parts.findIndex(part => part === foundCity);
            
            if (cityIndex > 0) {
                // City se pichla hissa uthao (Usually Area hota hai)
                let candidate = parts[cityIndex - 1]; 
                
                // Agar wo candidate bhi "Plus Code" hai, to us se pichla uthao
                if (candidate.includes('+') && cityIndex > 1) {
                    candidate = parts[cityIndex - 2];
                }

                // Agar ab theek hai to set kar do
                if (!candidate.includes('+')) {
                    foundArea = candidate;
                }
            } else if (parts.length >= 3) {
                // Agar city match na ho, to standard format (Street, Area, City, Country) mein se 3rd last utha lo
                foundArea = parts[parts.length - 3];
            }
        }

        // --- STEP D: Agar ab bhi nahi mila, to Result[1] check karo ---
        if ((!foundArea || foundArea.includes('+')) && data.results[1]) {
            const secondComponents = data.results[1].address_components;
            secondComponents.forEach(c => {
                if (c.types.includes('sublocality') || c.types.includes('neighborhood')) {
                    foundArea = c.long_name;
                }
            });
        }

        // --- FINAL FALBACK ---
        if (!foundArea || foundArea.includes('+')) {
             foundArea = ""; // User hath se likhega
             Alert.alert("Exact Area Not Found", "Please type your area manually in the search bar.");
        }

        // State Update
        setArea(foundArea);
        setCity(foundCity);
        
        // Formatted text banao (e.g., "Johar Town, Lahore")
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
    
    // Validation
    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword ||
      !formData.mobileNumber ||
      !city || !area // Location check
    ) {
      setError('Please fill in all required fields including location.');
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
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`p-6 pb-12`}
        keyboardShouldPersistTaps='handled'
      >
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
            <Text style={tw`text-lg font-semibold mb-3 text-gray-700`}>Full Name</Text>
            <TextInput
              style={tw`border border-gray-300 p-4 rounded-lg mb-4 text-base`}
              placeholder="Your Name"
              value={formData.name}
              onChangeText={(val) => handleInputChange('name', val)}
            />
            
            <Text style={tw`text-lg font-semibold mb-3 text-gray-700`}>Email</Text>
            <TextInput
              style={tw`border border-gray-300 p-4 rounded-lg mb-4 text-base`}
              placeholder="Email"
              value={formData.email}
              onChangeText={(val) => handleInputChange('email', val)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <Text style={tw`text-lg font-semibold mb-3 text-gray-700`}>Mobile Number</Text>
            <TextInput
              style={tw`border border-gray-300 p-4 rounded-lg mb-4 text-base`}
              placeholder="0300-1234567"
              value={formData.mobileNumber}
              onChangeText={(val) => handleInputChange('mobileNumber', val)}
              keyboardType="phone-pad"
            />
            
            {/* --- LOCATION SECTION --- */}
            <Text style={tw`text-lg font-semibold mb-2 text-gray-700`}>Your Location (City & Area)</Text>
            
            {/* Google Autocomplete */}
            <View style={tw`flex-row mb-3 z-50`}> 
                <View style={tw`flex-1`}>
                    <GooglePlacesAutocomplete
                    ref={googleRef}
                    placeholder='Search Area (e.g. Johar Town)'
                    minLength={2}
                    fetchDetails={true}
                    onPress={(data, details = null) => {
                        const description = data.description; 
                        const parts = description.split(',');
                        // Manual Search Extract
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
                        textInputContainer: tw`bg-white border border-gray-300 rounded-lg`,
                        textInput: tw`h-12 text-gray-700 text-base bg-transparent`,
                        listView: tw`absolute top-14 left-0 right-0 bg-white z-50 shadow-lg rounded-lg border border-gray-100`,
                    }}
                    enablePoweredByContainer={false}
                    />
                </View>
            </View>

            {/* Current Location Button */}
            <Pressable 
                onPress={handleCurrentLocation}
                disabled={loadingLocation}
                style={tw`flex-row items-center justify-center bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4`}
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
                <View style={tw`bg-green-50 p-3 rounded-lg mb-4 border border-green-200`}>
                    <Text style={tw`text-green-800 font-bold`}>
                        Selected: <Text style={tw`font-normal`}>{area}, {city}</Text>
                    </Text>
                </View>
            ) : null}
            
            <Text style={tw`text-lg font-semibold mb-3 text-gray-700`}>Password</Text>
            <TextInput
              style={tw`border border-gray-300 p-4 rounded-lg mb-4 text-base`}
              placeholder="Password (min. 6 characters)"
              value={formData.password}
              onChangeText={(val) => handleInputChange('password', val)}
              secureTextEntry
            />
            
            <Text style={tw`text-lg font-semibold mb-3 text-gray-700`}>Confirm Password</Text>
            <TextInput
              style={tw`border border-gray-300 p-4 rounded-lg mb-4 text-base`}
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChangeText={(val) => handleInputChange('confirmPassword', val)}
              secureTextEntry
            />
            
            {error && <Text style={tw`text-red-500 text-center mb-4`}>{error}</Text>}

            <Pressable
              style={tw.style(
                `bg-blue-600 py-4 rounded-lg shadow-md mt-2`,
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
            <Text style={tw`text-blue-600 text-center text-base font-medium`}>
              Already have an account? Login
            </Text>
          </Pressable>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}