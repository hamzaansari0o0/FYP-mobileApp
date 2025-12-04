import React from "react";
import { View, Text, Pressable, ImageBackground } from "react-native";
import { Link } from "expo-router";
import tw from "twrnc";
import { Ionicons } from "@expo/vector-icons";

export default function CourtCard({ court }) {
  const courtImage = court.courtImageURL
    ? { uri: court.courtImageURL }
    : require("../assets/images/hero-image.png"); 

  return (
    <Link href={`/home/${court.id}`} asChild>
      {/* Height h-36 for standard sizing */}
      <Pressable style={tw`w-full h-36 rounded-lg overflow-hidden mb-3 shadow-md`}>
        <ImageBackground
          source={courtImage}
          resizeMode="cover"
          style={tw`flex-1 justify-between p-2`}
        >
          <View style={tw`absolute inset-0 bg-black/30`} />
          
          {/* Smaller Price Tag */}
          <View style={tw`self-start bg-green-600/90 px-2 py-0.5 rounded-md`}>
            <Text style={tw`text-white font-bold text-xs`}>
              Rs. {court.pricePerHour}/hr
            </Text>
          </View>

          <View>
            <Text 
              style={tw`text-lg font-bold text-white shadow-sm`}
              numberOfLines={1}
            >
              {court.courtName}
            </Text>
            <View style={tw`flex-row items-center mt-0.5`}>
              <Ionicons name="location-sharp" size={12} color={tw.color("white")} />
              <Text 
                style={tw`text-xs text-gray-200 shadow-sm ml-1 font-medium`}
                numberOfLines={1}
              >
                {court.address}
              </Text>
            </View>
          </View>
        </ImageBackground>
      </Pressable>
    </Link>
  );
}