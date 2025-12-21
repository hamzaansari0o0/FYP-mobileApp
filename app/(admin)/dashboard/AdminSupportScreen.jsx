import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import {
    collection,
    doc,
    onSnapshot,
    orderBy,
    query,
    updateDoc
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    LayoutAnimation,
    Platform,
    Pressable,
    StatusBar,
    Text,
    UIManager,
    View
} from "react-native";
import tw from "twrnc";
import { db } from "../../../firebase/firebaseConfig";

// Android Layout Animation Enable
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function AdminSupportScreen() {
  const router = useRouter();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null); // Kaunsa card khula hai check karne ke liye

  // --- 1. FETCH TICKETS (Real-time) ---
  useEffect(() => {
    const q = query(
      collection(db, "support_tickets"),
      orderBy("createdAt", "desc") // Newest pehle
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTickets(ticketsList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- 2. TOGGLE CARD EXPAND ---
  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  // --- 3. MARK AS RESOLVED ---
  const handleStatusUpdate = async (id, currentStatus) => {
    const newStatus = currentStatus === "pending" ? "resolved" : "pending";
    
    try {
      const ticketRef = doc(db, "support_tickets", id);
      await updateDoc(ticketRef, {
        status: newStatus
      });
      // Real-time listener khud UI update kar dega
    } catch (error) {
      Alert.alert("Error", "Could not update status.");
    }
  };

  // --- RENDER CARD COMPONENT ---
  const renderTicketItem = ({ item }) => {
    const isExpanded = expandedId === item.id;
    const isPending = item.status === "pending";

    return (
      <Pressable 
        onPress={() => toggleExpand(item.id)}
        style={tw`bg-white mb-3 rounded-xl shadow-sm border-l-4 ${isPending ? 'border-yellow-400' : 'border-green-500'} overflow-hidden`}
      >
        <View style={tw`p-4`}>
          {/* Header Row: Subject & Status Badge */}
          <View style={tw`flex-row justify-between items-start`}>
            <View style={tw`flex-1 mr-2`}>
              <Text style={tw`text-gray-900 font-bold text-base`} numberOfLines={1}>
                {item.subject}
              </Text>
              <Text style={tw`text-gray-500 text-xs mt-1`}>
                From: <Text style={tw`font-medium text-gray-700`}>{item.name}</Text> • {new Date(item.createdAt?.seconds * 1000).toLocaleDateString()}
              </Text>
            </View>

            {/* Status Badge */}
            <View style={tw`px-2 py-1 rounded-md ${isPending ? 'bg-yellow-50' : 'bg-green-50'}`}>
              <Text style={tw`text-xs font-bold ${isPending ? 'text-yellow-700' : 'text-green-700'} uppercase`}>
                {item.status}
              </Text>
            </View>
          </View>

          {/* Email (Always Visible) */}
          <Text style={tw`text-gray-400 text-xs mt-1 italic`}>{item.email}</Text>

          {/* Message Body (Expandable) */}
          {isExpanded && (
            <View style={tw`mt-4 pt-3 border-t border-gray-100`}>
              <Text style={tw`text-gray-600 text-sm leading-6`}>
                {item.message}
              </Text>

              {/* Action Buttons */}
              <View style={tw`mt-4 flex-row justify-end`}>
                <Pressable
                  onPress={() => handleStatusUpdate(item.id, item.status)}
                  style={tw`flex-row items-center px-4 py-2 rounded-lg ${isPending ? 'bg-green-600' : 'bg-gray-200'}`}
                >
                  <Ionicons 
                    name={isPending ? "checkmark-circle" : "arrow-undo"} 
                    size={18} 
                    color={isPending ? "white" : "gray"} 
                  />
                  <Text style={tw`ml-2 font-bold ${isPending ? 'text-white' : 'text-gray-600'}`}>
                    {isPending ? "Mark as Resolved" : "Mark as Pending"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
          
          {/* Expand Hint Icon */}
          {!isExpanded && (
             <View style={tw`items-center mt-2`}>
                <Ionicons name="chevron-down" size={16} color={tw.color('gray-300')} />
             </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      {/* Header */}
      <View style={tw`px-5 pt-4 pb-4 bg-white border-b border-gray-200 shadow-sm`}>
        <View style={tw`flex-row items-center justify-between mt-5`}>
          <View style={tw`flex-row items-center `}>
            <Pressable onPress={() => router.back()} style={tw`p-2 -ml-2 mr-2 `}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </Pressable>
            <Text style={tw`text-xl font-bold text-gray-900`}>Support Inbox</Text>
          </View>
          
          {/* Total Pending Count */}
          <View style={tw`bg-red-100 px-3 py-1 rounded-full`}>
            <Text style={tw`text-red-600 text-xs font-bold`}>
              {tickets.filter(t => t.status === 'pending').length} Pending
            </Text>
          </View>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <ActivityIndicator size="large" color={tw.color('green-600')} style={tw`mt-10`} />
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          renderItem={renderTicketItem}
          contentContainerStyle={tw`p-5 pb-20`}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={tw`items-center justify-center mt-20`}>
              <Ionicons name="file-tray-outline" size={60} color={tw.color('gray-300')} />
              <Text style={tw`text-gray-400 text-lg mt-4 font-medium`}>No Tickets Found</Text>
              <Text style={tw`text-gray-400 text-sm`}>Good job! All clear.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}