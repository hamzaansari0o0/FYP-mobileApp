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
        
        // 🎨 COLORS (Owner Theme Match)
        tabBarActiveTintColor: "#ffffff", // Selected: Pora White
        tabBarInactiveTintColor: "#86efac", // Unselected: Light Green

        // 🖌️ STYLE (Floating Dark Green Bar)
        tabBarStyle: {
          // Agar hide karna hai to display 'none', warna 'flex'
          display: shouldHideTabBar ? 'none' : 'flex',

          ...tw`bg-green-900 border-t-0 shadow-lg`, // Dark Green + Shadow
          
          position: 'absolute', // 1. Float karwaya
          bottom: 40,           // 2. Bottom se oopar
          left: 16,             // 3. Sides se gap
          right: 16,
          borderRadius: 25,     // 4. Round corners
          height: 65,
          width:350,
          marginLeft:5,
          paddingBottom: 10,    // Center alignment adjustment
          paddingTop: 10,
          elevation: 5,         // Android Shadow
        },

        // 📝 LABEL STYLE
        tabBarLabelStyle: tw`text-[9px] font-medium mb-1`,
      }}
    >
      {/* Tab 1: Home */}
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* Tab 2: My Bookings (History) */}
      <Tabs.Screen
        name="history"
        options={{
          title: "My Bookings",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "calendar" : "calendar-outline"}
              size={24}
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
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              size={24}
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
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              size={26}
              color={color}
            />
          ),
        }}
      />

      {/* --- HIDDEN TABS --- */}
      
      {/* Hidden: Schedule */}
      <Tabs.Screen
        name="schedule" 
        options={{
          href: null, 
        }}
      />

      {/* Hidden: Notifications */}
      <Tabs.Screen
        name="notifications" 
        options={{
          href: null,
        }}
      />
      
    </Tabs>
  );
}