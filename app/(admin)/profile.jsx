import React from 'react';
import UserProfile from '../../components/UserProfile'; // Wohi component dobara import karein
import { useAuth } from '../../context/AuthContext';    // Context import karein

export default function AdminProfile() {
  // Context se data aur function lein
  const { userData, logout } = useAuth();

  // Naye component ko render karein aur props pass karein
  return (
    <UserProfile
      title="Admin Profile"
      userData={userData}
      logout={logout}
    />
  );
}