import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

// --- Reusable Menu Button Component (Smaller Icons) ---
const AdminMenuButton = ({ title, icon, subtitle, onPress }) => (
  <Pressable
    style={({ pressed }) => tw.style(
      `bg-white p-4 rounded-3xl shadow-sm border border-purple-50 mb-4 flex-row items-center justify-between`,
      pressed && `bg-gray-50 transform scale-[0.98]`
    )}
    onPress={onPress}
  >
    <View style={tw`flex-row items-center flex-1`}>
      {/* Updated: Smaller Box (w-11 h-11) and Smaller Icon (size={20}) */}
      <View style={tw`w-11 h-11 bg-purple-600 rounded-xl items-center justify-center mr-4 shadow-sm shadow-purple-200`}>
        <Ionicons name={icon} size={20} color="white" />
      </View>
      
      <View style={tw`flex-1`}>
        <Text style={tw`text-base font-bold text-gray-900`}>{title}</Text>
        {subtitle && <Text style={tw`text-purple-400 text-[11px] font-medium mt-0.5`}>{subtitle}</Text>}
      </View>
    </View>
    
    <View style={tw`bg-gray-50 p-1.5 rounded-full`}>
        <Ionicons name="chevron-forward" size={16} color="#9333ea" />
    </View>
  </Pressable>
);

export default function AdminDashboard() {
  const router = useRouter();

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <ScrollView contentContainerStyle={tw`pb-10`}>
        
        {/* --- Header Section (No Logout) --- */}
        <View style={tw`px-6 pt-6 pb-6 border-b border-gray-100 flex-row items-center bg-white`}>
           {/* Header Icon size remains same as per request */}
           <View style={tw`bg-purple-600 p-3 rounded-2xl mr-4 shadow-md shadow-purple-300`}>
              <MaterialIcons name="admin-panel-settings" size={28} color="white" />
           </View>
           <View>
              <Text style={tw`text-3xl font-extrabold text-purple-900`}>Dashboard</Text>
              <Text style={tw`text-gray-500 text-xs font-bold tracking-widest uppercase`}>Admin Control Panel</Text>
           </View>
        </View>
        
        {/* --- Menu Grid --- */}
        <View style={tw`px-6 pt-8`}>
          
          {/* Section: Management */}
          <Text style={tw`text-gray-400 font-bold mb-3 uppercase text-[10px] tracking-wider ml-2`}>
            Core Management
          </Text>
          
          <AdminMenuButton
            title="Manage Users"
            subtitle="View owners & verify identities"
            icon="people"
            onPress={() => router.push('/(admin)/dashboard/users')} 
          />
          
          <AdminMenuButton
            title="Manage Arenas"
            subtitle="Update arena details & status"
            icon="business"
            onPress={() => router.push('/(admin)/dashboard/arenas')} 
          />

          {/* Section: Support */}
          <View style={tw`mt-4`}>
              <Text style={tw`text-gray-400 font-bold mb-3 uppercase text-[10px] tracking-wider ml-2`}>
                Customer Service
              </Text>

              <AdminMenuButton
                title="Support Tickets"
                subtitle="Resolve player complaints & queries"
                icon="headset"
                onPress={() => router.push('/(admin)/dashboard/AdminSupportScreen')} 
              />
          </View>

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}