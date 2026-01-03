import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getReactNativePersistence,
  initializeAuth
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions"; // 👈 CHANGE 1: Ye import add karein
import { getStorage } from "firebase/storage";
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

let persistence;
if (Platform.OS === 'web') {
  persistence = browserLocalPersistence;
} else {
  persistence = getReactNativePersistence(ReactNativeAsyncStorage);
}

const auth = initializeAuth(app, {
  persistence: persistence
});

const db = getFirestore(app);
const storage = getStorage(app);

// 👇 CHANGE 2: Functions ko initialize karein
const functions = getFunctions(app, 'us-central1'); 
// 'us-central1' is liye likha kyunki deploy karte waqt yahi region tha.

// 👇 CHANGE 3: Export mein 'functions' bhi add karein
export { auth, db, functions, storage };
