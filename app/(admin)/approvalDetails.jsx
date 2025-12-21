import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

// Firebase & Utils
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { db, storage } from '../../firebase/firebaseConfig';
// 🔥 Notification Helper
import { notifyUser } from '../../utils/notifications';

export default function ApprovalDetailsScreen() {
  const { id, type } = useLocalSearchParams(); 
  const router = useRouter();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

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

  // --- 🔥 UPDATED: Approve / Reject Logic with Notifications ---
  const handleDecision = async (decision) => {
    setActionLoading(true);
    try {
      const collectionName = type === 'arena' ? 'users' : 'courts';
      const docRef = doc(db, collectionName, id);

      await updateDoc(docRef, { status: decision });

      // Notification Logic
      const isApproved = decision === 'approved';
      const targetOwnerId = type === 'arena' ? data.id : data.ownerId;
      const itemName = type === 'arena' ? data.arenaName : data.courtName;

      let notifTitle = "";
      let notifBody = "";
      let notifType = isApproved ? "booking" : "alert";

      if (type === 'arena') {
        notifTitle = isApproved ? "Arena Approved! 🏟️" : "Arena Update ⚠️";
        notifBody = isApproved 
          ? `Congratulations! Your arena '${itemName}' has been approved. You can now add courts and receive bookings.`
          : `Your registration for '${itemName}' was not approved at this time. Please contact support for details.`;
      } else {
        notifTitle = isApproved ? "Court Approved! ✅" : "Court Update ❌";
        notifBody = isApproved 
          ? `Great news! Your court '${itemName}' is now live and visible to all players.`
          : `The request for court '${itemName}' was not approved. Please review your details.`;
      }

      // Send Notification to Owner
      await notifyUser(targetOwnerId, notifTitle, notifBody, notifType, {
        url: '/(owner)/myCourt'
      });

      Alert.alert(
        isApproved ? "Approved!" : "Rejected",
        `The ${type} has been ${decision} and the owner has been notified.`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      console.error("Error updating status:", error);
      Alert.alert("Error", "Could not update status.");
    } finally {
      setActionLoading(false);
    }
  };

  // --- Image Re-upload Logic (Admin Override) ---
  const handleReuploadImage = async (fieldToUpdate) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Denied", "Need camera roll access.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setActionLoading(true);

      try {
        const blob = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = function () { resolve(xhr.response); };
          xhr.onerror = function () { reject(new TypeError("Network request failed")); };
          xhr.responseType = "blob";
          xhr.open("GET", asset.uri, true);
          xhr.send(null);
        });

        const path = type === 'arena' ? 'arenas' : 'courts';
        const storageRef = ref(storage, `${path}/admin_uploads/${id}_${Date.now()}`);
        
        const uploadTask = await uploadBytesResumable(storageRef, blob);
        const downloadUrl = await getDownloadURL(uploadTask.ref);
        blob.close();

        const collectionName = type === 'arena' ? 'users' : 'courts';
        const docRef = doc(db, collectionName, id);
        
        await updateDoc(docRef, { [fieldToUpdate]: downloadUrl });
        setData(prev => ({ ...prev, [fieldToUpdate]: downloadUrl }));
        Alert.alert("Updated", "Image replaced successfully.");
      } catch (error) {
        console.error("Upload failed", error);
        Alert.alert("Error", "Failed to upload image.");
      } finally {
        setActionLoading(false);
      }
    }
  };

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

  const title = type === 'arena' ? data.arenaName : data.courtName;
  const address = type === 'arena' ? data.arenaAddress : data.address;
  const mainImage = type === 'arena' ? data.arenaImageUrl : data.courtImageURL;
  const docImage = type === 'arena' ? data.arenaDocumentUrl : null;

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <View style={tw`flex-row items-center p-4 border-b border-gray-100`}>
        <Pressable onPress={() => router.back()} style={tw`p-2 bg-gray-100 rounded-full mr-3`}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </Pressable>
        <Text style={tw`text-xl font-bold text-gray-800`}>Review Request</Text>
      </View>

      <ScrollView contentContainerStyle={tw`p-5 pb-30`}>
        <Text style={tw`text-lg font-bold text-gray-800 mb-2`}>Public Thumbnail</Text>
        <View style={tw`mb-6`}>
          <Pressable onPress={() => openZoom(mainImage)}>
            <Image 
              source={mainImage ? { uri: mainImage } : { uri: 'https://via.placeholder.com/300' }} 
              style={tw`w-full h-56 rounded-lg bg-gray-200 border border-gray-300`}
              resizeMode="cover"
            />
            <View style={tw`absolute bottom-2 right-2 bg-black/60 p-2 rounded-full`}>
              <Ionicons name="expand" size={20} color="white" />
            </View>
          </Pressable>

          <Pressable 
            style={tw`mt-2 flex-row items-center justify-center py-2 bg-purple-50 rounded-lg border border-purple-100`}
            onPress={() => handleReuploadImage(type === 'arena' ? 'arenaImageUrl' : 'courtImageURL')}
          >
            <Ionicons name="camera" size={18} color={tw.color('purple-700')} />
            <Text style={tw`ml-2 text-purple-700 font-semibold`}>Change / Re-upload Image</Text>
          </Pressable>
        </View>

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

const DetailRow = ({ label, value }) => (
  <View style={tw`flex-row justify-between mb-2`}>
    <Text style={tw`text-gray-500 font-medium`}>{label}:</Text>
    <Text style={tw`text-gray-800 font-bold max-w-[60%] text-right`}>{value || 'N/A'}</Text>
  </View>
);