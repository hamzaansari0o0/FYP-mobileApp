import { Ionicons, MaterialIcons } from '@expo/vector-icons'; // MaterialIcons added
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  collection,
  doc, getDoc,
  getDocs, orderBy,
  query, where
} from 'firebase/firestore';
import moment from 'moment';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert,
  Linking,
  Platform, // Added
  Pressable, SectionList, StatusBar,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { db } from '../../../../firebase/firebaseConfig';

// === 🔥 1. MAP OPENING LOGIC (From History Screen) ===
const openMapsForDirections = (lat, lng, label) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lng}`;
    const labelEncoded = encodeURIComponent(label);
    
    const url = Platform.select({
        ios: `${scheme}${labelEncoded}@${latLng}`,
        android: `${scheme}${latLng}(${labelEncoded})`
    });

    Linking.openURL(url).catch(err => {
        Linking.openURL(`http://googleusercontent.com/maps.google.com/maps?q=${lat},${lng}`);
    });
};

// === 2. Countdown Timer Component ===
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
    <View style={tw`bg-green-50 border border-green-200 p-4 rounded-xl mb-6 shadow-sm`}>
      <Text style={tw`text-sm font-bold text-green-800 text-center mb-2 uppercase tracking-wide`}>
        {isExpired ? "Registration Closed" : "Registration Ends In"}
      </Text>
      <View style={tw`flex-row justify-center items-center`}>
        <TimeBlock value={formatTime(timeLeft.days)} label="DAYS" />
        <Text style={tw`text-2xl font-bold text-green-700 pb-4`}>:</Text>
        <TimeBlock value={formatTime(timeLeft.hours)} label="HRS" />
        <Text style={tw`text-2xl font-bold text-green-700 pb-4`}>:</Text>
        <TimeBlock value={formatTime(timeLeft.minutes)} label="MIN" />
        <Text style={tw`text-2xl font-bold text-green-700 pb-4`}>:</Text>
        <TimeBlock value={formatTime(timeLeft.seconds)} label="SEC" />
      </View>
    </View>
  );
};

const TimeBlock = ({ value, label }) => (
  <View style={tw`items-center mx-2`}>
    <Text style={tw`text-2xl font-bold text-green-900`}>{value}</Text>
    <Text style={tw`text-[10px] text-green-700 font-bold`}>{label}</Text>
  </View>
);

// === 3. DetailRow Component ===
const DetailRow = ({ icon, label, value }) => (
  <View style={tw`flex-row items-center mb-3 bg-white p-3 rounded-lg shadow-sm border border-gray-100`}>
    <View style={tw`bg-green-100 p-2 rounded-full`}>
        <Ionicons name={icon} size={18} color="#15803d" />
    </View>
    <View style={tw`ml-3 flex-1`}>
      <Text style={tw`text-xs font-bold text-gray-400 uppercase`}>{label}</Text>
      <Text style={tw`text-sm font-semibold text-gray-800 capitalize`}>{value}</Text>
    </View>
  </View>
);

// === 4. Winner Banner ===
const WinnerBanner = ({ winnerName }) => (
  <View style={tw`bg-yellow-50 border border-yellow-200 p-5 rounded-xl mb-6 items-center shadow-sm`}>
    <Ionicons name="trophy" size={40} color="#ca8a04" />
    <Text style={tw`text-lg font-bold text-yellow-800 mt-2`}>Tournament Winner</Text>
    <Text style={tw`text-2xl font-extrabold text-yellow-900 mt-1`}>{winnerName}</Text>
  </View>
);

// === 5. Registration Closed Banner ===
const RegistrationClosedBanner = ({ startDate }) => (
  <View style={tw`bg-red-50 border border-red-200 p-4 rounded-xl mb-6 flex-row items-center`}>
    <Ionicons name="alert-circle" size={32} color="#b91c1c" />
    <View style={tw`ml-3 flex-1`}>
        <Text style={tw`text-base font-bold text-red-800`}>Registrations Closed</Text>
        <Text style={tw`text-xs text-red-600 mt-1`}>
            Tournament starts on: {moment(startDate).format('MMM D, YYYY • h:mm A')}
        </Text>
    </View>
  </View>
);

