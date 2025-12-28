import { ImageBackground, Text, View } from "react-native";
import tw from "twrnc";

export default function HeroSection() {
  return (
    // Outer Container: Margins + Rounded Corners + Shadow
    <View style={tw` h-60 rounded-[32px] overflow-hidden shadow-lg bg-green-900`}>
      <ImageBackground
        source={require("../../../assets/images/hero-image.webp")} 
        resizeMode="cover"
        style={tw`flex-1 justify-end`}
      >
        {/* ✅ FIX: Maine yahan se 'bg-gradient-to-t' hata diya hai.
           Uski jagah simple 'bg-black/40' lagaya hai jo sab devices par chalta hai.
        */}
        <View style={tw`absolute inset-0 bg-black/40`} />
        
        {/* Content */}
        <View style={tw`px-6 py-6`}>
          {/* Badge */}
          <View style={tw`bg-green-500 self-start px-3 py-1.5 rounded-full mb-3 shadow-sm`}>
            <Text style={tw`text-white text-[10px] font-bold uppercase tracking-wider`}>
              Featured
            </Text>
          </View>

          {/* Main Headline */}
          <Text style={tw`text-2xl font-black text-white leading-tight mb-1`}>
            Level Up Your Game
          </Text>
          
          {/* Subtext */}
          <Text style={tw`text-sm text-gray-200 font-medium opacity-90`}>
            Discover and book the best turfs in seconds.
          </Text>
        </View>
      </ImageBackground>
    </View>
  );
}