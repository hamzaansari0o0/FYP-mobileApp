import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal, Pressable, RefreshControl,
  ScrollView, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { db } from '../../firebase/firebaseConfig';
import { notifyUser } from '../../utils/notifications';

// --- Helper: Status Badge Logic ---
const StatusBadge = ({ status }) => {
  let color = 'gray';
  let label = status || 'Pending';

  if (status === 'completed_and_paid') { color = 'green'; label = 'Paid'; }
  else if (status === 'upcoming') { color = 'blue'; label = 'Upcoming'; }
  else if (status === 'cancelled') { color = 'red'; label = 'Cancelled'; }

  return (
    <View style={tw`bg-${color}-100 px-2 py-0.5 rounded-full`}>
      <Text style={tw`text-${color}-700 text-[10px] font-bold uppercase`}>{label}</Text>
    </View>
  );
};

export default function TransactionsScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ totalVolume: 0, totalComm: 0, count: 0 });
  
  // Detail Modal State
  const [selectedTx, setSelectedTx] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchTransactions = async () => {
    try {
      const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(100));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      let volume = 0;
      list.forEach(item => { volume += (item.totalPrice || 0); });

      setStats({
        totalVolume: volume,
        totalComm: Math.round(volume * 0.05),
        count: list.length
      });
      setTransactions(list);
      setFilteredData(list);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchTransactions(); }, []));

  const handleSearch = (text) => {
    setSearch(text);
    const filtered = transactions.filter(item => 
      item.playerName?.toLowerCase().includes(text.toLowerCase()) || 
      item.arenaName?.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredData(filtered);
  };

  const openDetail = (tx) => {
    setSelectedTx(tx);
    setModalVisible(true);
  };

  const sendDirectNotif = async (userId, userName, msgType) => {
    const title = msgType === 'player' ? "Booking Support 🎧" : "Payment Update 💰";
    const body = `Hi ${userName}, admin is reviewing your transaction (Ref: ${selectedTx.id.slice(-6)}). We will contact you shortly.`;
    
    await notifyUser(userId, title, body, 'alert');
    alert("Notification sent to " + userName);
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* 1. Header & Search */}
      <View style={tw`bg-white px-5 pt-2 pb-4 shadow-sm`}>
        <View style={tw`flex-row items-center justify-between mb-4`}>
          <Pressable onPress={() => router.back()}><Ionicons name="arrow-back" size={26} /></Pressable>
          <Text style={tw`text-xl font-bold text-gray-900`}>Financial Ledger</Text>
          <Ionicons name="download-outline" size={24} color="purple" />
        </View>
        
        <View style={tw`bg-gray-100 flex-row items-center px-4 py-2 rounded-xl`}>
          <Ionicons name="search" size={18} color="gray" />
          <TextInput 
            placeholder="Search by Player or Arena..." 
            style={tw`flex-1 ml-2 text-gray-800`}
            value={search}
            onChangeText={handleSearch}
          />
        </View>
      </View>

      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchTransactions();}} />}
      >
        {/* 2. Professional Stats Section */}
        <View style={tw`flex-row px-3 mt-4`}>
          <View style={tw`flex-1 bg-purple-700 p-4 rounded-2xl mx-1 shadow-md`}>
            <Text style={tw`text-purple-100 text-xs`}>Total Revenue</Text>
            <Text style={tw`text-white text-lg font-bold`}>Rs. {stats.totalVolume.toLocaleString()}</Text>
          </View>
          <View style={tw`flex-1 bg-white p-4 rounded-2xl mx-1 border border-gray-100 shadow-sm`}>
            <Text style={tw`text-gray-500 text-xs`}>Admin Comm (5%)</Text>
            <Text style={tw`text-purple-700 text-lg font-bold`}>Rs. {stats.totalComm.toLocaleString()}</Text>
          </View>
        </View>

        {/* 3. Transaction List */}
        <View style={tw`px-5 mt-6`}>
          <Text style={tw`text-gray-400 font-bold mb-4 text-[10px] uppercase tracking-tighter`}>All Transactions ({stats.count})</Text>
          
          {loading ? <ActivityIndicator color="purple" size="large" style={tw`mt-10`} /> : (
            filteredData.map((item) => (
              <TouchableOpacity 
                key={item.id} 
                onPress={() => openDetail(item)}
                style={tw`bg-white p-4 rounded-2xl mb-3 flex-row items-center shadow-sm border border-gray-50`}
              >
                <View style={tw`w-10 h-10 rounded-full bg-gray-50 items-center justify-center mr-3`}>
                  <Ionicons name="person-outline" size={20} color="gray" />
                </View>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-sm font-bold text-gray-800`}>{item.playerName}</Text>
                  <Text style={tw`text-[10px] text-gray-400`}>{item.arenaName} • {item.date}</Text>
                </View>
                <View style={tw`items-end`}>
                  <Text style={tw`text-sm font-bold text-gray-900`}>Rs. {item.totalPrice}</Text>
                  <StatusBadge status={item.status} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* 4. Professional Detail Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={tw`flex-1 bg-black/50 justify-end`}>
          <View style={tw`bg-white rounded-t-3xl p-6 h-3/4 shadow-2xl`}>
            <View style={tw`w-12 h-1.5 bg-gray-200 rounded-full self-center mb-6`} />
            
            <Text style={tw`text-2xl font-bold text-gray-800 mb-1`}>Transaction Details</Text>
            <Text style={tw`text-gray-400 text-xs mb-6`}>ID: {selectedTx?.id}</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={tw`bg-gray-50 p-4 rounded-2xl mb-6`}>
                <DetailItem label="Player" value={selectedTx?.playerName} />
                <DetailItem label="Arena" value={selectedTx?.arenaName} />
                <DetailItem label="Date & Time" value={`${selectedTx?.date} @ ${selectedTx?.slotTime}:00`} />
                <View style={tw`h-px bg-gray-200 my-3`} />
                <DetailItem label="Total Price" value={`Rs. ${selectedTx?.totalPrice}`} bold />
                <DetailItem label="Admin Commission (5%)" value={`Rs. ${Math.round(selectedTx?.totalPrice * 0.05)}`} color="text-green-600" />
                <DetailItem label="Owner Payout" value={`Rs. ${selectedTx?.totalPrice - Math.round(selectedTx?.totalPrice * 0.05)}`} color="text-blue-600" />
              </View>

              <Text style={tw`text-gray-800 font-bold mb-3`}>Resolve Query / Actions</Text>
              <View style={tw`flex-row mb-4`}>
                <ActionButton 
                    title="Notify Player" 
                    icon="person" 
                    onPress={() => sendDirectNotif(selectedTx.playerId, selectedTx.playerName, 'player')} 
                />
                <ActionButton 
                    title="Notify Owner" 
                    icon="business" 
                    onPress={() => sendDirectNotif(selectedTx.ownerId, selectedTx.arenaName, 'owner')} 
                />
              </View>
            </ScrollView>

            <TouchableOpacity 
                onPress={() => setModalVisible(false)} 
                style={tw`bg-gray-900 py-4 rounded-2xl items-center mt-2`}
            >
              <Text style={tw`text-white font-bold`}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Sub-components
const DetailItem = ({ label, value, bold, color = 'text-gray-800' }) => (
  <View style={tw`flex-row justify-between mb-2`}>
    <Text style={tw`text-gray-500 text-sm`}>{label}</Text>
    <Text style={tw`${color} ${bold ? 'font-bold text-base' : 'font-medium text-sm'}`}>{value}</Text>
  </View>
);

const ActionButton = ({ title, icon, onPress }) => (
  <TouchableOpacity onPress={onPress} style={tw`flex-1 bg-purple-50 p-4 rounded-xl mx-1 items-center border border-purple-100`}>
    <Ionicons name={icon} size={20} color={tw.color('purple-700')} />
    <Text style={tw`text-purple-700 text-[10px] font-bold mt-1`}>{title}</Text>
  </TouchableOpacity>
);