// === 6. Player Match Card ===
const PlayerMatchCard = ({ match }) => {
  const isCompleted = match.status === 'completed';
  const winnerId = match.winner?.id;
  
  const teamAStyle = isCompleted && winnerId !== match.teamA?.id ? 'text-gray-400' : 'text-gray-800';
  const teamBStyle = isCompleted && winnerId !== match.teamB?.id ? 'text-gray-400' : 'text-gray-800';

  return (
    <View style={tw`bg-white p-4 rounded-xl shadow-sm mb-3 border border-gray-100 mx-1`}>
      <View style={tw`flex-row justify-between mb-2`}>
        <Text style={tw`text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded`}>Match {match.matchNumber}</Text>
        {isCompleted && <Text style={tw`text-xs font-bold text-gray-400`}>Finished</Text>}
      </View>
      
      <View style={tw`flex-row items-center justify-between`}>
        <Text style={tw`text-sm font-bold w-[35%] ${teamAStyle}`} numberOfLines={1}>
            {match.teamA?.name || 'TBD'}
        </Text>
        
        <View style={tw`bg-gray-100 px-3 py-1 rounded-full`}>
            {isCompleted ? (
            <Text style={tw`text-sm font-bold text-gray-800`}>{match.scoreA} - {match.scoreB}</Text>
            ) : (
            <Text style={tw`text-xs font-bold text-gray-500`}>VS</Text>
            )}
        </View>

        <Text style={tw`text-sm font-bold w-[35%] text-right ${teamBStyle}`} numberOfLines={1}>
            {match.teamB?.name || 'TBD'}
        </Text>
      </View>

      {isCompleted && match.winner && (
         <View style={tw`mt-3 pt-2 border-t border-gray-100 flex-row items-center justify-center`}>
            <Ionicons name="trophy" size={14} color="#15803d" />
            <Text style={tw`text-xs font-bold text-green-700 ml-1`}>
               Winner: {match.winner.name}
            </Text>
         </View>
      )}
    </View>
  );
};


