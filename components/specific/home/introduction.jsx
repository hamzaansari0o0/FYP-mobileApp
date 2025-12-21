import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import tw from 'twrnc';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../firebase/firebaseConfig';

// --- Feature Card Component ---
const FeatureCard = ({ icon, title, desc, index }) => (
  <Animated.View 
    entering={FadeInUp.delay(index * 100).duration(500)}
    layout={Layout.springify()}
    style={tw`bg-white p-5 rounded-3xl mb-4 shadow-sm border border-gray-100`}
  >
    <View style={tw`bg-green-50 w-12 h-12 rounded-2xl items-center justify-center mb-3`}>
      <Ionicons name={icon} size={24} color={tw.color('green-600')} />
    </View>
    <Text style={tw`text-lg font-bold text-gray-900 mb-1`}>{title}</Text>
    <Text style={tw`text-gray-500 leading-5 text-xs`}>{desc}</Text>
  </Animated.View>
);

// --- Stat Item Component ---
const StatItem = ({ label, value, icon, loading }) => (
  <View style={tw`items-center flex-1`}>
    <View style={tw`bg-green-600/10 p-3 rounded-full mb-1`}>
        <Ionicons name={icon} size={22} color={tw.color('green-700')} />
    </View>
    {loading ? (
      <ActivityIndicator size="small" color={tw.color('green-700')} />
    ) : (
      <Text style={tw`text-xl font-black text-gray-900`}>{value || '0'}</Text>
    )}
    <Text style={tw`text-[9px] font-bold text-gray-400 uppercase tracking-widest`}>{label}</Text>
  </View>
);

