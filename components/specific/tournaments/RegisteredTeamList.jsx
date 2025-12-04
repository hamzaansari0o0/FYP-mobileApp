import React, { useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, Alert } from 'react-native';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';

// Helper function: Array ko shuffle (randomize) karne ke liye
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

export default function RegisteredTeamList({ tournament, teams, onGenerateSchedule }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const deadlinePassed = tournament.registrationDeadline.toDate() < new Date();

  // Generate button dabane par
  const handlePress = async () => {
    if (teams.length < 2) {
      Alert.alert("Not Enough Teams", "You need at least 2 teams.");
      return;
    }
    if (tournament.format !== 'knockout') {
      Alert.alert("Not Supported", "Only Knockout format is supported right now.");
      return;
    }

    setIsGenerating(true);
    // Teams ko shuffle karein
    const shuffledTeams = shuffleArray([...teams]);
    // Parent component (main screen) ko shuffled teams bhej dein
    await onGenerateSchedule(shuffledTeams); 
    setIsGenerating(false);
  };

  return (
    <FlatList
      data={teams}
      keyExtractor={(item) => item.id}
      contentContainerStyle={tw`p-4`}
      renderItem={({ item, index }) => (
        <View style={tw`bg-white p-3 rounded-lg shadow-sm mb-3`}>
          <Text style={tw`text-base font-bold text-gray-700`}>
            {index + 1}. {item.teamName}
          </Text>
          <Text style={tw`text-sm text-gray-500`}>Captain: {item.captainName}</Text>
        </View>
      )}
      ListHeaderComponent={
        <>
          {/* --- Conditional Button --- */}
          <View style={tw`p-4 bg-white rounded-lg shadow-md mb-4`}>
            {isGenerating ? (
              <ActivityIndicator size="large" />
            ) : deadlinePassed ? (
              <Pressable
                style={tw`bg-blue-600 py-3 rounded-lg shadow-md`}
                onPress={handlePress}
              >
                <Text style={tw`text-white text-center text-lg font-bold`}>
                  Generate Schedule ({tournament.format})
                </Text>
              </Pressable>
            ) : (
              <View>
                <Text style={tw`text-lg font-bold text-gray-700 text-center`}>
                  Registrations are still open
                </Text>
                <Text style={tw`text-base text-gray-500 text-center mt-1`}>
                  Deadline: {moment(tournament.registrationDeadline.toDate()).format('D MMM, h:mm A')}
                </Text>
              </View>
            )}
          </View>
          
          <Text style={tw`text-xl font-bold text-gray-800 mb-3`}>
            Registered Teams ({teams.length})
          </Text>
        </>
      }
      ListEmptyComponent={
        <View style={tw`items-center justify-center mt-10 p-5 bg-white rounded-lg`}>
          <Ionicons name="people-outline" size={40} color={tw.color("gray-400")} />
          <Text style={tw`text-lg text-gray-500 mt-2`}>
            No teams have registered yet.
          </Text>
        </View>
      }
    />
  );
}
