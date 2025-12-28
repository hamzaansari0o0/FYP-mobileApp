import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
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
  Text,
  TextInput,
  View
} from 'react-native';
import tw from 'twrnc';
import { db, storage } from '../../firebase/firebaseConfig';

const SPORT_TYPES = ["Cricket", "Football", "Badminton", "Tennis", "Basketball", "Volleyball", "Other"];

export default function CourtRegistrationForm({ user, onRegistrationSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [arenaData, setArenaData] = useState(null);

  const [formData, setFormData] = useState({
    courtName: '',
    sportType: 'Cricket', // Default
    pricePerHour: '',
    bankName: '',
    accountNumber: '',
    jazzCash: '',
  });
  
  const [image, setImage] = useState(null);

  // --- Fetch Arena Data ---
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
      Alert.alert('Permission Denied', 'Need gallery permissions.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9], // Cinematic aspect ratio
      quality: 0.7,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Please upload an image smaller than 5MB.');
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
    const uploadTask = uploadBytesResumable(fileRef, blob);

    return new Promise((resolve, reject) => {
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
      Alert.alert('Missing Fields', 'Please fill all required fields marked with *');
      return;
    }
    
    if (!image) {
      Alert.alert('Missing Image', 'A court picture is required.');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const courtImageURL = await uploadImageAsync(image);
      
      const newCourtData = {
        ownerId: user.uid,
        courtName: formData.courtName.trim(),
        sportType: formData.sportType,
        pricePerHour: parseFloat(formData.pricePerHour),
        address: arenaData?.arenaAddress || "Arena Address", 
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
    }
  };
  
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={tw`flex-1`}>
    <ScrollView contentContainerStyle={tw`p-5 pb-24`} showsVerticalScrollIndicator={false}>
      
      {/* 1. Basic Info Section */}
      <View style={tw`bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-5`}>
        <Text style={tw`text-base font-bold text-gray-800 mb-4 flex-row items-center`}>
            <MaterialCommunityIcons name="information-outline" size={18} color="black" /> Basic Information
        </Text>

        {/* Court Name */}
        <View style={tw`mb-4`}>
            <Text style={tw`text-xs font-semibold text-gray-500 mb-1.5 ml-1`}>Court Name *</Text>
            <View style={tw`flex-row items-center border border-gray-200 rounded-xl px-3 bg-gray-50 focus:border-green-500`}>
                <Ionicons name="text-outline" size={20} color="gray" />
                <TextInput
                    style={tw`flex-1 p-3 text-gray-800 text-sm`}
                    placeholder="e.g. Center Pitch A"
                    value={formData.courtName}
                    onChangeText={(val) => handleInputChange('courtName', val)}
                />
            </View>
        </View>

        {/* Price */}
        <View style={tw`mb-4`}>
            <Text style={tw`text-xs font-semibold text-gray-500 mb-1.5 ml-1`}>Hourly Rate (PKR) *</Text>
            <View style={tw`flex-row items-center border border-gray-200 rounded-xl px-3 bg-gray-50`}>
                <Text style={tw`text-gray-500 font-bold text-lg mr-1`}>Rs.</Text>
                <TextInput
                    style={tw`flex-1 p-3 text-gray-800 text-sm`}
                    placeholder="e.g. 2500"
                    value={formData.pricePerHour}
                    onChangeText={(val) => handleInputChange('pricePerHour', val)}
                    keyboardType="numeric"
                />
            </View>
        </View>

        {/* Sport Type Chips */}
        <View>
            <Text style={tw`text-xs font-semibold text-gray-500 mb-2 ml-1`}>Sport Type *</Text>
            <View style={tw`flex-row flex-wrap gap-2`}>
                {SPORT_TYPES.map((sport) => (
                    <Pressable
                        key={sport}
                        onPress={() => handleInputChange('sportType', sport)}
                        style={tw`px-3 py-1.5 rounded-full border ${formData.sportType === sport ? 'bg-green-600 border-green-600' : 'bg-white border-gray-200'}`}
                    >
                        <Text style={tw`text-xs font-medium ${formData.sportType === sport ? 'text-white' : 'text-gray-600'}`}>
                            {sport}
                        </Text>
                    </Pressable>
                ))}
            </View>
        </View>
      </View>

      {/* 2. Image Upload Section */}
      <View style={tw`bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-5`}>
         <Text style={tw`text-base font-bold text-gray-800 mb-3`}>
             <Feather name="image" size={18} /> Court Image
         </Text>
         
         {image ? (
            <View style={tw`relative rounded-xl overflow-hidden shadow-sm`}>
                <Image source={{ uri: image }} style={tw`w-full h-48`} resizeMode="cover" />
                <Pressable 
                    onPress={pickImage}
                    style={tw`absolute bottom-2 right-2 bg-black/70 px-3 py-1.5 rounded-full flex-row items-center`}
                >
                    <Feather name="edit" size={14} color="white" style={tw`mr-1`} />
                    <Text style={tw`text-white text-xs font-bold`}>Change</Text>
                </Pressable>
            </View>
         ) : (
            <Pressable
                onPress={pickImage}
                style={tw`h-44 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 items-center justify-center`}
            >
                <View style={tw`bg-green-100 p-3 rounded-full mb-2`}>
                    <Ionicons name="camera-outline" size={24} color={tw.color('green-700')} />
                </View>
                <Text style={tw`text-gray-500 font-medium text-sm`}>Tap to upload court photo</Text>
                <Text style={tw`text-gray-400 text-xs mt-1`}>Max 5MB (JPG/PNG)</Text>
            </Pressable>
         )}
      </View>

      {/* 3. Location (Read-Only) */}
      <View style={tw`bg-blue-50 p-4 rounded-xl border border-blue-100 mb-5 flex-row items-start`}>
         <Ionicons name="location" size={20} color={tw.color('blue-600')} style={tw`mr-2 mt-0.5`} />
         <View style={tw`flex-1`}>
            <Text style={tw`text-blue-900 font-bold text-sm mb-1`}>Location Linked to Arena</Text>
            <Text style={tw`text-blue-800 text-xs leading-4 mb-1`}>
                {arenaData?.arenaAddress || "Loading Address..."}
            </Text>
            <Text style={tw`text-blue-400 text-[10px] italic`}>
                This court will automatically appear at your arena's location.
            </Text>
         </View>
      </View>

      {/* 4. Bank Details */}
      <View style={tw`bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-8`}>
        <Text style={tw`text-base font-bold text-gray-800 mb-4 flex-row items-center`}>
            <MaterialCommunityIcons name="bank-outline" size={18} /> Payout Details
        </Text>

        <View style={tw`mb-4`}>
            <Text style={tw`text-xs font-semibold text-gray-500 mb-1.5 ml-1`}>Bank Name *</Text>
            <View style={tw`flex-row items-center border border-gray-200 rounded-xl px-3 bg-gray-50`}>
                <MaterialCommunityIcons name="bank" size={18} color="gray" />
                <TextInput
                    style={tw`flex-1 p-3 text-gray-800 text-sm`}
                    placeholder="e.g. HBL / Meezan"
                    value={formData.bankName}
                    onChangeText={(val) => handleInputChange('bankName', val)}
                />
            </View>
        </View>

        <View style={tw`mb-4`}>
            <Text style={tw`text-xs font-semibold text-gray-500 mb-1.5 ml-1`}>Account Number / IBAN *</Text>
            <View style={tw`flex-row items-center border border-gray-200 rounded-xl px-3 bg-gray-50`}>
                <MaterialCommunityIcons name="card-account-details-outline" size={18} color="gray" />
                <TextInput
                    style={tw`flex-1 p-3 text-gray-800 text-sm`}
                    placeholder="Account Number"
                    value={formData.accountNumber}
                    onChangeText={(val) => handleInputChange('accountNumber', val)}
                />
            </View>
        </View>

        <View>
            <Text style={tw`text-xs font-semibold text-gray-500 mb-1.5 ml-1`}>JazzCash / EasyPaisa (Optional)</Text>
            <View style={tw`flex-row items-center border border-gray-200 rounded-xl px-3 bg-gray-50`}>
                <Feather name="smartphone" size={18} color="gray" />
                <TextInput
                    style={tw`flex-1 p-3 text-gray-800 text-sm`}
                    placeholder="0300-XXXXXXX"
                    value={formData.jazzCash}
                    onChangeText={(val) => handleInputChange('jazzCash', val)}
                    keyboardType="phone-pad"
                />
            </View>
        </View>
      </View>

      {/* Submit Button */}
      <Pressable
        style={tw.style(
          `bg-green-700 py-4 rounded-xl shadow-md flex-row justify-center items-center`,
          isSubmitting && `bg-green-500`
        )}
        onPress={handleRegisterCourt}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <ActivityIndicator color="white" style={tw`mr-2`} />
            <Text style={tw`text-white font-bold text-base`}>
                {uploadProgress > 0 && uploadProgress < 100 ? `Uploading Image ${uploadProgress}%` : 'Submitting...'}
            </Text>
          </>
        ) : (
          <>
             <Ionicons name="checkmark-circle" size={20} color="white" style={tw`mr-2`} />
             <Text style={tw`text-white font-bold text-base`}>Submit Court</Text>
          </>
        )}
      </Pressable>

    </ScrollView>
    </KeyboardAvoidingView>
  );
}