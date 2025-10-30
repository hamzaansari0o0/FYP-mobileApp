import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import tw from 'twrnc';

// Ye screen sirf loading ke waqt dikhegi
// Root _layout.jsx isay foran redirect kar dega
export default function StartPage() {
  return (
    <View style={tw`flex-1 items-center justify-center bg-white`}>
      <ActivityIndicator size="large" color={tw.color('blue-500')} />
    </View>
  );
}