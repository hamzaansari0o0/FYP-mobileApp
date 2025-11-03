import { Stack } from 'expo-router';
import React from 'react';

// Ye file Home tab ke andar Stack Navigator banati hai
// Ta ke user Home se Court Details par ja sakay
export default function HomeStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Home ki main screen (Search + List) */}
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false // Yahan header nahi dikhana
        }} 
      />
      
      {/* Court Details screen */}
      <Stack.Screen 
        name="[courtId]" 
        options={{
          headerShown: true, // Yahan header dikhana hai
          title: 'Court Details', // Title [courtId].jsx mein update hoga
        }}
      />
    </Stack>
  );
}