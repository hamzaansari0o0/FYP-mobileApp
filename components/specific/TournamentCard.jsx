import React from 'react';
import { View, Text, Pressable, ImageBackground } from 'react-native';
import { Link } from 'expo-router';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';

// === 1. NAYA COMPONENT: Status Badge ===
const StatusBadge = ({ status }) => {
  let bgColor, textColor, text;

  if (status === 'registration_open') {
    bgColor = 'bg-green-600';
    textColor = 'text-white';
    text = 'Register Now';
  } else if (status === 'live') {
    bgColor = 'bg-red-600';
    textColor = 'text-white';
    text = 'Live';
  } else if (status === 'completed') {
    bgColor = 'bg-gray-700';
    textColor = 'text-white';
    text = 'Finished';
  } else {
    return null; // Agar koi aur status ho to kuch na dikhayein
  }

  return (
    <View style={tw`absolute top-3 right-3 ${bgColor} px-3 py-1 rounded-full shadow-lg`}>
      <Text style={tw`font-bold ${textColor} text-xs`}>{text.toUpperCase()}</Text>
    </View>
  );
};

export default function TournamentCard({ tournament }) {
  // Arena ki default image
  const arenaImage = tournament.arenaImageUrl
    ? { uri: tournament.arenaImageUrl }
    : require('../../assets/images/hero-image.png'); // Default image

  return (
    // Link (waisa hi)
    <Link href={`/home/tournamentDetails/${tournament.id}`} asChild>
      <Pressable style={tw`w-full h-52 rounded-xl overflow-hidden mb-4 shadow-lg`}>
        <ImageBackground
          source={arenaImage}
          resizeMode="cover"
          style={tw`flex-1 justify-between p-3`}
        >
          {/* Black overlay effect (waisa hi) */}
          <View style={tw`absolute inset-0 bg-black/40`} />
          
          {/* === 2. STATUS BADGE (Top-Right) === */}
          <StatusBadge status={tournament.status} />

          {/* Top Row: Game Type (Top-Left, waisa hi) */}
          <View style={tw`self-start bg-blue-600 px-3 py-1 rounded-full`}>
            <Text style={tw`text-white font-bold capitalize`}>
              {tournament.gameType} {tournament.teamSize}
            </Text>
          </View>

          {/* Bottom Details (waisay hi) */}
          <View>
            <Text 
              style={tw`text-2xl font-bold text-white shadow-md`}
              numberOfLines={1}
            >
              {tournament.tournamentName}
            </Text>
            <Text 
              style={tw`text-base text-gray-200 shadow-md`}
              numberOfLines={1}
            >
              {tournament.arenaName}
            </Text>
            <View style={tw`flex-row items-center mt-1`}>
              <Ionicons name="calendar-outline" size={14} color={tw.color("white")} />
              <Text style={tw`text-sm text-gray-200 shadow-md ml-1`}>
                Starts: {moment(tournament.startDate.toDate()).format('D MMM')}
              </Text>
            </View>
          </View>
        </ImageBackground>
      </Pressable>
    </Link>
  );
}