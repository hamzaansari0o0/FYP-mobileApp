import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { SafeAreaView } from 'react-native-safe-area-context';

// Ye Admin ki placeholder screen hai (Error #1 fix ho gaya)
export default function AdminDashboard() {
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <View style={tw`flex-1 items-center justify-center p-5`}>
        <Text style={tw`text-3xl font-bold text-purple-800`}>
          Admin Dashboard
        </Text>
        <Text style={tw`text-lg text-gray-600 mt-2`}>
          Yahan admin controls honge.
        </Text>
      </View>
    </SafeAreaView>
  );
}