import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground, // 1. Import ImageBackground
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View
} from 'react-native';
import tw from 'twrnc';
import { useAuth } from '../../context/AuthContext';

// 2. Image Path (Ensure ye path sahi ho)
const bgImage = require('../../assets/images/loginForm-image.jpg');

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const router = useRouter(); 

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in both fields.');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      await login(email, password);
    } catch (e) {
      console.log('Login Error:', e.message); 
      if (e.message === 'auth/user-disabled') {
        setError('Your account has been disabled by an admin.');
      } else if (e.message === 'auth/email-not-verified') {
        setError('Please verify your email before logging in.');
      } else if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (e.code === 'auth/invalid-email') {
        setError('That email address is not valid.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    // 3. ImageBackground as main container
    <ImageBackground source={bgImage} style={tw`flex-1`} resizeMode="cover">
      {/* 4. Dark Overlay for readability */}
      <View style={tw`flex-1 bg-black/50 justify-center items-center p-6`}>
      
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={tw`w-full`}>

        {/* 5. White Container Box */}
        <View style={tw`bg-white/95 p-6 rounded-2xl shadow-2xl w-full max-w-sm`}>
        
            <Text style={tw`text-3xl font-bold text-center mb-6 text-gray-900`}>
            Welcome Back!
            </Text>

            <TextInput
            style={tw`border border-gray-300 p-4 rounded-xl mb-4 text-base bg-gray-50`}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            />
            <TextInput
            style={tw`border border-gray-300 p-4 rounded-xl mb-5 text-base bg-gray-50`}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            />

            {error && <Text style={tw`text-red-600 text-center mb-4 font-medium`}>{error}</Text>}

            <Pressable
            style={tw.style(
                `bg-blue-600 py-4 rounded-xl shadow-md`,
                loading && `bg-blue-400`
            )}
            onPress={handleLogin}
            disabled={loading}
            >
            {loading ? (
                <ActivityIndicator color={tw.color('white')} />
            ) : (
                <Text style={tw`text-white text-center text-lg font-bold`}>
                Login
                </Text>
            )}
            </Pressable>

            <Link href="/(auth)/signup" asChild>
            <Pressable style={tw`mt-6`}>
                <Text style={tw`text-blue-700 text-center text-base font-semibold`}>
                Don't have an account? Sign Up
                </Text>
            </Pressable>
            </Link>
        
        </View>
        {/* End White Container */}
        
      </KeyboardAvoidingView>
      </View>
      {/* End Overlay */}
    </ImageBackground>
  );
}