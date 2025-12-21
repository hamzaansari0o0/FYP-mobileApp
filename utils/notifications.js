import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where
} from "firebase/firestore";
import { Platform } from 'react-native';
import { db } from "../firebase/firebaseConfig";

// --- CONFIG: Handle Incoming Notifications ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * 0. SETUP: Register for Push Notifications (Get Token)
 */
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    // --- FIX: Token Fetching Logic ---
    try {
      // Humne 'your-project-id' hata diya hai kyunki wo error de raha tha.
      // Ab ye automatically aapke app config se ID uthayega.
      const tokenData = await Notifications.getExpoPushTokenAsync();
      token = tokenData.data;
      console.log("Expo Push Token:", token);
    } catch (error) {
      console.error("Error fetching Expo Push Token:", error);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

/**
 * 1. BASE HELPER: Send Push Notification via Expo
 */
export const sendPushNotification = async (expoPushToken, title, body, data = {}) => {
  if (!expoPushToken) return;

  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
  };

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.log("Error sending push notification:", error);
  }
};

/**
 * 2. NOTIFY USER (Compatible with Booking Logic)
 * Usage: notifyUser(userId, "Title", "Body", "booking", { url: '...' })
 */
export const notifyUser = async (userId, title, body, type = "info", data = {}) => {
  if (!userId) return;

  try {
    // A. Save to Firestore (In-App History)
    // Using addDoc ensures a new unique ID is generated every time
    await addDoc(collection(db, "notifications"), {
      userId: userId,
      title: title,
      body: body,
      type: type, // 'booking', 'info', 'alert'
      read: false,
      createdAt: serverTimestamp(),
      data: data
    });

    // B. Get User's Push Token & Send Push
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const token = userData.pushToken;

      if (token) {
        await sendPushNotification(token, title, body, data);
      }
    }
  } catch (error) {
    console.error("notifyUser Error:", error);
  }
};

/**
 * 3. NOTIFY ALL ADMINS (For Approvals, Reports)
 */
export const notifyAdmins = async (title, body, data = {}) => {
  try {
    const q = query(collection(db, 'users'), where('role', '==', 'admin'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        console.log("No admins found to notify.");
        return;
    }

    const notifications = snapshot.docs.map(async (docSnap) => {
      const admin = docSnap.data();
      
      // Push
      if (admin.pushToken) {
        await sendPushNotification(admin.pushToken, title, body, data);
      }
      
      // History
      return addDoc(collection(db, 'notifications'), {
        userId: docSnap.id,
        title,
        body,
        type: 'admin_alert',
        read: false,
        createdAt: serverTimestamp(),
        link: data.url || null
      });
    });

    await Promise.all(notifications);
    console.log(`📢 Notified ${snapshot.size} admins.`);
  } catch (error) {
    console.error("Error notifying admins:", error);
  }
};

/**
 * 4. NOTIFY ALL PLAYERS (For Broadcasts/Tournaments)
 */
export const notifyAllPlayers = async (title, body, data = {}) => {
  try {
    const q = query(collection(db, 'users'), where('role', '==', 'player'));
    const snapshot = await getDocs(q);

    const notifications = snapshot.docs.map(async (docSnap) => {
      const player = docSnap.data();
      
      // Push
      if (player.pushToken) {
        await sendPushNotification(player.pushToken, title, body, data);
      }
      
      // History
      return addDoc(collection(db, 'notifications'), {
        userId: docSnap.id,
        title,
        body,
        type: 'broadcast',
        read: false,
        createdAt: serverTimestamp(),
        link: data.url || null
      });
    });

    await Promise.all(notifications);
    console.log(`📢 Broadcasted to ${snapshot.size} players.`);
  } catch (error) {
    console.error("Error broadcasting to players:", error);
  }
};