import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StatusBar,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
// Ensure paths are correct based on your folder structure
import MatchScheduleList from '../../../../components/specific/tournaments/MatchScheduleList';
import RegisteredTeamList from '../../../../components/specific/tournaments/RegisteredTeamList';
import { useAuth } from '../../../../context/AuthContext';
import { db } from '../../../../firebase/firebaseConfig';
import { notifyUser } from '../../../../utils/notifications';

export default function ManageTournamentScreen() {
  const { tournamentId } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter(); 
  
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // === REALTIME LISTENER ===
  useEffect(() => {
    if (!tournamentId || !user) {
      if (!tournamentId) setLoading(false);
      return;
    }
    
    setLoading(true);

    const tourRef = doc(db, 'tournaments', tournamentId);
    const tourUnsub = onSnapshot(tourRef, (docSnap) => {
      if (docSnap.exists()) {
        setTournament({ id: docSnap.id, ...docSnap.data() });
      } else {
        Alert.alert("Error", "Tournament not found.");
        // Agar tournament delete ho jaye to list par wapis bhejein
        router.replace('/(owner)/tournaments'); 
      }
    }, (error) => {
      console.error("Error listening to tournament: ", error);
      setLoading(false);
    });

    const teamsQuery = query(
      collection(db, 'tournamentRegistrations'),
      where('tournamentId', '==', tournamentId)
    );
    const teamsUnsub = onSnapshot(teamsQuery, (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Error listening teams:", error));

    const matchesQuery = query(
      collection(db, 'tournamentMatches'),
      where('tournamentId', '==', tournamentId),
      orderBy('round', 'asc'),
      orderBy('matchNumber', 'asc')
    );
    const matchesUnsub = onSnapshot(matchesQuery, (snapshot) => {
      setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
        console.error("Error listening matches:", error);
        setLoading(false);
    });

    return () => {
      tourUnsub();
      teamsUnsub();
      matchesUnsub();
    };
  }, [tournamentId, user]);

  
  // --- Notify Helper ---
  const notifyRegisteredTeams = async (title, body, type = 'info') => {
      try {
        const q = query(
            collection(db, 'tournamentRegistrations'), 
            where('tournamentId', '==', tournamentId)
        );
        const snapshot = await getDocs(q);
        const notifications = snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const targetId = data.captainId || data.userId;
            if (targetId) {
                await notifyUser(targetId, title, body, type, { url: '/(player)/tournaments' });
            }
        });
        await Promise.all(notifications);
      } catch (error) {
          console.error("Notification Error:", error);
      }
  };

  // --- Schedule Generation Logic ---
  const handleGenerateSchedule = async (shuffledTeams) => {
    setIsGenerating(true);
    const batch = writeBatch(db);
    const N = shuffledTeams.length;
    let power = 2;
    let totalRounds = 1;
    while (power < N) {
      power *= 2; totalRounds++;
    }
    const numByes = power - N;
    let currentRoundTeams = [];
    let matchCounter = 1;

    try {
      // 1. "BYE" teams
      for (let i = 0; i < numByes; i++) {
        const team = shuffledTeams[i];
        const byeMatchRef = doc(collection(db, 'tournamentMatches'));
        const teamData = { id: team.id, name: team.teamName };
        batch.set(byeMatchRef, {
          tournamentId, ownerId: user.uid, round: 1, matchNumber: matchCounter,
          status: 'completed', teamA: teamData,
          teamB: { id: 'BYE', name: 'BYE' }, scoreA: 1, scoreB: 0,
          winner: teamData, feederMatchA: null, feederMatchB: null,
        });
        currentRoundTeams.push({ type: 'team', data: teamData });
        matchCounter++;
      }
      // 2. Round 1 matches
      for (let i = numByes; i < N; i += 2) {
        const teamA = shuffledTeams[i];
        const teamB = shuffledTeams[i+1];
        const matchRef = doc(collection(db, 'tournamentMatches'));
        const teamAData = { id: teamA.id, name: teamA.teamName };
        const teamBData = { id: teamB.id, name: teamB.teamName };
        batch.set(matchRef, {
          tournamentId, ownerId: user.uid, round: 1, matchNumber: matchCounter,
          status: 'upcoming', teamA: teamAData, teamB: teamBData, 
          scoreA: 0, scoreB: 0, winner: null, 
          feederMatchA: null, feederMatchB: null,
        });
        currentRoundTeams.push({ type: 'placeholder', matchId: matchRef.id, round: 1, matchNum: matchCounter });
        matchCounter++;
      }
      // 3. Round 2+
      for (let r = 2; r <= totalRounds; r++) {
        const nextRoundTeams = [];
        matchCounter = 1;
        for (let i = 0; i < currentRoundTeams.length; i += 2) {
          const teamA_info = currentRoundTeams[i];
          const teamB_info = currentRoundTeams[i+1];
          const matchRef = doc(collection(db, 'tournamentMatches'));
          let matchData = {
            tournamentId, ownerId: user.uid, round: r, matchNumber: matchCounter,
            status: 'pending', teamA: null, teamB: null, scoreA: 0, scoreB: 0,
            winner: null, feederMatchA: null, feederMatchB: null,
          };
          if (teamA_info.type === 'team') matchData.teamA = teamA_info.data;
          else {
            matchData.teamA = { id: null, name: `Winner (R${teamA_info.round}-M${teamA_info.matchNum})` };
            matchData.feederMatchA = teamA_info.matchId;
          }
          if (teamB_info.type === 'team') matchData.teamB = teamB_info.data;
          else {
            matchData.teamB = { id: null, name: `Winner (R${teamB_info.round}-M${teamB_info.matchNum})` };
            matchData.feederMatchB = teamB_info.matchId;
          }
          if(matchData.teamA?.id && matchData.teamB?.id) matchData.status = 'upcoming';
          batch.set(matchRef, matchData);
          nextRoundTeams.push({ type: 'placeholder', matchId: matchRef.id, round: r, matchNum: matchCounter });
          matchCounter++;
        }
        currentRoundTeams = nextRoundTeams;
      }
      
      const tourRef = doc(db, 'tournaments', tournamentId);
      batch.update(tourRef, { status: 'live', totalRounds: totalRounds });
      await batch.commit();

      // 🔥 NOTIFY REGISTERED TEAMS
      await notifyRegisteredTeams(
          "Schedule Live! 🗓️",
          `The match bracket for ${tournament.tournamentName} has been generated. Check who you're playing against!`,
          "booking"
      );

      Alert.alert("Schedule Generated!", `The full tournament bracket is now live.`);

    } catch (error) {
      console.error("Error generating schedule: ", error);
      Alert.alert("Error", "Failed to generate schedule.");
    } finally {
      setIsGenerating(false);
    }
  };
  
  // --- Winner Promote Logic ---
  const handleMatchUpdate = async (updatedMatch, winner) => {
    const matchRef = doc(db, 'tournamentMatches', updatedMatch.id);
    await updateDoc(matchRef, {
      scoreA: updatedMatch.scoreA,
      scoreB: updatedMatch.scoreB,
      status: 'completed',
      winner: winner,
    });
    
    if (tournament && updatedMatch.round === tournament.totalRounds) {
      const tourRef = doc(db, 'tournaments', tournamentId);
      await updateDoc(tourRef, {
        status: 'completed',
        tournamentWinner: winner, 
        completedAt: serverTimestamp() 
      });
      
      // 🔥 NOTIFY: Tournament Finished
      await notifyRegisteredTeams(
          "Tournament Ended 🏆",
          `${tournament.tournamentName} has finished! Winner: ${winner.name}`,
          "alert"
      );
      Alert.alert("Tournament Finished!", `Winner: ${winner.name}`);

    } else {
      const nextMatchQuery = query(collection(db, 'tournamentMatches'), where('tournamentId', '==', tournamentId), where('feederMatchA', '==', updatedMatch.id));
      const nextMatchQueryB = query(collection(db, 'tournamentMatches'), where('tournamentId', '==', tournamentId), where('feederMatchB', '==', updatedMatch.id));
      const [snapA, snapB] = await Promise.all([getDocs(nextMatchQuery), getDocs(nextMatchQueryB)]);
      let nextMatchRef = null; let slot = null;
      if (!snapA.empty) { nextMatchRef = snapA.docs[0].ref; slot = 'teamA'; } 
      else if (!snapB.empty) { nextMatchRef = snapB.docs[0].ref; slot = 'teamB'; }
      
      if (nextMatchRef) {
        const nextMatchSnap = await getDoc(nextMatchRef);
        const nextMatchData = nextMatchSnap.data();
        const otherSlot = (slot === 'teamA') ? 'teamB' : 'teamA';
        await updateDoc(nextMatchRef, {
          [slot]: winner,
          status: (nextMatchData[otherSlot] != null) ? 'upcoming' : 'pending'
        });
      }
    }
  };

  // --- CANCEL TOURNAMENT ---
  const handleCancelTournament = async () => {
    Alert.alert(
      "Cancel Tournament",
      "Are you sure? This action cannot be undone.",
      [
        { text: "Don't Cancel", style: "cancel" },
        { 
          text: "Yes, Cancel It", 
          style: "destructive",
          onPress: async () => {
            const tourRef = doc(db, 'tournaments', tournamentId);
            try {
              await runTransaction(db, async (transaction) => {
                const tourDoc = await transaction.get(tourRef);
                if (!tourDoc.exists()) throw new Error("Tournament doesn't exist!");
                const currentTeamCount = tourDoc.data().registeredTeamCount;
                if (currentTeamCount > 0) throw new Error("Cannot cancel. A player has already registered.");
                transaction.update(tourRef, { status: 'cancelled' });
              });
              
              Alert.alert("Success", "Tournament has been cancelled.");
              // Cancel hone ke baad list par wapis
              router.navigate('/(owner)/tournaments'); 

            } catch (error) {
              Alert.alert("Cancellation Failed", error.message);
            }
          }
        }
      ]
    );
  };

  if (loading) { 
      return (
        <View style={tw`flex-1 justify-center items-center bg-gray-50`}>
            <Stack.Screen options={{ headerShown: false }} />
            <ActivityIndicator size="large" color={tw.color('green-700')} />
        </View>
      ); 
  }

  if (!tournament) return null;

  if (isGenerating) {
     return (
        <View style={tw`flex-1 justify-center items-center bg-gray-50`}>
           <Stack.Screen options={{ headerShown: false }} />
           <ActivityIndicator size="large" color={tw.color('green-700')} />
           <Text style={tw`mt-4 text-base font-semibold text-gray-600`}>Generating Bracket...</Text>
        </View>
     );
  }

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* 🛑 Hide Default Header */}
      <Stack.Screen options={{ headerShown: false }} />
      
      <StatusBar barStyle="light-content" backgroundColor="#14532d" />

      {/* 🟢 CUSTOM HEADER */}
      <View style={{ backgroundColor: '#14532d' }}>
         <SafeAreaView edges={['top', 'left', 'right']} style={tw`px-4 pb-4 pt-2`}>
            <View style={tw`flex-row items-center justify-between`}>
               <View style={tw`flex-row items-center flex-1`}>
                  {/* 🛑 FIX: Back arrow ab specifically 'Tournaments List' par le kar jayega */}
                  <Pressable 
                    onPress={() => router.navigate('/(owner)/tournaments')} 
                    style={tw`mr-3 p-1`}
                  >
                     <Ionicons name="arrow-back" size={24} color="white" />
                  </Pressable>
                  <View style={tw`flex-1`}>
                     <Text style={tw`text-lg font-bold text-white`} numberOfLines={1}>
                        {tournament.tournamentName}
                     </Text>
                     <Text style={tw`text-xs text-green-200 capitalize`}>
                        {tournament.status.replace('_', ' ')}
                     </Text>
                  </View>
               </View>
            </View>
         </SafeAreaView>
      </View>

      {/* 🟢 MANAGEMENT BAR (Only for Open Registration) */}
      {tournament.status === 'registration_open' && (
        <View style={tw`bg-white px-4 py-3 border-b border-gray-100 flex-row justify-between items-center shadow-sm z-10`}>
           <Pressable 
            style={({pressed}) => [
                tw`flex-1 flex-row justify-center items-center bg-blue-50 py-2.5 rounded-lg mr-2 border border-blue-100`,
                pressed && tw`bg-blue-100`
            ]}
            onPress={() => router.push(`/(owner)/tournaments/edit/${tournamentId}`)}
           >
            <Ionicons name="create-outline" size={18} color={tw.color('blue-700')} />
            <Text style={tw`text-blue-700 font-bold text-sm ml-2`}>Edit Info</Text>
           </Pressable>

           {tournament.registeredTeamCount === 0 ? (
            <Pressable 
              style={({pressed}) => [
                  tw`flex-1 flex-row justify-center items-center bg-red-50 py-2.5 rounded-lg ml-2 border border-red-100`,
                  pressed && tw`bg-red-100`
              ]}
              onPress={handleCancelTournament} 
            >
              <Ionicons name="trash-outline" size={18} color={tw.color('red-700')} />
              <Text style={tw`text-red-700 font-bold text-sm ml-2`}>Cancel</Text>
            </Pressable>
           ) : (
             <View style={tw`flex-1 flex-row justify-center items-center bg-gray-100 py-2.5 rounded-lg ml-2 opacity-50`}>
                <Ionicons name="lock-closed-outline" size={16} color="gray" />
                <Text style={tw`text-gray-500 text-xs ml-2`}>Active Teams</Text>
             </View>
           )}
        </View>
      )}

      {/* 📄 CONTENT AREA */}
      <View style={tw`flex-1`}>
         {tournament.status === 'registration_open' ? (
            <RegisteredTeamList
              tournament={tournament}
              teams={teams} 
              onGenerateSchedule={handleGenerateSchedule}
            />
         ) : (
            <MatchScheduleList
              tournament={tournament} 
              matches={matches} 
              onMatchUpdate={handleMatchUpdate}
            />
         )}
      </View>
    </View>
  );
}