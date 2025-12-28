import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import tw from "twrnc";

export default function OwnerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // 🎨 COLORS
        tabBarActiveTintColor: "#ffffff", // Selected: Pora White
        tabBarInactiveTintColor: "#86efac", // Unselected: Light Green

        // 🖌️ STYLE (Floating Dark Green Bar)
        tabBarStyle: {
          ...tw`bg-green-900 border-t-0 shadow-lg`, // Dark Green + Shadow
          
          position: 'absolute', // 1. Bar ko content ke oopar float karwaya
          bottom: 40,           // 2. Bottom se 20 points oopar uthaya (Buttons se door)
          left: 16,             // 3. Sides se gap diya (Floating look ke liye)
          right: 16,
          borderRadius: 25,     // 4. Corners gol (Round) kar diye
          height: 70,
          marginLeft:'5',
          width: '350',
         // Height fix ki
          
          paddingBottom: 10,    // Icons ko center mein rakhne ke liye padding adjust ki
          paddingTop: 10,
          elevation: 5,         // Android Shadow
        },
        
        // 📝 LABEL STYLE
        tabBarLabelStyle: tw`text-[9px] font-medium mb-1`,
      }}
    >
      {/* 1. Dashboard */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
                name={focused ? "grid" : "grid-outline"} 
                size={24} 
                color={color} 
            />
          ),
        }}
      />

      {/* 2. My Court */}
      <Tabs.Screen
        name="myCourt"
        options={{
          title: "My Arena",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
                name={focused ? "football" : "football-outline"} 
                size={26} 
                color={color} 
            />
          ),
        }}
      />

      {/* 3. Tournaments */}
      <Tabs.Screen
        name="tournaments"
        options={{
          title: "Tournaments",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
                name={focused ? "trophy" : "trophy-outline"} 
                size={24} 
                color={color} 
            />
          ),
        }}
      />

      {/* 4. Earnings */}
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Earnings",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
                name={focused ? "wallet" : "wallet-outline"} 
                size={24} 
                color={color} 
            />
          ),
        }}
      />

      {/* 5. Profile */}
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

      {/* Hidden Tabs */}
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}