import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, SectionList, Text, View } from 'react-native';
import tw from 'twrnc';
import UpdateScoreModal from './UpdateScoreModal';

// --- MATCH CARD COMPONENT ---
const MatchCard = ({ match, onUpdatePress }) => {
  // Logic Flags
  const isByeMatch = match.status === 'bye';
  const isUpcoming = match.status === 'upcoming';
  const isPending = match.status === 'pending';
  const isCompleted = match.status === 'completed'; 
  
  // Bye matches are effectively "finished" conceptually for the UI flow
  const isFinished = isCompleted || isByeMatch;

  return (
    <View style={tw.style(
        `bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-200`,
        isByeMatch && `bg-slate-50 border-slate-200` // Slightly different bg for Byes
    )}>
      
      {/* --- HEADER: Round & Status --- */}
      <View style={tw`flex-row justify-between items-center mb-3`}>
        <Text style={tw`text-xs font-bold text-gray-400 uppercase tracking-wide`}>
            Round {match.round} • Match {match.matchNumber}
        </Text>
        
        {/* Status Badge */}
        {isByeMatch ? (
             <View style={tw`bg-blue-100 px-2 py-0.5 rounded text-xs border border-blue-200`}>
                <Text style={tw`text-blue-700 text-[10px] font-bold`}>AUTO QUALIFIED</Text>
             </View>
        ) : isCompleted ? (
            <View style={tw`bg-green-100 px-2 py-0.5 rounded text-xs border border-green-200`}>
                <Text style={tw`text-green-700 text-[10px] font-bold`}>FINISHED</Text>
            </View>
        ) : null}
      </View>
      
      {/* --- TEAMS & SCORE AREA --- */}
      <View style={tw`flex-row items-center justify-between`}>
        
        {/* Team A */}
        <View style={tw`flex-1 items-start`}>
          <Text style={tw.style(
            `text-base font-bold text-gray-800`,
            // If match done & this team NOT winner -> Strike style
            isFinished && match.winner?.id && match.winner?.id !== match.teamA?.id && 'text-gray-400 decoration-line-through',
            // If placeholder
            (!match.teamA?.id || match.teamA?.id === 'BYE') && 'text-gray-400 italic font-normal'
          )}>
            {match.teamA?.name || 'TBD'}
          </Text>
        </View>
        
        {/* Center: Score VS Icon */}
        <View style={tw`px-2 items-center justify-center min-w-[60px]`}>
          {isByeMatch ? (
             // Bye Icon instead of score
             <View style={tw`bg-blue-50 p-1.5 rounded-full`}>
                 <Ionicons name="checkmark" size={18} color={tw.color('blue-500')} />
             </View>
          ) : isCompleted ? (
            // Real Score
            <View style={tw`bg-green-50 px-3 py-1 rounded-lg border border-green-100`}>
                <Text style={tw`text-lg font-extrabold text-green-700`}>
                {match.scoreA} - {match.scoreB}
                </Text>
            </View>
          ) : (
            // VS Badge
            <Text style={tw`text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full`}>VS</Text>
          )}
        </View>
        
        {/* Team B */}
        <View style={tw`flex-1 items-end`}>
          <Text style={tw.style(
            `text-base font-bold text-gray-800 text-right`,
            isFinished && match.winner?.id && match.winner?.id !== match.teamB?.id && 'text-gray-400 decoration-line-through',
            (!match.teamB?.id || match.teamB?.id === 'BYE') && 'text-gray-400 italic font-normal'
          )}>
            {match.teamB?.name || 'TBD'}
          </Text>
        </View>
      </View>

      {/* --- BOTTOM ACTION AREA --- */}
      <View style={tw`mt-3 pt-3 border-t border-gray-100`}>
          {isByeMatch ? (
            <View style={tw`flex-row items-center justify-center`}>
                <Ionicons name="information-circle-outline" size={14} color="#3b82f6" />
                <Text style={tw`text-center text-blue-600 text-xs italic ml-1`}>
                    {match.winner?.name} advances automatically.
                </Text>
            </View>
          ) : isCompleted ? (
            <View style={tw`flex-row items-center justify-center`}>
                <Ionicons name="trophy" size={14} color="#15803d" />
                <Text style={tw`text-center text-green-700 font-bold ml-1 text-sm`}>
                Winner: {match.winner?.name}
                </Text>
            </View>
          ) : isUpcoming ? ( 
            // Button to Update Score
            <Pressable
              onPress={onUpdatePress}
              style={tw`bg-green-600 py-2.5 rounded-lg shadow-sm flex-row justify-center items-center active:bg-green-700`}
            >
              <Ionicons name="create-outline" size={18} color="white" style={tw`mr-2`} />
              <Text style={tw`text-white text-sm font-bold`}>Update Result</Text>
            </Pressable>
          ) : ( 
            // Pending State
             <Text style={tw`text-gray-400 text-center text-xs font-medium italic`}>
               Waiting for previous round...
             </Text>
          )}
      </View>
    </View>
  );
};


// --- MAIN LIST COMPONENT ---
export default function MatchScheduleList({ matches, onMatchUpdate, tournament }) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

  // Group Matches by Round
  const groupedMatches = useMemo(() => {
    if (!matches || matches.length === 0) return [];

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
    
    // Convert to array and sort by round number
    return Object.values(groups).sort((a, b) => {
        // Extract number from "Round X" to sort correctly
        const roundA = parseInt(a.title.replace('Round ', ''));
        const roundB = parseInt(b.title.replace('Round ', ''));
        return roundA - roundB;
    });
  }, [matches]);

  const handleUpdatePress = (match) => {
    setSelectedMatch(match);
    setIsModalVisible(true);
  };

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <SectionList
        sections={groupedMatches}
        keyExtractor={(item) => item.matchId || item.id} // Ensure unique key
        contentContainerStyle={tw`p-5 pb-20`}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        
        renderItem={({ item }) => (
          <MatchCard 
            match={item} 
            onUpdatePress={() => handleUpdatePress(item)}
          />
        )}
        
        renderSectionHeader={({ section: { title } }) => (
            <View style={tw`flex-row items-center mb-3 mt-4`}>
                <View style={tw`h-5 w-1.5 bg-green-600 rounded-full mr-3`} />
                <Text style={tw`text-xl font-bold text-gray-800 tracking-tight`}>{title}</Text>
            </View>
        )}
        
        ListHeaderComponent={
          <View style={tw`items-center p-6 bg-green-800 rounded-2xl shadow-lg mb-6 overflow-hidden relative`}>
            {/* Background Icon Decoration */}
            <Ionicons name="trophy" size={160} color="white" style={tw`absolute -bottom-10 -right-12 opacity-10`} />
            
            <View style={tw`bg-white/20 p-4 rounded-full mb-3`}>
                <Ionicons name="git-network-outline" size={32} color="white" />
            </View>
            <Text style={tw`text-2xl font-bold text-white`}>
              Tournament Bracket
            </Text>
            <Text style={tw`text-green-200 text-center text-sm mt-1 px-4`}>
               {tournament?.totalRounds ? `${tournament.totalRounds} Rounds Total` : 'Manage matches and track progress'}
            </Text>
          </View>
        }
        
        ListEmptyComponent={
            <View style={tw`items-center justify-center mt-12 bg-white p-8 rounded-xl border border-gray-100 mx-4`}>
                <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
                <Text style={tw`text-gray-400 mt-4 text-center`}>No matches scheduled yet.</Text>
            </View>
        }
      />

      {/* Update Score Modal */}
      <UpdateScoreModal
        match={selectedMatch}
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onMatchUpdated={onMatchUpdate}
      />
    </View>
  );
}