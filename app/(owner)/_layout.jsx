import React from 'react';
import { Tabs } from 'expo-router';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';

export default function OwnerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tw.color('green-600'),
        tabBarInactiveTintColor: tw.color('gray-400'),
        tabBarStyle: tw`bg-white border-t border-gray-200 pt-2`,
        tabBarLabelStyle: tw`text-xs font-medium mb-1`,
      }}
    >
      {/* 1. Dashboard */}
      <Tabs.Screen
        name="dashboard" 
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={size} color={color} />
          ),
        }}
      />
      
      {/* 2. My Court (Naam aur Icon theek kar diya) */}
      <Tabs.Screen
        name="myCourt" // <-- Naam 'myCourt' kar diya (folder se match karne ke liye)
        options={{
          title: 'My Arena', // Title abhi bhi 'My Arena' rakha hai
          tabBarIcon: ({ color, size, focused }) => (
            // Icon 'football' kar diya
            <Ionicons name={focused ? 'football' : 'football-outline'} size={size} color={color} />
          ),
        }}
      />

      {/* 3. Tournaments */}
      <Tabs.Screen
        name="tournaments"
        options={{
          title: 'Tournaments',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'trophy' : 'trophy-outline'} size={size} color={color} />
          ),
        }}
      />
      
      {/* 4. Profile (Aakhri tab) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}