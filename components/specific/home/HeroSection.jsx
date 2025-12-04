import React from "react";
import { View, Text, ImageBackground } from "react-native";
import tw from "twrnc";

export default function HeroSection() {
  return (
    // 'h-72' height di hai taake image badi aur clear dikhe
    <View style={tw`w-full h-72 bg-gray-900`}>
      <ImageBackground
        // Apni image ka path yahan lagayein
        source={require("../../../assets/images/hero-image.png")} 
        resizeMode="cover"
        style={tw`flex-1 justify-end`}
      >
        {/* Dark Overlay (Gradient effect ke liye taake text parha jaye) */}
        <View style={tw`absolute inset-0 bg-black/40`} />
        
        {/* Content Container with Padding */}
        <View style={tw`p-6 pb-8`}>
          <View style={tw`bg-green-600 self-start px-3 py-1 rounded-full mb-3`}>
            <Text style={tw`text-white text-xs font-bold uppercase`}>
              Play & Compete
            </Text>
          </View>

          <Text style={tw`text-3xl font-extrabold text-white shadow-md leading-tight`}>
            Your Sports Journey Starts Here
          </Text>
          
          <Text style={tw`text-base text-gray-200 mt-2 shadow-sm font-medium pr-4`}>
            Discover venues, join leagues, and connect with players. Court Chuno makes it easy to find your next game.
          </Text>
        </View>
      </ImageBackground>
    </View>
  );
}