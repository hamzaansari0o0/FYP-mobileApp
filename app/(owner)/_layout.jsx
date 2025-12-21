import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import tw from 'twrnc';

export default function OwnerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tw.color('green-600'),
        tabBarInactiveTintColor: tw.color('gray-400'),
        tabBarStyle: tw`bg-white border-t border-gray-200 `,
        tabBarLabelStyle: tw`text-xs font-medium mb-1`,
      }}
    >
      {/* 1. Dashboard */}
      <Tabs.Screen
        name="dashboard" 
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={size} color={color} />
          ),
        }}
      />
      
      {/* 2. My Court */}
      <Tabs.Screen
        name="myCourt" 
        options={{
          title: 'My Arena', 
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'football' : 'football-outline'} size={size} color={color} />
          ),
        }}
      />

      {/* 3. Tournaments */}
      <Tabs.Screen
        name="tournaments"
        options={{
          title: 'Tournaments',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'trophy' : 'trophy-outline'} size={size} color={color} />
          ),
        }}
      />
      
      {/* 4. Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />

      {/* 5. Notifications (Hidden Tab) */}
      <Tabs.Screen
        name="notifications"
        options={{
          // 'href: null' tab bar se button hata deta hai, 
          // par navigation ke liye screen available rehti hai.
          href: null, 
        }}
      />
    </Tabs>
  );
}