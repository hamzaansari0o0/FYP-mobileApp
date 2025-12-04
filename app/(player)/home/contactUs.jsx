import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';

export default function ContactUsScreen() {
  return (
    <View style={tw`flex-1 items-center justify-center`}>
      <Text style={tw`text-xl font-bold`}>Contact Us</Text>
      <Text>(Yahan contact form ya details show hongi)</Text>
    </View>
  );
}