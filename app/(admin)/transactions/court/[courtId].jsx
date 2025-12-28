import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore'; // Removed orderBy temporarily to ensure data shows
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StatusBar,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import tw from 'twrnc';
import { db } from '../../../../firebase/firebaseConfig';

// Helper: Status Colors & Labels
const getStatusDetails = (status) => {
    if (status === 'completed_settled') return { label: 'Settled', bg: 'bg-green-100', text: 'text-green-700' };
    if (status === 'completed_pending_payout') return { label: 'Pending Payout', bg: 'bg-orange-100', text: 'text-orange-700' };
    if (status && status.startsWith('cancelled')) return { label: 'Cancelled', bg: 'bg-red-100', text: 'text-red-700' };
    return { label: status || 'Pending', bg: 'bg-gray-100', text: 'text-gray-700' };
};

export default function CourtTransactionsScreen() {
  const { courtId } = useLocalSearchParams();
  const router = useRouter();
  
  const [allData, setAllData] = useState([]); // Sara data yahan store hoga
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, comm: 0 });
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'cancelled'
  
  // Modal State
  const [selectedTx, setSelectedTx] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (!courtId) return;

    const fetchTx = async () => {
      setLoading(true);
      try {
        // --- LOGIC: SIRF SELECTED COURT KA DATA ---
        const q = query(collection(db, 'bookings'), where('courtId', '==', courtId));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Calculate Stats (Sirf Active/Paid transactions ka total)
        let volume = 0;
        list.forEach(i => { 
            // Agar cancelled nahi hai to revenue mein add kro
            if (i.status && !i.status.startsWith('cancelled')) {
                volume += (i.totalPrice || i.amountPaid || 0); 
            }
        });
        
        setStats({ total: volume, comm: Math.round(volume * 0.05) });
        setAllData(list);

      } catch (error) {
        console.error("Error:", error);
        if(error.message.includes('index')) Alert.alert("Missing Index", "Check console.");
      } finally {
        setLoading(false);
      }
    };

    fetchTx();
  }, [courtId]);

  // --- FILTERING LOGIC BASED ON TABS ---
  const filteredData = allData.filter(item => {
      const isCancelled = item.status && item.status.startsWith('cancelled');
      if (activeTab === 'cancelled') return isCancelled; 
      return !isCancelled; // 'active' tab shows everything except cancelled
  });

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="dark-content" />

      {/* --- HEADER --- */}
      <View style={tw`px-6 pt-2 pb-4 bg-white flex-row items-center border-b border-gray-100`}>
        <Pressable onPress={() => router.back()} style={tw`mr-4 bg-purple-50 p-2.5 rounded-xl border border-purple-100`}>
            <Ionicons name="arrow-back" size={24} color="#581c87" />
        </Pressable>
        <View>
            <Text style={tw`text-2xl font-extrabold text-purple-900`}>Ledger</Text>
            {/* ID Hidden */}
            <Text style={tw`text-purple-400 text-xs font-medium`}>TRANSACTION HISTORY</Text>
        </View>
      </View>

      {/* --- STATS CARD (Always visible) --- */}
      <View style={tw`px-6 mt-6`}>
        <View style={tw`bg-purple-900 p-6 rounded-[24px] shadow-lg shadow-purple-400`}>
            <View style={tw`flex-row justify-between items-start`}>
                <View>
                    <Text style={tw`text-purple-200 text-xs font-bold uppercase tracking-widest mb-1`}>Total Revenue</Text>
                    <Text style={tw`text-white text-3xl font-extrabold`}>Rs. {stats.total.toLocaleString()}</Text>
                </View>
                <View style={tw`bg-white/20 p-2 rounded-xl`}>
                    <MaterialIcons name="attach-money" size={24} color="white" />
                </View>
            </View>
            <View style={tw`mt-4 pt-4 border-t border-white/20 flex-row justify-between`}>
                 <Text style={tw`text-purple-200 text-xs font-medium`}>Admin Commission (5%)</Text>
                 <Text style={tw`text-white text-sm font-bold`}>Rs. {stats.comm.toLocaleString()}</Text>
            </View>
        </View>
      </View>

      {/* --- TABS --- */}
      <View style={tw`flex-row px-6 mt-6 mb-2`}>
          <TouchableOpacity 
            onPress={() => setActiveTab('active')}
            style={tw`flex-1 py-3 items-center rounded-xl mr-2 ${activeTab === 'active' ? 'bg-purple-600 shadow-md' : 'bg-gray-50'}`}
          >
              <Text style={tw`font-bold text-sm ${activeTab === 'active' ? 'text-white' : 'text-gray-400'}`}>Settled / Active</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => setActiveTab('cancelled')}
            style={tw`flex-1 py-3 items-center rounded-xl ml-2 ${activeTab === 'cancelled' ? 'bg-red-500 shadow-md' : 'bg-gray-50'}`}
          >
              <Text style={tw`font-bold text-sm ${activeTab === 'cancelled' ? 'text-white' : 'text-gray-400'}`}>Cancelled</Text>
          </TouchableOpacity>
      </View>

      {/* --- LIST --- */}
      <View style={tw`px-6 py-2`}><Text style={tw`text-gray-400 text-xs font-bold uppercase`}>{filteredData.length} Records Found</Text></View>

      {loading ? <ActivityIndicator size="large" color="#7e22ce" style={tw`mt-10`} /> : (
        <FlatList
          data={filteredData}
          keyExtractor={item => item.id}
          contentContainerStyle={tw`px-6 pb-20`}
          ListEmptyComponent={
            <View style={tw`mt-10 items-center`}>
                <Text style={tw`text-gray-400 font-medium`}>No {activeTab} transactions found.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const statusStyle = getStatusDetails(item.status);
            return (
                <TouchableOpacity 
                    onPress={() => { setSelectedTx(item); setModalVisible(true); }}
                    style={tw`bg-white p-4 rounded-2xl mb-3 flex-row items-center shadow-sm border border-gray-100`}
                >
                <View style={tw`w-10 h-10 rounded-full ${activeTab === 'cancelled' ? 'bg-red-50' : 'bg-purple-50'} items-center justify-center mr-3`}>
                    <Ionicons name="person" size={16} color={activeTab === 'cancelled' ? '#ef4444' : '#9333ea'} />
                </View>
                <View style={tw`flex-1`}>
                    <Text style={tw`text-sm font-bold text-gray-800`}>{item.playerName}</Text>
                    <Text style={tw`text-[10px] text-gray-400`}>{item.date}</Text>
                </View>
                <View style={tw`items-end`}>
                    <Text style={tw`text-sm font-bold text-gray-900 mb-1`}>Rs. {item.totalPrice || item.amountPaid}</Text>
                    <View style={tw`${statusStyle.bg} px-2 py-0.5 rounded-full`}>
                        <Text style={tw`${statusStyle.text} text-[9px] font-bold uppercase`}>{statusStyle.label}</Text>
                    </View>
                </View>
                </TouchableOpacity>
            );
          }}
        />
      )}

      {/* --- MODAL (Details) --- */}
      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={tw`flex-1 bg-black/60 justify-end`}>
            <View style={tw`bg-white rounded-t-[30px] p-6 h-2/3 shadow-2xl`}>
                <View style={tw`w-12 h-1.5 bg-gray-200 rounded-full self-center mb-8`} />
                <Text style={tw`text-2xl font-bold text-purple-900 mb-6`}>Transaction Details</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={tw`bg-gray-50 p-5 rounded-2xl mb-4 border border-gray-100`}>
                        <DetailRow label="Transaction ID" value={selectedTx?.id} />
                        <DetailRow label="Player" value={selectedTx?.playerName} />
                        <DetailRow label="Date" value={selectedTx?.date} />
                        <DetailRow label="Status" value={selectedTx?.status} />
                        <View style={tw`h-px bg-gray-200 my-3`} />
                        <DetailRow label="Amount" value={`Rs. ${selectedTx?.totalPrice || selectedTx?.amountPaid}`} bold />
                    </View>
                </ScrollView>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={tw`bg-purple-600 py-4 rounded-2xl items-center mt-4 shadow-lg shadow-purple-300`}>
                    <Text style={tw`text-white font-bold text-base`}>Close</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const DetailRow = ({ label, value, bold }) => (
    <View style={tw`flex-row justify-between mb-4`}>
        <Text style={tw`text-gray-500 font-medium`}>{label}</Text>
        <Text style={tw`text-gray-900 ${bold ? 'font-extrabold text-lg' : 'font-semibold'}`}>{value}</Text>
    </View>
);