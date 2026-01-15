import { Ionicons } from "@expo/vector-icons";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
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
        tabBarStyle: customTabBarStyle,
        tabBarLabelStyle: tw`text-[9px] font-medium mb-1`,
      }}
    >
      {/* Tab 1: Home */}
      <Tabs.Screen
        name="home"
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? "";
          
          if (routeName === 'howItWorks' || routeName === 'about') {
            return {
              tabBarStyle: { display: 'none' },
              title: "Home",
              tabBarIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
              ),
            };
          }

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

      {/* Tab 3: Chat - 🔥 UPDATED LOGIC HERE 🔥 */}
      <Tabs.Screen
        name="chat"
        options={({ route }) => {
          // Check karein ke Chat Stack mein konsi screen khuli hai
          const routeName = getFocusedRouteNameFromRoute(route) ?? "index";

          // Agar hum Chat Room ([chatId]) ya New Chat screen par hain -> TAB CHUPAO
          if (routeName === '[chatId]' || routeName === 'new') {
            return {
              title: "Chat",
              unmountOnBlur: true,
              tabBarStyle: { display: 'none' }, // Yahan Tab Bar HIDE hoga
              tabBarIcon: ({ color, focused }) => (
                <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={24} color={color} />
              ),
            };
          }

          // Agar hum Chat List (index) par hain -> TAB DIKHAO
          return {
            title: "Chat",
            unmountOnBlur: true,
            tabBarStyle: customTabBarStyle, // Yahan Tab Bar SHOW hoga
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={24} color={color} />
            ),
          };
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

      <Tabs.Screen name="schedule" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}