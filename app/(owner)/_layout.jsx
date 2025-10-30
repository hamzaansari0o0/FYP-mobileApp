import React from 'react';
import { Tabs } from 'expo-router';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons'; // Icons ke liye

export default function OwnerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Header hide kar dein
        tabBarActiveTintColor: tw.color('green-600'), // Owner ke liye different color
        tabBarInactiveTintColor: tw.color('gray-400'),
        tabBarStyle: tw`bg-white border-t border-gray-200 pt-2`,
        tabBarLabelStyle: tw`text-xs font-medium mb-1`,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'grid' : 'grid-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      
      {/* --- YAHAN NAYA TAB ADD HUA HAI --- */}
      <Tabs.Screen
        name="myCourt" // Ye app/(owner)/myCourt.jsx file ko dhoondega
        options={{
          title: 'My Court',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'football' : 'football-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      {/* ---------------------------------- */}
      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Owner Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}