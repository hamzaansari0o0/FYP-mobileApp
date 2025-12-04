import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, Alert,
  ActivityIndicator, ScrollView, Image
} from 'react-native';
import tw from 'twrnc';
import { db, storage } from '../../firebase/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import * as ImagePicker from 'expo-image-picker';

export default function CourtRegistrationForm({ user, onRegistrationSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    courtName: '',
    address: '', // Default: Arena Address (Agar same hai)
    pricePerHour: '',
    bankName: '',
    accountNumber: '',
    jazzCash: '',
  });
  
  const [image, setImage] = useState(null);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // --- Image Picker ---
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Need camera roll permissions.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // Updated
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert('Image Too Large', 'Please select an image smaller than 5MB.');
        return;
      }
      setImage(asset.uri);
    }
  };
  
  // --- Upload Logic (Reliable XHR) ---
  const uploadImageAsync = async (uri) => {
    const blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () { resolve(xhr.response); };
      xhr.onerror = function () { reject(new TypeError("Network request failed")); };
      xhr.responseType = "blob";
      xhr.open("GET", uri, true);
      xhr.send(null);
    });
    
    // courts/USER_ID/court_TIMESTAMP
    const fileRef = ref(storage, `courts/${user.uid}/court_${Date.now()}`);
    
    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(fileRef, blob);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        }, 
        (error) => {
          blob.close();
          reject(error);
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          blob.close();
          resolve(downloadURL);
        }
      );
    });
  };

  const handleRegisterCourt = async () => {
    // 1. Validation
    if (!formData.courtName || !formData.pricePerHour || !formData.bankName || !formData.accountNumber) {
      Alert.alert('Missing Fields', 'Please fill all required fields.');
      return;
    }
    
    if (!image) {
      Alert.alert('Missing Image', 'Please upload a court picture.');
      return;
    }
    
    const price = parseFloat(formData.pricePerHour);
    if (isNaN(price) || price <= 0) {
        Alert.alert("Invalid Price", "Price must be a valid number.");
        return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // Step 1: Upload Image
      const courtImageURL = await uploadImageAsync(image);

      setUploadProgress(100); 
      
      // Step 2: Save to Firestore
      const newCourtData = {
        ownerId: user.uid,
        courtName: formData.courtName.trim(),
        address: formData.address.trim() || "Same as Arena", // Optional if inside arena
        pricePerHour: price,
        
        // Defaults (Baad mein update ho sakte hain)
        openTime: "00:00",
        closeTime: "23:00",
        
        courtImageURL: courtImageURL,
        status: 'pending', // IMPORTANT: Pending for Approval
        
        ownerBankDetails: {
          bankName: formData.bankName.trim(),
          accountNumber: formData.accountNumber.trim(),
          jazzCash: formData.jazzCash.trim() || '',
        },
        documentImages: [], // Abhi court ke liye alag docs nahi maang rahe
        location: null,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'courts'), newCourtData);
      
      Alert.alert('Success!', 'Court submitted for Admin Approval.');
      
      if (onRegistrationSuccess) {
        onRegistrationSuccess(docRef.id, newCourtData);
      }

    } catch (error) {
      console.error('Error registering court: ', error);
      Alert.alert('Error', 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };
  
  const getButtonText = () => {
    if (isSubmitting) {
      if (uploadProgress > 0 && uploadProgress < 100) {
        return `Uploading... ${uploadProgress}%`;
      }
      return 'Submitting...';
    }
    return 'Submit Court for Approval';
  };

  return (
    <ScrollView contentContainerStyle={tw`p-6 pb-20`}>
      <Text style={tw`text-3xl font-bold text-gray-800 mb-2`}>Add New Court</Text>
      <Text style={tw`text-sm text-gray-500 mb-6`}>
        Add details for a specific court (e.g. "Futsal Court 1"). This will need admin approval.
      </Text>
      
      {/* Court Name */}
      <Text style={tw`text-lg font-semibold mb-2 text-gray-700`}>Court Name</Text>
      <TextInput
        style={tw`border border-gray-300 p-4 rounded-lg mb-4 text-base bg-white`}
        placeholder="e.g., Futsal Ground A"
        value={formData.courtName}
        onChangeText={(val) => handleInputChange('courtName', val)}
      />
      
      {/* Address (Optional if same as Arena) */}
      <Text style={tw`text-lg font-semibold mb-2 text-gray-700`}>Address (Optional)</Text>
      <TextInput
        style={tw`border border-gray-300 p-4 rounded-lg mb-4 text-base bg-white`}
        placeholder="Leave empty if same as Arena"
        value={formData.address}
        onChangeText={(val) => handleInputChange('address', val)}
      />
      
      {/* Price */}
      <Text style={tw`text-lg font-semibold mb-2 text-gray-700`}>Price (per hour)</Text>
      <TextInput
        style={tw`border border-gray-300 p-4 rounded-lg mb-4 text-base bg-white`}
        placeholder="e.g., 2000"
        value={formData.pricePerHour}
        onChangeText={(val) => handleInputChange('pricePerHour', val)}
        keyboardType="numeric"
      />

      {/* Image Picker */}
      <Text style={tw`text-lg font-semibold mb-2 text-gray-700`}>Court Picture</Text>
      {image ? (
        <View style={tw`mb-4`}>
          <Image source={{ uri: image }} style={tw`w-full h-48 rounded-lg mb-2`} resizeMode="cover" />
          <Pressable onPress={pickImage}>
            <Text style={tw`text-blue-600 text-center font-bold`}>Change Image</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={tw`border-2 border-dashed border-gray-300 bg-gray-50 p-6 rounded-lg mb-6 items-center`}
          onPress={pickImage}
          disabled={isSubmitting}
        >
          <Text style={tw`text-gray-500 font-semibold`}>+ Upload Court Photo</Text>
        </Pressable>
      )}

      {/* Bank Details Header */}
      <View style={tw`bg-blue-50 p-4 rounded-lg mb-4 border border-blue-100`}>
        <Text style={tw`text-lg font-bold text-blue-800 mb-2`}>Bank Details for Payouts</Text>
        <Text style={tw`text-xs text-blue-600`}>
           This account will receive payments for bookings of this court.
        </Text>
      </View>
      
      <Text style={tw`text-lg font-semibold mb-2 text-gray-700`}>Bank Name</Text>
      <TextInput
        style={tw`border border-gray-300 p-4 rounded-lg mb-4 text-base bg-white`}
        placeholder="e.g., Meezan Bank"
        value={formData.bankName}
        onChangeText={(val) => handleInputChange('bankName', val)}
      />
      
      <Text style={tw`text-lg font-semibold mb-2 text-gray-700`}>Account Number (IBAN)</Text>
      <TextInput
        style={tw`border border-gray-300 p-4 rounded-lg mb-4 text-base bg-white`}
        placeholder="PK..."
        value={formData.accountNumber}
        onChangeText={(val) => handleInputChange('accountNumber', val)}
      />
      
      <Text style={tw`text-lg font-semibold mb-2 text-gray-700`}>JazzCash / EasyPaisa (Optional)</Text>
      <TextInput
        style={tw`border border-gray-300 p-4 rounded-lg mb-8 text-base bg-white`}
        placeholder="0300-1234567"
        value={formData.jazzCash}
        onChangeText={(val) => handleInputChange('jazzCash', val)}
        keyboardType="phone-pad"
      />

      {/* Submit Button */}
      <Pressable
        style={tw.style(
          `bg-green-600 py-4 rounded-lg shadow-md mb-10`,
          isSubmitting && `bg-green-400`
        )}
        onPress={handleRegisterCourt}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color={tw.color('white')} />
        ) : (
          <Text style={tw`text-white text-center text-lg font-bold`}>
            {getButtonText()}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}