import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import ArenaRegistrationForm from '../../../components/specific/ArenaRegistrationForm';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../firebase/firebaseConfig';
import { notifyAdmins } from '../../../utils/notifications';

// --- COURT CARD COMPONENT (No Changes Needed Here) ---
const OwnerCourtCard = ({ court, onEdit, onManageSlots }) => {
  const isRejected = court.status === 'rejected';
  const isApproved = court.status === 'approved';

  const getStatusStyle = () => {
      if (isApproved) return { bg: 'bg-green-100/90', text: 'text-green-700' };
      if (isRejected) return { bg: 'bg-red-100/90', text: 'text-red-700' };
      return { bg: 'bg-yellow-100/90', text: 'text-yellow-700' };
  };

  const statusStyle = getStatusStyle();

  return (
    <View style={tw`bg-white rounded-xl shadow-sm border ${isRejected ? 'border-red-300' : 'border-gray-100'} mb-5 overflow-hidden`}>
      <View>
          {court.courtImageURL ? (
            <Image source={{ uri: court.courtImageURL }} style={tw`w-full h-40`} resizeMode="cover" />
          ) : (
            <View style={tw`w-full h-40 bg-gray-100 items-center justify-center`}>
                <MaterialCommunityIcons name="image-off-outline" size={30} color="#9ca3af" />
            </View>
          )}
          <View style={tw`absolute top-3 right-3 px-2.5 py-1 rounded-full ${statusStyle.bg} backdrop-blur-md`}>
            <Text style={tw`text-[10px] font-bold tracking-wide ${statusStyle.text}`}>
                {court.status ? court.status.toUpperCase() : 'PENDING'}
            </Text>
          </View>
      </View>

      <View style={tw`p-4`}>
          <View style={tw`flex-row justify-between items-start mb-2`}>
             <View style={tw`flex-1 mr-2`}>
                 <Text style={tw`text-lg font-bold text-gray-900 leading-6`}>{court.courtName}</Text>
                 <Text style={tw`text-xs text-gray-400 mt-0.5`}>Sport: {court.sportType || 'General'}</Text>
             </View>
             <View style={tw`items-end`}>
                 <Text style={tw`text-lg font-extrabold text-green-700`}>Rs. {court.pricePerHour}</Text>
                 <Text style={tw`text-[10px] text-gray-400 uppercase`}>Per Hour</Text>
             </View>
          </View>

          {isRejected && (
              <View style={tw`bg-red-50 p-3 rounded-lg border border-red-100 mb-3 mt-2`}>
                  <View style={tw`flex-row items-center mb-1`}>
                      <Ionicons name="alert-circle" size={14} color="#dc2626" />
                      <Text style={tw`text-red-800 font-bold text-xs ml-1 uppercase`}>Action Required</Text>
                  </View>
                  <Text style={tw`text-red-600 text-xs leading-4`}>
                      {court.rejectionReason || "Admin did not provide a specific reason. Please check your details."}
                  </Text>
              </View>
          )}
          
          <View style={tw`h-[1px] bg-gray-50 my-3`} />

          <View style={tw`flex-row gap-3`}>
            <Pressable 
              onPress={() => onEdit(court.id)}
              style={tw`flex-1 flex-row justify-center items-center py-2.5 rounded-lg border ${isRejected ? 'bg-red-600 border-red-700' : 'bg-white border-gray-200'} active:opacity-80`}
            >
              <Feather name="edit-2" size={14} color={isRejected ? "white" : "#4b5563"} style={tw`mr-2`} />
              <Text style={tw`${isRejected ? 'text-white' : 'text-gray-600'} text-xs font-bold uppercase`}>
                  {isRejected ? 'Fix & Resubmit' : 'Edit Details'}
              </Text>
            </Pressable>

            <Pressable 
              onPress={() => onManageSlots(court.id)}
              disabled={!isApproved}
              style={tw`flex-1 flex-row justify-center items-center py-2.5 rounded-lg border ${isApproved ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100 opacity-50'}`}
            >
              <MaterialCommunityIcons name="calendar-clock" size={16} color={isApproved ? "#15803d" : "#9ca3af"} style={tw`mr-2`} />
              <Text style={tw`${isApproved ? 'text-green-800' : 'text-gray-400'} text-xs font-bold uppercase`}>Manage Slots</Text>
            </Pressable>
          </View>
      </View>
    </View>
  );
};

