import { Stack } from 'expo-router';
import Introduction from '../../../components/specific/home/introduction';

export default function AboutScreen() {
  return (
    <>
      {/* Isse header hide ho jayega kyunki Introduction ka apna header hai */}
      <Stack.Screen options={{ headerShown: false }} />
      <Introduction />
    </>
  );
}