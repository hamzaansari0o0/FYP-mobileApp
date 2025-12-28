import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import { Pressable, Text, View } from 'react-native';
import tw from 'twrnc';

export default function MatchRequestBubble({ currentMessage, user, onAccept }) {
  const isMyMessage = currentMessage.user._id === user.uid;
  const status = currentMessage.status; 
  const details = currentMessage.matchDetails; 

  return (
    <View style={tw`p-4 bg-white rounded-2xl border border-gray-200 w-72 my-2 mx-2 shadow-sm`}>
      
      {/* --- HEADER --- */}
      <View style={tw`flex-row items-center mb-3 border-b border-gray-100 pb-2`}>
        <View style={tw`bg-yellow-100 p-1.5 rounded-full mr-2`}>
           <Ionicons name="trophy" size={18} color="#ca8a04" /> 
        </View>
        <Text style={tw`font-bold text-gray-800 text-base`}>Match Challenge</Text>
      </View>
      
      {details && (
        <View style={tw`bg-gray-50 p-3 rounded-xl mb-4 border border-gray-100`}>
          
          {/* 1. Location & Address */}
          <View style={tw`flex-row items-start mb-3`}>
            <Ionicons name="location" size={16} color="#15803d" style={tw`mt-0.5`} />
            <View style={tw`ml-2 flex-1`}>
                <Text style={tw`text-gray-900 font-bold text-sm`} numberOfLines={1}>
                    {details.arenaName}
                </Text>
                {details.courtName && (
                   <Text style={tw`text-green-700 text-xs font-semibold mb-0.5`}>
                     {details.courtName}
                   </Text>
                )}
                {details.arenaAddress ? (
                   <Text style={tw`text-gray-500 text-xs leading-4`} numberOfLines={2}>
                       {details.arenaAddress}
                   </Text>
                ) : null}
            </View>
          </View>
          
          {/* 2. Date & Time */}
          <View style={tw`flex-row items-center bg-white p-2 rounded-lg border border-gray-100`}>
            <Ionicons name="calendar" size={16} color="#4b5563" />
            <Text style={tw`text-gray-700 font-medium ml-2 text-sm`}>
              {moment(details.matchDate).format('ddd, MMM Do')}
            </Text>
            <View style={tw`h-3 w-[1px] bg-gray-300 mx-2`} />
            <Ionicons name="time" size={16} color="#4b5563" />
             <Text style={tw`text-gray-700 font-medium ml-2 text-sm`}>
              {moment(details.matchDate).format('h:mm A')}
            </Text>
          </View>
        </View>
      )}

      {/* --- MESSAGE STATUS TEXT --- */}
      <Text style={tw`text-gray-400 mb-4 text-xs italic text-center`}>
        {isMyMessage 
          ? "You sent this challenge." 
          : "Are you ready to play?"}
      </Text>

      {/* --- ACTION BUTTONS --- */}
      {status === 'accepted' ? (
        <View style={tw`bg-green-100 border border-green-200 py-3 rounded-xl items-center flex-row justify-center`}>
          <Ionicons name="checkmark-circle" size={20} color="#15803d" />
          <Text style={tw`text-green-800 font-bold ml-2`}>MATCH BOOKED!</Text>
        </View>
      ) : status === 'pending' ? (
        isMyMessage ? (
           <View style={tw`bg-gray-100 py-3 rounded-xl items-center border border-gray-200`}>
             <Text style={tw`text-gray-500 font-medium`}>Waiting for response...</Text>
          </View>
        ) : (
          <Pressable 
            onPress={() => onAccept(currentMessage._id)}
            style={tw`bg-green-700 py-3 rounded-xl items-center shadow-md active:bg-green-800 flex-row justify-center`}
          >
            <Text style={tw`text-white font-bold text-sm mr-2`}>Accept Challenge</Text>
            <Ionicons name="arrow-forward-circle" size={18} color="white" />
          </Pressable>
        )
      ) : (
        <View style={tw`bg-gray-200 py-2 rounded-lg items-center`}>
           <Text style={tw`text-gray-500 font-bold`}>Offer Expired</Text>
        </View>
      )}
    </View>
  );
}