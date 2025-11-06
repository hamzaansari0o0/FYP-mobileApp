import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../firebase/firebaseConfig';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useRouter, useFocusEffect } from 'expo-router';
import CourtRegistrationForm from '../../../components/specific/CourtRegistrationForm';
import { Ionicons } from '@expo/vector-icons';

export default function MyCourtScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userCourt, setUserCourt] = useState(null);
  const [courtDocId, setCourtDocId] = useState(null);

  // Re-check court data whenever screen gains focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        checkExistingCourt();
      }
    }, [user])
  );

  const checkExistingCourt = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'courts'),
        where('ownerId', '==', user.uid),
        limit(1)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        setUserCourt(doc.data());
        setCourtDocId(doc.id);
      } else {
        setUserCourt(null);
        setCourtDocId(null);
      }
    } catch (error) {
      console.error('Error checking court: ', error);
      Alert.alert('Error', 'Could not fetch your court details.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCourt = () => {
    if (courtDocId) {
      router.push({
        pathname: '/myCourt/edit',
        params: { courtId: courtDocId },
      });
    } else {
      Alert.alert('Error', 'Court ID not found.');
    }
  };

  // Navigate to Manage Slots (new feature)
  const handleManageSlots = () => {
    if (courtDocId) {
      router.push({
        pathname: '/myCourt/maintenance',
        params: { courtId: courtDocId },
      });
    } else {
      Alert.alert('Error', 'Court ID not found.');
    }
  };

  const handleRegistrationSuccess = (newId, newData) => {
    setCourtDocId(newId);
    setUserCourt(newData);
  };

  // --- UI 1: Loading ---
  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 items-center justify-center bg-gray-100`}>
        <ActivityIndicator size="large" color={tw.color('green-600')} />
      </SafeAreaView>
    );
  }

  // --- UI 2: Court exists (show details) ---
  if (userCourt) {
    const statusColor =
      userCourt.status === 'approved'
        ? 'bg-green-100 border-green-500'
        : userCourt.status === 'pending'
        ? 'bg-yellow-100 border-yellow-500'
        : 'bg-red-100 border-red-500';

    const statusText =
      userCourt.status.charAt(0).toUpperCase() + userCourt.status.slice(1);

    return (
      <SafeAreaView style={tw`flex-1 bg-gray-100 p-5`}>
        <ScrollView>
          <Text style={tw`text-3xl font-bold text-gray-800 mb-6`}>
            My Court Details
          </Text>

          <View style={tw`p-4 border-l-4 rounded-md ${statusColor} mb-6`}>
            <Text style={tw`text-lg font-semibold text-gray-700`}>
              Status: {statusText}
            </Text>
          </View>

          <Text style={tw`text-2xl font-semibold text-gray-700`}>
            {userCourt.courtName}
          </Text>
          <Text style={tw`text-lg text-gray-600 mt-2`}>
            {userCourt.address}
          </Text>

          <Text
            style={tw`text-lg font-semibold text-gray-600 mt-2 p-2 bg-gray-200 rounded-lg`}
          >
            Operating Hours: 24/7 (All Slots)
          </Text>

          <Text style={tw`text-xl font-bold text-green-700 mt-4`}>
            Rs. {userCourt.pricePerHour}
            <Text style={tw`text-base font-normal text-gray-500`}>
              {' '}
              / hour
            </Text>
          </Text>

          <Pressable
            style={tw`bg-blue-600 py-3 rounded-lg shadow-md mt-6`}
            onPress={handleEditCourt}
          >
            <Text style={tw`text-white text-center text-lg font-bold`}>
              Edit Court Details
            </Text>
          </Pressable>

          {/* --- NEW BUTTON: Manage Slots --- */}
          <Pressable
            style={tw`bg-gray-700 py-3 rounded-lg shadow-md mt-4 flex-row items-center justify-center`}
            onPress={handleManageSlots}
          >
            <Ionicons
              name="cog-outline"
              size={18}
              color="white"
              style={tw`mr-2`}
            />
            <Text style={tw`text-white text-center text-lg font-bold`}>
              Manage Slot Availability
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- UI 3: No court registered (show form) ---
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <CourtRegistrationForm
        user={user}
        onRegistrationSuccess={handleRegistrationSuccess}
      />
    </SafeAreaView>
  );
}
