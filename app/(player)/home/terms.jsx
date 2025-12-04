import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';

export default function TermsScreen() {
  return (
    <View style={tw`flex-1 p-5`}>
      <Text style={tw`text-2xl font-bold mb-4`}>Terms & Policy</Text>
      <Text style={tw`text-base`}>
        (Yahan aapki application ki terms and conditions ka text aayega...)
      </Text>
    </View>
  );
}