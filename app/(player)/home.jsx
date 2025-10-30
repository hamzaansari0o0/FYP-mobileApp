import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PlayerHome() {
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <View style={tw`flex-1 items-center justify-center p-5`}>
        <Text style={tw`text-3xl font-bold text-blue-800 mb-2`}>
          Welcome, Player
        </Text>
        <Text style={tw`text-lg text-gray-600 text-center`}>
          Yahan par approved courts ki list dikhegi.
        </Text>
        {/* Yahan aap FlatList ya ScrollView add kar sakte hain */}
      </View>
    </SafeAreaView>
  );
}