// --- MAIN SCREEN ---
export default function MyCourtScreen() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true); 
  const [arenaData, setArenaData] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const loadScreenData = async () => {
        if (!user) return;
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userSnapshot = await getDoc(userDocRef);
          
          if (userSnapshot.exists()) {
            const freshUserData = userSnapshot.data();
            if (isActive) setArenaData(freshUserData);

            if (freshUserData.arenaName) {
              const q = query(
                collection(db, 'courts'),
                where('ownerId', '==', user.uid)
              );
              const courtsSnapshot = await getDocs(q);
              const courtsList = courtsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              if (isActive) setCourts(courtsList);
            }
          }
        } catch (error) {
          console.error("Error loading dashboard:", error);
        } finally {
          if (isActive) setLoading(false);
        }
      };
      setLoading(true);
      loadScreenData();
      return () => { isActive = false; };
    }, [user])
  );

  const handleArenaRegistrationSuccess = async (newArenaData) => {
    setArenaData(prev => ({ ...prev, ...newArenaData }));
    await notifyAdmins(
        "New Arena Request 🏟️",
        `Owner ${user.email} registered a new arena: ${newArenaData.arenaName}. Please review for approval.`,
        { url: '/(admin)/arenas' }
    );
  };

  const handleEditCourt = (courtId) => router.push({ pathname: '/myCourt/edit', params: { courtId } });
  const handleManageSlots = (courtId) => router.push({ pathname: '/myCourt/maintenance', params: { courtId } });
  const handleAddCourt = () => router.push('/myCourt/addCourt');

  if (loading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-gray-50`}>
        <ActivityIndicator size="large" color={tw.color('green-700')} />
      </View>
    );
  }

  const status = arenaData?.status || 'pending';
  const isApproved = status === 'approved';

  // 🟢 LOGIC UPDATE: Pass existingData to form
  if (!arenaData?.arenaName || status === 'rejected') {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50`}>
        <Stack.Screen options={{ headerShown: false }} />
        <ArenaRegistrationForm 
            user={user} 
            onRegistrationSuccess={handleArenaRegistrationSuccess}
            existingData={arenaData} // 🔥 Pass Rejected Data Here
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#14532d" translucent={false} />

      <View style={{ backgroundColor: '#14532d' }}>
          <SafeAreaView edges={['top', 'left', 'right']} style={tw`px-5 pb-5 pt-3`}>
             <View style={tw`flex-row justify-between items-center`}>
                <View style={tw`flex-row items-center gap-3`}>
                    <View style={tw`bg-green-800 p-2.5 rounded-xl border border-green-700`}>
                        <MaterialCommunityIcons name="basketball-hoop-outline" size={24} color="white" />
                    </View>
                    <View>
                        <Text style={tw`text-[10px] font-bold text-green-300 uppercase tracking-widest`}>Management</Text>
                        <Text style={tw`text-2xl font-bold text-white`}>My Courts</Text>
                    </View>
                </View>

                <Pressable onPress={handleAddCourt} style={tw`bg-white p-2.5 rounded-full shadow-lg active:bg-gray-100`}>
                    <Ionicons name="add" size={24} color={tw.color('green-900')} />
                </Pressable>
             </View>
          </SafeAreaView>
      </View>

      <FlatList
        data={courts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OwnerCourtCard court={item} onEdit={handleEditCourt} onManageSlots={handleManageSlots} />
        )}
        contentContainerStyle={tw`p-5 pb-32`}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={tw`mb-6 rounded-xl border-l-4 overflow-hidden shadow-sm bg-white ${isApproved ? 'border-green-500' : 'border-yellow-400'}`}>
               <View style={tw`flex-row p-4 items-start`}>
                  <View style={tw`mr-3 mt-0.5`}>
                     <Ionicons name={isApproved ? "checkmark-circle" : "alert-circle"} size={24} color={isApproved ? tw.color('green-600') : tw.color('yellow-600')} />
                  </View>
                  <View style={tw`flex-1`}>
                      <Text style={tw`text-sm font-bold text-gray-800 uppercase tracking-wide`}>Arena Status: {status}</Text>
                      <Text style={tw`text-xs text-gray-500 mt-1 leading-5`}>
                         {isApproved 
                           ? "Your arena is live! Players can now see and book your courts."
                           : "Your arena details are currently under review by the admin team."}
                      </Text>
                  </View>
               </View>
            </View>
            <View style={tw`flex-row justify-between items-center mb-4 ml-1`}>
                <Text style={tw`text-lg font-bold text-gray-800`}>Registered Courts</Text>
                <Text style={tw`text-xs font-medium text-gray-400`}>{courts.length} Found</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={tw`items-center justify-center mt-8 p-10 bg-white rounded-2xl border border-dashed border-gray-200`}>
             <View style={tw`bg-green-50 p-4 rounded-full mb-4`}>
                <MaterialCommunityIcons name="court-sports" size={40} color={tw.color('green-300')} />
             </View>
            <Text style={tw`text-lg font-bold text-gray-800`}>No Courts Added</Text>
            <Text style={tw`text-xs text-gray-500 text-center mt-2 leading-5`}>
              Tap the <Text style={tw`font-bold text-green-700`}>+</Text> button above to list your first court.
            </Text>
            <Pressable onPress={handleAddCourt} style={tw`mt-6 px-6 py-2 bg-green-700 rounded-full shadow-sm active:bg-green-800`}>
                <Text style={tw`text-white text-xs font-bold uppercase tracking-wide`}>Add First Court</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}