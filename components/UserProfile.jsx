import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import { collection, doc, getDocs, limit, query, updateDoc, where } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { useAuth } from "../context/AuthContext";
import { auth, db, storage } from "../firebase/firebaseConfig";

// --- Reusable Info Row ---
const InfoRow = ({ icon, label, value, themeColor, bgLight }) => (
  <View style={tw`bg-white p-4 rounded-xl shadow-sm w-full flex-row items-center mb-3 border border-gray-100`}>
    <View style={tw`${bgLight} p-2 rounded-full`}>
        <Ionicons name={icon} size={20} color={themeColor} />
    </View>
    <View style={tw`ml-4`}>
      <Text style={tw`text-xs font-bold text-gray-400 uppercase tracking-wide`}>{label}</Text>
      <Text style={tw`text-base font-semibold text-gray-800`}>{value}</Text>
    </View>
  </View>
);

export default function UserProfile({ title, userData, logout }) {
  const { user } = useAuth();
  const router = useRouter();

  // --- 🎨 DYNAMIC THEME LOGIC ---
  // ✅ Changed: Ab Sab kuch Green hai (Player & Owner Unified Theme)
  
  const theme = {
    main: "#15803d",          // Green-700
    lightBg: "bg-green-50",   // Light Green Background
    border: "border-green-200",
    textMain: "text-green-700",
    iconBg: "bg-green-600"
  };

  // States
  const [hasRegistrations, setHasRegistrations] = useState(false);
  const [image, setImage] = useState(userData?.profileUrl || null);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState(userData?.name || '');
  const [isEditingName, setIsEditingName] = useState(false);

  // Sync state
  useEffect(() => {
    if (userData) {
      setName(userData.name);
      setImage(userData.profileUrl);
    }
  }, [userData]);

  // --- 1. Check Registrations ---
  useFocusEffect(
    useCallback(() => {
      if (userData?.role === 'player' && user) {
        const checkRegistrations = async () => {
          const q = query(
            collection(db, 'tournamentRegistrations'),
            where('playerId', '==', user.uid),
            limit(1)
          );
          const snapshot = await getDocs(q);
          setHasRegistrations(!snapshot.empty);
        };
        checkRegistrations();
      }
    }, [user, userData])
  );

  // --- 2. Pick & Upload Image ---
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      handleImageUpload(result.assets[0].uri);
    }
  };

  const handleImageUpload = async (uri) => {
    setUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `profile_pictures/${user.uid}`;
      const storageRef = ref(storage, filename);

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      await updateDoc(doc(db, "users", user.uid), { profileUrl: downloadURL });
      
      setImage(downloadURL);
      Alert.alert("Success", "Profile picture updated!");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  // --- 3. Update Name ---
  const handleUpdateName = async () => {
    if (!name.trim()) return Alert.alert("Error", "Name cannot be empty");
    try {
      await updateDoc(doc(db, "users", user.uid), { name: name });
      setIsEditingName(false);
      Alert.alert("Success", "Name updated successfully!");
    } catch (error) {
      Alert.alert("Error", "Could not update name.");
    }
  };

  // --- 4. Reset Password ---
  const handlePasswordReset = async () => {
    Alert.alert(
      "Reset Password",
      `Send a password reset email to ${userData.email}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Email",
          onPress: async () => {
            try {
              await sendPasswordResetEmail(auth, userData.email);
              Alert.alert("Email Sent", "Check your inbox to reset your password.");
            } catch (error) {
              Alert.alert("Error", error.message);
            }
          },
        },
      ]
    );
  };

  if (!userData) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-white`}>
        <ActivityIndicator size="large" color={theme.main} />
      </View>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {/* Logout Button */}
      <Pressable
        style={tw`absolute top-12 right-5 z-10 bg-red-50 p-2 rounded-full border border-red-100 shadow-sm`}
        onPress={logout}
      >
        <Ionicons name="log-out-outline" size={24} color="#dc2626" />
      </Pressable>

      <ScrollView contentContainerStyle={tw`pb-20`}>
        {/* --- Header Section (Image & Name) --- */}
        <View style={tw`items-center pt-10 pb-8 ${theme.lightBg} rounded-b-[40px] shadow-sm mb-6`}>
            
            {/* Profile Image */}
            <Pressable onPress={pickImage} style={tw`relative mb-4`}>
                <View style={tw`w-28 h-28 rounded-full bg-white border-4 border-white shadow-md overflow-hidden justify-center items-center`}>
                    {uploading ? (
                        <ActivityIndicator color={theme.main} />
                    ) : image ? (
                        <Image source={{ uri: image }} style={tw`w-full h-full`} />
                    ) : (
                        // ✅ Changed: Default Icon color to Green Tint
                        <Ionicons name="person" size={60} color="#dcfce7" /> 
                    )}
                </View>
                <View style={tw`absolute bottom-0 right-0 ${theme.iconBg} p-2 rounded-full border-2 border-white`}>
                    <Ionicons name="camera" size={16} color="white" />
                </View>
            </Pressable>

            {/* Editable Name */}
            <View style={tw`flex-row items-center justify-center`}>
                {isEditingName ? (
                    <View style={tw`flex-row items-center bg-white rounded-lg px-3 py-1 border ${theme.border}`}>
                        <TextInput 
                            value={name} 
                            onChangeText={setName} 
                            style={tw`text-xl font-bold text-gray-800 min-w-[150px] text-center p-0`}
                            autoFocus
                        />
                        <Pressable onPress={handleUpdateName} style={tw`ml-2`}>
                            <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
                        </Pressable>
                    </View>
                ) : (
                    <Pressable onPress={() => setIsEditingName(true)} style={tw`flex-row items-center`}>
                        <Text style={tw`text-2xl font-bold text-gray-900 mr-2`}>{name}</Text>
                        <Ionicons name="pencil" size={16} color={theme.main} />
                    </Pressable>
                )}
            </View>
            <Text style={tw`text-sm text-gray-500 mt-1`}>{userData.email}</Text>
        </View>

        <View style={tw`px-5`}>
            
            {/* --- Match Schedule Button (Only for Players) --- */}
            {userData.role === 'player' && hasRegistrations && (
                <Pressable
                onPress={() => router.push('/(player)/schedule/matchschedule')}
                // ✅ Changed: bg-green-700 (Dark Green)
                style={tw`bg-green-700 p-4 rounded-2xl shadow-md flex-row items-center justify-between mb-6`}
                >
                <View style={tw`flex-row items-center`}>
                    <View style={tw`bg-white/20 p-2 rounded-full`}>
                        <Ionicons name="calendar" size={24} color="white" />
                    </View>
                    <View style={tw`ml-3`}>
                        <Text style={tw`text-white font-bold text-lg`}>My Match Schedule</Text>
                        {/* ✅ Changed: text-green-100 */}
                        <Text style={tw`text-green-100 text-xs`}>View upcoming games</Text>
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="white" />
                </Pressable>
            )}

            {/* --- Info Stats (Owners Only) --- */}
            {/* 🗑️ REMOVED: Total Payouts Received Card */}

            {/* --- Static Details --- */}
            <Text style={tw`text-gray-900 font-bold text-lg mb-3 mt-2`}>Account Details</Text>
            
            <InfoRow 
                icon="shield-checkmark" 
                label="Role" 
                value={userData.role.toUpperCase()} 
                themeColor={theme.main}
                bgLight={theme.lightBg}
            />
            
            {/* --- Password Reset Action --- */}
            <Pressable
                onPress={handlePasswordReset}
                style={tw`mt-4 bg-white border border-red-100 p-4 rounded-xl flex-row items-center justify-center shadow-sm`}
            >
                <Ionicons name="key-outline" size={20} color="#dc2626" />
                <Text style={tw`text-red-600 font-bold ml-2`}>Reset Password via Email</Text>
            </Pressable>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}