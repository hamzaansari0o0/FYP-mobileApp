import { Redirect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import Introduction from '../components/specific/home/introduction';
import { useAuth } from '../context/AuthContext';

export default function Index() {
  const { user, role, loading } = useAuth();
  // URL se params check karenge (agar menu se aya hai to 'view=about' hoga)
  const { view } = useLocalSearchParams(); 

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#15803d" />
      </View>
    );
  }

  // LOGIC:
  // 1. Agar User Logged In hai AUR usne Menu se click nahi kiya (Normal App Open)
  //    -> To Dashboard Redirect karo.
  if (user && view !== 'about') {
    if (role === 'player') return <Redirect href="/(player)/home" />;
    if (role === 'owner') return <Redirect href="/(owner)/dashboard" />;
    if (role === 'admin') return <Redirect href="/(admin)/dashboard" />;
  }

  // 2. Agar User Logged Out hai -> Introduction dikhao.
  // 3. Agar User Logged In hai lekin 'view=about' hai -> Introduction dikhao.
  return <Introduction />;
}