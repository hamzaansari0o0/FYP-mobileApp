import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, Alert,
  ActivityIndicator, ScrollView, Image
} from 'react-native';
import tw from 'twrnc';
import { db, storage } from '../../firebase/firebaseConfig';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export default function ArenaRegistrationForm({ user, onRegistrationSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    arenaName: '',
    arenaAddress: '',
  });

  // Do alag states images ke liye
  const [thumbnailImage, setThumbnailImage] = useState(null); // App mein dikhane ke liye
  const [documentImage, setDocumentImage] = useState(null);   // Admin approval ke liye

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // --- Image Picker (Reusable) ---
  const pickImage = async (type) => {
    // type = 'thumbnail' or 'document'
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // Updated for new Expo version
      allowsEditing: true, // User crop kar sake
      aspect: type === 'thumbnail' ? [16, 9] : [4, 3], // Thumbnail wide acha lagta hai
      quality: 0.7,
    });

    if (!result.canceled) {
      const asset = result.assets[0];

      // 5MB Validation
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Please select an image smaller than 5MB.');
        return;
      }

      if (type === 'thumbnail') {
        setThumbnailImage(asset.uri);
      } else {
        setDocumentImage(asset.uri);
      }
    }
  };

  // --- Upload Logic (Reliable XHR) ---
  const uploadImageAsync = async (uri, folderName) => {
    const blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () { resolve(xhr.response); };
      xhr.onerror = function (e) { 
        console.log(e); 
        reject(new TypeError("Network request failed")); 
      };
      xhr.responseType = "blob";
      xhr.open("GET", uri, true);
      xhr.send(null);
    });

    // Unique name: arenas/USER_ID/thumbnail_TIMESTAMP
    const fileRef = ref(storage, `arenas/${user.uid}/${folderName}_${Date.now()}`);
    
    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(fileRef, blob);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          // Hum sirf total progress dikhayenge, isliye isay exact map nahi kar rahe abhi
          // lekin aap chahein to use kar sakte hain
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

  const handleRegisterArena = async () => {
    // 1. Basic Validation
    if (!formData.arenaName || !formData.arenaAddress) {
      Alert.alert('Missing Fields', 'Please fill Arena Name and Address.');
      return;
    }

    // 2. Image Validation
    if (!thumbnailImage) {
      Alert.alert('Missing Thumbnail', 'Please upload a Cover Image for your Arena.');
      return;
    }
    if (!documentImage) {
      Alert.alert('Missing Document', 'Please upload a Valid Document for Admin Approval.');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // Step 1: Thumbnail Upload
      setUploadProgress(30);
      const thumbnailUrl = await uploadImageAsync(thumbnailImage, 'thumbnail');
      
      // Step 2: Document Upload
      setUploadProgress(60);
      const documentUrl = await uploadImageAsync(documentImage, 'document');

      setUploadProgress(90);

      // Step 3: Update Firestore (User Profile)
      const userRef = doc(db, 'users', user.uid);
      
      const updatedData = {
        arenaName: formData.arenaName.trim(),
        arenaAddress: formData.arenaAddress.trim(),
        arenaImageUrl: thumbnailUrl,      // Public viewing ke liye
        arenaDocumentUrl: documentUrl,    // Admin checking ke liye
        status: 'pending',                // Approval ke liye pending
        updatedAt: serverTimestamp(),
      };

      await updateDoc(userRef, updatedData);
      
      setUploadProgress(100);
      Alert.alert('Success!', 'Your Arena details and documents have been submitted for Admin Approval.');
      
      if (onRegistrationSuccess) {
        onRegistrationSuccess(updatedData);
      }

    } catch (error) {
      console.error('Error registering arena: ', error);
      Alert.alert('Error', 'Registration failed. Please check your internet connection.');
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
    return 'Submit Arena for Approval';
  };

  return (
    <ScrollView contentContainerStyle={tw`p-6 pb-20`}>
      <Text style={tw`text-3xl font-bold text-gray-800 mb-2`}>
        Register Your Arena
      </Text>
      <Text style={tw`text-sm text-gray-500 mb-6`}>
        Provide valid details and documents. Once approved by Admin, your arena will go live.
      </Text>
      
      {/* --- Fields --- */}
      <Text style={tw`text-lg font-semibold mb-2 text-gray-700`}>Arena Name</Text>
      <TextInput
        style={tw`border border-gray-300 p-4 rounded-lg mb-4 text-base bg-white`}
        placeholder="e.g., Goals Arena"
        value={formData.arenaName}
        onChangeText={(val) => handleInputChange('arenaName', val)}
      />
      
      <Text style={tw`text-lg font-semibold mb-2 text-gray-700`}>Arena Full Address</Text>
      <TextInput
        style={tw`border border-gray-300 p-4 rounded-lg mb-4 text-base bg-white`}
        placeholder="e.g., 123-B, Johar Town, Lahore"
        value={formData.arenaAddress}
        onChangeText={(val) => handleInputChange('arenaAddress', val)}
      />
      
      {/* --- Thumbnail Image Section --- */}
      <Text style={tw`text-lg font-semibold mb-2 text-gray-700`}>Arena Thumbnail</Text>
      <Text style={tw`text-xs text-gray-500 mb-2`}>This image will be shown to players.</Text>
      
      {thumbnailImage ? (
        <View style={tw`mb-3`}>
          <Image source={{ uri: thumbnailImage }} style={tw`w-full h-48 rounded-lg mb-2`} resizeMode="cover" />
          <Pressable onPress={() => pickImage('thumbnail')}>
            <Text style={tw`text-blue-600 text-center font-bold`}>Change Image</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable 
          onPress={() => pickImage('thumbnail')} 
          style={tw`mb-6 border-2 border-dashed border-gray-300 bg-gray-50 p-6 rounded-lg items-center`}
        > 
           <Text style={tw`text-gray-500 font-semibold`}>+ Pick Cover Image</Text>
        </Pressable>
      )}

      {/* --- Document Image Section --- */}
      <Text style={tw`text-lg font-semibold mb-2 text-gray-700`}>Official Document</Text>
      <Text style={tw`text-xs text-gray-500 mb-2`}>
        Upload valid proof (Registry/Ownership) for Admin verification. (Max 5MB)
      </Text>
      
      {documentImage ? (
        <View style={tw`mb-3`}>
          <Image source={{ uri: documentImage }} style={tw`w-full h-64 rounded-lg mb-2 border border-gray-200`} resizeMode="contain" />
          <Pressable onPress={() => pickImage('document')}>
            <Text style={tw`text-blue-600 text-center font-bold`}>Change Document</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable 
          onPress={() => pickImage('document')} 
          style={tw`mb-8 border-2 border-dashed border-blue-200 bg-blue-50 p-6 rounded-lg items-center`}
        > 
           <Text style={tw`text-blue-500 font-semibold`}>+ Upload Valid Document</Text>
        </Pressable>
      )}
      
      {/* --- Submit Button --- */}
      <Pressable
        style={tw.style(
          `bg-green-600 py-4 rounded-lg shadow-md`,
          isSubmitting && `bg-green-400`
        )}
        onPress={handleRegisterArena}
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