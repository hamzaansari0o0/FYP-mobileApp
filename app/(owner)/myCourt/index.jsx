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

// --- 🎨 MODERN COURT CARD (NO CHANGE) ---
const OwnerCourtCard = ({ court, onEdit, onManageSlots }) => {
  return (
    <View style={tw`bg-white rounded-xl shadow-sm border border-gray-100 mb-5 overflow-hidden`}>
      
      {/* Image Section with Overlay Badge */}
      <View>
          {court.courtImageURL ? (
            <Image
              source={{ uri: court.courtImageURL }}
              style={tw`w-full h-40`}
              resizeMode="cover"
            />
          ) : (
            <View style={tw`w-full h-40 bg-gray-100 items-center justify-center`}>
                <MaterialCommunityIcons name="image-off-outline" size={30} color="#9ca3af" />
            </View>
          )}
          
          {/* Status Badge Overlay */}
          <View style={tw`absolute top-3 right-3 px-2.5 py-1 rounded-full ${court.status === 'approved' ? 'bg-green-100/90' : 'bg-yellow-100/90'} backdrop-blur-md`}>
            <Text style={tw`text-[10px] font-bold tracking-wide ${court.status === 'approved' ? 'text-green-700' : 'text-yellow-700'}`}>
                {court.status ? court.status.toUpperCase() : 'PENDING'}
            </Text>
          </View>
      </View>

      {/* Content Section */}
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
          
          {/* Divider */}
          <View style={tw`h-[1px] bg-gray-50 my-3`} />

          {/* Action Buttons */}
          <View style={tw`flex-row gap-3`}>
            <Pressable 
              onPress={() => onEdit(court.id)}
              style={tw`flex-1 flex-row justify-center items-center py-2.5 rounded-lg border border-gray-200 bg-white active:bg-gray-50`}
            >
              <Feather name="edit-2" size={14} color="#4b5563" style={tw`mr-2`} />
              <Text style={tw`text-gray-600 text-xs font-bold uppercase`}>Edit Details</Text>
            </Pressable>

            <Pressable 
              onPress={() => onManageSlots(court.id)}
              style={tw`flex-1 flex-row justify-center items-center py-2.5 rounded-lg bg-green-50 border border-green-100 active:bg-green-100`}
            >
              <MaterialCommunityIcons name="calendar-clock" size={16} color="#15803d" style={tw`mr-2`} />
              <Text style={tw`text-green-800 text-xs font-bold uppercase`}>Manage Slots</Text>
            </Pressable>
          </View>
      </View>
    </View>
  );
};

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
          // 1. Fetch Fresh User Data
          const userDocRef = doc(db, 'users', user.uid);
          const userSnapshot = await getDoc(userDocRef);
          
          if (userSnapshot.exists()) {
            const freshUserData = userSnapshot.data();
            if (isActive) setArenaData(freshUserData);

            // 2. Fetch Courts if Arena registered
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

  // --- Navigation ---
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

  // Show Registration Form (If Arena not registered)
  if (!arenaData?.arenaName) {
    return (
      <SafeAreaView style={tw`flex-1 bg-gray-50`}>
        <Stack.Screen options={{ headerShown: false }} />
        <ArenaRegistrationForm user={user} onRegistrationSuccess={handleArenaRegistrationSuccess} />
      </SafeAreaView>
    );
  }

  // Status Logic
  const status = arenaData.status || 'pending';
  const isApproved = status === 'approved';

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* Hide Default Header */}
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* 🟢 1. STATUS BAR (Fixed) */}
      <StatusBar barStyle="light-content" backgroundColor="#14532d" translucent={false} />

      {/* 🟢 2. CUSTOM HEADER (Fixed with Wrapper View) */}
      <View style={{ backgroundColor: '#14532d' }}>
          <SafeAreaView edges={['top', 'left', 'right']} style={tw`px-5 pb-5 pt-3`}>
             <View style={tw`flex-row justify-between items-center`}>
                
                {/* Left: Title */}
                <View style={tw`flex-row items-center gap-3`}>
                    {/* Icon Box */}
                    <View style={tw`bg-green-800 p-2.5 rounded-xl border border-green-700`}>
                        <MaterialCommunityIcons name="basketball-hoop-outline" size={24} color="white" />
                    </View>
                    {/* Texts */}
                    <View>
                        <Text style={tw`text-[10px] font-bold text-green-300 uppercase tracking-widest`}>
                            Management
                        </Text>
                        <Text style={tw`text-2xl font-bold text-white`}>
                            My Courts
                        </Text>
                    </View>
                </View>

                {/* Right: Add Button (White Button for Contrast) */}
                <Pressable 
                    onPress={handleAddCourt}
                    style={tw`bg-white p-2.5 rounded-full shadow-lg active:bg-gray-100`}
                >
                    <Ionicons name="add" size={24} color={tw.color('green-900')} />
                </Pressable>
             </View>
          </SafeAreaView>
      </View>

      {/* --- CONTENT LIST (Unchanged) --- */}
      <FlatList
        data={courts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OwnerCourtCard
            court={item}
            onEdit={handleEditCourt}
            onManageSlots={handleManageSlots}
          />
        )}
        contentContainerStyle={tw`p-5 pb-32`}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Arena Status Alert */}
            <View style={tw`mb-6 rounded-xl border-l-4 overflow-hidden shadow-sm bg-white ${isApproved ? 'border-green-500' : 'border-yellow-400'}`}>
               <View style={tw`flex-row p-4 items-start`}>
                  <View style={tw`mr-3 mt-0.5`}>
                     <Ionicons 
                       name={isApproved ? "checkmark-circle" : "alert-circle"} 
                       size={24} 
                       color={isApproved ? tw.color('green-600') : tw.color('yellow-600')} 
                     />
                  </View>
                  <View style={tw`flex-1`}>
                      <Text style={tw`text-sm font-bold text-gray-800 uppercase tracking-wide`}>
                          Arena Status: {status}
                      </Text>
                      <Text style={tw`text-xs text-gray-500 mt-1 leading-5`}>
                         {isApproved 
                           ? "Your arena is live! Players can now see and book your courts."
                           : "Your arena details are currently under review by the admin team."}
                      </Text>
                  </View>
               </View>
            </View>
            
            {/* Section Title */}
            <View style={tw`flex-row justify-between items-center mb-4 ml-1`}>
                <Text style={tw`text-lg font-bold text-gray-800`}>
                    Registered Courts
                </Text>
                <Text style={tw`text-xs font-medium text-gray-400`}>
                    {courts.length} Found
                </Text>
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
              Tap the <Text style={tw`font-bold text-green-700`}>+</Text> button above to list your first court and start accepting bookings.
            </Text>
            
            <Pressable 
                onPress={handleAddCourt}
                style={tw`mt-6 px-6 py-2 bg-green-700 rounded-full shadow-sm active:bg-green-800`}
            >
                <Text style={tw`text-white text-xs font-bold uppercase tracking-wide`}>Add First Court</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}