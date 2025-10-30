import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/firebaseConfig';
import { collection, addDoc, query, where, getDocs, limit, serverTimestamp } from 'firebase/firestore';

export default function MyCourt() {
  const { user } = useAuth(); // Logged-in owner ki details
  const [loading, setLoading] = useState(true); // Initial check ke liye loading
  const [isSubmitting, setIsSubmitting] = useState(false); // Form submit ke liye loading
  const [userCourt, setUserCourt] = useState(null); // Owner ka mojooda court store karne ke liye

  // Form state
  const [formData, setFormData] = useState({
    courtName: '',
    address: '',
    pricePerHour: '',
    bankName: '',
    accountNumber: '',
    jazzCash: '', // Optional
  });

  // --- Step 1: Check karein ke court pehle se mojood hai ya nahi ---
  useEffect(() => {
    const checkExistingCourt = async () => {
      if (!user) return; // Agar user abhi load nahi hua

      setLoading(true);
      try {
        const q = query(
          collection(db, 'courts'),
          where('ownerId', '==', user.uid),
          limit(1) // Ek owner ki ek hi court hai (is design ke mutabiq)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // Court pehle se mojood hai
          const courtData = querySnapshot.docs[0].data();
          setUserCourt(courtData);
        } else {
          // Naya owner hai, court nahi hai
          setUserCourt(null);
        }
      } catch (error) {
        console.error('Error checking court: ', error);
        Alert.alert('Error', 'Could not fetch your court details.');
      } finally {
        setLoading(false);
      }
    };

    checkExistingCourt();
  }, [user]); // Ye tab chalega jab user ki details load hongi

  // --- Step 2: Form Submit Logic ---
  const handleRegisterCourt = async () => {
    // Validation
    if (
      !formData.courtName ||
      !formData.address ||
      !formData.pricePerHour ||
      !formData.bankName ||
      !formData.accountNumber
    ) {
      Alert.alert('Missing Fields', 'Please fill all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Database ke liye object tayar karein
      const newCourtData = {
        ownerId: user.uid,
        courtName: formData.courtName,
        address: formData.address,
        pricePerHour: parseFloat(formData.pricePerHour), // String ko number banayein
        status: 'pending', // Hamesha "pending" se shuru hoga
        ownerBankDetails: {
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          jazzCash: formData.jazzCash || '', // Agar khali ho to empty string
        },
        documentImages: [], // Abhi ke liye khali array
        location: null, // Jab Google Maps lagayein ge tab ye update hoga
        createdAt: serverTimestamp(), // Firebase ka server time
      };

      // Data ko 'courts' collection mein save karein
      const docRef = await addDoc(collection(db, 'courts'), newCourtData);
      
      Alert.alert('Success!', 'Your court has been submitted for approval.');
      // Form submit hone ke baad, user ko success dikhayein
      setUserCourt({ ...newCourtData, status: 'pending' }); // UI ko update karein

    } catch (error) {
      console.error('Error registering court: ', error);
      Alert.alert('Error', 'Court registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  
  // --- UI Functions ---

  // UI 1: Jab loading ho rahi ho
  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 items-center justify-center bg-gray-100`}>
        <ActivityIndicator size="large" color={tw.color('green-600')} />
        <Text style={tw`mt-4 text-lg text-gray-600`}>Loading Your Court...</Text>
      </SafeAreaView>
    );
  }

  // UI 2: Jab court pehle se mojood ho
  if (userCourt) {
    // Status ke hisab se rang
    const statusColor = userCourt.status === 'approved' ? 'bg-green-100 border-green-500' :
                        userCourt.status === 'pending' ? 'bg-yellow-100 border-yellow-500' :
                        'bg-red-100 border-red-500';
    const statusText = userCourt.status.charAt(0).toUpperCase() + userCourt.status.slice(1);

    return (
      <SafeAreaView style={tw`flex-1 bg-gray-100 p-5`}>
        <Text style={tw`text-3xl font-bold text-gray-800 mb-6`}>My Court Details</Text>
        
        {/* Status Alert Box */}
        <View style={tw`p-4 border-l-4 rounded-md ${statusColor} mb-6`}>
          <Text style={tw`text-lg font-bold text-gray-700`}>Status: {statusText}</Text>
          {userCourt.status === 'pending' && (
            <Text style={tw`text-base text-gray-600 mt-1`}>
              Your submission is under review. Admin will approve it shortly.
            </Text>
          )}
          {userCourt.status === 'approved' && (
            <Text style={tw`text-base text-gray-600 mt-1`}>
              Your court is live and visible to players!
            </Text>
          )}
        </View>

        <Text style={tw`text-2xl font-semibold text-gray-700`}>{userCourt.courtName}</Text>
        <Text style={tw`text-lg text-gray-600 mt-2`}>{userCourt.address}</Text>
        <Text style={tw`text-xl font-bold text-green-700 mt-4`}>
          Rs. {userCourt.pricePerHour} / hour
        </Text>
        
        {/* Yahan "Edit" button bhi add kar sakte hain */}
      </SafeAreaView>
    );
  }

  // UI 3: Jab court mojood na ho (Register Form)
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      <ScrollView contentContainerStyle={tw`p-6`}>
        <Text style={tw`text-3xl font-bold text-gray-800 mb-6`}>Register Your Court</Text>
        
        <Text style={tw`text-lg font-semibold mb-3 text-gray-700`}>Court Name</Text>
        <TextInput
          style={tw`border border-gray-300 p-4 rounded-lg mb-4 text-base bg-white`}
          placeholder="e.g., Hamza Futsal Arena"
          value={formData.courtName}
          onChangeText={(val) => handleInputChange('courtName', val)}
        />
        
        <Text style={tw`text-lg font-semibold mb-3 text-gray-700`}>Full Address</Text>
        <TextInput
          style={tw`border border-gray-300 p-4 rounded-lg mb-4 text-base bg-white`}
          placeholder="e.g., 123-B, Johar Town, Lahore"
          value={formData.address}
          onChangeText={(val) => handleInputChange('address', val)}
        />
        
        <Text style={tw`text-lg font-semibold mb-3 text-gray-700`}>Price (per hour)</Text>
        <TextInput
          style={tw`border border-gray-300 p-4 rounded-lg mb-4 text-base bg-white`}
          placeholder="e.g., 2000"
          value={formData.pricePerHour}
          onChangeText={(val) => handleInputChange('pricePerHour', val)}
          keyboardType="numeric"
        />
        
        {/* Bank Details */}
        <Text style={tw`text-2xl font-bold text-gray-800 mt-6 mb-4`}>Bank Details</Text>
        
        <Text style={tw`text-lg font-semibold mb-3 text-gray-700`}>Bank Name</Text>
        <TextInput
          style={tw`border border-gray-300 p-4 rounded-lg mb-4 text-base bg-white`}
          placeholder="e.g., Meezan Bank"
          value={formData.bankName}
          onChangeText={(val) => handleInputChange('bankName', val)}
        />
        
        <Text style={tw`text-lg font-semibold mb-3 text-gray-700`}>Account Number (IBAN)</Text>
        <TextInput
          style={tw`border border-gray-300 p-4 rounded-lg mb-4 text-base bg-white`}
          placeholder="PK..."
          value={formData.accountNumber}
          onChangeText={(val) => handleInputChange('accountNumber', val)}
        />
        
        <Text style={tw`text-lg font-semibold mb-3 text-gray-700`}>JazzCash / EasyPaisa (Optional)</Text>
        <TextInput
          style={tw`border border-gray-300 p-4 rounded-lg mb-6 text-base bg-white`}
          placeholder="0300-1234567"
          value={formData.jazzCash}
          onChangeText={(val) => handleInputChange('jazzCash', val)}
          keyboardType="phone-pad"
        />

        {/* Submit Button */}
        <Pressable
          style={tw.style(
            `bg-green-600 py-4 rounded-lg shadow-md`,
            isSubmitting && `bg-green-400`
          )}
          onPress={handleRegisterCourt}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={tw.color('white')} />
          ) : (
            <Text style={tw`text-white text-center text-lg font-bold`}>
              Submit for Approval
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}