import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Keyboard, // 1. Added Keyboard
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback, // 2. Added for Tap-to-Dismiss
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
      `border-2 p-4 rounded-xl w-[48%] items-center justify-center shadow-sm`,
      isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'
    )}
    onPress={onPress}
  >
    <Text
      style={tw.style(
        `font-bold text-base`,
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

  // --- INPUT HANDLER ---
  const handleInputChange = (field, value) => {
    if (field === 'mobileNumber') {
      const numericValue = value.replace(/[^0-9]/g, '');
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
        
        // --- City ---
        const mainComponents = data.results[0].address_components;
        mainComponents.forEach(c => {
            if (c.types.includes('locality') || c.types.includes('administrative_area_level_2')) {
                foundCity = c.long_name;
            }
        });
        if (!foundCity) foundCity = "Lahore"; 

        // --- Area ---
        mainComponents.forEach(c => {
             if (c.types.includes('sublocality') || 
                 c.types.includes('sublocality_level_1') || 
                 c.types.includes('neighborhood')) {
                 foundArea = c.long_name;
             }
        });

        // --- Fallback Area Logic ---
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

        // --- Final Area Check ---
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
             Alert.alert("Note", "Could not pinpoint exact area. Please search manually.");
        } else {
            setArea(foundArea);
            setCity(foundCity);
            
            const cleanAddress = `${foundArea}, ${foundCity}`;
            setFullAddress(data.results[0].formatted_address); 
            
            if (googleRef.current) {
                googleRef.current.setAddressText(cleanAddress);
            }
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
      setError('Please select a role (Player or Court Owner)');
      return;
    }
    
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword || !formData.mobileNumber || !city || !area) {
      setError('Please fill in all required fields and select location.');
      return;
    }
    
    const phoneRegex = /^03\d{9}$/; 
    if (!phoneRegex.test(formData.mobileNumber)) {
      setError('Invalid Mobile Number. Use format: 03001234567');
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
        'Check Your Inbox',
        `We have sent a verification link to ${formData.email}.\n\nPlease verify your email to activate your account.`,
        [
          { text: 'Go to Login', onPress: () => router.replace('/(auth)/login') },
        ]
      );
      
    } catch (err) {
      console.error('Signup Error:', err.code); 
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else {
        setError('Signup failed. Please try again.');
      }
    } finally {
      setLoading(false); 
    }
  };

  return (
    <ImageBackground source={bgImage} style={tw`flex-1`} resizeMode="cover">
      
      {/* 3. Wrap with TouchableWithoutFeedback to dismiss keyboard */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        
        <View style={tw`flex-1 bg-black/60`}> 
          <SafeAreaView style={tw`flex-1`}>
            
            {/* 4. Keyboard Avoiding View */}
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"} 
                style={tw`flex-1`}
            >
              
              <ScrollView
                style={tw`flex-1`}
                contentContainerStyle={tw`p-6 pb-20`} // Added bottom padding
                // 5. This is CRUCIAL for Google Places tap to work
                keyboardShouldPersistTaps='handled' 
                showsVerticalScrollIndicator={false}
              >
                <View style={tw`bg-white p-5 rounded-3xl shadow-2xl`}>

                    <Text style={tw`text-3xl font-bold text-center mb-6 text-gray-800`}>
                      Create Account
                    </Text>

                    <Text style={tw`text-base font-semibold mb-3 text-gray-700`}>I am a:</Text>
                    <View style={tw`flex-row justify-between mb-6`}>
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
                        <Text style={tw`text-sm font-bold text-gray-600 mb-1 ml-1`}>Full Name</Text>
                        <TextInput
                          style={tw`border border-gray-300 p-3.5 rounded-xl mb-4 text-base bg-gray-50`}
                          placeholder="e.g. Ali Khan"
                          value={formData.name}
                          onChangeText={(val) => handleInputChange('name', val)}
                          autoCapitalize="words"
                        />
                        
                        <Text style={tw`text-sm font-bold text-gray-600 mb-1 ml-1`}>Email Address</Text>
                        <TextInput
                          style={tw`border border-gray-300 p-3.5 rounded-xl mb-4 text-base bg-gray-50`}
                          placeholder="name@example.com"
                          value={formData.email}
                          onChangeText={(val) => handleInputChange('email', val)}
                          keyboardType="email-address"
                          autoCapitalize="none"
                        />
                        
                        <Text style={tw`text-sm font-bold text-gray-600 mb-1 ml-1`}>Mobile Number (PK)</Text>
                        <TextInput
                          style={tw`border border-gray-300 p-3.5 rounded-xl mb-4 text-base bg-gray-50`}
                          placeholder="03001234567"
                          value={formData.mobileNumber}
                          onChangeText={(val) => handleInputChange('mobileNumber', val)}
                          keyboardType="number-pad"
                          maxLength={11}
                        />
                        
                        {/* --- LOCATION --- */}
                        <Text style={tw`text-sm font-bold text-gray-600 mb-1 ml-1`}>Location</Text>
                        <View style={tw`flex-row z-50 h-14 relative mb-2`}> 
                            <View style={tw`flex-1 absolute top-0 left-0 right-0 z-50`}>
                                <GooglePlacesAutocomplete
                                  ref={googleRef}
                                  placeholder='Search Area (e.g. DHA, Lahore)'
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
                        <View style={tw`h-2`} /> 

                        <Pressable 
                            onPress={handleCurrentLocation}
                            disabled={loadingLocation}
                            style={tw`flex-row items-center justify-center bg-blue-50 p-3 rounded-xl border border-blue-100 mb-4 mt-6`}
                        >
                            {loadingLocation ? (
                                <ActivityIndicator size="small" color={tw.color('blue-600')} />
                            ) : (
                                <>
                                    <Ionicons name="location-sharp" size={20} color={tw.color('blue-600')} />
                                    <Text style={tw`text-blue-700 font-bold ml-2`}>Use Current Location</Text>
                                </>
                            )}
                        </Pressable>

                        {city ? (
                            <View style={tw`bg-green-50 p-3 rounded-xl mb-4 border border-green-200 flex-row items-center`}>
                                <Ionicons name="checkmark-circle" size={20} color="green" />
                                <Text style={tw`text-green-800 font-bold ml-2 flex-1`}>
                                    {area}, {city}
                                </Text>
                            </View>
                        ) : null}
                        
                        <Text style={tw`text-sm font-bold text-gray-600 mb-1 ml-1`}>Password</Text>
                        <TextInput
                          style={tw`border border-gray-300 p-3.5 rounded-xl mb-4 text-base bg-gray-50`}
                          placeholder="Min. 6 characters"
                          value={formData.password}
                          onChangeText={(val) => handleInputChange('password', val)}
                          secureTextEntry
                        />
                        
                        <Text style={tw`text-sm font-bold text-gray-600 mb-1 ml-1`}>Confirm Password</Text>
                        <TextInput
                          style={tw`border border-gray-300 p-3.5 rounded-xl mb-4 text-base bg-gray-50`}
                          placeholder="Re-enter password"
                          value={formData.confirmPassword}
                          onChangeText={(val) => handleInputChange('confirmPassword', val)}
                          secureTextEntry
                        />
                        
                        {error ? (
                          <View style={tw`bg-red-50 p-3 rounded-lg mb-4`}>
                             <Text style={tw`text-red-600 font-bold text-center`}>{error}</Text>
                          </View>
                        ) : null}

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
                              Create Account
                            </Text>
                          )}
                        </Pressable>
                      </>
                    )}

                    <View style={tw`mt-6 flex-row justify-center`}>
                        <Text style={tw`text-gray-600`}>Already have an account? </Text>
                        <Link href="/(auth)/login" asChild>
                          <Pressable>
                            <Text style={tw`text-blue-600 font-bold`}>
                              Login
                            </Text>
                          </Pressable>
                        </Link>
                    </View>
                    
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </TouchableWithoutFeedback>
    </ImageBackground>
  );
}