import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // Pure (auth) group se header hata dein
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />

      {/* "verify-email" wali line yahan se HATA di gayi hai */}
      
    </Stack>
  );
}