import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import tw from 'twrnc';
// db aur updateDoc ki zaroorat ab yahan nahi hai,
// kyunki hum logic parent (details/[tournamentId].jsx) mein bhej rahe hain.

export default function UpdateScoreModal({ match, visible, onClose, onMatchUpdated }) {
  const [scoreA, setScoreA] = useState('0');
  const [scoreB, setScoreB] = useState('0');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (match) {
      setScoreA(match.scoreA?.toString() || '0');
      setScoreB(match.scoreB?.toString() || '0');
    }
  }, [match]);

  if (!match) return null;

  const handleSave = async () => {
    setIsSaving(true);
    const numScoreA = parseInt(scoreA, 10);
    const numScoreB = parseInt(scoreB, 10);

    if (isNaN(numScoreA) || isNaN(numScoreB)) {
      Alert.alert("Invalid Score", "Please enter valid numbers.");
      setIsSaving(false);
      return;
    }
    
    // Sirf 'draw' check karein, winner logic parent mein hai
    if (numScoreA === numScoreB) {
       Alert.alert("Draws Not Allowed", "Please enter a winner for this knockout match.");
       setIsSaving(false);
       return;
    }

    // Winner decide karein
    const winner = (numScoreA > numScoreB) ? match.teamA : match.teamB;
    
    // Match object ko naye score ke saath update karein
    const updatedMatch = {
      ...match,
      scoreA: numScoreA,
      scoreB: numScoreB,
    };

    try {
      // Parent component (details/[tournamentId].jsx) ko naya data bhej dein
      // Taa ke woh score update kare AUR winner ko promote kare
      await onMatchUpdated(updatedMatch, winner);
      
      Alert.alert("Success", "Match score updated!");
      onClose(); // Modal band karein

    } catch (error) {
      console.error("Error in onMatchUpdated: ", error);
      Alert.alert("Error", "Could not save score.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 justify-center items-center bg-black/50 p-5`}>
        <View style={tw`bg-white p-5 rounded-lg w-full`}>
          <Text style={tw`text-xl font-bold text-center mb-4`}>Update Score</Text>
          
          <Text style={tw`text-base font-semibold text-gray-700`}>{match.teamA.name}</Text>
          <TextInput
            style={tw`border border-gray-300 p-3 rounded-lg text-base bg-white mb-4 text-center`}
            value={scoreA}
            onChangeText={setScoreA}
            keyboardType="number-pad"
          />

          <Text style={tw`text-base font-semibold text-gray-700`}>{match.teamB.name}</Text>
          <TextInput
            style={tw`border border-gray-300 p-3 rounded-lg text-base bg-white mb-6 text-center`}
            value={scoreB}
            onChangeText={setScoreB}
            keyboardType="number-pad"
          />

          <View style={tw`flex-row justify-between`}>
            <Pressable
              style={tw`bg-gray-200 py-3 px-5 rounded-lg`}
              onPress={onClose}
              disabled={isSaving}
            >
              <Text style={tw`text-gray-700 font-bold`}>Cancel</Text>
            </Pressable>
            <Pressable
              style={tw.style(`bg-green-600 py-3 px-5 rounded-lg`, isSaving && `bg-green-400`)}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <ActivityIndicator color="#fff" /> : 
                <Text style={tw`text-white font-bold`}>Save Score</Text>
              }
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}