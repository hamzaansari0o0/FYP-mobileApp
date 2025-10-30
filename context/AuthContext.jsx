import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase/firebaseConfig';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// 1. Context banana
const AuthContext = createContext();

// 2. Provider component banana
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // Firebase Auth object
  const [userData, setUserData] = useState(null); // Firestore data
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // User ki auth state sunna
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      
      // --- YAHAN SE UPDATE SHURU HUA HAI ---
      // try...catch...finally block add kiya hai
      try {
        if (user) {
          await user.reload(); 
          if (user.emailVerified) {
            // --- User Verified Hai ---
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              
              const userDataFromDb = userDoc.data();
              setRole(userDataFromDb.role);
              setUserData(userDataFromDb); // <-- Ye fix pehle se mojood tha
              setUser(user);

            } else {
              // User auth mein hai lekin database mein nahi (Error case)
              console.log('User data not found in Firestore, logging out.');
              setUser(null);
              setUserData(null);
              setRole(null);
              await signOut(auth); // Safety logout
            }
          } else {
            // --- User Verified Nahi Hai ---
            console.log('User is not verified, treating as logged out.');
            setUser(null);
            setRole(null);
            setUserData(null);
          }
        } else {
          // User login nahi hai
          setUser(null);
          setRole(null);
          setUserData(null);
        }
      } catch (error) {
        // Agar (await user.reload) ya (await getDoc) mein koi error aye
        console.error("Error in onAuthStateChanged: ", error);
        setUser(null);
        setRole(null);
        setUserData(null);
      } finally {
        // Ye har haal mein chalega
        // Aur loading ko false karega ta ke app "stuck" na ho
        setLoading(false);
      }
      // --- YAHAN PAR UPDATE KHATAM HUA HAI ---
    });
    
    return () => unsubscribe(); 
  }, []);

  // Signup function (ye bilkul theek hai)
  const signup = async (formData, selectedRole) => {
    const { email, password, name, mobileNumber, city } = formData;
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const newUser = userCredential.user;
    const newUserData = {
      uid: newUser.uid,
      name: name,
      email: email,
      role: selectedRole,
      mobileNumber: mobileNumber,
      city: city,
      createdAt: new Date(),
    };
    await setDoc(doc(db, 'users', newUser.uid), newUserData);
    try {
      await sendEmailVerification(newUser);
    } catch (emailError) {
      console.error("Error sending verification email: ", emailError);
      throw new Error("User created, but failed to send verification email.");
    }
  };

  // Login function (ye bilkul theek hai)
  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await userCredential.user.reload();
    const freshUser = auth.currentUser;
    if (!freshUser.emailVerified) {
      await signOut(auth);
      throw new Error("auth/email-not-verified");
    }
  };

  // Logout function
  const logout = async () => {
    await signOut(auth);
    // State (user, userData, role) ab onAuthStateChanged khud clear kar dega
  };

  // Context ki value (Ab userData export karega)
  const value = {
    user,
    userData, // <-- Ye ab 'null' nahi, balke data ke sath ayega
    role,
    loading,
    login,
    logout,
    signup,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 3. Hook banana ta ke asani se istemal kar sakein
export const useAuth = () => {
  return useContext(AuthContext);
};