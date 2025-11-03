import { Stack } from 'expo-router';
import React from 'react';

// Ye file dashboard group (index, users, courts) ke liye Stack layout banati hai
export default function DashboardStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" /> 
      <Stack.Screen name="users" />
      <Stack.Screen name="courts" />
    </Stack>
  );
}