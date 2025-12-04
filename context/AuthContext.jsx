import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase/firebaseConfig';

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
      // "Loading Stuck" fix
      try {
        if (user) {
          await user.reload(); 
          if (user.emailVerified) {
            // --- User Verified Hai ---
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const userDataFromDb = userDoc.data();
              
              // Pehle se login user ke liye "Disabled" check
              if (userDataFromDb.status === 'disabled') {
                console.log('User is disabled, logging out.');
                await signOut(auth); // User ko login nahi karne dena
                setUser(null);
                setUserData(null);
                setRole(null);
              } else {
                // User theek hai, login process continue karein
                setRole(userDataFromDb.role);
                setUserData(userDataFromDb); 
                setUser(user);
              }
            } else {
              console.log('User data not found in Firestore, logging out.');
              await signOut(auth);
              setUser(null);
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
        console.error("Error in onAuthStateChanged: ", error);
        setUser(null);
        setRole(null);
        setUserData(null);
      } finally {
        // App ko "stuck" hone se bachayein
        setLoading(false);
      }
    });
    
    return () => unsubscribe(); 
  }, []);

  // === SIGNUP FUNCTION (UPDATED) ===
  // Isme ab area, fullAddress aur coordinates save ho rahe hain
  const signup = async (formData, selectedRole) => {
    const { 
        email, 
        password, 
        name, 
        mobileNumber, 
        city, 
        area,         // <-- Added
        fullAddress,  // <-- Added
        coordinates   // <-- Added {lat, lng}
    } = formData;

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const newUser = userCredential.user;
    
    const newUserData = {
      uid: newUser.uid,
      name: name,
      email: email,
      role: selectedRole,
      mobileNumber: mobileNumber,
      
      // Location Data Save karein
      city: city || '',
      area: area || '',           // <-- Ab ye Database mein save hoga (Zaroori)
      fullAddress: fullAddress || '', // <-- Ye bhi
      coordinates: coordinates || null, // <-- Ye bhi
      
      status: "active", 
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

  // --- LOGIN FUNCTION (Waisa hi hai) ---
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
  };

  // Logout function
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

// 3. Hook banana ta ke asani se istemal kar sakein
export const useAuth = () => {
  return useContext(AuthContext);
};