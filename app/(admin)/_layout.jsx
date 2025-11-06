import React from "react";
import { Tabs } from "expo-router";
import tw from "twrnc";
import { Ionicons } from "@expo/vector-icons";

export default function AdminTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tw.color("purple-600"), // Admin theme
        tabBarInactiveTintColor: tw.color("gray-400"),
        tabBarStyle: tw`bg-white border-t border-gray-200 pt-2`,
        tabBarLabelStyle: tw`text-xs font-medium mb-1`,
      }}
    >
      {/* 🟣 Tab 1: Dashboard */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "stats-chart" : "stats-chart-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* 🟣 Tab 2: Approvals */}
      <Tabs.Screen
        name="approvals"
        options={{
          title: "Approvals",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "shield-checkmark" : "shield-checkmark-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* 🟣 Tab 3: Payouts */}
      <Tabs.Screen
        name="payouts"
        options={{
          title: "Payouts",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "card" : "card-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* 🟣 Tab 4: Transactions */}
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transactions",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "cash" : "cash-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* 🟣 Tab 5: Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
