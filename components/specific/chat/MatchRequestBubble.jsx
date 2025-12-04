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
      
      <View style={tw`flex-row items-center mb-3 border-b border-gray-100 pb-2`}>
        <View style={tw`bg-orange-100 p-1.5 rounded-full`}>
           <Ionicons name="trophy" size={18} color="orange" />
        </View>
        <Text style={tw`font-bold text-gray-800 ml-2 text-base`}>Match Challenge</Text>
      </View>
      
      {details && (
        <View style={tw`bg-gray-50 p-3 rounded-lg mb-4`}>
          
          {/* Location & Address */}
          <View style={tw`flex-row items-start mb-2`}>
            <Ionicons name="location-sharp" size={16} color={tw.color('blue-600')} style={tw`mt-0.5`} />
            <View style={tw`ml-2 flex-1`}>
                <Text style={tw`text-gray-800 font-bold`} numberOfLines={1}>
                    {details.arenaName}
                </Text>
                {/* === 4. ADDRESS DISPLAY === */}
                <Text style={tw`text-gray-500 text-xs`} numberOfLines={2}>
                    {details.arenaAddress}
                </Text>
            </View>
          </View>
          
          {/* Date & Time */}
          <View style={tw`flex-row items-center mt-1`}>
            <Ionicons name="time" size={16} color={tw.color('gray-500')} />
            <Text style={tw`text-gray-600 font-medium ml-2 text-sm`}>
              {moment(details.matchDate).format('ddd, MMM Do • h:mm A')}
            </Text>
          </View>
        </View>
      )}

      <Text style={tw`text-gray-500 mb-4 text-xs italic text-center`}>
        {isMyMessage 
          ? "You sent this challenge." 
          : "Are you ready to play?"}
      </Text>

      {status === 'accepted' ? (
        <View style={tw`bg-green-100 border border-green-200 py-2 rounded-lg items-center flex-row justify-center`}>
          <Ionicons name="checkmark-circle" size={18} color="green" />
          <Text style={tw`text-green-800 font-bold ml-2`}>MATCH ON!</Text>
        </View>
      ) : status === 'pending' ? (
        isMyMessage ? (
           <View style={tw`bg-gray-100 py-2 rounded-lg items-center`}>
             <Text style={tw`text-gray-500 font-medium`}>Waiting for response...</Text>
          </View>
        ) : (
          <Pressable 
            onPress={() => onAccept(currentMessage._id)}
            style={tw`bg-blue-600 py-3 rounded-xl items-center shadow-md active:bg-blue-700`}
          >
            <Text style={tw`text-white font-bold text-sm`}>Accept Challenge ⚔️</Text>
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