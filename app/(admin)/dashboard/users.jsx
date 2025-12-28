import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { db } from '../../../firebase/firebaseConfig';
import { notifyUser } from '../../../utils/notifications';

// --- Header Component ---
const AdminHeader = ({ title, onBack }) => (
  <View style={tw`flex-row items-center mb-6 pt-2`}>
    <Pressable onPress={onBack} style={tw`bg-gray-50 p-2 rounded-xl mr-3 border border-gray-200`}>
      <Ionicons name="arrow-back" size={20} color="#374151" />
    </Pressable>
    <View style={tw`flex-1 flex-row items-center`}>
        <View style={tw`bg-purple-600 p-2 rounded-lg mr-2`}>
            <Ionicons name="people" size={18} color="white" />
        </View>
        <Text style={tw`text-xl font-bold text-gray-900`}>{title}</Text>
    </View>
  </View>
);

// --- User Card ---
const UserCard = ({ user, onDisable, onEnable }) => {
  const isEnabled = user.status !== 'disabled';
  return (
    <View style={tw`bg-white p-4 rounded-2xl shadow-sm border border-purple-50 mb-3`}>
      <View style={tw`flex-row justify-between items-start`}>
        <View style={tw`flex-1`}>
            <View style={tw`flex-row items-center mb-1`}>
                <Text style={tw`text-base font-bold text-gray-900 mr-2`}>{user.name}</Text>
                <View style={tw`bg-purple-100 px-2 py-0.5 rounded`}>
                    <Text style={tw`text-[10px] font-bold text-purple-700 uppercase`}>{user.role}</Text>
                </View>
            </View>
            <Text style={tw`text-xs text-gray-500`}>{user.email}</Text>
        </View>

        {/* Status Pill */}
        <View style={tw`px-2 py-1 rounded-md ${isEnabled ? 'bg-green-50' : 'bg-red-50'}`}>
             <Text style={tw`text-[10px] font-bold ${isEnabled ? 'text-green-700' : 'text-red-700'}`}>
                {isEnabled ? 'ACTIVE' : 'DISABLED'}
             </Text>
        </View>
      </View>
      
      {/* Action Button */}
      <View style={tw`mt-4 pt-3 border-t border-gray-100 flex-row justify-end`}>
        <Pressable
          style={({ pressed }) => tw.style(
            `px-4 py-2 rounded-lg border flex-row items-center`,
            isEnabled ? `bg-red-50 border-red-100` : `bg-green-50 border-green-100`,
            pressed && `opacity-70`
          )}
          onPress={() => isEnabled ? onDisable(user) : onEnable(user)}
        >
          <Ionicons name={isEnabled ? "ban-outline" : "checkmark-circle-outline"} size={14} color={isEnabled ? "#b91c1c" : "#15803d"} style={tw`mr-1.5`} />
          <Text style={tw`text-xs font-bold ${isEnabled ? 'text-red-700' : 'text-green-700'}`}>
            {isEnabled ? 'Disable Access' : 'Enable Access'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default function ManageUsersScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [])
  );

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersList = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      setUsers(usersList);
    } catch (error) {
      Alert.alert('Error', 'Could not fetch users.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (user) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { status: 'disabled' });
      await notifyUser(user.uid, "Account Suspended 🛡️", "Your account has been disabled. Contact support.", "alert");
      Alert.alert('Success', 'User disabled & notified.');
      setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, status: 'disabled' } : u));
    } catch (error) {
      Alert.alert('Error', 'Failed to disable user.');
    }
  };

  const handleEnable = async (user) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { status: 'active' });
      await notifyUser(user.uid, "Account Activated ✅", "Welcome back! Your account is active.", "alert");
      Alert.alert('Success', 'User enabled & notified.');
      setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, status: 'active' } : u));
    } catch (error) {
      Alert.alert('Error', 'Failed to enable user.');
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="dark-content" />
      <View style={tw`flex-1 px-5`}>
        <AdminHeader title="Manage Users" onBack={() => router.back()} />
        {loading ? (
          <ActivityIndicator size="small" color="#9333ea" style={tw`mt-10`} />
        ) : (
          <FlatList
            data={users}
            keyExtractor={item => item.uid}
            renderItem={({ item }) => (
              <UserCard user={item} onDisable={handleDisable} onEnable={handleEnable} />
            )}
            contentContainerStyle={tw`pb-10`}
            ListEmptyComponent={<Text style={tw`text-center text-gray-400 mt-10 text-sm`}>No users found.</Text>}
          />
        )}
      </View>
    </SafeAreaView>
  );
}