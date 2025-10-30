import { Stack } from 'expo-router';
import React from 'react';

// Ye Admin group ka layout hai (Error #2 fix ho gaya)
export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="dashboard"
        options={{ headerShown: true, title: 'Admin Dashboard' }}
      />
    </Stack>
  );
}