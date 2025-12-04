import React, { useState } from "react";
import { View, Image, Pressable, Modal, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import tw from "twrnc";
import { Ionicons } from "@expo/vector-icons";

// Menu link component
const MenuLink = ({ title, href, icon, onClose }) => (
  <Link href={href} asChild>
    <Pressable
      onPress={onClose}
      style={tw`flex-row items-center p-4 border-b border-gray-100`}
    >
      <Ionicons name={icon} size={22} color={tw.color("gray-600")} />
      <Text style={tw`text-lg text-gray-800 ml-4`}>{title}</Text>
    </Pressable>
  </Link>
);

export default function HomeHeader() {
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  return (
    <>
      {/* Header */}
      <SafeAreaView style={tw`bg-gray-100 h-30`}>
        <View style={tw`flex-row justify-between items-center p-4 `}>
          {/* Logo Text */}
          <View style={tw`h-10 justify-center`}>
            <Text style={tw`text-xl font-bold text-green-700`}>
              CourtChuno
            </Text>
            {/* <Image
              source={require("../../../assets/images/courtchuno-logo.png")}
              style={tw`h-10 w-32`}
              resizeMode="contain"
            /> */}
          </View>

          {/* Menu Button */}
          <Pressable onPress={() => setIsMenuVisible(true)}>
            <Ionicons name="menu" size={32} color={tw.color("gray-700")} />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Menu Modal */}
      <Modal
        visible={isMenuVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsMenuVisible(false)}
      >
        <SafeAreaView style={tw`flex-1 bg-gray-50`}>
          <View style={tw`flex-row justify-between items-center p-4`}>
            <Text style={tw`text-2xl font-bold text-blue-600`}>Menu</Text>
            <Pressable onPress={() => setIsMenuVisible(false)}>
              <Ionicons
                name="close-circle"
                size={32}
                color={tw.color("gray-400")}
              />
            </Pressable>
          </View>

          {/* Menu Links */}
          <View style={tw`bg-white mt-5`}>
            <MenuLink
              title="Tournaments"
              href="/home/tournaments"
              icon="trophy-outline"
              onClose={() => setIsMenuVisible(false)}
            />
            <MenuLink
              title="Contact Us"
              href="/home/contactUs"
              icon="call-outline"
              onClose={() => setIsMenuVisible(false)}
            />
            <MenuLink
              title="Terms & Policy"
              href="/home/terms"
              icon="document-text-outline"
              onClose={() => setIsMenuVisible(false)}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}
