import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  where
} from "firebase/firestore";
import moment from "moment";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
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

// --- 🔥 1. MAP OPENING LOGIC (Standard) ---
const openMapsForDirections = (lat, lng, label) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lng}`;
    const labelEncoded = encodeURIComponent(label);
    
    const url = Platform.select({
        ios: `${scheme}${labelEncoded}@${latLng}`,
        android: `${scheme}${latLng}(${labelEncoded})`
    });

    Linking.openURL(url).catch(err => {
        Linking.openURL(`http://googleusercontent.com/maps.google.com/maps?q=${lat},${lng}`);
    });
};

/* 🧾 Booking Card Component (Updated for Multi-Slots) */
const BookingCard = ({ booking, onCancel, isCancelling }) => {
  const [loadingMap, setLoadingMap] = useState(false); 

  // --- 🔥 UPDATE 1: Handling Multi-Slot Time Display ---
  // Agar 'timeDisplayRange' (Multi) hai to wo dikhaye, warna purana single time
  const displayTime = booking.timeDisplayRange 
    ? booking.timeDisplayRange 
    : (booking.slotTime ? moment(booking.slotTime, "HH:mm").format("h:00 A") : "Time N/A");

  const slotCount = booking.slotCount || 1;

  const displayDate = booking.date 
    ? moment(booking.date).format("ddd, DD MMM YYYY") 
    : moment(booking.slotDateTime.toDate()).format("ddd, DD MMM YYYY");

  // --- 🔥 UPDATE 2: Cancellation Time Logic for Multi-Slots ---
  let bookingTimestamp;
  if (booking.slotDateTime?.toDate) {
      bookingTimestamp = booking.slotDateTime.toDate();
  } else {
      // New Logic: Agar bookedHours array hai, to uska pehla ghanta uthao
      const firstHour = booking.bookedHours ? booking.bookedHours[0] : booking.slotTime;
      bookingTimestamp = moment(`${booking.date}T${firstHour}:00`, "YYYY-MM-DDTHH:mm").toDate();
  }

  const hoursRemaining = moment(bookingTimestamp).diff(moment(), "hours");
  const isCancelled = booking.status.startsWith("cancelled");
  const isUpcoming = booking.status === "upcoming";
  const canCancel = hoursRemaining >= 4 && isUpcoming; 

  const refundAccountDisplay = booking.playerRefundAccount
    ? `...${booking.playerRefundAccount.slice(-4)}`
    : "Wallet";

  // --- INTELLIGENT DIRECTION HANDLER ---
  const handleDirectionPress = async () => {
    setLoadingMap(true);
    try {
        let lat = booking.location?.latitude;
        let lng = booking.location?.longitude;
        const arenaName = booking.arenaName || "Arena";

        if (lat && lng) {
            openMapsForDirections(lat, lng, arenaName);
            setLoadingMap(false);
            return;
        }

        if (booking.ownerId) {
            const ownerRef = doc(db, "users", booking.ownerId);
            const ownerSnap = await getDoc(ownerRef);

            if (ownerSnap.exists()) {
                const ownerData = ownerSnap.data();
                if (ownerData.location && ownerData.location.latitude) {
                    lat = ownerData.location.latitude;
                    lng = ownerData.location.longitude;
                    openMapsForDirections(lat, lng, ownerData.arenaName || arenaName);
                } else {
                    Alert.alert("Location Not Found", "The arena owner hasn't set a pinned location.");
                }
            } else {
                Alert.alert("Error", "Arena details not found.");
            }
        } else {
             const address = booking.arenaAddress || arenaName;
             const url = Platform.select({
                ios: `maps:0,0?q=${encodeURIComponent(address)}`,
                android: `geo:0,0?q=${encodeURIComponent(address)}`
            });
            Linking.openURL(url);
        }

    } catch (error) {
        console.error("Map Error:", error);
        Alert.alert("Error", "Could not fetch location.");
    } finally {
        setLoadingMap(false);
    }
  };

  return (
    <View style={tw`bg-white rounded-xl shadow-sm mb-4 border border-gray-100 overflow-hidden`}>
      <View style={tw`h-1.5 ${isCancelled ? 'bg-red-500' : 'bg-green-600'}`} />

      <View style={tw`p-4`}>
        {/* Arena Name */}
        <View style={tw`flex-row justify-between items-start mb-2`}>
          <View style={tw`flex-1 mr-2`}>
            <Text style={tw`text-lg font-bold text-gray-900 leading-tight`}>
              {booking.arenaName || "Arena Name Missing"}
            </Text>
            <Text style={tw`text-xs text-gray-500 font-medium uppercase mt-1`}>
              {booking.courtName || "Court Details Missing"}
            </Text>
          </View>
          
          <View style={tw`px-2 py-1 rounded-md ${isCancelled ? 'bg-red-50' : 'bg-green-50'}`}>
            <Text style={tw`text-xs font-bold ${isCancelled ? 'text-red-700' : 'text-green-700'} uppercase`}>
              {isCancelled ? "Cancelled" : "Confirmed"}
            </Text>
          </View>
        </View>

        {/* Directions Button */}
        <Pressable 
            onPress={handleDirectionPress}
            disabled={loadingMap}
            style={tw`flex-row items-center justify-center bg-blue-600 py-2.5 rounded-lg mb-4 shadow-sm active:bg-blue-700`}
        >
            {loadingMap ? (
                <ActivityIndicator size="small" color="white" />
            ) : (
                <>
                    <MaterialIcons name="directions" size={20} color="white" style={tw`mr-2`} />
                    <Text style={tw`text-white font-bold text-sm`}>Get Directions</Text>
                </>
            )}
        </Pressable>

        {/* Booking Info */}
        <View style={tw`bg-gray-50 p-3 rounded-lg mb-3`}>
            <View style={tw`flex-row items-center mb-2`}>
                <Ionicons name="calendar" size={16} color="#4B5563" />
                <Text style={tw`text-gray-700 ml-2 text-sm font-medium`}>
                    {displayDate}
                </Text>
            </View>

            <View style={tw`flex-row items-start`}>
                <Ionicons name="time" size={16} color="#4B5563" style={tw`mt-0.5`} />
                <View style={tw`ml-2 flex-1`}>
                    <Text style={tw`text-gray-700 text-sm font-medium`}>
                        {displayTime}
                    </Text>
                    {/* Show Slot Count Logic */}
                    {slotCount > 1 && (
                        <Text style={tw`text-blue-600 text-xs font-bold mt-0.5`}>
                            ({slotCount} Slots Booked)
                        </Text>
                    )}
                </View>
            </View>
        </View>

        <View style={tw`flex-row items-center justify-between`}>
          <View style={tw`flex-row items-center`}>
            <Ionicons name="cash-outline" size={18} color="#059669" />
            <Text style={tw`text-gray-600 ml-2 text-sm`}>Amount Paid:</Text>
          </View>
          <Text style={tw`font-bold text-green-700 text-base`}>Rs. {booking.amountPaid}</Text>
        </View>

        {/* Cancel Actions */}
        {isUpcoming && (
          <View style={tw`mt-4 pt-3 border-t border-gray-100`}>
            {canCancel ? (
              <Pressable
                style={tw.style(
                  `flex-row justify-center items-center border border-red-200 bg-red-50 py-2.5 rounded-lg`,
                  isCancelling && `opacity-50`
                )}
                onPress={() => onCancel(booking)}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
                    <Text style={tw`text-red-700 font-bold ml-2 text-sm`}>Cancel Booking</Text>
                  </>
                )}
              </Pressable>
            ) : (
              <View style={tw`bg-gray-100 py-2 rounded-lg flex-row justify-center items-center`}>
                 <Ionicons name="lock-closed" size={14} color="#6B7280" />
                <Text style={tw`text-xs text-center text-gray-500 font-medium ml-2`}>
                  Cannot cancel (Less than 4 hours left)
                </Text>
              </View>
            )}
          </View>
        )}

        {isCancelled && (
          <View style={tw`mt-3 bg-red-50 p-2 rounded-lg border border-red-100`}>
             <Text style={tw`text-xs text-red-600 text-center`}>
                Refund initiated to {refundAccountDisplay}
             </Text>
          </View>
        )}
      </View>
    </View>
  );
};

