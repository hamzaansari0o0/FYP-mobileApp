import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { db } from '../../../firebase/firebaseConfig';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'; // deleteDoc hata diya
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// --- Reusable Admin Header (ye waisa hi hai) ---
const AdminHeader = ({ title, onBack }) => (
  <View style={tw`flex-row items-center mb-5`}>
    <Pressable onPress={onBack} style={tw`p-2`}>
      <Ionicons name="arrow-back-outline" size={28} color={tw.color('purple-800')} />
    </Pressable>
    <Text style={tw`text-3xl font-bold text-purple-800 ml-3`}>{title}</Text>
  </View>
);

// --- User Card Component (UPDATE HUA HAI) ---
const UserCard = ({ user, onDisable, onEnable }) => { // 'onDelete' prop hata diya
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
        {/* --- DELETE BUTTON YAHAN SE HATA DIYA GAYA HAI --- */}
        
        {/* --- Disable/Enable Button --- */}
        <Pressable
          // Button ko thora bara kar diya
          style={tw`py-2 px-5 rounded-lg ${isEnabled ? 'bg-yellow-500' : 'bg-green-500'}`}
          onPress={() => isEnabled ? onDisable(user.uid) : onEnable(user.uid)}
        >
          <Text style={tw`text-white font-bold`}>
            {isEnabled ? 'Disable' : 'Enable'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default function ManageUsersScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter(); // Router ko initialize karein

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [])
  );

  const fetchUsers = async () => { /* ... (ye function waisa hi rahega) ... */ 
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersList = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users: ", error);
      Alert.alert('Error', 'Could not fetch users.');
    } finally {
      setLoading(false);
    }
  };
  const handleDisable = async (userId) => { /* ... (waisa hi) ... */ 
    try {
      await updateDoc(doc(db, 'users', userId), { status: 'disabled' });
      Alert.alert('Success', 'User has been disabled.');
      setUsers(prev => prev.map(u => u.uid === userId ? { ...u, status: 'disabled' } : u));
    } catch (error) {
      Alert.alert('Error', 'Failed to disable user.');
    }
  };
  const handleEnable = async (userId) => { /* ... (waisa hi) ... */ 
    try {
      await updateDoc(doc(db, 'users', userId), { status: 'active' });
      Alert.alert('Success', 'User has been re-enabled.');
      setUsers(prev => prev.map(u => u.uid === userId ? { ...u, status: 'active' } : u));
    } catch (error) {
      Alert.alert('Error', 'Failed to enable user.');
    }
  };
  
  // --- "handleDelete" FUNCTION YAHAN SE MUKAMMAL HATA DIYA GAYA HAI ---

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
              <UserCard 
                user={item} 
                onDisable={handleDisable} 
                onEnable={handleEnable} 
                // 'onDelete' prop yahan se hata diya
              />
            )}
            ListEmptyComponent={<Text>No users found.</Text>}
          />
        )}
      </View>
    </SafeAreaView>
  );
}