export default function Introduction() {
  const router = useRouter();
  const { user, role } = useAuth(); 
  const [activeTab, setActiveTab] = useState('player'); 
  const [counts, setCounts] = useState({ courts: 0, bookings: 0, players: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  // --- Live Stats Fetching ---
  useEffect(() => {
    let isMounted = true;
    const fetchLiveStats = async () => {
      try {
        // Agar permission error aya to catch block handle karega
        const courtsSnapshot = await getCountFromServer(collection(db, 'courts'));
        const bookingsSnapshot = await getCountFromServer(collection(db, 'bookings'));
        const playersSnapshot = await getCountFromServer(query(collection(db, 'users'), where('role', '==', 'player')));

        if (isMounted) {
          setCounts({
            courts: courtsSnapshot.data().count,
            bookings: bookingsSnapshot.data().count,
            players: playersSnapshot.data().count,
          });
        }
      } catch (error) {
        console.log("Stats fetching fallback used due to:", error.code);
        // Fallback data agar permission denied ho ya internet na ho
        if (isMounted) setCounts({ courts: '40+', bookings: '3.4k+', players: '3300+' });
      } finally {
        if (isMounted) setLoadingStats(false);
      }
    };
    fetchLiveStats();
    return () => { isMounted = false; };
  }, []);

  const formatBookings = (num) => {
    if (typeof num === 'string') return num;
    return num > 999 ? (num / 1000).toFixed(1) + 'k+' : num;
  };

  const handleGoHome = () => {
    if (role === 'player') router.push('/(player)/home');
    else if (role === 'owner') router.push('/(owner)/dashboard');
    else if (role === 'admin') router.push('/(admin)/dashboard');
  };

  return (
    <View style={tw`flex-1 bg-white`}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        
        {/* --- 🟢 Hero Section --- */}
        <View style={tw`bg-green-700 pt-12 pb-12 px-6 rounded-b-[45px] shadow-lg`}>
          
          {/* Back Button */}
          {user ? (
            <Pressable onPress={() => router.back()} style={tw`bg-white/10 self-start p-2 rounded-full mb-6`}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
          ) : (
            <View style={tw`h-6`} /> 
          )}
          
          <Animated.View entering={FadeInDown.delay(200)}>
            <Text style={tw`text-green-200 text-xs font-bold uppercase tracking-[3px] mb-2`}>Elevate Your Game</Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(400)}>
            <Text style={tw`text-white text-4xl font-black leading-10 mb-4`}>Your Sports{"\n"}Journey Starts Here!</Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(600)}>
            <Text style={tw`text-green-50 text-sm leading-5 mb-8 opacity-80`}>
              Whether you are a player looking for a match or an owner managing an arena, CourtChuno connects you instantly.
            </Text>
          </Animated.View>
          
          <View style={tw`flex-row`}>
            {!user ? (
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => router.push('/(auth)/login')} 
                style={tw`bg-white px-7 py-3.5 rounded-xl shadow-md mr-3`}
              >
                <Text style={tw`text-green-700 font-bold text-sm`}>Get Started</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={handleGoHome} 
                style={tw`bg-white px-7 py-3.5 rounded-xl shadow-md mr-3`}
              >
                <Text style={tw`text-green-700 font-bold text-sm`}>Back to Home</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => router.push('/home/howItWorks')}
              style={tw`bg-green-800 px-7 py-3.5 rounded-xl border border-green-600`}
            >
              <Text style={tw`text-white font-bold text-sm`}>Learn more</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* --- 🏆 Why Choose Us (Tabs) --- */}
        <View style={tw`px-6 -mt-6`}>
          <View style={tw`bg-white p-6 rounded-[35px] shadow-xl border border-gray-50`}>
             <View style={tw`flex-row justify-between items-center mb-6`}>
                <Text style={tw`text-2xl font-black text-gray-900`}>Why Choose Us?</Text>
             </View>

             <View style={tw`flex-row bg-gray-100 p-1 rounded-2xl mb-6`}>
                <TouchableOpacity onPress={() => setActiveTab('player')} style={tw`flex-1 py-3 rounded-xl items-center ${activeTab === 'player' ? 'bg-white shadow-sm' : ''}`}>
                    <Text style={tw`font-bold ${activeTab === 'player' ? 'text-green-700' : 'text-gray-400'}`}>For Players</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('owner')} style={tw`flex-1 py-3 rounded-xl items-center ${activeTab === 'owner' ? 'bg-white shadow-sm' : ''}`}>
                    <Text style={tw`font-bold ${activeTab === 'owner' ? 'text-green-700' : 'text-gray-400'}`}>For Owners</Text>
                </TouchableOpacity>
             </View>

             {/* Tab Content - RESTORED FEATURES */}
             {activeTab === 'player' ? (
               <View>
                 <FeatureCard index={1} icon="map-outline" title="Find & Book Venues" desc="Discover sports venues near you. Check slots and book instantly." />
                 <FeatureCard index={2} icon="trophy-outline" title="Join Tournaments" desc="Compete in tournaments, track rankings, and view leaderboards." />
                 <FeatureCard index={3} icon="chatbubbles-outline" title="Chat with Players" desc="Connect with athletes, discuss strategies, and stay in touch." />
                 {/* 🔥 Restored Player Features */}
                 <FeatureCard index={4} icon="shield-half-outline" title="Team Matchmaking" desc="Request matches and find perfect opponents for your team." />
                 <FeatureCard index={5} icon="card-outline" title="Secure Payments" desc="Pay safely with multiple secure and instant payment options." />
               </View>
             ) : (
               <View>
                 <FeatureCard index={1} icon="business-outline" title="Manage Your Arena" desc="Full control over slots, pricing, and court details from one dashboard." />
                 <FeatureCard index={2} icon="calendar-outline" title="Automated Bookings" desc="No more manual calls. Get instant bookings and notifications 24/7." />
                 <FeatureCard index={3} icon="trophy-outline" title="Host Tournaments" desc="Launch tournaments easily. Auto-generate schedules and manage live scores." />
                 {/* 🔥 Restored Owner Features */}
                 <FeatureCard index={4} icon="trending-up-outline" title="Increase Revenue" desc="Fill empty slots, host events, and attract more players." />
                 <FeatureCard index={5} icon="people-outline" title="Verified Players" desc="Deal with verified users to ensure a safe and professional environment." />
                 <FeatureCard index={6} icon="wallet-outline" title="Fast Payouts" desc="Track your earnings in real-time and get hassle-free payouts." />
               </View>
             )}
          </View>
        </View>

        {/* --- Stats & Footer --- */}
        <View style={tw`py-12 px-6 items-center`}>
          <Text style={tw`text-xl font-black text-gray-900 mb-6 text-center`}>The Heart of Pakistan's Sports</Text>
          <View style={tw`flex-row bg-white p-5 rounded-[30px] shadow-md border border-gray-50`}>
             <StatItem label="Courts" value={counts.courts} icon="football-outline" loading={loadingStats} />
             <StatItem label="Bookings" value={formatBookings(counts.bookings)} icon="receipt-outline" loading={loadingStats} />
             <StatItem label="Players" value={counts.players} icon="people-circle-outline" loading={loadingStats} />
          </View>
        </View>

        <View style={tw`bg-gray-900 pt-12 pb-8 px-10 items-center`}>
           <Text style={tw`text-white text-3xl font-black mb-2 tracking-tighter`}>CourtChuno</Text>
           <Text style={tw`text-gray-500 text-center mb-8 leading-5 text-xs`}>Making sports accessible for everyone, everywhere.</Text>
           <Text style={tw`text-gray-600 text-[10px] font-bold`}>© 2025 CourtChuno.</Text>
        </View>

      </ScrollView>
    </View>
  );
}