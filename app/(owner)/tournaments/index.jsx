import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router'; // Stack import kiya
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../firebase/firebaseConfig';

// --- 🎨 CUSTOM TOURNAMENT CARD ---
const TournamentCard = ({ item, onPress }) => {
  // Status Colors Logic
  let statusColor = "bg-green-100 text-green-800";
  let borderColor = "border-green-600";
  let iconName = "trophy";

  const statusLower = item.status ? item.status.toLowerCase() : "";

  if (statusLower === 'completed' || statusLower === 'ended') {
      statusColor = "bg-gray-100 text-gray-600";
      borderColor = "border-gray-400";
      iconName = "trophy-outline";
  } else if (statusLower === 'cancelled') {
      statusColor = "bg-red-100 text-red-600";
      borderColor = "border-red-500";
      iconName = "close-circle-outline";
  } else if (statusLower === 'ongoing') {
      statusColor = "bg-blue-100 text-blue-700";
      borderColor = "border-blue-500";
      iconName = "play-circle-outline";
  }

  return (
    <Pressable 
      style={tw`bg-white mb-4 rounded-xl shadow-sm border-l-4 ${borderColor} overflow-hidden`}
      onPress={onPress}
    >
      <View style={tw`p-4`}>
        <View style={tw`flex-row justify-between items-start`}>
          {/* Title & Icon */}
          <View style={tw`flex-row items-center flex-1 mr-2`}>
            <View style={tw`bg-gray-50 p-2 rounded-lg mr-3`}>
              <MaterialCommunityIcons name={iconName} size={24} color={tw.color('green-700')} />
            </View>
            <View style={tw`flex-1`}>
              <Text style={tw`text-lg font-bold text-gray-900`} numberOfLines={1}>
                {item.tournamentName}
              </Text>
              <Text style={tw`text-xs text-gray-500`}>
                Created by You
              </Text>
            </View>
          </View>

          {/* Status Badge */}
          <View style={tw`px-2.5 py-1 rounded-full ${statusColor.split(' ')[0]}`}>
             <Text style={tw`text-[10px] font-bold uppercase ${statusColor.split(' ')[1]}`}>
               {item.status || 'Draft'}
             </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={tw`h-[1px] bg-gray-100 my-3`} />

        {/* Info Row: Teams & Type */}
        <View style={tw`flex-row items-center justify-between`}>
           <View style={tw`flex-row items-center`}>
              <Ionicons name="people" size={16} color={tw.color('gray-400')} />
              <Text style={tw`ml-1.5 text-sm font-medium text-gray-600`}>
                <Text style={tw`font-bold text-gray-900`}>{item.registeredTeamCount || 0}</Text>
                <Text style={tw`text-gray-400`}> / {item.teamLimit || '∞'} Teams</Text>
              </Text>
           </View>
           
           <View style={tw`flex-row items-center`}>
              <Text style={tw`text-xs font-semibold text-green-700`}>View Details</Text>
              <Ionicons name="chevron-forward" size={14} color={tw.color('green-700')} />
           </View>
        </View>
      </View>
    </Pressable>
  );
};

