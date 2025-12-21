import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'; // updateDoc added
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase/firebaseConfig';
import { registerForPushNotificationsAsync } from '../utils/notifications'; // Import Notification Utility

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Helper to Save Token ---
  // Ye function hum Login aur Signup dono mein use karenge code clean rakhne ke liye
  const saveUserPushToken = async (uid) => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await updateDoc(doc(db, 'users', uid), {
          pushToken: token
        });
        console.log("✅ Device Token updated in Firestore");
      }
    } catch (error) {
      console.log("⚠️ Token update failed (Minor):", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          await user.reload(); 
          if (user.emailVerified) {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const userDataFromDb = userDoc.data();
              
              if (userDataFromDb.status === 'disabled') {
                await signOut(auth);
                setUser(null);
                setUserData(null);
                setRole(null);
              } else {
                setRole(userDataFromDb.role);
                setUserData(userDataFromDb); 
                setUser(user);
                
                // Silent Token Update on Auto-Login
                saveUserPushToken(user.uid);
              }
            } else {
              await signOut(auth);
              setUser(null);
            }
          } else {
            setUser(null);
            setRole(null);
            setUserData(null);
          }
        } else {
          setUser(null);
          setRole(null);
          setUserData(null);
        }
      } catch (error) {
        console.error("Error in onAuthStateChanged: ", error);
        setUser(null);
        setRole(null);
        setUserData(null);
      } finally {
        setLoading(false);
      }
    });
    
    return () => unsubscribe(); 
  }, []);

  // === SIGNUP FUNCTION ===
  const signup = async (formData, selectedRole) => {
    const { 
        email, password, name, mobileNumber, city, 
        area, fullAddress, coordinates 
    } = formData;

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const newUser = userCredential.user;
    
    // Initial Data Save
    const newUserData = {
      uid: newUser.uid,
      name: name,
      email: email,
      role: selectedRole,
      mobileNumber: mobileNumber,
      city: city || '',
      area: area || '',
      fullAddress: fullAddress || '',
      coordinates: coordinates || null,
      status: "active", 
      createdAt: new Date(),
    };
    
    await setDoc(doc(db, 'users', newUser.uid), newUserData);
    
    // 🔔 TOKEN SAVE Logic
    await saveUserPushToken(newUser.uid);
    
    try {
      await sendEmailVerification(newUser);
    } catch (emailError) {
      console.error("Error sending verification email: ", emailError);
      throw new Error("User created, but failed to send verification email.");
    }
  };

  // === LOGIN FUNCTION ===
  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const loggedInUser = userCredential.user;

    await loggedInUser.reload();
    if (!loggedInUser.emailVerified) {
      await signOut(auth);
      throw new Error("auth/email-not-verified");
    }

    const userDoc = await getDoc(doc(db, 'users', loggedInUser.uid));
    if (!userDoc.exists()) {
      await signOut(auth);
      throw new Error("auth/user-not-found-in-db");
    }
    
    const userData = userDoc.data();
    if (userData.status === 'disabled') {
      await signOut(auth);
      throw new Error("auth/user-disabled");
    }

    // 🔔 TOKEN SAVE Logic (Login ke foran baad)
    await saveUserPushToken(loggedInUser.uid);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value = {
    user,
    userData,
    role,
    loading,
    login,
    logout,
    signup,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  return useContext(AuthContext);
};