import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';
import tw from 'twrnc';

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

  // Firestore timestamp convert logic check
  const deadlineDate = tournament.registrationDeadline?.toDate 
    ? tournament.registrationDeadline.toDate() 
    : new Date(tournament.registrationDeadline);

  const deadlinePassed = deadlineDate < new Date();

  // Generate button dabane par
  const handlePress = async () => {
    if (teams.length < 2) {
      Alert.alert("Not Enough Teams", "You need at least 2 teams to generate a schedule.");
      return;
    }
    if (tournament.format !== 'knockout') {
      Alert.alert("Not Supported", "Only Knockout format is supported right now.");
      return;
    }

    setIsGenerating(true);
    // Teams ko shuffle karein
    const shuffledTeams = shuffleArray([...teams]);
    
    // Parent component ko bhejein
    await onGenerateSchedule(shuffledTeams); 
    setIsGenerating(false);
  };

  const renderTeamItem = ({ item, index }) => (
    <View style={tw`bg-white p-4 rounded-xl shadow-sm mb-3 border border-gray-100 flex-row items-center`}>
      {/* Number Badge */}
      <View style={tw`h-10 w-10 rounded-full bg-green-50 items-center justify-center mr-4 border border-green-100`}>
        <Text style={tw`text-green-700 font-bold text-lg`}>{index + 1}</Text>
      </View>
      
      {/* Info */}
      <View style={tw`flex-1`}>
        <Text style={tw`text-lg font-bold text-gray-800`}>
          {item.teamName}
        </Text>
        <View style={tw`flex-row items-center mt-1`}>
            <Ionicons name="person-circle-outline" size={14} color="gray" />
            <Text style={tw`text-xs text-gray-500 ml-1`}>Captain: {item.captainName}</Text>
        </View>
      </View>
      
      <Ionicons name="shield-checkmark-outline" size={20} color={tw.color('green-600')} />
    </View>
  );

  return (
    <FlatList
      data={teams}
      keyExtractor={(item) => item.id}
      contentContainerStyle={tw`p-5 pb-20`} // Bottom padding for clean scroll
      showsVerticalScrollIndicator={false}
      renderItem={renderTeamItem}
      
      ListHeaderComponent={
        <View style={tw`mb-4`}>
          
          {/* --- Stats Header --- */}
          <View style={tw`flex-row justify-between items-center mb-6`}>
             <View>
                <Text style={tw`text-2xl font-bold text-gray-800`}>Teams</Text>
                <Text style={tw`text-gray-500 text-sm`}>Total Registered</Text>
             </View>
             <View style={tw`bg-green-100 px-4 py-2 rounded-lg`}>
                <Text style={tw`text-green-800 font-bold text-xl`}>{teams.length}</Text>
             </View>
          </View>

          {/* --- Action Area (Generate or Status) --- */}
          <View style={tw`bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-6`}>
            {isGenerating ? (
              <View style={tw`py-4`}>
                <ActivityIndicator size="large" color={tw.color('green-600')} />
                <Text style={tw`text-center text-gray-500 mt-2`}>Generating Brackets...</Text>
              </View>
            ) : deadlinePassed ? (
              // Case 1: Deadline Passed -> Show Generate Button
              <>
                <View style={tw`flex-row items-center mb-3`}>
                    <Ionicons name="time" size={20} color={tw.color('red-500')} />
                    <Text style={tw`text-red-500 font-bold ml-2`}>Registration Closed</Text>
                </View>
                <Text style={tw`text-gray-600 mb-4 text-sm`}>
                    Registration deadline has passed. You can now generate the match schedule.
                </Text>

                <Pressable
                  style={tw`bg-green-600 py-4 rounded-xl shadow-md flex-row justify-center items-center active:bg-green-700`}
                  onPress={handlePress}
                >
                  <Ionicons name="calendar-outline" size={20} color="white" style={tw`mr-2`} />
                  <Text style={tw`text-white text-center text-lg font-bold`}>
                    Generate Schedule
                  </Text>
                </Pressable>
              </>
            ) : (
              // Case 2: Deadline Open -> Show Status
              <View style={tw`items-center`}>
                <View style={tw`bg-blue-50 p-3 rounded-full mb-2`}>
                    <Ionicons name="timer-outline" size={30} color={tw.color('blue-600')} />
                </View>
                <Text style={tw`text-lg font-bold text-blue-700 text-center`}>
                  Registrations Open
                </Text>
                <Text style={tw`text-sm text-gray-500 text-center mt-1 px-4`}>
                  Schedule can be generated after the deadline passes.
                </Text>
                <View style={tw`bg-gray-100 mt-3 px-3 py-1 rounded text-center`}>
                    <Text style={tw`text-xs text-gray-600 font-bold`}>
                        Deadline: {moment(deadlineDate).format('D MMM, h:mm A')}
                    </Text>
                </View>
              </View>
            )}
          </View>
          
          {teams.length > 0 && (
            <Text style={tw`text-sm font-bold text-gray-500 uppercase mb-2 tracking-wider`}>
                Team List
            </Text>
          )}
        </View>
      }
      
      ListEmptyComponent={
        <View style={tw`items-center justify-center mt-6 p-8 bg-gray-50 rounded-2xl border border-gray-200 border-dashed`}>
          <Ionicons name="people-outline" size={48} color={tw.color("gray-300")} />
          <Text style={tw`text-lg font-bold text-gray-400 mt-3`}>No Teams Yet</Text>
          <Text style={tw`text-sm text-gray-400 text-center mt-1`}>
            Share your tournament to get players!
          </Text>
        </View>
      }
    />
  );
}