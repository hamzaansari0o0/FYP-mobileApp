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
      <Tabs.Screen
        name="dashboard" // app/(owner)/dashboard.jsx
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="myCourt" // app/(owner)/myCourt/ folder
        options={{
          title: 'My Court',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'football' : 'football-outline'} size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="profile" // app/(owner)/profile.jsx
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