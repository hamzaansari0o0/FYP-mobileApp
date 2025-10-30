import { initializeApp } from "firebase/app";
// --- STEP 1: Sahi Imports ---
import { 
  initializeAuth,
  getReactNativePersistence,  // Yeh Native (Mobile) ke liye hai
  browserLocalPersistence     // Yeh Web ke liye hai (sahi naam)
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Aap ki keys .env file se aa rahi hain (yeh theek hai)
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

// --- STEP 2: Sahi Logic ---

let persistence;

if (Platform.OS === 'web') {
  // Web ke liye, hum direct constant pass karte hain (function call nahi)
  persistence = browserLocalPersistence;
} else {
  // Mobile (iOS/Android) ke liye, hum function call karte hain
  persistence = getReactNativePersistence(ReactNativeAsyncStorage);
}

// Ab 'auth' ko sahi persistence ke sath initialize karein
const auth = initializeAuth(app, {
  persistence: persistence
});

// Baqi services (Firestore)
const db = getFirestore(app);

// Dono ko export karein
export { auth, db };