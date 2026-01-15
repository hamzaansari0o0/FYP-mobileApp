import { Stack } from "expo-router";
import React from "react";
import HomeHeader from "../../../components/specific/home/HomeHeader";

export default function HomeStackLayout() {
  return (
    <Stack screenOptions={{ animation: 'slide_from_right' }}>
      
      {/* 1. Main Home */}
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          header: () => <HomeHeader />,
        }}
      />

      {/* 2. Specific Pages */}
      <Stack.Screen
        name="howItWorks"
        options={{ headerShown: false }}
      />
      
      {/* ❌ "introduction" wala block yahan se DELETE kar diya hai kyunki file nahi thi */}
      {/* Agar aapko Introduction dikhana hai to 'about' screen use ho rahi hai */}

      <Stack.Screen
        name="about" 
        options={{ headerShown: false }} 
      />

      {/* 3. Details Screens */}
      <Stack.Screen
        name="[courtId]"
        options={{ headerShown: false, title: "Court Details" }}
      />
      
      <Stack.Screen
        name="ownerDetails/[ownerId]"
        options={{ headerShown: false, title: "Owner's Courts" }}
      />

      <Stack.Screen
        name="nearby-players"
        options={{ headerShown: false, title: "Nearby Players" }}
      />

      <Stack.Screen
        name="allOwners"
        options={{ headerShown: true, title: "All Play Arenas" }}
      />

      <Stack.Screen
        name="tournaments"
        options={{ headerShown: false, title: "Tournaments" }}
      />

      <Stack.Screen
        name="contactUs"
        options={{ headerShown: false, title: "Contact Us" }}
      />

      <Stack.Screen
        name="terms"
        options={{ headerShown: true, title: "Terms & Policy" }}
      />
    </Stack>
  );
}