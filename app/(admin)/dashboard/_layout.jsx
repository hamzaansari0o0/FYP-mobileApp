import { Stack } from 'expo-router';
import React from 'react';

export default function DashboardStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Main Dashboard */}
      <Stack.Screen name="index" /> 
      
      {/* Lists */}
      <Stack.Screen name="users" />
      <Stack.Screen name="arenas" />
      
      {/* Detail Screen (Naya) */}
      <Stack.Screen name="arenaCourts/[ownerId]" />
    </Stack>
  );
}