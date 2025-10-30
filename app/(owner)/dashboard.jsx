import React from 'react';
import { View, Text, Pressable } from 'react-native';
// import { useAuth } from '../../context/AuthContext'; // Isay uncomment karein jab AuthContext ready ho
import tw from 'twrnc';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OwnerDashboard() {
  // const { logout } = useAuth(); // Isay uncomment karein

  // Sirf testing ke liye dummy function
  const logout = () => {
    console.log('Logout pressed');
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <View style={tw`flex-1 items-center justify-center p-6`}>
        <Text style={tw`text-3xl font-bold text-green-800 mb-2`}>
          Owner Dashboard
        </Text>
        <Text style={tw`text-lg text-gray-600 text-center mb-10`}>
          Yahan owner apni court ka status dekhega.
        </Text>

        {/* Logout Button */}
        <Pressable
          style={tw`bg-red-600 py-3 px-10 rounded-full shadow-lg`}
          onPress={logout}
        >
          <Text style={tw`text-white text-lg font-bold`}>Logout</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}