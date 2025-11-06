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
// DateTimePickerModal ab zaroori nahi hai
// import DateTimePickerModal from 'react-native-modal-datetime-picker'; 
// SafeAreaView bhi yahan zaroori nahi hai kyunki KeyboardAvoidingView hai

// Helper function: Time-related functions ab remove kar dein ge

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
    
    // openTime aur closeTime state variables ab zaroori nahi hain
    // const [openTime, setOpenTime] = useState(new Date());
    // const [closeTime, setCloseTime] = useState(new Date());
    
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Time Picker States ab zaroori nahi hain
    // const [isTimePickerVisible, setTimePickerVisible] = useState(false);
    // const [pickerType, setPickerType] = useState('open'); 
    
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

                    // timeStringToDate helper aur time states ko load karna ab remove karein
                    
                    setDetails({
                        courtName: data.courtName || '',
                        address: data.address || '',
                        pricePerHour: String(data.pricePerHour || ''), 
                        bankName: data.ownerBankDetails?.bankName || '',
                        accountNumber: data.ownerBankDetails?.accountNumber || '',
                        jazzCash: data.ownerBankDetails?.jazzCash || '',
                    });
                    
                    // setOpenTime aur setCloseTime calls ko remove karein
                    // setOpenTime(timeStringToDate(data.openTime));
                    // setCloseTime(timeStringToDate(data.closeTime));
                    
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
    
    // Time Picker logic (handleConfirmTime, handleShowPicker) ab zaroori nahi hai
    // ...

    // --- YEH FUNCTION DATA UPDATE KAREGA (UPDATED) ---
    const handleSave = async () => {
        if (isSaving || !user) return;

        // openTime aur closeTime check ko remove karein
        if (!details.courtName || !details.address || !details.pricePerHour) {
            Alert.alert("Error", "Court Name, Address, aur Price fields fill karna zaroori hai.");
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
                // --- DEFAULT VALUES SET KAREIN ---
                openTime: '00:00', // Hardcode 12:00 AM
                closeTime: '23:00', // Hardcode 11:00 PM (1-hour slot)
                // ------------------------------
                ownerBankDetails: {
                    bankName: details.bankName.trim(),
                    accountNumber: details.accountNumber.trim(),
                    jazzCash: details.jazzCash.trim() || '',
                },
                status: 'pending', 
            };

            await updateDoc(courtRef, updatedData);
            
            Alert.alert("Success", "Court details update ho gayi hain aur dobara approval ke liye bhej di gayi hain.");
            router.back(); 

        } catch (error) {
            console.error("Error saving court details:", error);
            Alert.alert("Error", "Details save nahi ho sake.");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={tw`flex-1 justify-center items-center bg-white`}>
                <ActivityIndicator size="large" color={tw.color('blue-600')} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={tw`flex-1 bg-gray-100`}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
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

              {/* --- OPERATING HOURS SECTION KO REMOVE KAR DIYA GAYA HAI --- */}
              <View style={tw`bg-blue-100 p-3 rounded-lg mt-4`}>
                 <Text style={tw`text-sm font-semibold text-blue-700 text-center`}>
                    Booking slots are now set to 24/7 (12:00 AM - 11:00 PM) by default.
                 </Text>
              </View>
              {/* ------------------------------------------------------------- */}
              
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
          
          {/* DateTimePickerModal ko bhi remove kar diya gaya hai */}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    input: {
        borderWidth: 1,
        borderColor: tw.color('gray-300'),
        padding: 12,
        borderRadius: 8,
        fontSize: 16,
        backgroundColor: tw.color('white'),
    },
    // timeInput style ki ab zaroorat nahi hai
});