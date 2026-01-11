import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import tw from "twrnc";

export default function OwnerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // 🎨 COLORS
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "#86efac",

        // 🔥 GLOBAL PADDING (Ye zaroor lagana taake content tab bar ke peeche na chupe)
        sceneContainerStyle: { paddingBottom: 100, backgroundColor: 'white' },

        // 🖌️ STYLE (Responsive Floating Bar)
        tabBarStyle: {
          ...tw`bg-green-900 border-t-0 shadow-lg`, 
          
          position: 'absolute',
          
          // 👇 Positioning Logic (Fixed for All Mobiles)
          bottom: 40,    // 40 thora zyada oopar tha, 30 best float look hai
          left: 20,      // Left margin
          right: 20,     // Right margin (Ab width khud adjust hogi)
          
          // ❌ Ye lines maine HATA di hain (Inki wajah se masla tha):
          // width: '350', 
          // marginLeft: '5',

          height: 70,    // Height fixed theek hai
          borderRadius: 35, // Pill shape (Height ka aadha)
          
          // Padding & Shadow
          paddingBottom: 10,
          paddingTop: 10,
          elevation: 10, // Shadow strong ki hai
          borderTopWidth: 0, 
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
            <Ionicons name={focused ? "grid" : "grid-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* 2. My Arena (Court) */}
      <Tabs.Screen
        name="myCourt"
        options={{
          title: "My Arena",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "football" : "football-outline"} size={26} color={color} />
          ),
        }}
      />

      {/* 3. Tournaments */}
      <Tabs.Screen
        name="tournaments"
        options={{
          title: "Tournaments",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "trophy" : "trophy-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* 4. Earnings */}
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Earnings",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "wallet" : "wallet-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* 5. Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={26} color={color} />
          ),
        }}
      />

      {/* Hidden Tabs */}
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}