import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import {
    collection,
    doc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    runTransaction,
    updateDoc,
    where
} from "firebase/firestore";
import moment from "moment";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
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
import { notifyUser } from "../../utils/notifications";

// --- 🎨 PROFESSIONAL BOOKING CARD (Maintained Logic) ---
const BookingCard = ({ booking, onCancel, isCancelling }) => {
  const isCancelled = booking.status && booking.status.startsWith("cancelled");
  const isCompleted = booking.status === 'completed_pending_payout' || booking.status === 'completed_settled';

  // Handling Time Display
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

  // --- Dynamic Styles ---
  let cardBorder = "border-l-4 border-green-700"; 
  let badgeBg = "bg-green-50";
  let badgeText = "text-green-800";
  let statusLabel = "Paid / Upcoming";
  let dateBoxBg = "bg-green-50";
  let dateText = "text-green-800";

  if (isCancelled) {
      cardBorder = "border-l-4 border-red-500";
      badgeBg = "bg-red-50";
      badgeText = "text-red-600";
      statusLabel = "Cancelled";
      dateBoxBg = "bg-red-50";
      dateText = "text-red-600";
  } else if (isCompleted) {
      cardBorder = "border-l-4 border-blue-500";
      badgeBg = "bg-blue-50";
      badgeText = "text-blue-700";
      statusLabel = "Completed";
      dateBoxBg = "bg-blue-50";
      dateText = "text-blue-700";
  }

  return (
    <View style={tw`mb-4 mx-5 bg-white rounded-xl shadow-md ${cardBorder} overflow-hidden`}>
      <View style={tw`p-4`}>
        
        {/* Row 1: Date & Player Name */}
        <View style={tw`flex-row justify-between items-start mb-3`}>
            <View style={tw`flex-row items-center`}>
                {/* Date Box */}
                <View style={tw`${dateBoxBg} p-2.5 rounded-lg items-center justify-center mr-3 border border-gray-100`}>
                    <Text style={tw`text-xs font-bold uppercase text-gray-500`}>
                        {moment(booking.date).format("MMM")}
                    </Text>
                    <Text style={tw`text-xl font-extrabold ${dateText}`}>
                        {moment(booking.date).format("DD")}
                    </Text>
                </View>
                
                {/* Name & Court */}
                <View>
                    <Text style={tw`text-lg font-bold text-gray-900`}>
                        {booking.playerName}
                    </Text>
                    <Text style={tw`text-xs text-gray-500 font-medium`}>
                        {booking.courtName}
                    </Text>
                </View>
            </View>

            {/* Status Badge */}
            <View style={tw`px-2.5 py-1 rounded-full ${badgeBg} border border-gray-100`}>
                <Text style={tw`text-[10px] font-bold uppercase ${badgeText}`}>
                    {statusLabel}
                </Text>
            </View>
        </View>

        {/* Divider */}
        <View style={tw`h-[1px] bg-gray-100 my-2`} />

        {/* Row 2: Time & Price */}
        <View style={tw`flex-row justify-between items-center`}>
             <View style={tw`flex-row items-center`}>
                <Ionicons name="time" size={16} color={tw.color('green-700')} />
                <Text style={tw`text-sm font-semibold text-gray-700 ml-1.5`}>
                    {timeDisplay}
                </Text>
             </View>
             <Text style={tw`text-base font-bold text-gray-900`}>
                Rs. {booking.totalPrice || booking.amountPaid}
             </Text>
        </View>

        {/* --- ACTIONS SECTION --- */}
        {!isCancelled && !isCompleted && (
            <View style={tw`mt-4 pt-3 border-t border-dashed border-gray-200`}>
                <Pressable
                    onPress={() => onCancel(booking)}
                    disabled={isCancelling}
                    style={tw`flex-row justify-center items-center py-2.5 bg-red-50 rounded-lg border border-red-100 active:bg-red-100`}
                >
                    {isCancelling ? (
                        <ActivityIndicator size="small" color="red" />
                    ) : (
                        <>
                            <Ionicons name="close-circle" size={18} color="#dc2626" style={tw`mr-1.5`} />
                            <Text style={tw`text-red-600 text-xs font-bold uppercase tracking-wide`}>Cancel Booking</Text>
                        </>
                    )}
                </Pressable>
            </View>
        )}

        {isCompleted && (
             <View style={tw`mt-3 pt-2 border-t border-dashed border-blue-100`}>
                <View style={tw`flex-row justify-center items-center`}>
                    <Text style={tw`text-blue-500 text-[10px] font-bold uppercase tracking-wide`}>
                        Money in Escrow / Settled
                    </Text>
                </View>
             </View>
        )}

        {isCancelled && (
            <View style={tw`mt-3 pt-2`}>
                <Text style={tw`text-[10px] text-red-400 italic text-center`}>
                    Refund has been initiated to the player.
                </Text>
            </View>
        )}

      </View>
    </View>
  );
};

