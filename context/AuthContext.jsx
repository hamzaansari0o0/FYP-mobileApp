import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
// 👇 Added 'deleteField' here
import { deleteField, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase/firebaseConfig';
import { registerForPushNotificationsAsync } from '../utils/notifications';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Helper to Save Token ---
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
            // Agar email verified nahi hai, to state null rakho
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
    
    // Token Save
    await saveUserPushToken(newUser.uid);
    
    try {
      await sendEmailVerification(newUser);
    } catch (emailError) {
      console.error("Error sending verification email: ", emailError);
      throw new Error("User created, but failed to send verification email.");
    }

    // Force Logout immediately after signup
    await signOut(auth);
  };

  // === LOGIN FUNCTION ===
  const login = async (email, password) => {
    // Forcefully sign out first just in case any ghost session exists
    try { await signOut(auth); } catch(e) {}

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const loggedInUser = userCredential.user;

    // Reload user to get fresh emailVerified status
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

    // Login Successful & Update Token
    await saveUserPushToken(loggedInUser.uid);
  };

  // === UPDATED LOGOUT FUNCTION ===
  const logout = async () => {
    try {
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        // 🔥 Remove Push Token from Firestore so notifications stop on this device
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          pushToken: deleteField() 
        });
      }
      
      // Now Sign Out
      await signOut(auth);
      
      // Reset State
      setUser(null);
      setUserData(null);
      setRole(null);
      
    } catch (error) {
      console.error("Logout Error:", error);
      // Fallback: Ensure signout happens even if DB fails
      await signOut(auth);
      setUser(null);
    }
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