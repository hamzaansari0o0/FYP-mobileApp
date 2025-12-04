import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const AdminMenuButton = ({ title, icon, onPress }) => (
  <Pressable
    style={tw`bg-white p-5 rounded-lg shadow-md flex-row items-center justify-between mb-4`}
    onPress={onPress}
  >
    <View style={tw`flex-row items-center`}>
      <Ionicons name={icon} size={28} color={tw.color('purple-600')} />
      <Text style={tw`text-lg font-bold text-gray-800 ml-4`}>{title}</Text>
    </View>
    <Ionicons name="chevron-forward-outline" size={24} color={tw.color('gray-400')} />
  </Pressable>
);

export default function AdminDashboard() {
  const router = useRouter();

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <ScrollView style={tw`p-5`}>
        <Text style={tw`text-3xl font-bold text-purple-800 mb-6`}>
          Dashboard
        </Text>
        
        <View style={tw`mt-6`}>
          {/* Manage Users */}
          <AdminMenuButton
            title="Manage Users"
            icon="people-outline"
            onPress={() => router.push('/(admin)/dashboard/users')} 
          />
          
          {/* Manage Arenas (Hierarchical Flow) */}
          <AdminMenuButton
            title="Manage Arenas"
            icon="business-outline" // Icon change kiya
            onPress={() => router.push('/(admin)/dashboard/arenas')} 
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}