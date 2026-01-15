// components/specific/FilterModal.jsx
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import tw from "twrnc";

const SPORTS = ["All", "Cricket", "Football", "Badminton", "Padel", "Tennis"];

export default function FilterModal({
  visible,
  onClose,
  onApply,
  currentFilters,
}) {
  const [selectedSport, setSelectedSport] = useState(
    currentFilters.sport || "All"
  );
  const [maxPrice, setMaxPrice] = useState(
    currentFilters.maxPrice ? String(currentFilters.maxPrice) : ""
  );
  const [userLocation, setUserLocation] = useState(
    currentFilters.userLocation || null
  );
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Handle getting current location
  const handleGetCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert("Permission to access location was denied");
        setLoadingLocation(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error(error);
      alert("Could not fetch location");
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleApply = () => {
    onApply({
      sport: selectedSport,
      maxPrice: maxPrice ? parseInt(maxPrice) : null,
      userLocation: userLocation,
    });
    onClose();
  };

  const handleReset = () => {
    setSelectedSport("All");
    setMaxPrice("");
    setUserLocation(null);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 justify-end bg-black/50`}>
        <View style={tw`bg-white rounded-t-3xl p-6 h-[75%]`}>
          {/* Header */}
          <View style={tw`flex-row justify-between items-center mb-6`}>
            <Text style={tw`text-xl font-bold text-gray-800`}>
              Filter Arenas
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons
                name="close-circle"
                size={28}
                color={tw.color("gray-400")}
              />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 1. Location Filter */}
            <View style={tw`mb-6`}>
              <Text style={tw`text-sm font-bold text-gray-600 mb-3 uppercase`}>
                Sort by Location
              </Text>
              <Pressable
                onPress={handleGetCurrentLocation}
                style={tw`flex-row items-center justify-center p-4 rounded-xl border ${
                  userLocation
                    ? "bg-green-50 border-green-500"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                {loadingLocation ? (
                  <ActivityIndicator size="small" color="green" />
                ) : (
                  <>
                    <Ionicons
                      name={userLocation ? "navigate" : "navigate-outline"}
                      size={20}
                      color={userLocation ? "green" : "gray"}
                    />
                    <Text
                      style={tw`ml-2 font-semibold ${
                        userLocation ? "text-green-700" : "text-gray-600"
                      }`}
                    >
                      {userLocation
                        ? "Location Found (Nearest First)"
                        : "Use My Current Location"}
                    </Text>
                  </>
                )}
              </Pressable>
              {userLocation && (
                <Text style={tw`text-xs text-green-600 mt-1 ml-1`}>
                  Arenas will be sorted by distance.
                </Text>
              )}
            </View>

            {/* 2. Sport Type Filter */}
            <View style={tw`mb-6`}>
              <Text style={tw`text-sm font-bold text-gray-600 mb-3 uppercase`}>
                Sport Type
              </Text>
              <View style={tw`flex-row flex-wrap gap-2`}>
                {SPORTS.map((sport) => (
                  <Pressable
                    key={sport}
                    onPress={() => setSelectedSport(sport)}
                    style={tw`px-4 py-2 rounded-full border ${
                      selectedSport === sport
                        ? "bg-green-600 border-green-600"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Text
                      style={tw`text-xs font-bold ${
                        selectedSport === sport ? "text-white" : "text-gray-600"
                      }`}
                    >
                      {sport}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* 3. Price Filter */}
            <View style={tw`mb-6`}>
              <Text style={tw`text-sm font-bold text-gray-600 mb-3 uppercase`}>
                Max Price (Per Hour)
              </Text>
              <View
                style={tw`flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3`}
              >
                <Text style={tw`text-gray-500 mr-2`}>PKR</Text>
                <TextInput
                  placeholder="e.g. 2000"
                  keyboardType="numeric"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  style={tw`flex-1 font-bold text-gray-800`}
                />
              </View>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={tw`pt-4 border-t border-gray-100 flex-row gap-4`}>
            <Pressable
              onPress={handleReset}
              style={tw`flex-1 py-4 bg-gray-100 rounded-xl items-center`}
            >
              <Text style={tw`font-bold text-gray-600`}>Reset</Text>
            </Pressable>
            <Pressable
              onPress={handleApply}
              style={tw`flex-[2] py-4 bg-green-700 rounded-xl items-center shadow-lg shadow-green-200`}
            >
              <Text style={tw`font-bold text-white`}>Apply Filters</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
