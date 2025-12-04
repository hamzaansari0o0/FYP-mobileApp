import React, { useState, useCallback } from "react";
import { 
  View, Text, Pressable, ActivityIndicator, 
  ScrollView, Alert 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { db } from "../firebase/firebaseConfig";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

// InfoRow (User ki details dikhane ke liye)
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

// InfoRowButton (Clickable button "My Match Schedule" ke liye)
const InfoRowButton = ({ icon, label, onPress }) => (
  <Pressable
    onPress={onPress}
    style={tw`bg-white p-4 rounded-lg shadow-sm w-full flex-row items-center mb-4 border border-blue-200`}
  >
    <Ionicons name={icon} size={24} color={tw.color("blue-600")} />
    <View style={tw`ml-4 flex-1 flex-row justify-between items-center`}>
      <Text style={tw`text-lg font-semibold text-blue-700`}>{label}</Text>
      <Ionicons name="chevron-forward-outline" size={24} color={tw.color("blue-600")} />
    </View>
  </Pressable>
);

export default function UserProfile({ title, userData, logout, adminRevenue }) {
  const { user } = useAuth();
  const router = useRouter(); // Navigate karne ke liye
  
  // State (Button dikhane ke liye)
  const [hasRegistrations, setHasRegistrations] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(true);

  // Hook (Check karne ke liye player registered hai ya nahi)
  useFocusEffect(
    useCallback(() => {
      if (userData?.role === 'player' && user) {
        setLoadingCheck(true);
        const checkRegistrations = async () => {
          const q = query(
            collection(db, 'tournamentRegistrations'), 
            where('playerId', '==', user.uid),
            limit(1) 
          );
          const snapshot = await getDocs(q);
          setHasRegistrations(!snapshot.empty); 
          setLoadingCheck(false);
        };
        checkRegistrations();
      } else {
        setLoadingCheck(false);
      }
    }, [user, userData])
  );
  
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      {/* --- Logout Button --- */}
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

      <ScrollView contentContainerStyle={tw`p-5 pt-16`}>
        <Text style={tw`text-3xl font-bold text-gray-800 mb-4 text-center`}>
          {title}
        </Text>

        {!userData ? (
          <ActivityIndicator size="large" color={tw.color("blue-500")} />
        ) : (
          <View style={tw`w-full items-center`}>
            
            {/* === "MY WALLET CREDIT" BOX YAHAN SE HATA DIYA GAYA HAI === */}

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
                value={`Rs. ${adminRevenue || 0}`}
                color="font-bold text-purple-700"
              />
            )}
            
            {/* Baaqi details waisi hi */}
            <InfoRow icon="person-circle-outline" label="Full Name" value={userData.name} />
            <InfoRow icon="mail-outline" label="Email Address" value={userData.email} />
            <InfoRow icon="shield-checkmark-outline" label="Role" value={userData.role.charAt(0).toUpperCase() + userData.role.slice(1)} />

            {/* Conditional "My Match Schedule" Button (Yeh abhi bhi maujood hai) */}
            {userData.role === 'player' && !loadingCheck && hasRegistrations && (
              <InfoRowButton
                icon="shield-half-outline"
                label="My Match Schedule"
                onPress={() => router.push('/(player)/schedule/matchschedule')}
              />
            )}
            
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}