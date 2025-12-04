import React from "react";
import { Tabs, useSegments } from "expo-router"; // 1. 'useSegments' import karein
import tw from "twrnc";
import { Ionicons } from "@expo/vector-icons";

export default function PlayerTabLayout() {
  const segments = useSegments(); // 2. Route segments get karein
  
  // 3. Check karein ke hum 'chat' folder ke andar 'index' ke BAAD wali screen par hain ya nahi
  // (e.g., /chat/[chatId])
  const isChatRoom = segments.includes('chat') && segments.length > 2;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tw.color("blue-600"),
        tabBarInactiveTintColor: tw.color("gray-400"),
        
        // 4. NAYA DYNAMIC STYLE
        tabBarStyle: {
          display: isChatRoom ? 'none' : 'flex', // <-- YEH ASAL FIX HAI
          ...tw`bg-white border-t border-gray-200 pt-2`,
        },
        tabBarLabelStyle: tw`text-xs font-medium mb-1`,
      }}
    >
      {/* Tab 1: Home */}
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* Tab 2: My Bookings */}
      <Tabs.Screen
        name="history"
        options={{
          title: "My Bookings",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "calendar" : "calendar-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* Tab 3: Chat */}
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* Tab 4: Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* Hidden Tab: schedule */}
      <Tabs.Screen
        name="schedule" 
        options={{
          href: null, 
        }}
      />
      
    </Tabs>
  );
}