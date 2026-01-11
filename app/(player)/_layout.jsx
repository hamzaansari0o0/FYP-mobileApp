import { Ionicons } from "@expo/vector-icons";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native"; // 1. IMPORT THIS
import { Tabs, useSegments } from "expo-router";
import tw from "twrnc";

export default function PlayerTabLayout() {
  const segments = useSegments();
  
  // Global checks (Chat/Notifications)
  const isChatRoom = segments.includes('chat') && segments.length > 2;
  const isNotificationScreen = segments.includes('notifications');
  const globalHide = isChatRoom || isNotificationScreen;

  // Common Tab Bar Style
  const customTabBarStyle = {
    display: globalHide ? 'none' : 'flex',
    ...tw`bg-green-900 border-t-0 shadow-lg`,
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    borderRadius: 25,
    height: 65,
    paddingBottom: 10,
    paddingTop: 10,
    elevation: 5,
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "#86efac",
        tabBarStyle: customTabBarStyle, // Default Style apply kiya
        tabBarLabelStyle: tw`text-[9px] font-medium mb-1`,
      }}
    >
      {/* Tab 1: Home (Special Logic Applied Here) */}
      <Tabs.Screen
        name="home"
        options={({ route }) => {
          // 🔥 MAGIC LOGIC: Check current screen inside Home Stack
          const routeName = getFocusedRouteNameFromRoute(route) ?? "";
          
          // Agar user in pages par hai, to Tabs HIDE karein
          if (routeName === 'howItWorks' || routeName === 'about') {
            return {
              tabBarStyle: { display: 'none' }, // Tabs Hidden
              title: "Home",
              tabBarIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
              ),
            };
          }

          // Warna Normal Style
          return {
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
            ),
          };
        }}
      />

      {/* Tab 2: My Bookings */}
      <Tabs.Screen
        name="history"
        options={{
          title: "My Bookings",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* Tab 3: Chat */}
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarStyle: { display: 'none' }, // Chat tab itself should hide bar when inside
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* Tab 4: Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={26} color={color} />
          ),
        }}
      />

      {/* --- HIDDEN TABS --- */}
      <Tabs.Screen name="schedule" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}