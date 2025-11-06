import React from "react";
import { Stack } from "expo-router";

export default function MyCourtStackLayout() {
  // This layout manages 3 screens:
  // 1. index.jsx (Court Details)
  // 2. edit.jsx (Edit Court Info)
  // 3. maintenance.jsx (Slot Availability Management)

  return (
    <Stack>
      {/* Court Details Screen */}
      <Stack.Screen
        name="index" // app/(owner)/myCourt/index.jsx
        options={{
          headerShown: false, // Hide header on main details screen
        }}
      />

      {/* Edit Court Screen */}
      <Stack.Screen
        name="edit" // app/(owner)/myCourt/edit.jsx
        options={{
          headerShown: true,
          title: "Edit Court Details",
          presentation: "modal", // Opens like a modal
        }}
      />

      {/* Slot Maintenance Screen */}
      <Stack.Screen
        name="maintenance" // app/(owner)/myCourt/maintenance.jsx
        options={{
          headerShown: true,
          title: "Manage Slot Availability",
          presentation: "modal", // Opens as modal too
        }}
      />
    </Stack>
  );
}
