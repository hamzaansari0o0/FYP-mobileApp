import React, { useState, useEffect } from 'react';
import { 
  View, Text, Image, ScrollView, ActivityIndicator, 
  Alert, Pressable, Modal, TouchableOpacity 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Firebase Imports
import { db, storage } from '../../firebase/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';

export default function ApprovalDetailsScreen() {
  const { id, type } = useLocalSearchParams(); // id = document ID, type = 'arena' or 'court'
  const router = useRouter();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false); // Approve/Reject process ke liye

  // Image Zoom Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // --- 1. Fetch Data ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const collectionName = type === 'arena' ? 'users' : 'courts';
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setData({ id: docSnap.id, ...docSnap.data() });
        } else {
          Alert.alert("Error", "Document not found.");
          router.back();
        }
      } catch (error) {
        console.error("Error fetching details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, type]);

  // --- 2. Approve / Reject Logic ---
  const handleDecision = async (decision) => {
    // decision = 'approved' or 'rejected'
    setActionLoading(true);
    try {
      const collectionName = type === 'arena' ? 'users' : 'courts';
      const docRef = doc(db, collectionName, id);

      await updateDoc(docRef, { status: decision });

      Alert.alert(
        decision === 'approved' ? "Approved!" : "Rejected",
        `The ${type} has been ${decision} successfully.`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      console.error("Error updating status:", error);
      Alert.alert("Error", "Could not update status.");
    } finally {
      setActionLoading(false);
    }
  };

  // --- 3. Image Re-upload Logic (Admin Override) ---
  const handleReuploadImage = async (fieldToUpdate) => {
    // Permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Denied", "Need camera roll access.");
      return;
    }

    // Pick Image
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setActionLoading(true);

      try {
        // Upload Logic (XHR)
        const blob = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = function () { resolve(xhr.response); };
          xhr.onerror = function () { reject(new TypeError("Network request failed")); };
          xhr.responseType = "blob";
          xhr.open("GET", asset.uri, true);
          xhr.send(null);
        });

        // Naya naam generate karein
        const path = type === 'arena' ? 'arenas' : 'courts';
        const storageRef = ref(storage, `${path}/admin_uploads/${id}_${Date.now()}`);
        
        // Upload
        const uploadTask = await uploadBytesResumable(storageRef, blob);
        const downloadUrl = await getDownloadURL(uploadTask.ref);
        blob.close();

        // Firestore Update karein
        const collectionName = type === 'arena' ? 'users' : 'courts';
        const docRef = doc(db, collectionName, id);
        
        // Dynamic field update (ya to thumbnail hai ya document)
        await updateDoc(docRef, { [fieldToUpdate]: downloadUrl });

        // Local state update taake UI foran change ho
        setData(prev => ({ ...prev, [fieldToUpdate]: downloadUrl }));
        
        Alert.alert("Updated", "Image has been replaced successfully.");

      } catch (error) {
        console.error("Upload failed", error);
        Alert.alert("Error", "Failed to upload image.");
      } finally {
        setActionLoading(false);
      }
    }
  };

  // --- 4. Helper to Open Zoom Modal ---
  const openZoom = (imageUrl) => {
    if (!imageUrl) return;
    setSelectedImage(imageUrl);
    setModalVisible(true);
  };

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-50`}>
        <ActivityIndicator size="large" color={tw.color('purple-600')} />
      </View>
    );
  }

  if (!data) return null;

  // Determine fields based on Type (Arena vs Court)
  const title = type === 'arena' ? data.arenaName : data.courtName;
  const address = type === 'arena' ? data.arenaAddress : data.address;
  const mainImage = type === 'arena' ? data.arenaImageUrl : data.courtImageURL;
  const docImage = type === 'arena' ? data.arenaDocumentUrl : null; // Courts ka abhi doc nahi rakha, agar ho to yahan add karein

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      
      {/* Header */}
      <View style={tw`flex-row items-center p-4 border-b border-gray-100`}>
        <Pressable onPress={() => router.back()} style={tw`p-2 bg-gray-100 rounded-full mr-3`}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </Pressable>
        <Text style={tw`text-xl font-bold text-gray-800`}>Review Request</Text>
      </View>

      <ScrollView contentContainerStyle={tw`p-5 pb-30`}>
        
        {/* --- SECTION 1: PUBLIC IMAGE --- */}
        <Text style={tw`text-lg font-bold text-gray-800 mb-2`}>Public Thumbnail</Text>
        <View style={tw`mb-6`}>
          <Pressable onPress={() => openZoom(mainImage)}>
            <Image 
              source={mainImage ? { uri: mainImage } : { uri: 'https://via.placeholder.com/300' }} 
              style={tw`w-full h-56 rounded-lg bg-gray-200 border border-gray-300`}
              resizeMode="cover"
            />
            {/* Zoom Icon Overlay */}
            <View style={tw`absolute bottom-2 right-2 bg-black/60 p-2 rounded-full`}>
              <Ionicons name="expand" size={20} color="white" />
            </View>
          </Pressable>

          {/* Admin Edit Button */}
          <Pressable 
            style={tw`mt-2 flex-row items-center justify-center py-2 bg-purple-50 rounded-lg border border-purple-100`}
            onPress={() => handleReuploadImage(type === 'arena' ? 'arenaImageUrl' : 'courtImageURL')}
          >
            <Ionicons name="camera" size={18} color={tw.color('purple-700')} />
            <Text style={tw`ml-2 text-purple-700 font-semibold`}>Change / Re-upload Image</Text>
          </Pressable>
        </View>

        {/* --- SECTION 2: DETAILS --- */}
        <View style={tw`bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6`}>
          <Text style={tw`text-lg font-bold text-gray-800 mb-3`}>Details</Text>
          
          <DetailRow label="Name" value={title} />
          <DetailRow label="Address" value={address} />
          
          {type === 'arena' && (
            <>
              <DetailRow label="Owner Name" value={data.name} />
              <DetailRow label="Owner Email" value={data.email} />
              <DetailRow label="Phone" value={data.mobileNumber} />
            </>
          )}

          {type === 'court' && (
            <>
              <DetailRow label="Price" value={`Rs. ${data.pricePerHour} / hour`} />
              <DetailRow label="Bank" value={data.ownerBankDetails?.bankName} />
              <DetailRow label="Account" value={data.ownerBankDetails?.accountNumber} />
            </>
          )}
        </View>

        {/* --- SECTION 3: LEGAL DOCUMENT (Arena Only) --- */}
        {type === 'arena' && (
          <View style={tw`mb-6`}>
            <View style={tw`flex-row justify-between items-center mb-2`}>
               <Text style={tw`text-lg font-bold text-red-800`}>Legal Document (Private)</Text>
               <View style={tw`bg-red-100 px-2 py-1 rounded`}>
                 <Text style={tw`text-xs text-red-700 font-bold`}>CONFIDENTIAL</Text>
               </View>
            </View>
            
            <Pressable onPress={() => openZoom(docImage)}>
              <Image 
                source={docImage ? { uri: docImage } : { uri: 'https://via.placeholder.com/300?text=No+Document' }} 
                style={tw`w-full h-64 rounded-lg bg-gray-200 border-2 border-red-100`}
                resizeMode="contain"
              />
              <View style={tw`absolute bottom-2 right-2 bg-black/60 p-2 rounded-full`}>
                <Ionicons name="expand" size={20} color="white" />
              </View>
            </Pressable>
          </View>
        )}

      </ScrollView>

      {/* --- FOOTER: ACTION BUTTONS --- */}
      <View style={tw`absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200 flex-row justify-between shadow-lg`}>
        {actionLoading ? (
           <View style={tw`flex-1 items-center`}>
             <ActivityIndicator size="small" color="black" />
             <Text style={tw`text-xs text-gray-500 mt-1`}>Processing...</Text>
           </View>
        ) : (
          <>
            <Pressable 
              style={tw`flex-1 bg-white border border-red-500 py-3 rounded-lg mr-2 items-center`}
              onPress={() => handleDecision('rejected')}
            >
              <Text style={tw`text-red-600 font-bold text-lg`}>Reject ❌</Text>
            </Pressable>
            <Pressable 
              style={tw`flex-1 bg-green-600 py-3 rounded-lg ml-2 items-center shadow-sm`}
              onPress={() => handleDecision('approved')}
            >
              <Text style={tw`text-white font-bold text-lg`}>Approve ✅</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* --- FULL SCREEN IMAGE MODAL --- */}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={tw`flex-1 bg-black justify-center items-center`}>
          <TouchableOpacity 
            style={tw`absolute top-10 right-5 z-10 p-2 bg-gray-800 rounded-full`}
            onPress={() => setModalVisible(false)}
          >
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>
          
          <Image 
            source={{ uri: selectedImage }} 
            style={{ width: '100%', height: '90%' }} 
            resizeMode="contain" 
          />
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// Simple Helper Component for text rows
const DetailRow = ({ label, value }) => (
  <View style={tw`flex-row justify-between mb-2`}>
    <Text style={tw`text-gray-500 font-medium`}>{label}:</Text>
    <Text style={tw`text-gray-800 font-bold max-w-[60%] text-right`}>{value || 'N/A'}</Text>
  </View>
);