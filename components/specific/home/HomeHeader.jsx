import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Modal, Pressable, Text, View } from "react-native";
import tw from "twrnc";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase/firebaseConfig";

const { width } = Dimensions.get("window");

export default function HomeHeader() {
  const router = useRouter();
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Animation Value (Starts off-screen: -width)
  const slideAnim = useRef(new Animated.Value(-width)).current;

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

  // Open Drawer
  const openMenu = () => {
    setModalVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  // Close Drawer
  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: -width,
      duration: 250,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
    });
  };

  // Handle Navigation
  const handleNav = (path) => {
    closeMenu();
    setTimeout(() => {
        router.push(path);
    }, 100);
  };

  // 🔥 BRANDED MENU LINK COMPONENT
  const MenuLink = ({ title, icon, path }) => (
    <Pressable
      onPress={() => handleNav(path)}
      style={({ pressed }) => tw.style(
        `flex-row items-center w-full p-3.5 mb-3 rounded-xl border border-green-800`, 
        // Agar press karein to thoda light green, warna transparent
        pressed ? `bg-green-800` : `bg-transparent`
      )}
    >
      {/* 1. Icon Container (Deep Green Accent) */}
      <View style={tw`bg-green-800/80 p-2 rounded-lg shadow-sm`}>
        <Ionicons name={icon} size={20} color="#bbf7d0" /> 
        {/* #bbf7d0 is light green tint */}
      </View>

      {/* 2. Text */}
      <Text style={tw`flex-1 text-base font-semibold text-white ml-4 tracking-wide`}>
        {title}
      </Text>

      {/* 3. Arrow */}
      <Ionicons name="chevron-forward" size={18} color="#4ade80" /> 
      {/* #4ade80 is bright green for direction */}
    </Pressable>
  );

  return (
    <>
      {/* 🔥 HEADER BAR */}
      <View style={tw`bg-green-900 py-4 px-5 shadow-xl z-50`}>
        <View style={tw`flex-row justify-between items-center`}>
          
          {/* Left: Menu & Logo */}
          <View style={tw`flex-row items-center`}>
            <Pressable 
                onPress={openMenu} 
                style={tw`mr-4 p-1 rounded-full active:bg-green-800`}
            >
              <Ionicons name="menu" size={28} color="white" />
            </Pressable>
            
            <Text style={tw`text-xl font-black text-white tracking-tighter`}>
              Court<Text style={tw`text-green-400`}>Chuno</Text>
            </Text>
          </View>

          {/* Right: Notification */}
          <Pressable 
            onPress={() => router.push('/(player)/notifications')} 
            style={tw`relative p-2 bg-green-800 rounded-full border border-green-700 shadow-sm`}
          >
            <Ionicons name="notifications" size={20} color="#facc15" />
            {unreadCount > 0 && (
              <View style={tw`absolute top-1 right-1.5 bg-red-500 rounded-full w-2.5 h-2.5 border border-green-900`} />
            )}
          </Pressable>
        </View>
      </View>

      {/* 🔥 SLIDING MENU MODAL */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeMenu}
      >
        <View style={tw`flex-1 flex-row`}>
          
          {/* 1. Animated Drawer (THEME: DEEP GREEN) */}
          <Animated.View 
            style={[
              // Use green-900 instead of gray-900 for brand consistency
              tw`bg-green-900 w-[80%] h-full pt-12 px-5 shadow-2xl z-20 border-r border-green-800`,
              { transform: [{ translateX: slideAnim }] }
            ]}
          >
             {/* Drawer Header */}
             <View style={tw`flex-row justify-between items-center mb-8 border-b border-green-800 pb-5`}>
                <View>
                    <Text style={tw`text-white font-black text-3xl tracking-tight`}>
                        Court<Text style={tw`text-green-400`}>Chuno</Text>
                    </Text>
                    <Text style={tw`text-green-200 text-xs mt-1 font-medium`}>PLAYER DASHBOARD</Text>
                </View>
                <Pressable onPress={closeMenu} style={tw`bg-green-800 p-2 rounded-full`}>
                    <Ionicons name="close" size={24} color="white" />
                </Pressable>
             </View>

             {/* Menu Links */}
             <View style={tw`flex-1 mt-2`}>
                <MenuLink title="Tournaments" path="/home/tournaments" icon="trophy" />
                <MenuLink title="About Us" path="/home/about" icon="information-circle" />
                <MenuLink title="Contact Support" path="/home/contactUs" icon="headset" />
                <MenuLink title="Terms & Policy" path="/home/terms" icon="shield-checkmark" />
             </View>

             {/* Footer */}
             <View style={tw`mb-8 border-t border-green-800 pt-6`}>
                <Text style={tw`text-green-300/60 text-center text-[10px] font-bold uppercase tracking-[3px]`}>
                    Version 1.0.0
                </Text>
             </View>
          </Animated.View>

          {/* 2. Overlay (Click to close) */}
          <Pressable 
            style={tw`flex-1 bg-black/60`} // Thoda dark overlay focus ke liye
            onPress={closeMenu} 
          />
        
        </View>
      </Modal>
    </>
  );
}