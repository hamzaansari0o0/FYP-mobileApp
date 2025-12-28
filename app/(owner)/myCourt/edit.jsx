import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useAuth } from '../../../context/AuthContext';
import { db, storage } from '../../../firebase/firebaseConfig';
import { notifyAdmins } from '../../../utils/notifications';

export default function EditCourtDetailScreen() {
  const { courtId } = useLocalSearchParams(); 
  const router = useRouter();
  const { user } = useAuth();
  
  // State
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [image, setImage] = useState(null); 
  const [originalImage, setOriginalImage] = useState(null); 
  
  const [details, setDetails] = useState({
    courtName: '',
    address: '',
    sportType: '',
    pricePerHour: '',
    bankName: '',
    accountNumber: '',
    jazzCash: '',
  });

  // --- Fetch Data ---
  useEffect(() => {
    if (!courtId || !user) return;
    const fetchCourtDetails = async () => {
      try {
        const courtRef = doc(db, 'courts', courtId);
        const docSnap = await getDoc(courtRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.ownerId !== user.uid) {
            Alert.alert("Access Denied", "You do not own this court.");
            router.back();
            return;
          }
          setDetails({
            courtName: data.courtName || '',
            address: data.address || '',
            sportType: data.sportType || 'General',
            pricePerHour: String(data.pricePerHour || ''), 
            bankName: data.ownerBankDetails?.bankName || '',
            accountNumber: data.ownerBankDetails?.accountNumber || '',
            jazzCash: data.ownerBankDetails?.jazzCash || '',
          });
          if (data.courtImageURL) {
            setImage(data.courtImageURL);
            setOriginalImage(data.courtImageURL);
          }
        } else {
          Alert.alert("Error", "Court not found.");
          router.back();
        }
      } catch (error) {
        console.error("Error fetching details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourtDetails();
  }, [courtId, user]);
  
  const handleInputChange = (field, value) => {
    setDetails((prev) => ({ ...prev, [field]: value }));
  };

  // --- Image Picker & Upload ---
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Gallery access is required.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImageAsync = async (uri) => {
    if (uri === originalImage) return originalImage;
    const blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () { resolve(xhr.response); };
      xhr.onerror = function () { reject(new TypeError("Network request failed")); };
      xhr.responseType = "blob";
      xhr.open("GET", uri, true);
      xhr.send(null);
    });
    const fileRef = ref(storage, `courts/${user.uid}/court_${Date.now()}`);
    const uploadTask = uploadBytesResumable(fileRef, blob);
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed', null, 
        (error) => { blob.close(); reject(error); }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          blob.close();
          resolve(downloadURL);
        }
      );
    });
  };

  // --- Save Handler ---
  const handleSave = async () => {
    if (isSaving || !user) return;
    if (!details.courtName || !details.pricePerHour) {
      Alert.alert("Missing Fields", "Court Name and Price are required.");
      return;
    }
    setIsSaving(true);
    try {
      const finalImageURL = await uploadImageAsync(image);
      const courtRef = doc(db, 'courts', courtId);
      const updatedData = {
        courtName: details.courtName.trim(),
        pricePerHour: parseFloat(details.pricePerHour),
        courtImageURL: finalImageURL,
        sportType: details.sportType,
        ownerBankDetails: {
          bankName: details.bankName.trim(),
          accountNumber: details.accountNumber.trim(),
          jazzCash: details.jazzCash.trim() || '',
        },
        status: 'pending',
      };
      await updateDoc(courtRef, updatedData);
      await notifyAdmins(
        "Court Updated ✏️",
        `Court '${details.courtName}' updated by owner.`,
        { url: '/(admin)/arenas' }
      );
      Alert.alert("Success", "Court updated! Sent for approval.");
      router.back(); 
    } catch (error) {
      Alert.alert("Error", "Could not save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Delete Handler ---
  const handleDelete = () => {
    Alert.alert(
      "Delete Court?",
      "This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteDoc(doc(db, 'courts', courtId));
              Alert.alert("Deleted", "Court has been removed.");
              router.back();
            } catch (error) {
              Alert.alert("Error", "Could not delete court.");
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-50`}>
        <ActivityIndicator size="large" color={tw.color('green-700')} />
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#14532d" translucent={false} />

      {/* 🟢 HEADER (Updated: Removed Save Button) */}
      <View style={{ backgroundColor: '#14532d' }}>
        <SafeAreaView edges={['top', 'left', 'right']} style={tw`px-4 pb-4 pt-2 border-b border-green-800`}>
          <View style={tw`flex-row justify-between items-center`}>
            <Pressable onPress={() => router.back()} style={tw`p-2 -ml-2`}>
               <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            
            <Text style={tw`text-lg font-bold text-white`}>Edit Court</Text>
            
            {/* Empty view to balance the title center alignment */}
            <View style={tw`w-8`} />
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={tw`flex-1`}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        // 🟢 PADDING BOTTOM ADDED HERE (pb-36)
        contentContainerStyle={tw`p-5 pb-36`} 
      >
        
        {/* --- IMAGE --- */}
        <View style={tw`mb-6`}>
            <Text style={tw`text-xs font-bold text-gray-500 mb-2 uppercase ml-1`}>Court Photo</Text>
            <View style={tw`relative rounded-xl overflow-hidden shadow-sm bg-white`}>
                {image ? (
                    <Image source={{ uri: image }} style={tw`w-full h-48 bg-gray-200`} resizeMode="cover" />
                ) : (
                    <View style={tw`w-full h-48 bg-gray-200 items-center justify-center`}>
                        <Ionicons name="image" size={40} color="gray" />
                    </View>
                )}
                <Pressable 
                    onPress={pickImage}
                    style={tw`absolute bottom-3 right-3 bg-white/90 p-2 rounded-full shadow-md flex-row items-center gap-2`}
                >
                    <Feather name="camera" size={16} color="black" />
                    <Text style={tw`text-xs font-bold`}>Change Photo</Text>
                </Pressable>
            </View>
        </View>

        {/* --- DETAILS FORM --- */}
        <View style={tw`bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-5`}>
            <Text style={tw`text-base font-bold text-gray-800 mb-4 flex-row items-center`}>
                <MaterialCommunityIcons name="information-outline" size={18} /> Basic Info
            </Text>
            <View style={tw`mb-4`}>
                <Text style={tw`text-xs text-gray-500 font-semibold mb-1 ml-1`}>Court Name</Text>
                <TextInput
                    style={tw`border border-gray-200 rounded-lg p-3 bg-gray-50 text-base`}
                    value={details.courtName}
                    onChangeText={(val) => handleInputChange('courtName', val)}
                />
            </View>
            <View style={tw`mb-4`}>
                <Text style={tw`text-xs text-gray-500 font-semibold mb-1 ml-1`}>Sport Type</Text>
                <TextInput
                    style={tw`border border-gray-200 rounded-lg p-3 bg-gray-50 text-base`}
                    value={details.sportType}
                    onChangeText={(val) => handleInputChange('sportType', val)}
                    placeholder="e.g. Cricket"
                />
            </View>
            <View>
                 <Text style={tw`text-xs text-gray-500 font-semibold mb-1 ml-1`}>Address (Linked to Arena)</Text>
                 <View style={tw`bg-gray-100 p-3 rounded-lg border border-gray-200`}>
                    <Text style={tw`text-gray-500 text-sm`}>{details.address}</Text>
                    <View style={tw`flex-row items-center mt-2`}>
                        <Ionicons name="lock-closed" size={12} color="gray" style={tw`mr-1`} />
                        <Text style={tw`text-[10px] text-gray-400 italic`}>To change address, edit Arena details.</Text>
                    </View>
                 </View>
            </View>
        </View>

        {/* --- PRICING --- */}
        <View style={tw`bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-5`}>
            <Text style={tw`text-base font-bold text-gray-800 mb-4`}>
                <Ionicons name="pricetag-outline" size={18} /> Pricing
            </Text>
            <View>
                <Text style={tw`text-xs text-gray-500 font-semibold mb-1 ml-1`}>Hourly Rate (PKR)</Text>
                <TextInput
                    style={tw`border border-gray-200 rounded-lg p-3 bg-gray-50 text-lg font-bold text-green-700`}
                    value={details.pricePerHour}
                    onChangeText={(val) => handleInputChange('pricePerHour', val)}
                    keyboardType="numeric"
                />
            </View>
        </View>

        {/* --- BANK DETAILS --- */}
        <View style={tw`bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-8`}>
            <Text style={tw`text-base font-bold text-gray-800 mb-4`}>
                <MaterialCommunityIcons name="bank-outline" size={18} /> Payout Details
            </Text>
            <View style={tw`mb-3`}>
                <Text style={tw`text-xs text-gray-500 font-semibold mb-1 ml-1`}>Bank Name</Text>
                <TextInput
                    style={tw`border border-gray-200 rounded-lg p-3 bg-gray-50`}
                    value={details.bankName}
                    onChangeText={(val) => handleInputChange('bankName', val)}
                />
            </View>
            <View style={tw`mb-3`}>
                <Text style={tw`text-xs text-gray-500 font-semibold mb-1 ml-1`}>Account / IBAN</Text>
                <TextInput
                    style={tw`border border-gray-200 rounded-lg p-3 bg-gray-50`}
                    value={details.accountNumber}
                    onChangeText={(val) => handleInputChange('accountNumber', val)}
                />
            </View>
            <View>
                <Text style={tw`text-xs text-gray-500 font-semibold mb-1 ml-1`}>JazzCash / EasyPaisa</Text>
                <TextInput
                    style={tw`border border-gray-200 rounded-lg p-3 bg-gray-50`}
                    value={details.jazzCash}
                    onChangeText={(val) => handleInputChange('jazzCash', val)}
                    keyboardType="phone-pad"
                />
            </View>
        </View>

        {/* 🟢 NEW FOOTER AREA (Save & Delete) */}
        
        {/* 1. MAIN SAVE BUTTON */}
        <Pressable
          style={tw`bg-green-700 py-4 rounded-2xl shadow-md flex-row justify-center items-center mb-4`}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={tw`text-white text-base font-bold`}>Save Changes</Text>
          )}
        </Pressable>

        {/* 2. DANGER ZONE (DELETE) */}
        <Pressable 
            onPress={handleDelete}
            disabled={isDeleting}
            style={tw`bg-red-50 border border-red-200 p-4 rounded-xl flex-row justify-center items-center`}
        >
            {isDeleting ? (
                <ActivityIndicator size="small" color="red" />
            ) : (
                <>
                    <Ionicons name="trash-outline" size={20} color={tw.color('red-600')} style={tw`mr-2`} />
                    <Text style={tw`text-red-600 font-bold `}>Delete Court</Text>
                </>
            )}
        </Pressable>

      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}