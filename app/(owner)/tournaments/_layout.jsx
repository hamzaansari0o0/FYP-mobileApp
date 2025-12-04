import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

export default function TournamentStackLayout() {
  const router = useRouter();

  return (
    <Stack>
      {/* 1. List Screen */}
      <Stack.Screen
        name="index" 
        options={{
          title: "My Tournaments",
          headerRight: () => (
            <Pressable onPress={() => router.push('/(owner)/tournaments/create')}>
              <Ionicons name="add" size={30} color={tw.color("blue-600")} style={tw`mr-3`} />
            </Pressable>
          ),
        }}
      />
      
      {/* 2. Create Screen */}
      <Stack.Screen
        name="create" 
        options={{
          title: "Create New Tournament",
          presentation: "modal",
        }}
      />

      {/* 3. Manage Screen */}
      <Stack.Screen
        name="details/[tournamentId]"
        options={{
          title: "Manage Tournament",
          presentation: "modal",
        }}
      />
      
      {/* === 4. NAYI EDIT SCREEN === */}
      <Stack.Screen
        name="edit/[tournamentId]" // app/(owner)/tournaments/edit/[tournamentId].jsx
        options={{
          title: "Edit Tournament",
          presentation: "modal",
        }}
      />
      
    </Stack>
  );
}