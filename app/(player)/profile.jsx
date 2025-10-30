import React from 'react';
import UserProfile from '../../components/UserProfile'; // Naya component import karein
import { useAuth } from '../../context/AuthContext';    // Context import karein

export default function PlayerProfile() {
  // Context se data aur function lein
  const { userData, logout } = useAuth();

  // Naye component ko render karein aur props pass karein
  return (
    <UserProfile
      title="Player Profile"
      userData={userData}
      logout={logout}
    />
  );
}