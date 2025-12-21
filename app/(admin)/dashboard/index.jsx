import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useAuth } from '../../../context/AuthContext'; // Logout ke liye

// Reusable Button Component (Aapka wala hi style)
const AdminMenuButton = ({ title, icon, subtitle, onPress }) => (
  <Pressable
    style={tw`bg-white p-5 rounded-xl shadow-sm flex-row items-center justify-between mb-4 border border-gray-100`}
    onPress={onPress}
  >
    <View style={tw`flex-row items-center flex-1`}>
      <View style={tw`p-3 bg-purple-50 rounded-full mr-4`}>
        <Ionicons name={icon} size={24} color={tw.color('purple-700')} />
      </View>
      <View style={tw`flex-1`}>
        <Text style={tw`text-lg font-bold text-gray-800`}>{title}</Text>
        {subtitle && <Text style={tw`text-gray-400 text-xs`}>{subtitle}</Text>}
      </View>
    </View>
    <Ionicons name="chevron-forward" size={20} color={tw.color('gray-400')} />
  </Pressable>
);

export default function AdminDashboard() {
  const router = useRouter();
  const { logout } = useAuth(); // Auth context se logout function

  // Logout Function with Confirmation
  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Logout", 
        style: "destructive", 
        onPress: async () => {
          await logout();
          // Login screen par wapas bhejne ke liye (AuthContext usually handle karta hai, but safety ke liye)
          router.replace("/(auth)/login");
        } 
      },
    ]);
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <ScrollView contentContainerStyle={tw`p-6`}>
        
        {/* Header Section */}
        <View style={tw`flex-row justify-between items-center mb-8 mt-2`}>
          <View>
            <Text style={tw`text-gray-500 text-xs uppercase font-bold tracking-widest mb-1`}>Admin Panel</Text>
            <Text style={tw`text-3xl font-black text-purple-900`}>Dashboard</Text>
          </View>
          {/* Logout Button */}
          <Pressable 
            onPress={handleLogout}
            style={tw`bg-white p-2 rounded-full shadow-sm border border-gray-100`}
          >
            <Ionicons name="log-out-outline" size={24} color={tw.color('red-500')} />
          </Pressable>
        </View>
        
        {/* Menu Grid */}
        <View>
          <Text style={tw`text-gray-500 font-bold mb-4 uppercase text-xs ml-1`}>Management</Text>
          
          {/* 1. Manage Users */}
          <AdminMenuButton
            title="Manage Users"
            subtitle="Approve owners & view users"
            icon="people"
            onPress={() => router.push('/(admin)/dashboard/users')} 
          />
          
          {/* 2. Manage Arenas */}
          <AdminMenuButton
            title="Manage Arenas"
            subtitle="Verify & update arenas"
            icon="business"
            onPress={() => router.push('/(admin)/dashboard/arenas')} 
          />

           <Text style={tw`text-gray-500 font-bold mb-4 mt-2 uppercase text-xs ml-1`}>Support</Text>

          {/* 3. Support Tickets (NEW) */}
          <AdminMenuButton
            title="Support Tickets"
            subtitle="View player issues & queries"
            icon="headset" // Perfect icon for support
            onPress={() => router.push('/(admin)/dashboard/AdminSupportScreen')} 
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}