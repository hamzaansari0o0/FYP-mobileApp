import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router"; // useRouter add kiya
import {
  collection,
  getDocs,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable, // Pressable add kiya
  StatusBar,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import TournamentCard from "../../../components/specific/TournamentCard";
import { db } from "../../../firebase/firebaseConfig";

export default function TournamentsScreen() {
  const router = useRouter(); // Router hook
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchActiveTournaments();
    }, [])
  );

  const fetchActiveTournaments = async () => {
    setLoading(true);

    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const q1 = query(
        collection(db, "tournaments"),
        where("status", "in", ["registration_open", "live"])
      );

      const q2 = query(
        collection(db, "tournaments"),
        where("status", "==", "completed"),
        where("completedAt", ">", Timestamp.fromDate(oneDayAgo))
      );

      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

      const tournamentMap = new Map();

      snap1.docs.forEach((doc) =>
        tournamentMap.set(doc.id, { id: doc.id, ...doc.data() })
      );

      snap2.docs.forEach((doc) =>
        tournamentMap.set(doc.id, { id: doc.id, ...doc.data() })
      );

      let list = Array.from(tournamentMap.values());

      list.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());

      setTournaments(list);
    } catch (error) {
      console.error("Error fetching tournaments: ", error);

      if (error.code === "failed-precondition") {
        Alert.alert(
          "Database Error",
          "Query requires an index. Please check the console log for a link to create it."
        );
      } else {
        Alert.alert("Error", "Could not fetch tournaments.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-green-800`}>
      <StatusBar barStyle="light-content" backgroundColor="#166534" />

      {/* --- Header Section --- */}
      <View style={tw`px-5 py-4 bg-green-800 pb-8`}>
        {/* Row for Arrow and Title */}
        <View style={tw`flex-row items-center mb-1`}>
          <Pressable 
            onPress={() => router.back()} 
            style={tw`mr-3 p-1 rounded-full bg-white/10`}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          
          <Text style={tw`text-2xl font-bold text-white tracking-wide`}>
            Tournaments 🏆
          </Text>
        </View>

        {/* Subtitle aligned with text */}
        <Text style={tw`text-green-100 text-xs ml-10`}>
          Compete, Win, and Rank Up!
        </Text>
      </View>

      {/* --- Body (Rounded Top) --- */}
      <View style={tw`flex-1 bg-gray-50 rounded-t-3xl -mt-6 overflow-hidden`}>
        {loading ? (
          <View style={tw`flex-1 justify-center items-center`}>
            <ActivityIndicator size="large" color="#166534" />
            <Text style={tw`text-gray-500 text-sm mt-4 font-medium`}>
              Loading Events...
            </Text>
          </View>
        ) : (
          <FlatList
            data={tournaments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <TournamentCard tournament={item} />}
            contentContainerStyle={tw`p-5 pb-20`}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={tw`items-center justify-center mt-20 px-6`}>
                <View style={tw`bg-green-100 p-6 rounded-full mb-4`}>
                  <Ionicons name="trophy-outline" size={48} color="#15803d" />
                </View>
                <Text style={tw`text-xl font-bold text-gray-800 mb-2`}>
                  No Active Tournaments
                </Text>
                <Text style={tw`text-gray-500 text-center leading-5`}>
                  There are no live or upcoming tournaments right now. Please check back later!
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}