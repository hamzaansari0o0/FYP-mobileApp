import { Stack } from 'expo-router';

export default function TransactionStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* 1. Arenas List (Entry Point) */}
      <Stack.Screen name="index" />
      
      {/* 2. Courts List */}
      <Stack.Screen name="[arenaId]" />
      
      {/* 3. Transaction List */}
      <Stack.Screen name="court/[courtId]" />
    </Stack>
  );
}