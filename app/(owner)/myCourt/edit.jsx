import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, TextInput, Alert, 
  ActivityIndicator, KeyboardAvoidingView, Platform, 
  StyleSheet, Pressable 
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import tw from 'twrnc';
import { db } from '../../../firebase/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../../context/AuthContext'; 
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { SafeAreaView } from 'react-native-safe-area-context'; // <-- ERROR FIX YAHAN HAI

// Helper function: Date object se "HH:mm" string banata hai
const formatTime = (date) => {
  if (!date) return '00:00';
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export default function EditCourtDetailScreen() {
    // 'courtId' ko 'index.jsx' se params ke zariye hasil karein
    const { courtId } = useLocalSearchParams(); 
    const router = useRouter();
    const { user } = useAuth();
    
    // State
    const [details, setDetails] = useState({
        courtName: '',
        address: '',
        pricePerHour: '',
        bankName: '',
        accountNumber: '',
        jazzCash: '',
    });
    const [openTime, setOpenTime] = useState(new Date());
    const [closeTime, setCloseTime] = useState(new Date());
    
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [isTimePickerVisible, setTimePickerVisible] = useState(false);
    const [pickerType, setPickerType] = useState('open'); 
    const [headerTitle, setHeaderTitle] = useState('Edit Court');

    useEffect(() => {
        if (!courtId || !user) {
            setLoading(false);
            return;
        }
        
        const fetchCourtDetails = async () => {
            try {
                const courtRef = doc(db, 'courts', courtId);
                const docSnap = await getDoc(courtRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    
                    if (data.ownerId !== user.uid) {
                        Alert.alert("Access Denied", "Aap is court ke owner nahi hain.");
                        router.back();
                        return;
                    }

                    const timeStringToDate = (timeStr) => {
                        if (!timeStr) return new Date();
                        const [h, m] = timeStr.split(':').map(Number);
                        const date = new Date();
                        date.setHours(h, m, 0, 0);
                        return date;
                    };

                    setDetails({
                        courtName: data.courtName || '',
                        address: data.address || '',
                        pricePerHour: String(data.pricePerHour || ''), 
                        bankName: data.ownerBankDetails?.bankName || '',
                        accountNumber: data.ownerBankDetails?.accountNumber || '',
                        jazzCash: data.ownerBankDetails?.jazzCash || '',
                    });
                    setOpenTime(timeStringToDate(data.openTime));
                    setCloseTime(timeStringToDate(data.closeTime));
                    setHeaderTitle(`Edit: ${data.courtName}`); 
                } else {
                    Alert.alert("Error", "Court not found.");
                    router.back();
                }
            } catch (error) {
                console.error("Error fetching court details:", error);
                Alert.alert("Error", "Details load nahi ho sake.");
            } finally {
                setLoading(false);
            }
        };

        fetchCourtDetails();
    }, [courtId, user]);
    
    const handleInputChange = (field, value) => {
      setDetails((prev) => ({ ...prev, [field]: value }));
    };
    
    // Time Picker Confirm
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

    // --- YEH FUNCTION DATA UPDATE KAREGA ---
    const handleSave = async () => {
        if (isSaving || !user) return;

        if (!details.courtName || !details.address || !details.pricePerHour || !openTime || !closeTime) {
            Alert.alert("Error", "Tamam fields fill karna zaroori hai.");
            return;
        }
        
        const price = parseInt(details.pricePerHour);
        if (isNaN(price) || price <= 0) {
            Alert.alert("Error", "Price per hour sahi dhang se enter karein.");
            return;
        }

        setIsSaving(true);
        try {
            const courtRef = doc(db, 'courts', courtId);
            
            const updatedData = {
                courtName: details.courtName.trim(),
                address: details.address.trim(),
                pricePerHour: price,
                openTime: formatTime(openTime),
                closeTime: formatTime(closeTime),
                ownerBankDetails: {
                    bankName: details.bankName.trim(),
                    accountNumber: details.accountNumber.trim(),
                    jazzCash: details.jazzCash.trim() || '',
                },
                // status ko 'pending' par set karein ta ke admin dobara approve kare
                status: 'pending', 
            };

            await updateDoc(courtRef, updatedData);
            
            Alert.alert("Success", "Court details update ho gayi hain aur dobara approval ke liye bhej di gayi hain.");
            router.back(); // Owner ko 'myCourt/index.jsx' par wapas bhej denge

        } catch (error) {
            console.error("Error saving court details:", error);
            Alert.alert("Error", "Details save nahi ho sake.");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        // Yahan SafeAreaView ki zaroorat nahi thi, sirf View
        return (
            <View style={tw`flex-1 justify-center items-center bg-white`}>
                <ActivityIndicator size="large" color={tw.color('blue-600')} />
            </View>
        );
    }

    return (
        // KeyboardAvoidingView ko SafeAreaView se bahar rakhein
        <KeyboardAvoidingView
            style={tw`flex-1 bg-gray-100`}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Stack.Screen header ko dynamic title dega */}
          <Stack.Screen 
              options={{ 
                  title: headerTitle,
                  headerRight: () => (
                      <Pressable 
                          onPress={handleSave} 
                          disabled={isSaving} 
                          style={tw`p-2 rounded-lg ${isSaving ? 'opacity-50' : ''}`}
                      >
                          {isSaving ? (
                              <ActivityIndicator color={tw.color('blue-600')} />
                          ) : (
                              <Text style={tw`text-blue-600 text-lg font-bold`}>Update</Text>
                          )}
                      </Pressable>
                  ),
              }}
          />
          {/* ScrollView ab content area hai */}
          <ScrollView contentContainerStyle={tw`p-6`}>
              <Text style={tw`text-lg font-semibold mb-3 text-gray-700`}>Court Name</Text>
              <TextInput
                style={styles.input}
                value={details.courtName}
                onChangeText={(val) => handleInputChange('courtName', val)}
              />
              
              <Text style={tw`text-lg font-semibold mb-3 mt-4 text-gray-700`}>Full Address</Text>
              <TextInput
                style={styles.input}
                value={details.address}
                onChangeText={(val) => handleInputChange('address', val)}
              />
              
              <Text style={tw`text-lg font-semibold mb-3 mt-4 text-gray-700`}>Price (per hour)</Text>
              <TextInput
                style={styles.input}
                value={details.pricePerHour}
                onChangeText={(val) => handleInputChange('pricePerHour', val)}
                keyboardType="numeric"
              />

              {/* Operating Hours Section */}
              <Text style={tw`text-2xl font-bold text-gray-800 mt-6 mb-4`}>Operating Hours</Text>
              <View style={tw`flex-row justify-between mb-6`}>
                <View style={tw`w-1/2 pr-2`}>
                  <Text style={tw`text-sm text-gray-600 mb-1`}>Opening Time</Text>
                  <Pressable
                    style={styles.timeInput}
                    onPress={() => handleShowPicker('open')}
                  >
                    <Text style={tw`text-lg font-bold text-blue-800`}>{formatTime(openTime)}</Text>
                  </Pressable>
                </View>
                <View style={tw`w-1/2 pl-2`}>
                  <Text style={tw`text-sm text-gray-600 mb-1`}>Closing Time</Text>
                  <Pressable
                    style={styles.timeInput}
                    onPress={() => handleShowPicker('close')}
                  >
                    <Text style={tw`text-lg font-bold text-blue-800`}>{formatTime(closeTime)}</Text>
                  </Pressable>
                </View>
              </View>
              
              {/* Bank Details */}
              <Text style={tw`text-2xl font-bold text-gray-800 mt-6 mb-4`}>Bank Details</Text>
              
              <Text style={tw`text-lg font-semibold mb-3 text-gray-700`}>Bank Name</Text>
              <TextInput
                style={styles.input}
                value={details.bankName}
                onChangeText={(val) => handleInputChange('bankName', val)}
              />
              
              <Text style={tw`text-lg font-semibold mb-3 mt-4 text-gray-700`}>Account Number (IBAN)</Text>
              <TextInput
                style={styles.input}
                value={details.accountNumber}
                onChangeText={(val) => handleInputChange('accountNumber', val)}
              />
              
              <Text style={tw`text-lg font-semibold mb-3 mt-4 text-gray-700`}>JazzCash / EasyPaisa (Optional)</Text>
              <TextInput
                style={styles.input}
                value={details.jazzCash}
                onChangeText={(val) => handleInputChange('jazzCash', val)}
                keyboardType="phone-pad"
              />
          </ScrollView>
          
          {/* Time Picker Modal */}
          <DateTimePickerModal
              isVisible={isTimePickerVisible}
              mode="time"
              date={pickerType === 'open' ? openTime : closeTime}
              onConfirm={handleConfirmTime}
              onCancel={() => setTimePickerVisible(false)}
          />
        </KeyboardAvoidingView>
    );
}

// Styles ko file ke akhir mein rakhein
const styles = StyleSheet.create({
    input: {
        borderWidth: 1,
        borderColor: tw.color('gray-300'),
        padding: 12,
        borderRadius: 8,
        fontSize: 16,
        backgroundColor: tw.color('white'),
    },
    timeInput: {
        backgroundColor: tw.color('white'),
        padding: 16, // Thora behtar padding
        borderRadius: 8,
        borderWidth: 1,
        borderColor: tw.color('blue-400'),
        alignItems: 'center',
    },
});