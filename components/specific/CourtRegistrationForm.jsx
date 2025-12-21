import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text, TextInput,
  View
} from 'react-native';
import tw from 'twrnc';
import { db, storage } from '../../firebase/firebaseConfig';

export default function CourtRegistrationForm({ user, onRegistrationSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Arena data hold karne ke liye
  const [arenaData, setArenaData] = useState(null);

  const [formData, setFormData] = useState({
    courtName: '',
    pricePerHour: '',
    bankName: '',
    accountNumber: '',
    jazzCash: '',
  });
  
  const [image, setImage] = useState(null);

  // --- 🔥 Fetch Arena Data (Address + Location) on Mount ---
  useEffect(() => {
    const fetchArenaData = async () => {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                setArenaData(userDoc.data());
            }
        } catch (error) {
            console.error("Error fetching arena info:", error);
        }
    };
    fetchArenaData();
  }, [user]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Image Picker
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Need camera roll permissions.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert('Image Too Large', 'Max 5MB allowed.');
        return;
      }
      setImage(asset.uri);
    }
  };
  
  // Upload Logic
  const uploadImageAsync = async (uri) => {
    const blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () { resolve(xhr.response); };
      xhr.onerror = function () { reject(new TypeError("Network request failed")); };
      xhr.responseType = "blob";
      xhr.open("GET", uri, true);
      xhr.send(null);
    });
    
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
    if (!formData.courtName || !formData.pricePerHour || !formData.bankName || !formData.accountNumber) {
      Alert.alert('Missing Fields', 'Please fill all required fields.');
      return;
    }
    
    if (!image) {
      Alert.alert('Missing Image', 'Please upload a court picture.');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const courtImageURL = await uploadImageAsync(image);
      setUploadProgress(100); 
      
      const newCourtData = {
        ownerId: user.uid,
        courtName: formData.courtName.trim(),
        pricePerHour: parseFloat(formData.pricePerHour),
        
        // 🔥 INHERIT LOCATION FROM ARENA
        // Agar arena ke paas address hai to wo lelo, nahi to default
        address: arenaData?.arenaAddress || "Arena Address", 
        // Agar arena ke paas lat/lng hai to wo lelo (CRITICAL for Player Maps)
        location: arenaData?.location || null,

        openTime: "00:00",
        closeTime: "23:00",
        courtImageURL: courtImageURL,
        status: 'pending', 
        
        ownerBankDetails: {
          bankName: formData.bankName.trim(),
          accountNumber: formData.accountNumber.trim(),
          jazzCash: formData.jazzCash.trim() || '',
        },
        documentImages: [], 
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
    if (isSubmitting) return uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : 'Submitting...';
    return 'Submit Court for Approval';
  };

  return (
    <ScrollView contentContainerStyle={tw`p-6 pb-20`}>
      <Text style={tw`text-3xl font-bold text-gray-800 mb-2`}>Add New Court</Text>
      <Text style={tw`text-sm text-gray-500 mb-6`}>
        Add details for a specific court. This will inherit location from your Arena.
      </Text>
      
      {/* Location Info Box (Auto-filled) */}
      <View style={tw`bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100`}>
        <Text style={tw`text-blue-800 font-bold mb-1`}>📍 Location Info</Text>
        <Text style={tw`text-gray-700 text-sm`}>
            {arenaData?.arenaAddress ? arenaData.arenaAddress : "Loading Arena Location..."}
        </Text>
        <Text style={tw`text-xs text-blue-500 mt-2`}>
            (This court will be registered at your Arena's location automatically.)
        </Text>
      </View>

      {/* Court Name */}
      <Text style={tw`text-lg font-semibold mb-2 text-gray-700`}>Court Name</Text>
      <TextInput
        style={tw`border border-gray-300 p-4 rounded-lg mb-4 text-base bg-white`}
        placeholder="e.g., Futsal Ground A"
        value={formData.courtName}
        onChangeText={(val) => handleInputChange('courtName', val)}
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
      <View style={tw`bg-gray-100 p-4 rounded-lg mb-4 border border-gray-200`}>
        <Text style={tw`text-lg font-bold text-gray-800 mb-2`}>Bank Details for Payouts</Text>
        <Text style={tw`text-xs text-gray-600`}>
           Payments will be sent to this account.
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