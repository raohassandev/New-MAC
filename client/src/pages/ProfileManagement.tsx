import '../ProfileManagement.css';

import React, { useEffect, useState } from 'react';
import {
  applyProfile,
  createProfile,
  deleteProfile,
  getProfiles,
  updateProfile,
} from '../services/api';

import { Profile } from '../types/profile.types';
import ProfileCard from '../components/profiles/ProfileCard';
import ProfileForm from '../components/profiles/ProfileForm';

const ProfileManagement: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  // Fetch profiles on component mount
  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const data = await getProfiles();
      setProfiles(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch profiles');
      console.error('Error fetching profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = () => {
    setEditingProfile(null);
    setShowForm(true);
  };

  const handleEditProfile = (id: string) => {
    const profile = profiles.find(p => p._id === id);
    if (profile) {
      setEditingProfile(profile);
      setShowForm(true);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this profile?')) {
      return;
    }

    try {
      await deleteProfile(id);
      setProfiles(profiles.filter(profile => profile._id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete profile');
      console.error('Error deleting profile:', err);
    }
  };

  const handleApplyProfile = async (id: string) => {
    try {
      await applyProfile(id);
      alert('Profile applied successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to apply profile');
      console.error('Error applying profile:', err);
    }
  };

  const handleSubmitProfile = async (profileData: Partial<Profile>) => {
    try {
      if (editingProfile?._id) {
        // Update existing profile
        const updatedProfile = await updateProfile(editingProfile._id, profileData);
        setProfiles(profiles.map(p => (p._id === editingProfile._id ? updatedProfile : p)));
      } else {
        // Create new profile
        const newProfile = await createProfile(profileData);
        setProfiles([...profiles, newProfile]);
      }

      setShowForm(false);
      setEditingProfile(null);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
      console.error('Error saving profile:', err);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingProfile(null);
  };

  if (loading && profiles.length === 0) {
    return <div className="loading">Loading profiles...</div>;
  }

  return (
    <div className="profile-management-page">
      <div className="page-header">
        <h1>Cooling Profiles</h1>
        <button className="create-button" onClick={handleCreateProfile}>
          Create New Profile
        </button>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {showForm ? (
        <div className="form-container">
          <h2>{editingProfile ? 'Edit Profile' : 'Create New Profile'}</h2>
          <ProfileForm
            profile={editingProfile || undefined}
            onSubmit={handleSubmitProfile}
            onCancel={handleCancelForm}
          />
        </div>
      ) : (
        <div className="profiles-container">
          {profiles.length > 0 ? (
            profiles.map(profile => (
              <ProfileCard
                key={profile._id}
                profile={profile}
                onEdit={handleEditProfile}
                onDelete={handleDeleteProfile}
                onApply={handleApplyProfile}
              />
            ))
          ) : (
            <div className="no-profiles">
              <p>No profiles found. Create your first cooling profile!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileManagement;
