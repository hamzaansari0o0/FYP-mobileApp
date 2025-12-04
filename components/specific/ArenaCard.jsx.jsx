import React from "react";
import { View, Text, Pressable, ImageBackground } from "react-native";
import { Link } from "expo-router";
import tw from "twrnc";
import { Ionicons } from "@expo/vector-icons";

export default function ArenaCard({ arena }) {
  const arenaImage = arena.arenaImageUrl
    ? { uri: arena.arenaImageUrl }
    : require("../../assets/images/hero-image.png"); 

  return (
    <Link href={`/home/ownerDetails/${arena.id}`} asChild>
      {/* Height reduced to h-36 for standard look */}
      <Pressable style={tw`w-full h-36 rounded-lg overflow-hidden mb-3 shadow-md`}>
        <ImageBackground
          source={arenaImage}
          resizeMode="cover"
          style={tw`flex-1 justify-end p-2`}
        >
          <View style={tw`absolute inset-0 bg-black/30`} />
          
          <Text 
            style={tw`text-lg font-bold text-white shadow-sm`}
            numberOfLines={1}
          >
            {arena.arenaName || arena.name} 
          </Text>
          <View style={tw`flex-row items-center mt-0.5`}>
            <Ionicons name="location-sharp" size={12} color={tw.color("white")} />
            <Text 
              style={tw`text-xs text-gray-200 shadow-sm ml-1 font-medium`}
              numberOfLines={1}
            >
              {arena.arenaAddress || arena.city} 
            </Text>
          </View>
        </ImageBackground>
      </Pressable>
    </Link>
  );
}