import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { db } from '../../../../firebase/firebaseConfig';
import { notifyUser } from '../../../../utils/notifications';

// --- Header Component ---
const AdminHeader = ({ title, onBack }) => (
  <View style={tw`flex-row items-center mb-6 pt-2`}>
    <Pressable onPress={onBack} style={tw`bg-gray-50 p-2 rounded-xl mr-3 border border-gray-200`}>
      <Ionicons name="arrow-back" size={20} color="#374151" />
    </Pressable>
    <View style={tw`flex-1 flex-row items-center`}>
        <View style={tw`bg-purple-600 p-2 rounded-lg mr-2`}>
            <MaterialIcons name="grid-view" size={18} color="white" />
        </View>
        <Text style={tw`text-xl font-bold text-gray-900 flex-1`} numberOfLines={1}>
          {title}
        </Text>
    </View>
  </View>
);

// --- Court Card Component ---
const CourtManageCard = ({ court, onDisable, onEnable }) => {
  const isEnabled = court.status === 'approved';
  
  return (
    <View style={tw`bg-white p-4 rounded-2xl shadow-sm border border-purple-50 mb-3`}>
      <View style={tw`flex-row justify-between items-start`}>
        <View style={tw`flex-1 mr-2`}>
            <Text style={tw`text-base font-bold text-gray-900`}>{court.courtName}</Text>
            <Text style={tw`text-[11px] text-gray-500 mt-0.5`}>Price: Rs. {court.pricePerHour}/hr</Text>
        </View>
        
        {/* Status Badge */}
        <View style={tw`px-2 py-1 rounded-md ${isEnabled ? 'bg-green-50' : 'bg-red-50'}`}>
            <Text style={tw`text-[10px] font-bold uppercase ${isEnabled ? 'text-green-700' : 'text-red-700'}`}>
              {court.status ? court.status : 'UNKNOWN'}
            </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={tw`flex-row justify-end mt-3 border-t border-gray-100 pt-3`}>
         <Pressable
          style={({ pressed }) => tw.style(
            `px-3 py-1.5 rounded-lg border flex-row items-center`,
            isEnabled ? `bg-red-50 border-red-100` : `bg-green-50 border-green-100`,
            pressed && `opacity-70`
          )}
          onPress={() => isEnabled ? onDisable(court) : onEnable(court)}
        >
          <Text style={tw`text-[10px] font-bold ${isEnabled ? 'text-red-700' : 'text-green-700'}`}>
            {isEnabled ? 'Disable Court' : 'Enable Court'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

// --- Main Screen ---
export default function ArenaCourtsScreen() {
  const { ownerId } = useLocalSearchParams();
  const router = useRouter();
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if(ownerId) fetchCourts();
    }, [ownerId])
  );

  const fetchCourts = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'courts'),
        where('ownerId', '==', ownerId)
      );
      const querySnapshot = await getDocs(q);
      const courtsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourts(courtsList);
    } catch (error) {
      console.error("Error fetching courts: ", error);
      Alert.alert("Error", "Could not fetch courts.");
    } finally {
      setLoading(false);
    }
  };

  // --- 🛡️ Disable Logic ---
  const handleDisable = async (court) => {
    Alert.alert(
      "Disable Court?",
      `Players won't be able to see or book '${court.courtName}'.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Disable", style: "destructive", 
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'courts', court.id), { status: 'disabled' });
              
              await notifyUser(
                ownerId,
                "Court Offline 🔴",
                `Administrative Update: Your court '${court.courtName}' has been disabled.`,
                "alert",
                { url: '/(owner)/myCourt' }
              );

              setCourts(prev => prev.map(c => c.id === court.id ? { ...c, status: 'disabled' } : c));
              Alert.alert("Success", "Court disabled & owner notified.");
            } catch (err) {
              Alert.alert("Error", "Failed to update.");
            }
          }
        }
      ]
    );
  };

  // --- ✅ Enable Logic ---
  const handleEnable = async (court) => {
    try {
      await updateDoc(doc(db, 'courts', court.id), { status: 'approved' });
      
      await notifyUser(
        ownerId,
        "Court Online 🟢",
        `Great news! Your court '${court.courtName}' has been enabled.`,
        "booking",
        { url: '/(owner)/myCourt' }
      );

      setCourts(prev => prev.map(c => c.id === court.id ? { ...c, status: 'approved' } : c));
      Alert.alert("Success", "Court enabled & owner notified.");
    } catch (err) {
      Alert.alert("Error", "Failed to update.");
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />
      <View style={tw`flex-1 px-5`}>
        <AdminHeader title="Manage Courts" onBack={() => router.back()} />
        
        {loading ? (
          <ActivityIndicator size="small" color="#9333ea" style={tw`mt-10`} />
        ) : (
          <FlatList
            data={courts}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <CourtManageCard 
                court={item} 
                onDisable={handleDisable} 
                onEnable={handleEnable} 
              />
            )}
            contentContainerStyle={tw`pb-10`}
            ListEmptyComponent={
              <View style={tw`items-center justify-center mt-20 opacity-50`}>
                <Ionicons name="folder-open-outline" size={48} color="#9ca3af" />
                <Text style={tw`text-center text-gray-400 mt-2 text-xs`}>No courts found in this arena.</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}