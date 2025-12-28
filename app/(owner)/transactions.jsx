import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack, useFocusEffect } from "expo-router";
import {
    collection,
    getDocs,
    orderBy,
    query,
    where
} from "firebase/firestore";
import moment from "moment";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StatusBar,
    Text,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase/firebaseConfig";

// --- 🧮 HELPER: Calculate 95% Share ---
const getOwnerShare = (totalAmount) => {
  if (!totalAmount) return 0;
  return Math.round(totalAmount * 0.95);
};

// --- 💳 TRANSACTION CARD COMPONENT ---
const TransactionCard = ({ booking, type }) => {
  const isReceived = type === "received";
  const ownerAmount = getOwnerShare(booking.totalPrice || booking.amountPaid);
  
  // Date Formatting
  const dateObj = moment(booking.date, "YYYY-MM-DD");
  const day = dateObj.format("DD");
  const month = dateObj.format("MMM");

  // Time Display Logic
  let timeDisplay = "N/A";
  if (booking.timeDisplayRange) {
      timeDisplay = booking.timeDisplayRange;
  } else if (booking.bookedHours && booking.bookedHours.length > 0) {
      const start = Math.min(...booking.bookedHours);
      const end = Math.max(...booking.bookedHours) + 1;
      timeDisplay = `${start}:00 - ${end}:00`;
  } else if (booking.slotTime) {
      timeDisplay = `${booking.slotTime}:00`;
  }

  return (
    <View style={tw`bg-white p-4 rounded-xl mb-3 shadow-sm border border-gray-100 flex-row items-center`}>
      {/* Date Box */}
      <View style={tw`bg-gray-50 rounded-lg px-3 py-2 items-center mr-3 border border-gray-200`}>
        <Text style={tw`text-xs text-gray-500 font-bold uppercase`}>{month}</Text>
        <Text style={tw`text-lg font-extrabold text-gray-800`}>{day}</Text>
      </View>

      {/* Details */}
      <View style={tw`flex-1`}>
        <Text style={tw`text-sm font-bold text-gray-900`}>
          {booking.playerName}
        </Text>
        <Text style={tw`text-xs text-gray-500 mt-0.5`}>
          {booking.courtName} • {timeDisplay}
        </Text>
        <View style={tw`flex-row items-center mt-2`}>
            <View style={tw`bg-${isReceived ? 'green' : 'orange'}-100 px-2 py-0.5 rounded-md self-start`}>
                <Text style={tw`text-[10px] font-bold text-${isReceived ? 'green' : 'orange'}-700 uppercase`}>
                    {isReceived ? "Settled" : "Pending from Admin"}
                </Text>
            </View>
        </View>
      </View>

      {/* Amount (Right Side) */}
      <View style={tw`items-end`}>
        <Text style={tw`text-base font-extrabold ${isReceived ? 'text-green-600' : 'text-orange-600'}`}>
          Rs. {ownerAmount}
        </Text>
        <Text style={tw`text-[10px] text-gray-400`}>
          (95% Share)
        </Text>
      </View>
    </View>
  );
};

