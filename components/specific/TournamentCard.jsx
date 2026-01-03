import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import moment from 'moment';
import React from 'react';
import { ImageBackground, Pressable, Text, View } from 'react-native';
import tw from 'twrnc';

// === 1. UPDATED: Status Badge Logic ===
const StatusBadge = ({ status, deadlineTimestamp }) => {
  let bgColor, textColor, text;
  
  // Date check logic
  const now = new Date();
  const deadline = deadlineTimestamp?.toDate ? deadlineTimestamp.toDate() : null;
  const isRegistrationClosed = deadline && deadline < now;

  if (status === 'completed') {
    bgColor = 'bg-gray-700';
    textColor = 'text-white';
    text = 'Finished';
  } else if (status === 'live') {
    bgColor = 'bg-red-600';
    textColor = 'text-white';
    text = 'Live';
  } else if (status === 'registration_open') {
    // Yahan check hoga ke date nikal gayi ya nahi
    if (isRegistrationClosed) {
      bgColor = 'bg-red-700'; // Dark Red for Closed
      textColor = 'text-white';
      text = 'Registration Closed';
    } else {
      bgColor = 'bg-green-600';
      textColor = 'text-white';
      text = 'Register Now';
    }
  } else {
    return null;
  }

  return (
    <View style={tw`absolute top-3 right-3 ${bgColor} px-3 py-1 rounded-full shadow-lg z-10`}>
      <Text style={tw`font-bold ${textColor} text-xs`}>{text.toUpperCase()}</Text>
    </View>
  );
};

export default function TournamentCard({ tournament }) {
  // Arena ki default image
  const arenaImage = tournament.arenaImageUrl
    ? { uri: tournament.arenaImageUrl }
    : require('../../assets/images/tournament-futsal-image-3.jpg'); // Adjust path as needed

  return (
    <Link href={`/home/tournamentDetails/${tournament.id}`} asChild>
      <Pressable style={tw`w-full h-52 rounded-xl overflow-hidden mb-4 shadow-lg`}>
        <ImageBackground
          source={arenaImage}
          resizeMode="cover"
          style={tw`flex-1 justify-between p-3`}
        >
          {/* Black overlay effect */}
          <View style={tw`absolute inset-0 bg-black/40`} />
          
          {/* === 2. STATUS BADGE with Deadline Prop === */}
          <StatusBadge 
            status={tournament.status} 
            deadlineTimestamp={tournament.registrationDeadline} 
          />

          {/* Top Row: Game Type */}
          <View style={tw`self-start bg-blue-600 px-3 py-1 rounded-full`}>
            <Text style={tw`text-white font-bold capitalize text-xs`}>
              {tournament.gameType} {tournament.teamSize}
            </Text>
          </View>

          {/* Bottom Details */}
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
              <Ionicons name="calendar-outline" size={14} color="white" />
              <Text style={tw`text-sm text-gray-200 shadow-md ml-1`}>
                Starts: {moment(tournament.startDate?.toDate()).format('D MMM, h:mm A')}
              </Text>
            </View>
          </View>
        </ImageBackground>
      </Pressable>
    </Link>
  );
}