/* 🏠 Main History Screen */
export default function HistoryScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  useFocusEffect(
    useCallback(() => {
      if (user) fetchMyBookings();
    }, [user])
  );

  // --- 🔥 UPDATE 3: Sorting Logic (Nearest First) ---
  const fetchMyBookings = async () => {
    try {
      // 1. Get ALL user bookings (No orderBy inside query to avoid Type errors)
      const q = query(
        collection(db, "bookings"),
        where("playerId", "==", user.uid)
      );

      const querySnapshot = await getDocs(q);
      const now = moment();

      const bookingsList = querySnapshot.docs
        .map((docSnap) => {
            const data = docSnap.data();
            
            // Generate a 'sortTime' object for consistent sorting
            let sortTime;
            if (data.date && data.bookedHours && data.bookedHours.length > 0) {
                // New Format: Use the FIRST booked hour
                sortTime = moment(`${data.date}T${data.bookedHours[0]}:00`, "YYYY-MM-DDTHH:mm");
            } else if (data.slotDateTime) {
                // Old Format: Use Timestamp
                sortTime = moment(data.slotDateTime.toDate());
            } else {
                 // Error Case: Push to end
                 sortTime = moment().add(10, 'years');
            }

            return { id: docSnap.id, ...data, sortTime };
        })
        .filter((booking) => {
          // Filter out OLD completed bookings if you only want Upcoming
          // Or keep them but ensure cancelled/expired logic is correct
          // Logic: Show if Upcoming OR (Completed but not too old?)
          // For now, let's keep your original filter logic:
          
          if (booking.status === "completed_and_paid") return false; // Hide old completed
          
          // Check expiry
          if (booking.sortTime.isBefore(now) && booking.status !== 'upcoming') {
              return false; // Hide past bookings
          }
          return true;
        })
        // Sort: Sabse chota time (Nearest Future) sabse pehle
        .sort((a, b) => a.sortTime.valueOf() - b.sortTime.valueOf());

      setBookings(bookingsList);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      if(error.code === 'failed-precondition') {
        Alert.alert("System Update", "Optimizing database... please reload in 2 minutes.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyBookings();
  };

  const handleCancelBooking = (booking) => {
    const refundAccountDisplay = booking.playerRefundAccount
      ? `...${booking.playerRefundAccount.slice(-4)}`
      : "your registered method";
      
    Alert.alert(
      "Confirm Cancellation",
      `Are you sure? This will cancel ${booking.slotCount || 1} slot(s).\n\nRefund: Rs. ${booking.amountPaid}\nTo: ${refundAccountDisplay}`,
      [
        { text: "No, Keep it", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () => performCancellation(booking),
        },
      ]
    );
  };
  


  // --- 🔥 UPDATE 4: Cancellation Logic for Multi-Slots ---
  const performCancellation = async (booking) => {
    setCancellingId(booking.id);
    const bookingRef = doc(db, "bookings", booking.id);
    const slotDocId = `${booking.courtId}_${booking.date}`; 
    const slotRef = doc(db, "court_slots", slotDocId);

    try {
      await runTransaction(db, async (transaction) => {
        const slotDoc = await transaction.get(slotRef);
        
        if (slotDoc.exists()) {
          const slotsMap = slotDoc.data().slots || {};
          
          // Determine which slots to free (New Array vs Old Single String)
          const slotsToFree = booking.bookedHours || [booking.slotTime];

          // Loop through ALL booked hours and free them
          slotsToFree.forEach((hour) => {
              if (slotsMap[hour]) {
                  slotsMap[hour] = "available";
              }
          });

          // Update the slots document
          transaction.update(slotRef, { slots: slotsMap });
        }
        
        // Update booking status
        transaction.update(bookingRef, { status: "cancelled_by_player" });
      });

      Alert.alert("Success", "Booking Cancelled. Refund initiated.");
      fetchMyBookings(); // Refresh list immediately
    } catch (error) {
      console.error("Cancellation Failed:", error);
      Alert.alert("Error", "Network error. Could not cancel.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
       <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
       
      <View style={tw`px-5 py-4 bg-white border-b border-gray-200 mb-2`}>
        <Text style={tw`text-2xl font-bold text-gray-900`}>My Bookings</Text>
        <Text style={tw`text-gray-500 text-xs`}>Your upcoming games schedule</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={tw.color("green-600")} style={tw`mt-20`} />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={tw`p-5 pb-20`}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[tw.color("green-600")]} />
          }
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onCancel={handleCancelBooking}
              isCancelling={cancellingId === item.id}
            />
          )}
          ListEmptyComponent={
            <View style={tw`items-center justify-center mt-20 px-10`}>
              <View style={tw`bg-gray-100 p-6 rounded-full mb-4`}>
                <Ionicons name="calendar-outline" size={50} color={tw.color("gray-400")} />
              </View>
              <Text style={tw`text-lg font-bold text-gray-800`}>No Upcoming Bookings</Text>
              <Text style={tw`text-center text-gray-500 mt-2 mb-6 leading-5`}>
                Your scheduled games will appear here with full details.
              </Text>
              
              <Pressable 
                onPress={() => router.push("/(player)/home")}
                style={tw`bg-green-700 px-6 py-3 rounded-full shadow-lg shadow-green-200`}
              >
                <Text style={tw`text-white font-bold`}>Book a Court Now</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}