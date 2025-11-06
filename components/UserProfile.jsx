import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { Ionicons } from "@expo/vector-icons";

// Ye component ab 'adminRevenue' naam ka ek naya prop le raha hai
export default function UserProfile({ title, userData, logout, adminRevenue }) {
  // Ek chota component info row ke liye
  const InfoRow = ({ icon, label, value, color = "text-gray-800" }) => (
    <View
      style={tw`bg-white p-4 rounded-lg shadow-sm w-full flex-row items-center mb-4`}
    >
      <Ionicons name={icon} size={24} color={tw.color("gray-500")} />
      <View style={tw`ml-4`}>
        <Text style={tw`text-sm font-bold text-gray-500`}>{label}</Text>
        <Text style={tw`text-lg ${color}`}>{value}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      {/* --- Logout Button (Top Right Corner) --- */}
      <Pressable
        style={tw`absolute top-12 right-5 z-10 bg-white p-2 rounded-full shadow-md`}
        onPress={logout}
      >
        <Ionicons
          name="log-out-outline"
          size={28}
          color={tw.color("red-600")}
        />
      </Pressable>

      <View style={tw`flex-1 items-center justify-start p-5 pt-16`}>
        <Text style={tw`text-3xl font-bold text-gray-800 mb-4`}>
          {title} {/* Title prop se ayega */}
        </Text>

        {/* Loading spinner jab tak userData nahi ata */}
        {!userData ? (
          <ActivityIndicator size="large" color={tw.color("blue-500")} />
        ) : (
          <View style={tw`w-full items-center`}>
            {/* --- NAYA CONDITIONAL WALLET LOGIC --- */}

            {/* Agar user Player hai: */}
            {userData.role === "player" && (
              <InfoRow
                icon="wallet-outline"
                label="My Wallet Credit (Refunds)"
                value={`Rs. ${userData.walletCredit || 0}`}
                color="font-bold text-green-700"
              />
            )}

            {/* Agar user Owner hai: */}
            {userData.role === "owner" && (
              <InfoRow
                icon="cash-outline"
                label="Total Payouts Received"
                value={`Rs. ${userData.ownerBalance || 0}`}
                color="font-bold text-blue-700"
              />
            )}

            {/* Agar user Admin hai: */}
            {userData.role === "admin" && (
              <InfoRow
                icon="analytics-outline"
                label="Total App Revenue (5%)"
                // Ye 'adminRevenue' prop se aa raha hai
                value={`Rs. ${adminRevenue || 0}`}
                color="font-bold text-purple-700"
              />
            )}
            {/* ------------------------------------ */}

            {/* User ka naam */}
            <InfoRow
              icon="person-circle-outline"
              label="Full Name"
              value={userData.name}
            />

            {/* User ka email */}
            <InfoRow
              icon="mail-outline"
              label="Email Address"
              value={userData.email}
            />

            {/* User ka role */}
            <InfoRow
              icon="shield-checkmark-outline"
              label="Role"
              value={
                userData.role.charAt(0).toUpperCase() + userData.role.slice(1)
              }
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
