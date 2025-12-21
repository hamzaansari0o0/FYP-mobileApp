import { Stack } from 'expo-router';

export default function DashboardStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Main Dashboard */}
      <Stack.Screen name="index" /> 
      
      {/* Lists */}
      <Stack.Screen name="users" />
      <Stack.Screen name="arenas" />
      
      {/* Detail Screen */}
      <Stack.Screen name="arenaCourts/[ownerId]" />

      {/* --- NEW: Support Screen --- */}
      <Stack.Screen name="AdminSupportScreen" />
    </Stack>
  );
}