import { Ionicons } from "@expo/vector-icons";
import { Tabs, useSegments } from "expo-router";
import tw from "twrnc";

export default function PlayerTabLayout() {
  const segments = useSegments();
  
  // 1. Check karein ke hum Chat Room mein hain?
  const isChatRoom = segments.includes('chat') && segments.length > 2;

  // 2. Check karein ke hum Notifications screen par hain?
  const isNotificationScreen = segments.includes('notifications');

  // 3. Agar Chat Room YA Notification screen ho, to Tab Bar chupa dein
  const shouldHideTabBar = isChatRoom || isNotificationScreen;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // 👇 Change: Active color ab Black hai
        tabBarActiveTintColor: "black", 
        tabBarInactiveTintColor: tw.color("gray-400"),
        
        // Dynamic Style to Hide Tab Bar (Height/Width unchanged)
        tabBarStyle: {
          display: shouldHideTabBar ? 'none' : 'flex', 
          ...tw`bg-white border-t border-gray-200 `,
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

      {/* Hidden Tab: Schedule */}
      <Tabs.Screen
        name="schedule" 
        options={{
          href: null, 
        }}
      />

      {/* 🔥 NEW HIDDEN TAB: Notifications */}
      <Tabs.Screen
        name="notifications" 
        options={{
          href: null, // Ye Tab Bar mein button nahi banaye ga
        }}
      />
      
    </Tabs>
  );
}