import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { db } from '../../../firebase/firebaseConfig';
// 🔥 Notification helper import kiya
import { notifyUser } from '../../../utils/notifications';

const AdminHeader = ({ title, onBack }) => (
  <View style={tw`flex-row items-center mb-5`}>
    <Pressable onPress={onBack} style={tw`p-2`}>
      <Ionicons name="arrow-back-outline" size={28} color={tw.color('purple-800')} />
    </Pressable>
    <Text style={tw`text-3xl font-bold text-purple-800 ml-3`}>{title}</Text>
  </View>
);

const UserCard = ({ user, onDisable, onEnable }) => {
  const isEnabled = user.status !== 'disabled';
  return (
    <View style={tw`bg-white p-4 rounded-lg shadow-md mb-4`}>
      <View style={tw`flex-row justify-between items-start`}>
        <View>
          <Text style={tw`text-xl font-bold text-gray-800`}>{user.name}</Text>
          <Text style={tw`text-base text-gray-600 mt-1`}>{user.email}</Text>
          <Text style={tw`text-sm font-semibold text-purple-600 mt-1`}>
            Role: {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
          </Text>
        </View>
        <Text style={tw.style(
          `text-xs font-bold px-2 py-1 rounded-full`,
          isEnabled ? `bg-green-100 text-green-800` : `bg-red-100 text-red-800`
        )}>
          {isEnabled ? 'Active' : 'Disabled'}
        </Text>
      </View>
      
      <View style={tw`flex-row justify-end mt-4 pt-3 border-t border-gray-200`}>
        <Pressable
          style={tw`py-2 px-5 rounded-lg ${isEnabled ? 'bg-yellow-500' : 'bg-green-500'}`}
          onPress={() => isEnabled ? onDisable(user) : onEnable(user)}
        >
          <Text style={tw`text-white font-bold`}>
            {isEnabled ? 'Disable User' : 'Enable User'}
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

  // --- 🛡️ Disable User Action ---
  const handleDisable = async (user) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { status: 'disabled' });
      
      // 🔥 Send Push & History Notification
      await notifyUser(
        user.uid, 
        "Account Suspended 🛡️", 
        "Hi " + user.name + ", your account has been disabled by the admin. Please contact support.",
        "alert"
      );

      Alert.alert('Success', 'User disabled & notified.');
      setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, status: 'disabled' } : u));
    } catch (error) {
      Alert.alert('Error', 'Failed to disable user.');
    }
  };

  // --- ✅ Enable User Action ---
  const handleEnable = async (user) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { status: 'active' });

      // 🔥 Send Push & History Notification
      await notifyUser(
        user.uid, 
        "Account Activated ✅", 
        "Welcome back! Your account has been re-enabled. You can now use the app.",
        "alert"
      );

      Alert.alert('Success', 'User enabled & notified.');
      setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, status: 'active' } : u));
    } catch (error) {
      Alert.alert('Error', 'Failed to enable user.');
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <View style={tw`p-5`}>
        <AdminHeader title="Manage Users" onBack={() => router.back()} />
        {loading ? (
          <ActivityIndicator size="large" color={tw.color('purple-600')} />
        ) : (
          <FlatList
            data={users}
            keyExtractor={item => item.uid}
            renderItem={({ item }) => (
              <UserCard user={item} onDisable={handleDisable} onEnable={handleEnable} />
            )}
            ListEmptyComponent={<Text>No users found.</Text>}
          />
        )}
      </View>
    </SafeAreaView>
  );
}