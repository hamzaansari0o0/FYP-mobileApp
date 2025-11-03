import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';

export default function CourtCard({ court }) {
  return (
    // --- YAHAN LINK UPDATE HUA HAI ---
    // Pehle: href={`/(player)/${court.id}`}
    // Ab:     href={`/home/${court.id}`} 
    // (Kyunke ye home stack ke andar hai)
    <Link href={`/home/${court.id}`} asChild> 
      <Pressable style={tw`bg-white p-4 rounded-xl shadow-md mb-4`}>
        <View style={tw`flex-row items-center`}>
          <View style={tw`bg-green-100 p-3 rounded-lg`}>
            <Ionicons name="football-outline" size={24} color={tw.color('green-700')} />
          </View>
          <View style={tw`ml-4 flex-1`}>
            <Text style={tw`text-lg font-bold text-gray-800`} numberOfLines={1}>
              {court.courtName}
            </Text>
            <Text style={tw`text-sm text-gray-500`} numberOfLines={1}>
              {court.address}
            </Text>
          </View>
        </View>
        <View style={tw`mt-4 pt-3 border-t border-gray-100`}>
          <Text style={tw`text-lg font-bold text-green-700`}>
            Rs. {court.pricePerHour} 
            <Text style={tw`text-sm font-normal text-gray-500`}> / hour</Text>
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}