// --- MAIN SCREEN ---
export default function TournamentsListScreen() {
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter(); 

  const [tournaments, setTournaments] = useState([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);

  const isArenaApproved = userData?.status === 'approved';

  useFocusEffect(
    useCallback(() => {
      if (userData && isArenaApproved) {
        fetchOwnerTournaments();
      } else {
        setLoadingTournaments(false);
      }
    }, [isArenaApproved, userData])
  );

  const fetchOwnerTournaments = async () => {
    setLoadingTournaments(true);
    try {
      const q = query(
        collection(db, 'tournaments'),
        where('ownerId', '==', userData.uid)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTournaments(list);
    } catch (error) {
      console.error('Error fetching tournaments: ', error);
    } finally {
      setLoadingTournaments(false);
    }
  };

  if (authLoading) {
    return (
        <View style={tw`flex-1 justify-center items-center bg-gray-50`}>
             <Stack.Screen options={{ headerShown: false }} />
            <ActivityIndicator size="large" color={tw.color("green-700")} />
        </View>
    );
  }

  // --- UI 1: Arena Not Approved (Green Theme Version) ---
  if (!isArenaApproved) {
    return (
      <View style={tw`flex-1 bg-gray-50`}>
         {/* 🛑 HIDE DEFAULT HEADER */}
         <Stack.Screen options={{ headerShown: false }} />
         
         <StatusBar barStyle="light-content" backgroundColor="#14532d" />
         {/* Simple Header */}
         <View style={{ backgroundColor: '#14532d' }}>
            <SafeAreaView edges={['top', 'left', 'right']} style={tw`px-5 py-4`}>
                <Text style={tw`text-xl font-bold text-white`}>Tournaments</Text>
            </SafeAreaView>
         </View>

         <View style={tw`flex-1 items-center justify-center p-6`}>
            <View style={tw`bg-white p-6 rounded-full shadow-sm mb-6`}>
                <MaterialCommunityIcons name="shield-lock-outline" size={60} color={tw.color("green-700")} />
            </View>
            <Text style={tw`text-2xl font-extrabold text-green-900 text-center mb-3`}>
                Access Restricted
            </Text>
            <Text style={tw`text-base text-gray-500 text-center leading-6 px-4`}>
                Your Arena is not approved yet.{"\n"}
                Please wait for Admin approval to create and manage tournaments.
            </Text>
         </View>
      </View>
    );
  }

  // --- UI 2: Tournaments List ---
  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* 🛑 HIDE DEFAULT HEADER */}
      <Stack.Screen options={{ headerShown: false }} />

      <StatusBar barStyle="light-content" backgroundColor="#14532d" translucent={false} />

      {/* 🟢 HEADER */}
      <View style={{ backgroundColor: '#14532d' }}>
        <SafeAreaView edges={['top', 'left', 'right']} style={tw`px-5 pb-4 pt-2`}>
            <View style={tw`flex-row justify-between items-center`}>
                {/* Title */}
                <View>
                    <Text style={tw`text-xs text-green-300 font-medium uppercase tracking-wider`}>Arena Management</Text>
                    <Text style={tw`text-2xl font-bold text-white`}>My Tournaments</Text>
                </View>

                {/* Add Button */}
                <Pressable 
                    onPress={() => router.push('/(owner)/tournaments/create')}
                    style={({pressed}) => [
                        tw`bg-green-500 p-2.5 rounded-full shadow-lg border border-green-400`,
                        pressed && tw`bg-green-400`
                    ]}
                >
                    <Ionicons name="add" size={24} color="white" />
                </Pressable>
            </View>
        </SafeAreaView>
      </View>

      {/* 🟢 CONTENT */}
      {loadingTournaments ? (
         <View style={tw`flex-1 justify-center items-center`}>
            <ActivityIndicator size="large" color={tw.color("green-700")} />
         </View>
      ) : (
        <FlatList
          data={tournaments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={tw`p-5 pb-24`}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
             <TournamentCard 
                item={item} 
                onPress={() => router.push(`/(owner)/tournaments/details/${item.id}`)}
             />
          )}
          ListEmptyComponent={
             <View style={tw`items-center justify-center mt-20 px-10`}>
               <View style={tw`bg-white p-6 rounded-full shadow-sm mb-4 border border-gray-100`}>
                 <Ionicons name="trophy-outline" size={48} color={tw.color("green-300")} />
               </View>
               <Text style={tw`text-lg font-bold text-gray-800 mb-2`}>No Tournaments Yet</Text>
               <Text style={tw`text-sm text-gray-500 text-center leading-5 mb-6`}>
                 Create your first tournament to start managing teams and matches.
               </Text>
               <Pressable 
                 onPress={() => router.push('/(owner)/tournaments/create')}
                 style={tw`bg-green-700 px-6 py-3 rounded-xl shadow-md`}
               >
                 <Text style={tw`text-white font-bold`}>Create Tournament</Text>
               </Pressable>
             </View>
          }
        />
      )}
    </View>
  );
}