// === MAIN COMPONENT ===
export default function TournamentDetailsScreen() {
  const { tournamentId } = useLocalSearchParams(); 
  const router = useRouter();
  
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMap, setLoadingMap] = useState(false); // 🔥 For Map Loading

  // --- Fetch Data ---
  useEffect(() => {
    if (!tournamentId) return;
    
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'tournaments', tournamentId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const tourData = { id: docSnap.id, ...docSnap.data() };
          setTournament(tourData);

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
          router.back();
        }
      } catch (error) {
        console.error("Error fetching data: ", error);
        Alert.alert("Error", "Could not load details.");
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [tournamentId]);

  // --- Group Matches by Round ---
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

  // === 🔥 7. NEW: Handle Get Direction Logic ===
  const handleGetDirection = async () => {
    if (!tournament) return;
    setLoadingMap(true);

    try {
        let lat = tournament.location?.latitude;
        let lng = tournament.location?.longitude;
        const arenaName = tournament.arenaName || "Arena";

        // 1. Agar tournament me location already hai
        if (lat && lng) {
            openMapsForDirections(lat, lng, arenaName);
            setLoadingMap(false);
            return;
        }

        // 2. Agar nahi, to Arena Owner se fetch kro (using arenaId)
        if (tournament.arenaId) {
            const ownerRef = doc(db, "users", tournament.arenaId);
            const ownerSnap = await getDoc(ownerRef);

            if (ownerSnap.exists()) {
                const ownerData = ownerSnap.data();
                if (ownerData.location && ownerData.location.latitude) {
                    lat = ownerData.location.latitude;
                    lng = ownerData.location.longitude;
                    openMapsForDirections(lat, lng, ownerData.arenaName || arenaName);
                } else {
                    Alert.alert("Location Not Found", "The arena owner hasn't set a pinned location.");
                }
            } else {
                Alert.alert("Error", "Arena details not found.");
            }
        } else {
            // 3. Fallback: Address Search
             const address = tournament.arenaAddress || arenaName;
             const url = Platform.select({
                ios: `maps:0,0?q=${encodeURIComponent(address)}`,
                android: `geo:0,0?q=${encodeURIComponent(address)}`
            });
            Linking.openURL(url);
        }

    } catch (error) {
        console.error("Map Error:", error);
        Alert.alert("Error", "Could not fetch location.");
    } finally {
        setLoadingMap(false);
    }
  };

  if (loading) {
    return (
        <View style={tw`flex-1 bg-green-800 justify-center items-center`}>
            <Stack.Screen options={{ headerShown: false }} /> 
            <ActivityIndicator size="large" color="white" />
        </View>
    );
  }

  if (!tournament) return null;

  const isRegistrationOpen = 
    tournament.status === 'registration_open' && 
    tournament.registrationDeadline?.toDate() > new Date();

  return (
    <SafeAreaView style={tw`flex-1 bg-green-800`}>
      {/* HEADER HIDE KARNE WALI LINE */}
      <Stack.Screen options={{ headerShown: false }} /> 

      <StatusBar barStyle="light-content" backgroundColor="#166534" />
      
      {/* --- Custom Header --- */}
      <View style={tw`px-5 py-4 bg-green-800 flex-row items-center`}>
        <Pressable 
            onPress={() => router.back()} 
            style={tw`p-2 bg-white/20 rounded-full mr-3`}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text style={tw`text-xl font-bold text-white flex-1`} numberOfLines={1}>
          Tournament Details
        </Text>
      </View>

      {/* --- Body --- */}
      <View style={tw`flex-1 bg-gray-50 rounded-t-3xl overflow-hidden`}>
        <SectionList
          sections={groupedMatches}
          keyExtractor={(item) => item.id}
          // Added pb-32 to give space for scrolling
          contentContainerStyle={tw`p-5 pb-32`} 
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}

          // --- HEADER: All Tournament Info ---
          ListHeaderComponent={
            <>
              <Text style={tw`text-2xl font-bold text-gray-900 mb-1`}>
                {tournament.tournamentName}
              </Text>
              
              {/* ✅ HOST INFO & GET DIRECTION BUTTON */}
              <View style={tw`flex-row items-center justify-between mb-6`}>
                 <View style={tw`flex-row items-center flex-1 mr-2`}>
                    <Ionicons name="location-outline" size={18} color="gray" />
                    <Text style={tw`text-gray-500 ml-1`} numberOfLines={1}>
                        Hosted by {tournament.arenaName}
                    </Text>
                 </View>
                 
                 {/* 🔥 UPDATED DIRECTION BUTTON (BLUE PILL STYLE) */}
                 <Pressable 
                    onPress={handleGetDirection}
                    disabled={loadingMap}
                    style={tw`flex-row items-center bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full active:bg-blue-100`}
                 >
                    {loadingMap ? (
                        <ActivityIndicator size="small" color="#2563EB" />
                    ) : (
                        <>
                            <MaterialIcons name="directions" size={16} color="#2563EB" style={tw`mr-1`} />
                            <Text style={tw`text-blue-600 font-bold text-xs`}>Get Direction</Text>
                        </>
                    )}
                 </Pressable>
              </View>

              {/* Status Banners */}
              {tournament.status === 'completed' ? (
                <WinnerBanner winnerName={tournament.tournamentWinner?.name || 'Unknown'} />
              ) : isRegistrationOpen ? (
                <CountdownTimer deadline={tournament.registrationDeadline.toDate()} />
              ) : (
                <RegistrationClosedBanner startDate={tournament.startDate.toDate()} />
              )}

              {/* Info Grid */}
              <View style={tw`mb-6`}>
                <Text style={tw`text-lg font-bold text-gray-800 mb-3`}>Overview</Text>
                <View style={tw`flex-row flex-wrap justify-between`}>
                    <View style={tw`w-[48%]`}>
                        <DetailRow icon="game-controller" label="Game" value={tournament.gameType} />
                        <DetailRow icon="people" label="Format" value={tournament.teamSize} />
                        <DetailRow icon="trophy" label="Prize" value={`₹${tournament.prizeMoney}`} />
                    </View>
                    <View style={tw`w-[48%]`}>
                        <DetailRow icon="calendar" label="Date" value={moment(tournament.startDate.toDate()).format('D MMM')} />
                        <DetailRow icon="layers" label="Type" value={tournament.format} />
                        <DetailRow icon="cash" label="Entry" value={`₹${tournament.entryFee}`} />
                    </View>
                </View>
              </View>

              {/* Rules Section */}
              <View style={tw`bg-white p-4 rounded-xl border border-gray-200 mb-6`}>
                 <Text style={tw`text-lg font-bold text-gray-800 mb-2`}>Rules & Info</Text>
                 <Text style={tw`text-gray-600 leading-5 text-sm`}>
                    {tournament.rules || 'No specific rules provided by the host.'}
                 </Text>
              </View>

              {/* Matches Header (If Matches Exist) */}
              {matches.length > 0 && (
                 <View style={tw`flex-row items-center mb-2 mt-2`}>
                    <Ionicons name="git-network-outline" size={24} color="#15803d" style={tw`mr-2`} />
                    <Text style={tw`text-xl font-bold text-gray-800`}>Bracket / Matches</Text>
                 </View>
              )}
            </>
          }

          // --- SECTION HEADER: Round Titles ---
          renderSectionHeader={({ section: { title } }) => (
            <View style={tw`bg-gray-200 py-1 px-3 rounded-lg self-start mt-4 mb-2`}>
                <Text style={tw`text-sm font-bold text-gray-700`}>{title}</Text>
            </View>
          )}

          // --- ITEM: Match Card ---
          renderItem={({ item }) => <PlayerMatchCard match={item} />}

          // --- EMPTY STATE ---
          ListEmptyComponent={
             (!loading && (tournament.status === 'live' || tournament.status === 'completed') && matches.length === 0) ? (
                <View style={tw`items-center py-10`}>
                    <Text style={tw`text-gray-400`}>Matches are being scheduled...</Text>
                </View>
             ) : null
          }

          // Button Footer
          ListFooterComponent={
            isRegistrationOpen ? (
                <View style={tw`mt-8 mb-5`}>
                    <Link href={`/home/teamRegistration/${tournamentId}`} asChild>
                    <Pressable style={tw`bg-green-800 py-4 rounded-xl shadow-md flex-row justify-center items-center`}>
                        <Ionicons name="person-add" size={20} color="white" style={tw`mr-2`} />
                        <Text style={tw`text-white text-center text-lg font-bold`}>
                            Register Team • ₹{tournament.entryFee}
                        </Text>
                    </Pressable>
                    </Link>
                </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}