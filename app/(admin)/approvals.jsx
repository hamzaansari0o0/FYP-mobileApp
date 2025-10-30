import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { db } from '../../firebase/firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { useFocusEffect } from 'expo-router';

// Ek chota component pending court card ke liye
const CourtCard = ({ court, onApprove, onReject }) => (
  <View style={tw`bg-white p-4 rounded-lg shadow-md mb-4`}>
    <Text style={tw`text-xl font-bold text-gray-800`}>{court.courtName}</Text>
    <Text style={tw`text-base text-gray-600 mt-1`}>{court.address}</Text>
    <Text style={tw`text-lg font-semibold text-green-700 mt-2`}>
      Rs. {court.pricePerHour} / hour
    </Text>
    
    <View style={tw`mt-2`}>
      <Text style={tw`text-sm font-bold text-gray-500`}>Bank: {court.ownerBankDetails.bankName}</Text>
      <Text style={tw`text-sm text-gray-500`}>Account: {court.ownerBankDetails.accountNumber}</Text>
    </View>

    {/* Approve / Reject Buttons */}
    <View style={tw`flex-row justify-around mt-4 pt-3 border-t border-gray-200`}>
      <Pressable
        style={tw`bg-red-500 py-2 px-6 rounded-lg`}
        onPress={() => onReject(court.id)}
      >
        <Text style={tw`text-white font-bold`}>Reject</Text>
      </Pressable>
      <Pressable
        style={tw`bg-green-500 py-2 px-6 rounded-lg`}
        onPress={() => onApprove(court.id)}
      >
        <Text style={tw`text-white font-bold`}>Approve</Text>
      </Pressable>
    </View>
  </View>
);

export default function ApprovalsScreen() {
  const [pendingCourts, setPendingCourts] = useState([]);
  const [loading, setLoading] = useState(true);

  // useFocusEffect tab chalta hai jab bhi user is tab par ata hai
  useFocusEffect(
    React.useCallback(() => {
      fetchPendingCourts();
    }, [])
  );

  // Function to fetch courts
  const fetchPendingCourts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'courts'), where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      const courtsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPendingCourts(courtsList);
    } catch (error) {
      console.error("Error fetching pending courts: ", error);
      Alert.alert('Error', 'Could not fetch courts.');
    } finally {
      setLoading(false);
    }
  };

  // --- Action Functions ---

  const handleApprove = async (courtId) => {
    try {
      const courtRef = doc(db, 'courts', courtId);
      await updateDoc(courtRef, {
        status: 'approved'
      });
      Alert.alert('Success', 'Court has been approved.');
      // List se remove karein (ta ke UI foran update ho)
      setPendingCourts(prev => prev.filter(court => court.id !== courtId));
    } catch (error) {
      console.error('Error approving court: ', error);
      Alert.alert('Error', 'Failed to approve court.');
    }
  };

  const handleReject = async (courtId) => {
    try {
      const courtRef = doc(db, 'courts', courtId);
      await updateDoc(courtRef, {
        status: 'rejected'
      });
      Alert.alert('Success', 'Court has been rejected.');
      // List se remove karein
      setPendingCourts(prev => prev.filter(court => court.id !== courtId));
    } catch (error) {
      console.error('Error rejecting court: ', error);
      Alert.alert('Error', 'Failed to reject court.');
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <View style={tw`p-5`}>
        <Text style={tw`text-3xl font-bold text-purple-800 mb-5`}>Court Approvals</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color={tw.color('purple-600')} />
        ) : (
          <FlatList
            data={pendingCourts}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <CourtCard
                court={item}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            )}
            ListEmptyComponent={
              <View style={tw`flex-1 items-center justify-center mt-20`}>
                <Text style={tw`text-lg text-gray-500`}>No pending approvals found.</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}