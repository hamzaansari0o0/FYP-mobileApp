import React from 'react';
import UserProfile from '../../components/UserProfile';
import { useAuth } from '../../context/AuthContext';

export default function PlayerProfile() {
  const { userData, logout } = useAuth();

  return (
    <UserProfile
      title="Player Profile"
      userData={userData}
      logout={logout}
    />
  );
}