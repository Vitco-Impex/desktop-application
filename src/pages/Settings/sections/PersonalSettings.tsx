/**
 * Personal Settings Section
 * Profile management and password change
 */

import React, { useState, useEffect } from 'react';
import { profileService, UpdateProfileRequest, ChangePasswordRequest } from '@/services/profile.service';
import { authStore } from '@/store/authStore';
import { User } from '@/types';
import './PersonalSettings.css';

export const PersonalSettings: React.FC = () => {
  const { user, setUser } = authStore();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Profile form state
  const [profileForm, setProfileForm] = useState<UpdateProfileRequest>({});
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState<ChangePasswordRequest>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const profileData = await profileService.getProfile();
      setProfile(profileData);
      setProfileForm({
        name: profileData.name,
        phoneNumber: profileData.phoneNumber,
        address: profileData.address,
        employeeId: profileData.employeeId,
        designation: profileData.designation,
        dateOfJoining: profileData.dateOfJoining,
        dateOfBirth: profileData.dateOfBirth,
        emergencyContact: profileData.emergencyContact,
        bio: profileData.bio,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const updatedProfile = await profileService.updateProfile(profileForm);
      setProfile(updatedProfile);
      setUser(updatedProfile); // Update auth store
      setIsEditingProfile(false);
      setSuccess('Profile updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      await profileService.changePassword(passwordForm);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsChangingPassword(false);
      setSuccess('Password changed successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profile) {
    return <div className="settings-section-loading">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="settings-section-error">Failed to load profile</div>;
  }

  return (
    <div className="personal-settings">
      <div className="settings-section-header">
        <h2>Personal Information</h2>
        <p className="settings-section-description">Manage your personal details and account information</p>
      </div>

      {error && <div className="settings-error">{error}</div>}
      {success && <div className="settings-success">{success}</div>}

      {/* Profile Information */}
      <div className="settings-card">
        <div className="settings-card-header">
          <h3>Profile Information</h3>
          {!isEditingProfile && (
            <button
              className="btn-edit"
              onClick={() => setIsEditingProfile(true)}
            >
              Edit
            </button>
          )}
        </div>

        <div className="settings-card-content">
          <div className="form-grid">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="form-input disabled"
              />
              <small className="form-help">Email cannot be changed</small>
            </div>

            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={profileForm.name || ''}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                disabled={!isEditingProfile}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={profileForm.phoneNumber || ''}
                onChange={(e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value })}
                disabled={!isEditingProfile}
                className="form-input"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="form-group">
              <label>Employee ID</label>
              <input
                type="text"
                value={profileForm.employeeId || ''}
                onChange={(e) => setProfileForm({ ...profileForm, employeeId: e.target.value })}
                disabled={!isEditingProfile}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Designation</label>
              <input
                type="text"
                value={profileForm.designation || ''}
                onChange={(e) => setProfileForm({ ...profileForm, designation: e.target.value })}
                disabled={!isEditingProfile}
                className="form-input"
                placeholder="Job Title"
              />
            </div>

            <div className="form-group">
              <label>Department</label>
              <input
                type="text"
                value={profile.department || ''}
                disabled
                className="form-input disabled"
              />
              <small className="form-help">Department is managed by HR/Admin</small>
            </div>

            <div className="form-group">
              <label>Date of Birth</label>
              <input
                type="date"
                value={profileForm.dateOfBirth || ''}
                onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                disabled={!isEditingProfile}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Date of Joining</label>
              <input
                type="date"
                value={profileForm.dateOfJoining || ''}
                onChange={(e) => setProfileForm({ ...profileForm, dateOfJoining: e.target.value })}
                disabled={!isEditingProfile}
                className="form-input"
              />
            </div>

            <div className="form-group full-width">
              <label>Address</label>
              <textarea
                value={profileForm.address || ''}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                disabled={!isEditingProfile}
                className="form-input"
                rows={3}
                placeholder="Street address, City, State, ZIP"
              />
            </div>

            <div className="form-group full-width">
              <label>Bio</label>
              <textarea
                value={profileForm.bio || ''}
                onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                disabled={!isEditingProfile}
                className="form-input"
                rows={4}
                placeholder="Tell us about yourself..."
                maxLength={500}
              />
              <small className="form-help">
                {(profileForm.bio || '').length} / 500 characters
              </small>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="form-section">
            <h4>Emergency Contact</h4>
            <div className="form-grid">
              <div className="form-group">
                <label>Contact Name</label>
                <input
                  type="text"
                  value={profileForm.emergencyContact?.name || ''}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      emergencyContact: {
                        ...profileForm.emergencyContact,
                        name: e.target.value,
                      },
                    })
                  }
                  disabled={!isEditingProfile}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Contact Phone</label>
                <input
                  type="tel"
                  value={profileForm.emergencyContact?.phone || ''}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      emergencyContact: {
                        ...profileForm.emergencyContact,
                        phone: e.target.value,
                      },
                    })
                  }
                  disabled={!isEditingProfile}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Relationship</label>
                <input
                  type="text"
                  value={profileForm.emergencyContact?.relationship || ''}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      emergencyContact: {
                        ...profileForm.emergencyContact,
                        relationship: e.target.value,
                      },
                    })
                  }
                  disabled={!isEditingProfile}
                  className="form-input"
                  placeholder="e.g., Spouse, Parent, Sibling"
                />
              </div>
            </div>
          </div>

          {isEditingProfile && (
            <div className="form-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  setIsEditingProfile(false);
                  loadProfile(); // Reset form
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleUpdateProfile}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Password Change */}
      <div className="settings-card">
        <div className="settings-card-header">
          <h3>Change Password</h3>
          {!isChangingPassword && (
            <button
              className="btn-edit"
              onClick={() => setIsChangingPassword(true)}
            >
              Change Password
            </button>
          )}
        </div>

        {isChangingPassword && (
          <div className="settings-card-content">
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Current Password *</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                  }
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group full-width">
                <label>New Password *</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                  }
                  className="form-input"
                  required
                  minLength={6}
                />
                <small className="form-help">Must be at least 6 characters</small>
              </div>

              <div className="form-group full-width">
                <label>Confirm New Password *</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                  }
                  className="form-input"
                  required
                />
                {passwordForm.newPassword &&
                  passwordForm.confirmPassword &&
                  passwordForm.newPassword !== passwordForm.confirmPassword && (
                    <small className="form-error">Passwords do not match</small>
                  )}
              </div>
            </div>

            <div className="form-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  setIsChangingPassword(false);
                  setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  });
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleChangePassword}
                disabled={
                  loading ||
                  !passwordForm.currentPassword ||
                  !passwordForm.newPassword ||
                  passwordForm.newPassword !== passwordForm.confirmPassword ||
                  passwordForm.newPassword.length < 6
                }
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

