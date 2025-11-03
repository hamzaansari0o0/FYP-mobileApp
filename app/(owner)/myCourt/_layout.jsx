import { Stack } from 'expo-router';
import React from 'react';

export default function MyCourtStackLayout() {
  // Ye layout "My Court" tab ke andar 2 screens manage karega:
  // 1. index.jsx (Details)
  // 2. edit.jsx (Edit Form)
  return (
    <Stack>
      <Stack.Screen 
        name="index" // app/(owner)/myCourt/index.jsx
        options={{ 
          headerShown: false // Details screen par header nahi dikhana
        }} 
      />
      <Stack.Screen 
        name="edit" // app/(owner)/myCourt/edit.jsx
        options={{
          headerShown: true, // Edit screen par header dikhana hai
          title: 'Edit Court Details',
          presentation: 'modal', // Ta ke ye screen neechay se oopar aye
        }} 
      />
    </Stack>
  );
}