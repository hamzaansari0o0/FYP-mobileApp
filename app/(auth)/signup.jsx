import { Link, useRouter } from 'expo-router'; 
import { useState } from 'react';
import {
  Alert, 
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext'; 
import tw from 'twrnc';

// Role Button (Ye bilkul theek hai)
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
  
  // --- NAYA FORM STATE ---
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    mobileNumber: '',
    city: '',
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signup } = useAuth(); 
  const router = useRouter(); 

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSignup = async () => {
    // --- NAYI VALIDATION ---
    if (!selectedRole) {
      setError('Please select a role');
      return;
    }
    // Check karein ke sab fields bhari hui hain
    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword ||
      !formData.mobileNumber ||
      !formData.city
    ) {
      setError('Please fill in all required fields.');
      return;
    }
    // Password check
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }
    // -------------------------
    
    setLoading(true);
    setError('');

    try {
      // formData aur selectedRole ko context mein bhej dein
      await signup(formData, selectedRole); 
      
      // Popup dikhayein (ye pehle se theek hai)
      Alert.alert(
        'Signup Successful',
        'A verification email has been sent. Please verify your email, then login.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/login'), 
          },
        ]
      );
      
    } catch (err) {
      // Firebase errors (ye pehle se theek hain)
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

        {/* --- NAYA FORM UI --- */}
        {/* Ye form ab role select karne par hamesha dikhega */}
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
            
            <Text style={tw`text-lg font-semibold mb-3 text-gray-700`}>City</Text>
            <TextInput
              style={tw`border border-gray-300 p-4 rounded-lg mb-4 text-base`}
              placeholder="e.g., Lahore"
              value={formData.city}
              onChangeText={(val) => handleInputChange('city', val)}
            />

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
            
            {/* Owner wala conditional block (courtName, price) yahan se hata diya hai */}

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
        {/* --------------------- */}

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