// --- MAIN DASHBOARD ---
export default function OwnerDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // --- 🔥 NEW: Tab State ---
  const [activeTab, setActiveTab] = useState('present'); // 'past', 'present', 'future'

  // 1. Notifications Count
  useEffect(() => {
    if (!user) return;
    const q = query(
        collection(db, 'notifications'), 
        where('userId', '==', user.uid),
        where('read', '==', false)
    );
    const unsubscribe = onSnapshot(q, (snap) => setUnreadCount(snap.size));
    return () => unsubscribe();
  }, [user]);

  // 2. Fetch Bookings
  const fetchOwnerBookings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // ✅ CHANGED: Removed date filter to allow fetching Past bookings as well
      const q = query(
        collection(db, "bookings"),
        where("ownerId", "==", user.uid),
        orderBy("date", "desc") // Fetch all history
      );
      const querySnapshot = await getDocs(q);
      let bookingsList = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Auto Complete Logic (Escrow)
      const now = moment();
      const updates = [];
      bookingsList = bookingsList.map(b => {
          if (b.status === 'cancelled' || (b.status && b.status.startsWith('cancelled')) || b.status === 'completed_pending_payout' || b.status === 'completed_settled') {
              return b;
          }
          let endHour = 0;
          if (b.bookedHours && Array.isArray(b.bookedHours) && b.bookedHours.length > 0) {
              const maxHour = Math.max(...b.bookedHours);
              endHour = maxHour + 1;
          } else if (b.slotTime) {
              endHour = parseInt(b.slotTime) + 1;
          } else {
              return b;
          }
          const bookingEndTime = moment(b.date, "YYYY-MM-DD").hour(endHour).minute(0);
          
          // 🔥 This triggers the move to "Earnings" (Pending)
          if (now.isAfter(bookingEndTime)) {
              b.status = 'completed_pending_payout';
              updates.push(updateDoc(doc(db, "bookings", b.id), { status: 'completed_pending_payout' }));
          }
          return b;
      });
      if (updates.length > 0) await Promise.all(updates);
      setBookings(bookingsList);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { fetchOwnerBookings(); }, [fetchOwnerBookings]));
  const onRefresh = () => { setRefreshing(true); fetchOwnerBookings(); };

  // --- 🔥 NEW: Filtering Logic based on Tabs ---
  const filteredBookings = useMemo(() => {
    const today = moment().startOf('day');

    return bookings.filter(booking => {
        const bookingDate = moment(booking.date, "YYYY-MM-DD");

        if (activeTab === 'past') {
            return bookingDate.isBefore(today);
        } else if (activeTab === 'present') {
            return bookingDate.isSame(today);
        } else if (activeTab === 'future') {
            return bookingDate.isAfter(today);
        }
        return false;
    }).sort((a, b) => {
        // Sort Logic: 
        // Present/Future: Ascending (Soonest first)
        // Past: Descending (Most recent past first)
        const dateA = moment(a.date, "YYYY-MM-DD");
        const dateB = moment(b.date, "YYYY-MM-DD");

        if (activeTab === 'past') {
            return dateB.valueOf() - dateA.valueOf();
        }
        return dateA.valueOf() - dateB.valueOf();
    });

  }, [bookings, activeTab]);

  // 3. Cancel Logic
  const handleOwnerCancel = (booking) => {
    Alert.alert(
      "Cancel Booking?",
      "This will cancel the booking and refund the player.",
      [
        { text: "No", style: "cancel" },
        { text: "Yes, Cancel", style: "destructive", onPress: () => performOwnerCancellation(booking) },
      ]
    );
  };

  const performOwnerCancellation = async (booking) => {
    setCancellingId(booking.id);
    const bookingRef = doc(db, "bookings", booking.id);
    const slotDocId = `${booking.courtId}_${booking.date}`;
    const slotRef = doc(db, "court_slots", slotDocId);

    try {
      await runTransaction(db, async (transaction) => {
        const slotDoc = await transaction.get(slotRef);
        if (slotDoc.exists()) {
          const slotsMap = slotDoc.data().slots || {};
          const hoursToCancel = booking.bookedHours || [booking.slotTime];
          if(Array.isArray(hoursToCancel)){
              hoursToCancel.forEach(hour => { slotsMap[hour] = "unavailable"; });
          }
          transaction.update(slotRef, { slots: slotsMap });
        }
        transaction.update(bookingRef, { status: "cancelled_by_owner", cancellationReason: "Owner Decision" });
      });

      await notifyUser(
        booking.playerId,
        "Booking Cancelled ⚠️",
        `Your booking at ${booking.arenaName} was cancelled by the owner.`,
        "alert", 
        { url: '/(player)/history' }
      );
      fetchOwnerBookings();
      Alert.alert("Cancelled", "Booking has been cancelled.");
    } catch (error) {
      Alert.alert("Error", "Could not cancel booking.");
    } finally {
      setCancellingId(null);
    }
  };

  // --- 🔥 Component for Tab Button ---
  const TabButton = ({ title, value }) => {
    const isActive = activeTab === value;
    return (
        <Pressable 
            onPress={() => setActiveTab(value)}
            style={tw.style(
                `flex-1 items-center py-3 border-b-2`,
                isActive ? `border-green-800` : `border-transparent`
            )}
        >
            <Text style={tw.style(
                `font-bold text-sm uppercase tracking-wide`,
                isActive ? `text-green-800` : `text-gray-400`
            )}>
                {title}
            </Text>
        </Pressable>
    );
  }

  return (
    <View style={tw`flex-1 bg-gray-50`}>
        {/* 🟢 1. STATUS BAR */}
        <StatusBar barStyle="light-content" backgroundColor="#14532d" translucent={false} />
        
        {/* 🟢 2. DARK GREEN HEADER */}
        <View style={{ backgroundColor: '#14532d' }}>
            <SafeAreaView edges={['top', 'left', 'right']} style={tw`px-5 pb-4 pt-2 border-b border-green-800`}>
                <View style={tw`flex-row justify-between items-center`}>
                    
                    {/* Left Side: Icon & Title */}
                    <View style={tw`flex-row items-center gap-3`}>
                        <View style={tw`bg-green-800 p-2 rounded-xl`}>
                            <MaterialCommunityIcons name="view-dashboard" size={22} color="white" />
                        </View>
                        <View>
                            <Text style={tw`text-xs text-green-300 font-medium uppercase tracking-wider`}>Welcome Back</Text>
                            <Text style={tw`text-xl font-bold text-white`}>Dashboard</Text>
                        </View>
                    </View>

                    {/* Right Side: Notification */}
                    <Pressable 
                        onPress={() => router.push('/(owner)/notifications')}
                        style={tw`bg-green-800 p-2.5 rounded-full border border-green-700 relative`}
                    >
                        <Ionicons name="notifications-outline" size={20} color="white" />
                        {unreadCount > 0 && (
                            <View style={tw`absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full border-2 border-[#14532d] items-center justify-center`}>
                                <Text style={tw`text-[8px] font-bold text-white`}>{unreadCount}</Text>
                            </View>
                        )}
                    </Pressable>
                </View>
            </SafeAreaView>
        </View>

        {/* --- 🔥 3. TABS SECTION --- */}
        <View style={tw`flex-row bg-white border-b border-gray-200 px-2`}>
            <TabButton title="Past" value="past" />
            <TabButton title="Present" value="present" />
            <TabButton title="Future" value="future" />
        </View>

        {/* --- CONTENT --- */}
        {loading ? (
            <View style={tw`flex-1 justify-center items-center`}>
                <ActivityIndicator size="large" color={tw.color("green-700")} />
            </View>
        ) : (
            <FlatList
                data={filteredBookings}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <BookingCard
                        booking={item}
                        onCancel={handleOwnerCancel}
                        isCancelling={cancellingId === item.id}
                    />
                )}
                contentContainerStyle={tw`pt-5 pb-24`}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[tw.color('green-700')]} />
                }
                ListHeaderComponent={
                    filteredBookings.length > 0 && (
                        <View style={tw`px-5 mb-3 flex-row items-center justify-between`}>
                          <Text style={tw`text-xs font-bold text-gray-500 uppercase tracking-wider`}>
                            {activeTab} Schedule
                          </Text>
                          <Text style={tw`text-[10px] text-green-700 font-bold bg-green-100 px-2 py-0.5 rounded-full`}>
                             {filteredBookings.length} Bookings
                          </Text>
                        </View>
                    )
                }
                ListEmptyComponent={
                    <View style={tw`items-center justify-center mt-20 px-10`}>
                        <View style={tw`bg-white p-6 rounded-full shadow-sm mb-4 border border-gray-100`}>
                            <MaterialCommunityIcons 
                                name={activeTab === 'past' ? "history" : activeTab === 'future' ? "calendar-arrow-right" : "calendar-today"} 
                                size={48} 
                                color={tw.color('green-200')} 
                            />
                        </View>
                        <Text style={tw`text-lg font-bold text-gray-800 mb-1 capitalize`}>No {activeTab} Bookings</Text>
                        <Text style={tw`text-xs text-gray-500 text-center leading-5`}>
                            {activeTab === 'past' ? "You don't have any past bookings." : 
                             activeTab === 'present' ? "No games scheduled for today." : 
                             "No upcoming bookings found."}
                        </Text>
                    </View>
                }
            />
        )}
    </View>
  );
}