// --- MAIN SCREEN ---
export default function OwnerTransactions() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data States
  const [pendingList, setPendingList] = useState([]);
  const [receivedList, setReceivedList] = useState([]);
  const [activeTab, setActiveTab] = useState("pending"); // 'pending' | 'received'
  
  // Stats
  const [stats, setStats] = useState({ pendingTotal: 0, receivedTotal: 0 });

  // 1. Fetch Logic
  const fetchFinancials = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const q = query(
        collection(db, "bookings"),
        where("ownerId", "==", user.uid),
        orderBy("date", "desc") 
      );

      const querySnapshot = await getDocs(q);
      const allBookings = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // --- 🧠 CORE LOGIC FOR TABS ---
      const pList = [];
      const rList = [];
      let pTotal = 0;
      let rTotal = 0;

      allBookings.forEach((b) => {
        const ownerShare = getOwnerShare(b.totalPrice || b.amountPaid);
        
        if (b.status === 'completed_pending_payout') {
            pList.push(b);
            pTotal += ownerShare;
        } else if (b.status === 'completed_settled') {
            rList.push(b);
            rTotal += ownerShare;
        }
      });

      setPendingList(pList);
      setReceivedList(rList);
      setStats({ pendingTotal: pTotal, receivedTotal: rTotal });

    } catch (error) {
      console.error("Error fetching financials:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchFinancials();
    }, [fetchFinancials])
  );

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* 🛑 Hide Default Header */}
      <Stack.Screen options={{ headerShown: false }} />
      
      <StatusBar barStyle="light-content" backgroundColor="#14532d" />

      {/* 🟢 CUSTOM GREEN HEADER */}
      <View style={{ backgroundColor: '#14532d' }}>
         <SafeAreaView edges={['top', 'left', 'right']} style={tw`px-5 pb-6 pt-2`}>
            <View style={tw`flex-row items-center justify-between`}>
               <View>
                  <Text style={tw`text-2xl font-bold text-white`}>Earnings</Text>
                  <Text style={tw`text-green-200 text-xs`}>Track your payouts & history</Text>
               </View>
               <View style={tw`bg-green-800 p-2 rounded-full`}>
                  <Ionicons name="stats-chart" size={20} color="white"/>
               </View>
            </View>
         </SafeAreaView>
      </View>

      {/* --- STATS & TABS SECTION --- */}
      <View style={tw`px-5 -mt-4 mb-2`}>
        {/* Balance Cards */}
        <View style={tw`flex-row mb-6`}>
            {/* Pending Card */}
            <View style={tw`flex-1 bg-white p-4 rounded-xl border-l-4 border-orange-500 shadow-sm mr-2`}>
                <View style={tw`flex-row items-center mb-1`}>
                    <Ionicons name="time" size={14} color="#ea580c" />
                    <Text style={tw`text-orange-600 text-xs font-bold ml-1 uppercase`}>Pending</Text>
                </View>
                <Text style={tw`text-xl font-extrabold text-gray-800`}>
                    Rs. {stats.pendingTotal.toLocaleString()}
                </Text>
                <Text style={tw`text-[10px] text-gray-400 mt-1`}>Waiting for Admin</Text>
            </View>

            {/* Received Card */}
            <View style={tw`flex-1 bg-white p-4 rounded-xl border-l-4 border-green-600 shadow-sm ml-2`}>
                <View style={tw`flex-row items-center mb-1`}>
                    <Ionicons name="wallet" size={14} color="#15803d" />
                    <Text style={tw`text-green-600 text-xs font-bold ml-1 uppercase`}>Withdrawn</Text>
                </View>
                <Text style={tw`text-xl font-extrabold text-gray-800`}>
                    Rs. {stats.receivedTotal.toLocaleString()}
                </Text>
                <Text style={tw`text-[10px] text-gray-400 mt-1`}>In your account</Text>
            </View>
        </View>

        {/* Tabs */}
        <View style={tw`flex-row border-b border-gray-200`}>
          <Pressable 
            onPress={() => setActiveTab("pending")}
            style={tw`mr-6 pb-2 border-b-2 ${activeTab === "pending" ? "border-orange-500" : "border-transparent"}`}
          >
            <Text style={tw`font-bold ${activeTab === "pending" ? "text-orange-600" : "text-gray-400"}`}>
                Pending ({pendingList.length})
            </Text>
          </Pressable>

          <Pressable 
            onPress={() => setActiveTab("received")}
            style={tw`pb-2 border-b-2 ${activeTab === "received" ? "border-green-600" : "border-transparent"}`}
          >
            <Text style={tw`font-bold ${activeTab === "received" ? "text-green-600" : "text-gray-400"}`}>
                History ({receivedList.length})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* --- LIST --- */}
      {loading ? (
        <ActivityIndicator size="large" color="#15803d" style={tw`mt-10`} />
      ) : (
        <FlatList
          data={activeTab === "pending" ? pendingList : receivedList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TransactionCard booking={item} type={activeTab} />
          )}
          contentContainerStyle={tw`px-5 pb-20 pt-2`}
          refreshControl={
            <RefreshControl 
                refreshing={refreshing} 
                onRefresh={() => {setRefreshing(true); fetchFinancials();}} 
                colors={['#15803d']} // Green Spinner
            />
          }
          ListEmptyComponent={
            <View style={tw`items-center justify-center mt-12`}>
               <MaterialCommunityIcons 
                  name={activeTab === "pending" ? "timer-sand-empty" : "cash-refund"} 
                  size={50} 
                  color="#e2e8f0" 
               />
               <Text style={tw`text-gray-400 font-bold mt-4 text-center px-10`}>
                   {activeTab === "pending" 
                   ? "No pending payouts.\nEarnings appear here after matches end." 
                   : "No payout history yet."}
               </Text>
            </View>
          }
        />
      )}
    </View>
  );
}