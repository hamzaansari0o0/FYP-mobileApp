import React from 'react';
import { Tabs } from 'expo-router';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons'; // Icons ke liye

export default function PlayerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Har screen ke top par header hide kar dein
        tabBarActiveTintColor: tw.color('blue-600'), // Active icon/label ka rang
        tabBarInactiveTintColor: tw.color('gray-400'), // Inactive ka rang
        tabBarStyle: tw`bg-white border-t border-gray-200 pt-2`, // Tab bar ki styling
        tabBarLabelStyle: tw`text-xs font-medium mb-1`, // Label ki styling
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'My Bookings',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person-circle' : 'person-circle-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}