import React from 'react';
import { Tabs } from 'expo-router';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tw.color('purple-600'), // Admin ka theme
        tabBarInactiveTintColor: tw.color('gray-400'),
        tabBarStyle: tw`bg-white border-t border-gray-200 pt-2`,
        tabBarLabelStyle: tw`text-xs font-medium mb-1`,
      }}
    >
      <Tabs.Screen
        name="dashboard" // app/(admin)/dashboard.jsx
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="approvals" // app/(admin)/approvals.jsx
        options={{
          title: 'Approvals',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'} size={size} color={color} />
          ),
        }}
      />
      
      {/* --- YAHAN NAYA TAB ADD HUA HAI --- */}
      <Tabs.Screen
        name="profile" // Ye app/(admin)/profile.jsx file ko dhoondega
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={size} color={color} />
          ),
        }}
      />
      {/* ---------------------------------- */}
      
    </Tabs>
  );
}