import React, { useState, useCallback } from 'react';
import { 
  View, Text, ActivityIndicator, 
  FlatList, SectionList, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../firebase/firebaseConfig';
import { 
  collection, query, where, getDocs, doc, getDoc, 
  orderBy // 1. 'orderBy' import karein (sorting ke liye)
} from 'firebase/firestore';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';

// === 2. MATCH CARD (Updated) ===
// Ismein 'playerTeam' prop add kiya gaya hai (highlighting ke liye)
const MatchCard = ({ match, playerTeam }) => {
  const isCompleted = match.status === 'completed';
  
  // Check karein ke yeh match player ka hai
  const isMyTeamA = playerTeam && playerTeam.id === match.teamA?.id;
  const isMyTeamB = playerTeam && playerTeam.id === match.teamB?.id;
  const isMyMatch = isMyTeamA || isMyTeamB;

  // Loser team ko gray karein
  const winnerId = match.winner?.id;
  const teamAStyle = isCompleted && winnerId !== match.teamA?.id ? 'text-gray-400' : 'text-blue-600';
  const teamBStyle = isCompleted && winnerId !== match.teamB?.id ? 'text-gray-400' : 'text-blue-600';

  return (
    // Agar player ka match hai to highlight karein
    <View style={tw.style(
      `bg-white p-3 rounded-lg shadow-sm mb-3 border`,
      isMyMatch ? 'border-blue-500' : 'border-gray-200'
    )}>
      
      {/* Status (e.g., Round 1 - Completed) */}
      <Text style={tw.style(
        `text-xs font-semibold`,
        isCompleted ? 'text-green-600' : 'text-gray-500' // 'Completed' ya 'Upcoming'
      )}>
        Round {match.round} - {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
      </Text>
      
      <View style={tw`flex-row items-center justify-between mt-1`}>
        {/* Team A */}
        <Text style={tw`text-base font-bold w-[40%] ${teamAStyle}`}>
          {match.teamA?.name || 'Waiting...'}
        </Text>
        
        {/* Score ya 'vs' */}
        {isCompleted ? ( // Agar match complete hai to score dikhayein
          <Text style={tw`text-lg font-bold text-black`}>{match.scoreA} - {match.scoreB}</Text>
        ) : (
          <Text style={tw`text-sm text-gray-500`}>vs</Text>
        )}
        
        {/* Team B */}
        <Text style={tw`text-base font-bold w-[40%] text-right ${teamBStyle}`}>
          {match.teamB?.name || 'Waiting...'}
        </Text>
      </View>

      {/* Agar player ka match hai to badge dikhayein */}
      {isMyMatch && !isCompleted && (
        <View style={tw`absolute top-[-10px] right-2 bg-blue-500 px-2 py-1 rounded-full`}>
          <Text style={tw`text-white text-xs font-bold`}>Your Match</Text>
        </View>
      )}
    </View>
  );
};

export default function MatchScheduleScreen() {
  const { user } = useAuth();
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Nayi state taake humein pata ho player ki team konsi hai
  const [myRegistrations, setMyRegistrations] = useState(new Map());

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchFullSchedule();
      }
    }, [user])
  );

  const fetchFullSchedule = async () => {
    setLoading(true);
    try {
      // 1. Player ki saari registrations (teams) dhoondein
      const regQuery = query(
        collection(db, 'tournamentRegistrations'), 
        where('playerId', '==', user.uid)
      );
      const regSnap = await getDocs(regQuery);
      
      if (regSnap.empty) {
        setScheduleData([]);
        setLoading(false);
        return;
      }

      // 2. Un tournaments ki IDs aur Team details save karein
      const tournamentIds = [];
      const tempRegMap = new Map();
      regSnap.docs.forEach(doc => {
        const data = doc.data();
        if (!tournamentIds.includes(data.tournamentId)) {
          tournamentIds.push(data.tournamentId);
        }
        // Save karein: tournamentId -> { teamId (registration ID), teamName }
        tempRegMap.set(data.tournamentId, { id: doc.id, name: data.teamName });
      });
      setMyRegistrations(tempRegMap); // Nayi state update karein

      // 3. === QUERY FIX ===
      // Un sab tournaments ke SAARE matches fetch karein (sirf 'upcoming' nahi)
      const matchesQuery = query(
        collection(db, 'tournamentMatches'),
        where('tournamentId', 'in', tournamentIds),
        // Sort karein
        orderBy('round', 'asc'),
        orderBy('matchNumber', 'asc')
      );
      const matchesSnap = await getDocs(matchesQuery);

      // 4. Matches ko Tournament ke hisaab se group karein
      const groupedData = {};
      matchesSnap.docs.forEach(doc => {
        const match = { id: doc.id, ...doc.data() };
        const tourId = match.tournamentId;
        if (!groupedData[tourId]) {
          groupedData[tourId] = { data: [] };
        }
        groupedData[tourId].data.push(match);
      });
      
      // 5. Final data structure banayein
      const finalScheduleData = [];
      for (const tourId of tournamentIds) {
        if (groupedData[tourId] && groupedData[tourId].data.length > 0) {
          const tourDoc = await getDoc(doc(db, 'tournaments', tourId));
          const tourName = tourDoc.exists() ? tourDoc.data().tournamentName : "Unknown Tournament";
          
          finalScheduleData.push({
            title: tourName,
            myTeam: tempRegMap.get(tourId), // Player ki team ki info add karein
            data: groupedData[tourId].data,
          });
        }
      }

      setScheduleData(finalScheduleData);

    } catch (error) {
      console.error("Error fetching schedule: ", error);
      Alert.alert("Error", "Could not load schedule.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-100`}>
      {loading ? (
        <ActivityIndicator size="large" style={tw`mt-20`} />
      ) : (
        <SectionList
          sections={scheduleData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={tw`p-4`}
          // === 4. RENDER ITEM UPDATE ===
          // 'myTeam' prop ko MatchCard mein pass karein
          renderItem={({ item, section }) => (
            <MatchCard match={item} playerTeam={section.myTeam} />
          )}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={tw`text-xl font-bold text-gray-800 mb-2 mt-4`}>
              {title}
            </Text>
          )}
          ListEmptyComponent={
            <View style={tw`items-center justify-center mt-20 p-5`}>
              <Ionicons name="shield-outline" size={40} color={tw.color("gray-400")} />
              <Text style={tw`text-lg text-gray-500 mt-2 text-center`}>
                You have no matches scheduled.
              </Text>
              <Text style={tw`text-sm text-gray-400 mt-1 text-center`}>
                (Schedules appear after the owner generates them)
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}