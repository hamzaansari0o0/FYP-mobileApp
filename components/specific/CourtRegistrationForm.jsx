import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import tw from 'twrnc';
import { db } from '../../firebase/firebaseConfig'; // Path theek karein
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

// Helper function: Date object se "HH:mm" string banata hai
const formatTime = (date) => {
  if (!date) return '00:00';
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

// Ye component props mein 'user' object aur ek 'onSuccess' function lega
export default function CourtRegistrationForm({ user, onRegistrationSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form ki tamam state ab is component ke andar hai
  const [formData, setFormData] = useState({
    courtName: '',
    address: '',
    pricePerHour: '',
    bankName: '',
    accountNumber: '',
    jazzCash: '',
  });

  // Time state bhi isi component ke andar hai
  const [openTime, setOpenTime] = useState(new Date(0, 0, 0, 17, 0)); // Default 5 PM (ab 24/7 hai)
  const [closeTime, setCloseTime] = useState(new Date(0, 0, 0, 4, 0)); // Default 4 AM (ab 24/7 hai)
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState('open');

  // Time Picker Handlers
  const handleConfirmTime = (date) => {
    const cleanDate = new Date(date);
    cleanDate.setMinutes(0);
    cleanDate.setSeconds(0);
    if (pickerType === 'open') setOpenTime(cleanDate);
    else setCloseTime(cleanDate);
    setTimePickerVisible(false);
  };
  
  const handleShowPicker = (type) => {
    setPickerType(type);
    setTimePickerVisible(true);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Register logic bhi isi component mein move ho gaya
  const handleRegisterCourt = async () => {
    if (!formData.courtName || !formData.address || !formData.pricePerHour || !formData.bankName || !formData.accountNumber) {
      Alert.alert('Missing Fields', 'Please fill all required fields.');
      return;
    }
    
    const price = parseFloat(formData.pricePerHour);
    if (isNaN(price) || price <= 0) {
        Alert.alert("Invalid Price", "Price must be a valid number.");
        return;
    }

    setIsSubmitting(true);
    try {
      const newCourtData = {
        ownerId: user.uid,
        courtName: formData.courtName.trim(),
        address: formData.address.trim(),
        pricePerHour: price,
        
        // 24/7 Booking ke liye hardcoded values
        openTime: "00:00",
        closeTime: "23:00", // 11 PM slot (23:00 - 23:59)
        
        status: 'pending', 
        ownerBankDetails: {
          bankName: formData.bankName.trim(),
          accountNumber: formData.accountNumber.trim(),
          jazzCash: formData.jazzCash.trim() || '',
        },
        documentImages: [],
        location: null,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'courts'), newCourtData);
      
      Alert.alert('Success!', 'Your court has been submitted for approval.');
      
      // Parent component (MyCourtScreen) ko batayein ke registration ho gayi hai
      if (onRegistrationSuccess) {
        onRegistrationSuccess(docRef.id, newCourtData);
      }

    } catch (error) {
      console.error('Error registering court: ', error);
      Alert.alert('Error', 'Court registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Return mein sirf Form ka UI hai
  return (
    <ScrollView contentContainerStyle={tw`p-6`}>
      <Text style={tw`text-3xl font-bold text-gray-800 mb-6`}>Register Your Court</Text>
      
      {/* Court Details */}
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

      {/* Operating Hours Section (Removed) */}
      <View style={tw`bg-blue-100 p-3 rounded-lg my-4`}>
         <Text style={tw`text-sm font-semibold text-blue-700 text-center`}>
            Note: Your court will be available for 24/7 booking (12:00 AM - 11:00 PM).
         </Text>
      </View>
      
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
      
      {/* Time Picker Modal ki zaroorat nahi, kyunke hum ne time fields remove kar diye hain */}
      {/* Lekin agar aap ne rakhe hain, to unhein bhi yahan move karein */}
      
    </ScrollView>
  );
}