import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View
} from 'react-native';
import tw from 'twrnc';

export default function UpdateScoreModal({ match, visible, onClose, onMatchUpdated }) {
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Jab modal open ho, purana score (agar hai) set karein
  useEffect(() => {
    if (match) {
      setScoreA(match.scoreA !== undefined ? match.scoreA.toString() : '');
      setScoreB(match.scoreB !== undefined ? match.scoreB.toString() : '');
    }
  }, [match]);

  // Helper to get current winner name based on typed score
  const getWinnerText = () => {
    const sA = parseInt(scoreA || '0', 10);
    const sB = parseInt(scoreB || '0', 10);
    if (sA > sB) return match?.teamA?.name;
    if (sB > sA) return match?.teamB?.name;
    return 'Draw (Not Allowed)';
  };

  if (!match) return null;

  const handleSave = async () => {
    // 1. Validation
    if (scoreA === '' || scoreB === '') {
        Alert.alert("Missing Score", "Please enter scores for both teams.");
        return;
    }

    const numScoreA = parseInt(scoreA, 10);
    const numScoreB = parseInt(scoreB, 10);

    if (isNaN(numScoreA) || isNaN(numScoreB)) {
      Alert.alert("Invalid Score", "Please enter valid numbers.");
      return;
    }
    
    // 2. No Draw Logic (Knockout)
    if (numScoreA === numScoreB) {
       Alert.alert("Draws Not Allowed", "This is a knockout match. There must be a winner.");
       return;
    }

    setIsSaving(true);

    // 3. Prepare Data
    // Winner decide karein
    const winner = (numScoreA > numScoreB) ? match.teamA : match.teamB;
    
    const updatedMatch = {
      ...match,
      scoreA: numScoreA,
      scoreB: numScoreB,
    };

    try {
      // Parent component logic call
      await onMatchUpdated(updatedMatch, winner);
      onClose(); // Close modal immediately on success
      
    } catch (error) {
      console.error("Error updating match:", error);
      Alert.alert("Error", "Could not save score. Please try again.");
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
      <View style={tw`flex-1 justify-center items-center bg-black/70 p-4`}>
        
        {/* Keyboard Avoiding View taake keyboard input na chupaye */}
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={tw`w-full`}
        >
            <View style={tw`bg-white rounded-2xl w-full shadow-2xl overflow-hidden`}>
            
            {/* --- HEADER --- */}
            <View style={tw`bg-gray-50 p-4 border-b border-gray-100 flex-row justify-between items-center`}>
                <Text style={tw`text-lg font-bold text-gray-800`}>Update Match Result</Text>
                <Pressable onPress={onClose} style={tw`p-1 bg-gray-200 rounded-full`}>
                    <Ionicons name="close" size={20} color="gray" />
                </Pressable>
            </View>

            {/* --- CONTENT --- */}
            <View style={tw`p-6`}>
                
                {/* Teams Row */}
                <View style={tw`flex-row items-center justify-between`}>
                    
                    {/* Team A Input */}
                    <View style={tw`flex-1 items-center`}>
                        <Text style={tw`font-bold text-gray-800 text-center mb-2 h-10`} numberOfLines={2}>
                            {match.teamA?.name}
                        </Text>
                        <TextInput
                            style={tw`border-2 border-gray-200 w-20 h-16 rounded-xl text-center text-3xl font-bold text-gray-800 bg-gray-50 focus:border-green-500 focus:bg-white`}
                            value={scoreA}
                            onChangeText={setScoreA}
                            keyboardType="number-pad"
                            maxLength={3}
                            placeholder="0"
                            placeholderTextColor="#ccc"
                            selectTextOnFocus
                        />
                    </View>

                    {/* VS Badge */}
                    <View style={tw`px-4`}>
                        <Text style={tw`text-gray-300 font-black text-xl italic`}>VS</Text>
                    </View>

                    {/* Team B Input */}
                    <View style={tw`flex-1 items-center`}>
                        <Text style={tw`font-bold text-gray-800 text-center mb-2 h-10`} numberOfLines={2}>
                            {match.teamB?.name}
                        </Text>
                        <TextInput
                            style={tw`border-2 border-gray-200 w-20 h-16 rounded-xl text-center text-3xl font-bold text-gray-800 bg-gray-50 focus:border-green-500 focus:bg-white`}
                            value={scoreB}
                            onChangeText={setScoreB}
                            keyboardType="number-pad"
                            maxLength={3}
                            placeholder="0"
                            placeholderTextColor="#ccc"
                            selectTextOnFocus
                        />
                    </View>
                </View>

                {/* --- WINNER PREVIEW --- */}
                <View style={tw`mt-6 bg-green-50 p-3 rounded-lg border border-green-100 items-center`}>
                    <Text style={tw`text-xs text-green-700 uppercase font-bold tracking-widest`}>
                        Projected Winner
                    </Text>
                    <Text style={tw`text-lg font-bold text-green-800 mt-1`}>
                        {getWinnerText()}
                    </Text>
                </View>

            </View>

            {/* --- FOOTER / BUTTONS --- */}
            <View style={tw`p-4 border-t border-gray-100 flex-row gap-3`}>
                <Pressable
                    style={tw`flex-1 py-3.5 bg-gray-100 rounded-xl items-center justify-center`}
                    onPress={onClose}
                    disabled={isSaving}
                >
                    <Text style={tw`text-gray-600 font-bold`}>Cancel</Text>
                </Pressable>
                
                <Pressable
                    style={tw.style(
                        `flex-1 py-3.5 bg-green-600 rounded-xl items-center justify-center flex-row shadow-sm`,
                        isSaving && `bg-green-400`
                    )}
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle-outline" size={20} color="white" style={tw`mr-2`} />
                            <Text style={tw`text-white font-bold`}>Save Result</Text>
                        </>
                    )}
                </Pressable>
            </View>

            </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}