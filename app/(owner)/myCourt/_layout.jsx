import React from "react";
import { Stack } from "expo-router";

export default function MyCourtStackLayout() {
  // Yeh layout ab "My Arena" ke andar tamam screens manage karega
  return (
    <Stack>
      {/* 1. Main Screen (index.jsx) */}
      <Stack.Screen
        name="index" // app/(owner)/myCourt/index.jsx
        options={{
          headerShown: false, // Iska apna header hoga
        }}
      />

      {/* 2. Add Court Screen (Nayi Screen) */}
      <Stack.Screen
        name="addCourt" // app/(owner)/myCourt/addCourt.jsx
        options={{
          headerShown: true,
          title: "Add New Court",
          presentation: "modal",
        }}
      />

      {/* 3. Edit Court Screen (Pehle se maujood) */}
      <Stack.Screen
        name="edit" // app/(owner)/myCourt/edit.jsx
        options={{
          headerShown: true,
          title: "Edit Court Details",
          presentation: "modal",
        }}
      />

      {/* 4. Slot Maintenance Screen (Pehle se maujood) */}
      <Stack.Screen
        name="maintenance" // app/(owner)/myCourt/maintenance.jsx
        options={{
          headerShown: true,
          title: "Manage Slot Availability",
          presentation: "modal",
        }}
      />
    </Stack>
  );
}