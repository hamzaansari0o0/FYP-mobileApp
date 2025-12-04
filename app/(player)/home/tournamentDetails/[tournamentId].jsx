import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, ScrollView, ActivityIndicator, Alert, 
  Pressable, SectionList // 1. SectionList import karein
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, Link } from 'expo-router';
import tw from 'twrnc';
import { db } from '../../../../firebase/firebaseConfig';
import { 
  doc, getDoc, collection, query, where, 
  getDocs, orderBy // 2. Naye imports (matches fetch karne ke liye)
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';

// === Countdown Timer Component (Waisa hi) ===
const CountdownTimer = ({ deadline }) => {
  const calculateTimeLeft = () => {
    const difference = deadline.getTime() - new Date().getTime();
    let timeLeft = {};
    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    } else {
      timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    return timeLeft;
  };
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  useEffect(() => {
    const timer = setTimeout(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearTimeout(timer);
  });
  const formatTime = (value) => value.toString().padStart(2, '0');
  const isExpired = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  return (
    <View style={tw`bg-red-100 border border-red-300 p-4 rounded-lg mb-5`}>
      <Text style={tw`text-base font-bold text-red-700 text-center mb-2`}>
        {isExpired ? "Registration Closed" : "Registration Closes In:"}
      </Text>
      <View style={tw`flex-row justify-center`}>
        <View style={tw`items-center mx-2`}>
          <Text style={tw`text-3xl font-bold text-red-800`}>{formatTime(timeLeft.days)}</Text>
          <Text style={tw`text-xs text-red-600`}>DAYS</Text>
        </View>
        <Text style={tw`text-3xl font-bold text-red-800`}>:</Text>
        <View style={tw`items-center mx-2`}>
          <Text style={tw`text-3xl font-bold text-red-800`}>{formatTime(timeLeft.hours)}</Text>
          <Text style={tw`text-xs text-red-600`}>HOURS</Text>
        </View>
        <Text style={tw`text-3xl font-bold text-red-800`}>:</Text>
        <View style={tw`items-center mx-2`}>
          <Text style={tw`text-3xl font-bold text-red-800`}>{formatTime(timeLeft.minutes)}</Text>
          <Text style={tw`text-xs text-red-600`}>MINUTES</Text>
        </View>
        <Text style={tw`text-3xl font-bold text-red-800`}>:</Text>
        <View style={tw`items-center mx-2`}>
          <Text style={tw`text-3xl font-bold text-red-800`}>{formatTime(timeLeft.seconds)}</Text>
          <Text style={tw`text-xs text-red-600`}>SECONDS</Text>
        </View>
      </View>
    </View>
  );
};

// === DetailRow Component (Waisa hi) ===
const DetailRow = ({ icon, label, value }) => (
  <View style={tw`flex-row items-start mb-3`}>
    <Ionicons name={icon} size={20} color={tw.color('blue-600')} style={tw`mt-1`} />
    <View style={tw`ml-3`}>
      <Text style={tw`text-sm font-bold text-gray-500`}>{label}</Text>
      <Text style={tw`text-base text-gray-800 capitalize`}>{value}</Text>
    </View>
  </View>
);

// === 3. NAYA "Winner Banner" Component ===
const WinnerBanner = ({ winnerName }) => (
  <View style={tw`bg-yellow-300 border border-yellow-500 p-4 rounded-lg mb-5 items-center`}>
    <Ionicons name="trophy" size={40} color={tw.color('yellow-800')} />
    <Text style={tw`text-xl font-bold text-yellow-900 mt-2`}>Tournament Winner</Text>
    <Text style={tw`text-2xl font-bold text-yellow-900`}>{winnerName}</Text>
  </View>
);

// === 4. NAYA "Registration Closed" Banner Component ===
const RegistrationClosedBanner = ({ startDate }) => (
  <View style={tw`bg-red-100 border border-red-300 p-4 rounded-lg mb-5 items-center`}>
    <Ionicons name="close-circle-outline" size={30} color={tw.color('red-700')} />
    <Text style={tw`text-lg font-bold text-red-800 mt-2`}>Registrations are Closed</Text>
    <Text style={tw`text-base text-gray-700`}>
      Tournament starts on: {moment(startDate).format('D MMM, YYYY')}
    </Text>
  </View>
);

// === 5. NAYA "Player Match Card" Component ===
// (Owner ke MatchCard se thoda alag, kyunki ismein 'Update' button nahi hai)
const PlayerMatchCard = ({ match }) => {
  const isCompleted = match.status === 'completed';
  const winnerId = match.winner?.id;
  // Haarne wali team ko gray karein
  const teamAStyle = isCompleted && winnerId !== match.teamA?.id ? 'text-gray-400' : 'text-gray-800';
  const teamBStyle = isCompleted && winnerId !== match.teamB?.id ? 'text-gray-400' : 'text-gray-800';

  return (
    <View style={tw`bg-white p-3 rounded-lg shadow-sm mb-3 border border-gray-200`}>
      <Text style={tw`text-xs text-gray-500`}>Round {match.round} - Match {match.matchNumber}</Text>
      <View style={tw`flex-row items-center justify-between mt-1`}>
        {/* Team A */}
        <Text style={tw`text-base font-bold w-[40%] ${teamAStyle}`}>{match.teamA?.name || 'Waiting...'}</Text>
        {/* Score / vs */}
        {isCompleted ? (
          <Text style={tw`text-lg font-bold text-blue-600`}>{match.scoreA} - {match.scoreB}</Text>
        ) : (
          <Text style={tw`text-sm text-gray-500`}>vs</Text>
        )}
        {/* Team B */}
        <Text style={tw`text-base font-bold w-[40%] text-right ${teamBStyle}`}>{match.teamB?.name || 'Waiting...'}</Text>
      </View>
      {/* Winner dikhayein */}
      {isCompleted && match.winner && (
         <Text style={tw`text-center text-green-600 font-semibold mt-1`}>
           Winner: {match.winner.name}
         </Text>
      )}
    </View>
  );
};


// === 6. MAIN COMPONENT (Updated Data Fetching ke saath) ===
export default function TournamentDetailsScreen() {
  const { tournamentId } = useLocalSearchParams();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]); // Matches ke liye nayi state
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;
    
    // Dono (tournament aur matches) ko fetch karein
    const fetchAllData = async () => {
      setLoading(true);
      try {
        // 1. Tournament Details fetch karein
        const docRef = doc(db, 'tournaments', tournamentId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const tourData = { id: docSnap.id, ...docSnap.data() };
          setTournament(tourData);

          // 2. Agar tournament 'live' ya 'completed' hai, to matches fetch karein
          if (tourData.status === 'live' || tourData.status === 'completed') {
            const matchesQuery = query(
              collection(db, 'tournamentMatches'),
              where('tournamentId', '==', tournamentId),
              orderBy('round', 'asc'),
              orderBy('matchNumber', 'asc')
            );
            const matchesSnap = await getDocs(matchesQuery);
            const matchesList = matchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMatches(matchesList);
          }
        } else {
          Alert.alert("Error", "Tournament not found.");
        }
      } catch (error) {
        console.error("Error fetching tournament: ", error);
        Alert.alert("Error", "Could not load details.");
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [tournamentId]); // Jab ID badle to dobara fetch karein

  // Matches ko Round ke hisab se group karein (SectionList ke liye)
  const groupedMatches = useMemo(() => {
    const groups = {};
    matches.forEach(match => {
      const round = match.round;
      if (!groups[round]) {
        groups[round] = { title: `Round ${round}`, data: [] };
      }
      groups[round].data.push(match);
    });
    return Object.values(groups);
  }, [matches]);

  if (loading) {
    return <ActivityIndicator size="large" style={tw`mt-20`} />;
  }
  if (!tournament) {
    return <Text style={tw`text-center text-red-500 mt-10`}>Tournament details not available.</Text>;
  }

  // Registration button ke liye logic
  const isRegistrationOpen = 
    tournament.status === 'registration_open' && 
    tournament.registrationDeadline.toDate() > new Date();

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <Stack.Screen options={{ title: tournament.tournamentName }} />
      
      {/* === 7. NAYA UI: SectionList (Matches aur Details ko ek saath handle karne ke liye) === */}
      <SectionList
        sections={groupedMatches} // Match data
        keyExtractor={(item) => item.id}
        contentContainerStyle={tw`p-5`}
        
        // Match ka card
        renderItem={({ item }) => <PlayerMatchCard match={item} />} 
        
        // Round ka header (e.g., "Round 1")
        renderSectionHeader={({ section: { title } }) => (
          <Text style={tw`text-xl font-bold text-gray-800 mb-2 mt-4`}>{title}</Text>
        )}

        // --- Saari Details ab Header mein ---
        ListHeaderComponent={
          <>
            <Text style={tw`text-3xl font-bold text-gray-800`}>{tournament.tournamentName}</Text>
            <Text style={tw`text-lg text-gray-600 mb-5`}>Hosted by {tournament.arenaName}</Text>
            
            {/* --- NAYA CONDITIONAL BANNER --- */}
            {tournament.status === 'completed' ? (
              <WinnerBanner winnerName={tournament.tournamentWinner?.name || 'N/A'} />
            ) : isRegistrationOpen ? (
              <CountdownTimer deadline={tournament.registrationDeadline.toDate()} />
            ) : (
              <RegistrationClosedBanner startDate={tournament.startDate.toDate()} />
            )}
            {/* --- BANNER KHATAM --- */}

            <View style={tw`bg-gray-100 p-4 rounded-lg`}>
              <DetailRow icon="game-controller-outline" label="Game Type" value={`${tournament.gameType} ${tournament.teamSize}`} />
              <DetailRow icon="trophy-outline" label="Format" value={tournament.format} />
              <DetailRow icon="cash-outline" label="Entry Fee" value={`Rs. ${tournament.entryFee}`} />
              <DetailRow icon="gift-outline" label="Prize Money" value={`Rs. ${tournament.prizeMoney}`} />
              <DetailRow icon="people-outline" label="Teams" value={`${tournament.registeredTeamCount} / ${tournament.teamLimit || 'Unlimited'}`} />
            </View>

            <Text style={tw`text-xl font-bold text-gray-800 mt-6 mb-2`}>Rules</Text>
            <Text style={tw`text-base text-gray-700 mb-4`}>{tournament.rules || 'No specific rules provided.'}</Text>
            
            {/* Match schedule ka title (agar matches hain) */}
            {matches.length > 0 && (
              <Text style={tw`text-2xl font-bold text-gray-800 mt-4`}>Match Schedule</Text>
            )}
          </>
        }
      />

      {/* --- NAYA STICKY BOTTOM LOGIC --- */}
      {/* Yeh view ab sirf tab dikhega jab registration open ho */}
      {isRegistrationOpen && (
        <View style={tw`p-4 border-t border-gray-200 bg-white`}>
          <Link href={`/home/teamRegistration/${tournament.id}`} asChild>
            <Pressable style={tw`bg-green-600 py-3 rounded-lg shadow-md`}>
              <Text style={tw`text-white text-center text-lg font-bold`}>
                Register Your Team (Rs. {tournament.entryFee})
              </Text>
            </Pressable>
          </Link>
        </View>
      )}
      {/* Agar registration band hai ya tournament complete hai, to button nahi dikhega */}

    </SafeAreaView>
  );
}