import React from 'react';
import { Stack } from 'expo-router';

export default function ScheduleStackLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="matchschedule" // app/(player)/schedule/matchschedule.jsx
        options={{
          title: "My Match Schedule", // Header ka title
        }}
      />
    </Stack>
  );
}