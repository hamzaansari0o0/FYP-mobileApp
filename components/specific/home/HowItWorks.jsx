// /components/specific/home/HowItWorks.jsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Dimensions, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import tw from 'twrnc';

const { width } = Dimensions.get('window');

const StepCard = ({ number, title, desc, icon, isLast }) => (
  <Animated.View entering={FadeInRight.delay(number * 150).duration(500)} style={tw`flex-row mb-6`}>
    <View style={tw`items-center mr-4`}>
      <View style={tw`w-10 h-10 rounded-full bg-green-100 items-center justify-center border-2 border-green-600 z-10`}>
        <Text style={tw`text-green-800 font-bold`}>{number}</Text>
      </View>
      {!isLast && <View style={tw`w-0.5 h-full bg-gray-200 absolute top-10`} />}
    </View>
    <View style={tw`flex-1 bg-gray-50 p-4 rounded-2xl border border-gray-100`}>
      <View style={tw`flex-row items-center mb-2`}>
        <Ionicons name={icon} size={20} color={tw.color('green-700')} style={tw`mr-2`} />
        <Text style={tw`text-base font-bold text-gray-900`}>{title}</Text>
      </View>
      <Text style={tw`text-gray-500 text-xs leading-4`}>{desc}</Text>
    </View>
  </Animated.View>
);

export default function HowItWorks() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('player');

  return (
    <View style={tw`flex-1 bg-white`}>
      {/* Header */}
      <View style={tw`pt-12 px-6 pb-4 bg-white border-b border-gray-100 flex-row items-center`}>
        <Pressable onPress={() => router.back()} style={tw`p-2 bg-gray-50 rounded-full mr-4`}>
           <Ionicons name="arrow-back" size={24} color="black" />
        </Pressable>
        <Text style={tw`text-xl font-black text-gray-900`}>How it Works</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`pb-10`}>
        
        {/* Toggle Switch */}
        <View style={tw`mx-6 mt-6 bg-gray-100 p-1 rounded-2xl flex-row mb-8`}>
            <Pressable 
                onPress={() => setActiveTab('player')}
                style={tw`flex-1 py-3 rounded-xl items-center ${activeTab === 'player' ? 'bg-white shadow-sm' : ''}`}
            >
                <Text style={tw`font-bold ${activeTab === 'player' ? 'text-green-700' : 'text-gray-500'}`}>For Players</Text>
            </Pressable>
            <Pressable 
                onPress={() => setActiveTab('owner')}
                style={tw`flex-1 py-3 rounded-xl items-center ${activeTab === 'owner' ? 'bg-white shadow-sm' : ''}`}
            >
                <Text style={tw`font-bold ${activeTab === 'owner' ? 'text-green-700' : 'text-gray-500'}`}>For Owners</Text>
            </Pressable>
        </View>

        {/* Video Placeholder */}
        <Animated.View entering={FadeInDown.duration(600)} style={tw`mx-6 h-48 bg-gray-900 rounded-3xl items-center justify-center mb-10 overflow-hidden shadow-lg`}>
             {/* Future: Replace this with <Video /> component */}
             <View style={tw`absolute inset-0 bg-green-900/40 z-0`} />
             <Ionicons name="play-circle" size={64} color="white" style={tw`z-10 opacity-90`} />
             <Text style={tw`text-white mt-2 font-bold z-10 tracking-widest uppercase text-xs`}>
                 Watch {activeTab === 'player' ? 'Player' : 'Owner'} Tutorial
             </Text>
        </Animated.View>

        {/* Steps Section */}
        <View style={tw`px-6`}>
           <Text style={tw`text-2xl font-black text-gray-900 mb-6`}>
               {activeTab === 'player' ? 'Start Playing in 4 Steps' : 'Grow Your Business in 4 Steps'}
           </Text>

           {activeTab === 'player' ? (
               <View>
                   <StepCard number={1} icon="search" title="Discover" desc="Search for top-rated sports arenas near you. Filter by sport, price, and facilities." />
                   <StepCard number={2} icon="calendar" title="Book Slot" desc="Select your preferred date and time. Check real-time availability instantly." />
                   <StepCard number={3} icon="card" title="Secure Pay" desc="Confirm your booking by paying securely via JazzCash, EasyPaisa or Card." />
                   <StepCard number={4} icon="football" title="Play & Enjoy" desc="Reach the venue, show your booking QR code, and start playing!" isLast />
               </View>
           ) : (
               <View>
                   <StepCard number={1} icon="create" title="Register Arena" desc="Create your owner profile and list your sports arena with details and photos." />
                   <StepCard number={2} icon="time" title="Set Availability" desc="Define your operating hours, slot prices, and peak time rates." />
                   <StepCard number={3} icon="checkmark-circle" title="Accept Bookings" desc="Receive booking requests. Approve them automatically or manually." />
                   <StepCard number={4} icon="wallet" title="Get Paid" desc="Receive payments directly into your account and track daily earnings." isLast />
               </View>
           )}
        </View>

        {/* Call to Action */}
        <View style={tw`mx-6 mt-8`}>
             <Pressable onPress={() => router.push(activeTab === 'player' ? '/(player)/home' : '/(auth)/signup')} style={tw`bg-green-700 py-4 rounded-xl items-center shadow-md`}>
                 <Text style={tw`text-white font-bold text-lg`}>
                    {activeTab === 'player' ? 'Book a Court Now' : 'Register My Arena'}
                 </Text>
             </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}