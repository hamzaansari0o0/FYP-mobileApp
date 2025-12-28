import { Stack } from "expo-router";
import React from "react";
import HomeHeader from "../../../components/specific/home/HomeHeader";

export default function HomeStackLayout() {
  return (
    <Stack>
      {/* 1. Home ki main screen */}
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          header: () => <HomeHeader />,
        }}
      />

      {/* 2. Court Details screen */}
      <Stack.Screen
        name="[courtId]"
        options={{
          headerShown: false,
          title: "Court Details",
        }}
      />
      
      {/* 3. Owner Details */}
      <Stack.Screen
        name="ownerDetails/[ownerId]"
        options={{
          headerShown: false,
          title: "Owner's Courts",
        }}
      />

      {/* === NAYI "SEE MORE" SCREEN === */}
      <Stack.Screen
        name="allOwners" // <-- Yeh nayi screen hai
        options={{
          headerShown: true,
          title: "All Play Arenas",
        }}
      />
      {/* === END OF NAYI SCREEN === */}

      {/* 4. Tournaments */}
      <Stack.Screen
        name="tournaments"
        options={{
          headerShown: false,
          title: "Tournaments",
        }}
      />

      {/* 5. Contact Us */}
      <Stack.Screen
        name="contactUs"
        options={{
          headerShown: false,
          title: "Contact Us",
        }}
      />

      {/* 6. Terms */}
      <Stack.Screen
        name="terms"
        options={{
          headerShown: true,
          title: "Terms & Policy",
        }}
      />
    </Stack>
  );
}