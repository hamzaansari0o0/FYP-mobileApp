import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

export default function TransactionsScreen() {
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <View style={tw`flex-1 items-center justify-center p-5`}>
        <Text style={tw`text-3xl font-bold text-purple-800`}>
          Transactions
        </Text>
        <Text style={tw`text-lg text-gray-600 mt-2 text-center`}>
          Yahan tamam payments ki details ayengi.
        </Text>
      </View>
    </SafeAreaView>
  );
}