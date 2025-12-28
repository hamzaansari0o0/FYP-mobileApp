import React from 'react';
import UserProfile from '../../components/UserProfile';
import { useAuth } from '../../context/AuthContext';

export default function OwnerProfile() {
  const { userData, logout } = useAuth();

  return (
    <UserProfile
      title="Owner Profile"
      userData={userData}
      logout={logout}
    />
  );
}