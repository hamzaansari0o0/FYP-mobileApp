import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, SectionList, ActivityIndicator } from 'react-native';
import tw from 'twrnc';
import UpdateScoreModal from './UpdateScoreModal'; // Modal
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';

// Match Card (jo matches dikhaye ga)
const MatchCard = ({ match, onUpdatePress }) => {
  // Check karein ke match abhi shuru ho sakta hai ya nahi
  const isPending = match.status === 'pending'; // Waiting for teams
  const isUpcoming = match.status === 'upcoming'; // Ready to play
  const isCompleted = match.status === 'completed';
  
  return (
    <View style={tw`bg-white p-3 rounded-lg shadow-sm mb-3 border border-gray-200`}>
      <Text style={tw`text-xs text-gray-500`}>Round {match.round} - Match {match.matchNumber}</Text>
      
      <View style={tw`flex-row items-center justify-between mt-1`}>
        {/* Team A */}
        <View style={tw`flex-1`}>
          <Text style={tw.style(
            `text-base font-bold`,
            isCompleted && match.winner?.id !== match.teamA?.id && 'text-gray-400', // Haarne wali team
            match.teamA?.id === 'BYE' && 'text-gray-400 italic' // Bye team
          )}>
            {match.teamA?.name || 'Waiting...'}
          </Text>
        </View>
        
        {/* Score / vs */}
        <View style={tw`px-2`}>
          {isCompleted ? (
            <Text style={tw`text-lg font-bold text-blue-600`}>
              {match.scoreA} - {match.scoreB}
            </Text>
          ) : (
            <Text style={tw`text-sm text-gray-500`}>vs</Text>
          )}
        </View>
        
        {/* Team B */}
        <View style={tw`flex-1`}>
          <Text style={tw.style(
            `text-base font-bold text-right`,
            isCompleted && match.winner?.id !== match.teamB?.id && 'text-gray-400', // Haarne wali team
            match.teamB?.id === 'BYE' && 'text-gray-400 italic'
          )}>
            {match.teamB?.name || 'Waiting...'}
          </Text>
        </View>
      </View>

      {/* Button Logic */}
      {isCompleted ? (
        <Text style={tw`text-center text-green-600 font-bold mt-2`}>
          Winner: {match.winner?.name || 'Draw'}
        </Text>
      ) : isUpcoming ? ( // Match 'upcoming' hai (dono teams ready hain)
        <Pressable
          onPress={onUpdatePress}
          style={tw`bg-blue-100 py-2 rounded-lg mt-3`}
        >
          <Text style={tw`text-blue-700 text-center font-semibold`}>Update Score</Text>
        </Pressable>
      ) : ( // Match 'pending' hai (teams ka intezar)
         <View style={tw`bg-gray-100 py-2 rounded-lg mt-3`}>
          <Text style={tw`text-gray-500 text-center font-semibold`}>
            Waiting for teams...
          </Text>
        </View>
      )}
    </View>
  );
};


// Main Component (Ab SectionList istemal karega)
export default function MatchScheduleList({ tournament, matches, onMatchUpdate }) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

  // Matches ko Round ke hisab se group karein
  const groupedMatches = useMemo(() => {
    const groups = {};
    matches.forEach(match => {
      const round = match.round;
      if (!groups[round]) {
        groups[round] = {
          title: `Round ${round}`,
          data: [],
        };
      }
      groups[round].data.push(match);
    });
    return Object.values(groups);
  }, [matches]); // Yeh tabhi run hoga jab matches ki list badlegi

  const handleUpdatePress = (match) => {
    setSelectedMatch(match);
    setIsModalVisible(true);
  };

  return (
    <View style={tw`flex-1`}>
      <SectionList
        sections={groupedMatches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={tw`p-4`}
        renderItem={({ item }) => (
          <MatchCard 
            match={item} 
            onUpdatePress={() => handleUpdatePress(item)}
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={tw`text-xl font-bold text-gray-800 mb-2 mt-4`}>{title}</Text>
        )}
        ListHeaderComponent={
          <View style={tw`items-center p-4 bg-white rounded-lg shadow-md mb-4`}>
            <Ionicons name="checkmark-done-circle" size={40} color={tw.color("green-600")} />
            <Text style={tw`text-lg font-bold text-green-700 mt-2`}>
              Schedule is Live!
            </Text>
          </View>
        }
      />

      {/* Modal */}
      <UpdateScoreModal
        match={selectedMatch}
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onMatchUpdated={onMatchUpdate} // <-- Function ka naam update karein
      />
    </View>
  );
}