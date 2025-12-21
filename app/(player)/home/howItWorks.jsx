// app/(player)/home/howItWorks.jsx
import { Stack } from 'expo-router';
import HowItWorks from '../../../components/specific/home/HowItWorks';

export default function HowItWorksScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <HowItWorks />
    </>
  );
}