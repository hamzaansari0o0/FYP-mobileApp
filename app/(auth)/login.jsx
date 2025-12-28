import { Link, useRouter } from 'expo-router';
import { sendPasswordResetEmail } from "firebase/auth"; // ✅ Import Added
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert, // ✅ Import Added
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import tw from 'twrnc';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../firebase/firebaseConfig'; // ✅ Import auth directly

const bgImage = require('../../assets/images/loginForm-image.jpg');

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const router = useRouter(); 

  // --- ✅ FORGOT PASSWORD LOGIC ---
  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Email Required", "Please enter your email address in the box above to reset your password.");
      return;
    }
    
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert("Email Sent", "Password reset link has been sent to your email. Check your inbox (and spam folder).");
    } catch (err) {
      console.log(err);
      if (err.code === 'auth/user-not-found') {
        Alert.alert("Error", "No user found with this email.");
      } else if (err.code === 'auth/invalid-email') {
        Alert.alert("Error", "Invalid email address format.");
      } else {
        Alert.alert("Error", "Could not send reset email. Try again later.");
      }
    }
  };
  // -------------------------------

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
    <ImageBackground source={bgImage} style={tw`flex-1`} resizeMode="cover">
      
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        
        <View style={tw`flex-1 bg-black/50`}>
          
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"} 
            style={tw`flex-1 justify-center items-center p-6`}
          >
            
            <View style={tw`bg-white/95 p-6 rounded-2xl shadow-2xl w-full max-w-sm`}>
            
                <Text style={tw`text-3xl font-bold text-center mb-6 text-gray-900`}>
                  Welcome Back!
                </Text>

                <TextInput
                  style={tw`border border-gray-300 p-4 rounded-xl mb-4 text-base bg-gray-50 text-gray-800`}
                  placeholder="Email"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                
                <TextInput
                  style={tw`border border-gray-300 p-4 rounded-xl mb-2 text-base bg-gray-50 text-gray-800`}
                  placeholder="Password"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />

                {/* ✅ Forgot Password Link */}
                <Pressable onPress={handleForgotPassword} style={tw`self-end mb-4 p-1`}>
                    <Text style={tw`text-blue-600 font-semibold text-sm`}>Forgot Password?</Text>
                </Pressable>

                {error ? (
                  <Text style={tw`text-red-600 text-center mb-4 font-medium`}>{error}</Text>
                ) : null}

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
            
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </ImageBackground>
  );
}