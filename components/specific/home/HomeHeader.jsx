import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native"; // 🔥 ScrollView added here
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase/firebaseConfig";

const MenuLink = ({ title, href, icon, onClose }) => (
  <Link href={href} asChild>
    <Pressable
      onPress={onClose}
      style={tw`flex-row items-center p-4 border-b border-gray-50`}
    >
      <View style={tw`bg-gray-100 p-2 rounded-lg`}>
        <Ionicons name={icon} size={20} color={tw.color("gray-600")} />
      </View>
      <Text style={tw`text-lg font-medium text-gray-800 ml-4`}>{title}</Text>
    </Pressable>
  </Link>
);

export default function HomeHeader() {
  const router = useRouter();
  const { user } = useAuth();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', user.uid), 
      where('read', '==', false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [user]);

  return (
    <>
      <SafeAreaView style={tw`bg-white shadow-sm z-50`}>
        <View style={tw`flex-row justify-between items-center px-4 py-3`}>
          <View style={tw`flex-row items-center`}>
            <Pressable onPress={() => setIsMenuVisible(true)} style={tw`mr-3 p-1`}>
              <Ionicons name="menu-outline" size={30} color={tw.color("gray-800")} />
            </Pressable>
            <Text style={tw`text-2xl font-black text-green-700 tracking-tighter`}>
              CourtChuno
            </Text>
          </View>

          <Pressable onPress={() => router.push('/(player)/notifications')} style={tw`relative p-2 bg-gray-50 rounded-full`}>
            <Ionicons name="notifications-outline" size={24} color={tw.color("gray-700")} />
            {unreadCount > 0 && (
              <View style={tw`absolute top-2 right-2 bg-red-500 rounded-full w-2.5 h-2.5 border-2 border-white`} />
            )}
          </Pressable>
        </View>
      </SafeAreaView>

      <Modal
        visible={isMenuVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsMenuVisible(false)}
      >
        <View style={tw`flex-1 bg-black/60`}>
            <View style={tw`bg-white w-3/4 h-full pt-12`}>
                <View style={tw`flex-row justify-between items-center px-6 mb-6 pb-4 border-b border-gray-100`}>
                    <Text style={tw`text-2xl font-black text-green-700`}>Menu</Text>
                    <Pressable onPress={() => setIsMenuVisible(false)} style={tw`p-1`}>
                       <Ionicons name="close-circle-outline" size={32} color={tw.color("gray-400")} />
                    </Pressable>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    <MenuLink
                      title="Tournaments"
                      href="/home/tournaments"
                      icon="trophy-outline"
                      onClose={() => setIsMenuVisible(false)}
                    />
                    
                    <MenuLink
                      title="About CourtChuno"
                      href="/home/about"
                      icon="information-circle-outline"
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
                </ScrollView>

                <View style={tw`p-6 border-t border-gray-100`}>
                  <Text style={tw`text-gray-400 text-xs font-bold uppercase`}>App Version 1.0.0</Text>
                </View>
            </View>
            <Pressable style={tw`flex-1`} onPress={() => setIsMenuVisible(false)} />
        </View>
      </Modal>
    </>
  );
}