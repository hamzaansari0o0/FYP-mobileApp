import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext'; // Import karein
import tw from 'twrnc';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth(); // Asal login function lein
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
      // Agar kamyab hua, to onAuthStateChanged redirection kar dega
      
    } catch (e) {
      // --- YAHAN NAYA ERROR CHECK ADD HUA HAI ---
      console.log('Login Error:', e.message); 
      if (e.message === 'auth/email-not-verified') {
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
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <View style={tw`flex-1 justify-center p-6`}>
        <Text style={tw`text-3xl font-bold text-center mb-8 text-gray-800`}>
          Welcome Back!
        </Text>

        <TextInput
          style={tw`border border-gray-300 p-4 rounded-lg mb-4 text-base`}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={tw`border border-gray-300 p-4 rounded-lg mb-5 text-base`}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error && <Text style={tw`text-red-500 text-center mb-4`}>{error}</Text>}

        <Pressable
          style={tw.style(
            `bg-blue-600 py-4 rounded-lg shadow-md`,
            loading && `bg-blue-400` // Disabled state
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
            <Text style={tw`text-blue-600 text-center text-base font-medium`}>
              Don't have an account? Sign Up
            </Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}