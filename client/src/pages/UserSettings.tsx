import {
  Bell,
  Key,
  Lock,
  Monitor,
  Moon,
  Shield,
  Sun,
  User as UserIcon,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

const UserSettings: React.FC = () => {
  const { user, token, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Profile settings
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI Preferences
  const [theme, setTheme] = useState('light');
  const [timezone, setTimezone] = useState('UTC');

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState({
    alerts: true,
    updates: true,
    deviceStatus: true,
  });
  const [inAppNotifications, setInAppNotifications] = useState({
    alerts: true,
    updates: true,
    deviceStatus: true,
  });

  // API Keys
  const [apiKeys, setApiKeys] = useState<
    { id: string; name: string; createdAt: string; lastUsed?: string }[]
  >([]);

  // Session management
  const [activeSessions, setActiveSessions] = useState<
    { id: string; device: string; location: string; lastActive: string }[]
  >([]);

  // Two-factor authentication
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);

  // Available timezones
  const timezones = [
    'UTC',
    'UTC+1',
    'UTC+2',
    'UTC+3',
    'UTC+4',
    'UTC+5',
    'UTC+6',
    'UTC+7',
    'UTC+8',
    'UTC+9',
    'UTC+10',
    'UTC+11',
    'UTC+12',
    'UTC-1',
    'UTC-2',
    'UTC-3',
    'UTC-4',
    'UTC-5',
    'UTC-6',
    'UTC-7',
    'UTC-8',
    'UTC-9',
    'UTC-10',
    'UTC-11',
    'UTC-12',
  ];

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');

      // In a real app, fetch these from API
      fetchUserPreferences();
      fetchApiKeys();
      fetchActiveSessions();
    }
  }, [user]);

  const fetchUserPreferences = async () => {
    // Mock API call
    setLoading(true);
    try {
      // In a real app, this would be an actual API call
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock data
      setTheme('light');
      setTimezone('UTC');
      setTwoFactorEnabled(false);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      setLoading(false);
    }
  };

  const fetchApiKeys = async () => {
    // Mock API call
    try {
      // In a real app, this would be an actual API call
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock data
      setApiKeys([
        {
          id: 'key-1',
          name: 'Development Key',
          createdAt: '2024-04-15T10:30:00Z',
          lastUsed: '2024-04-28T15:42:00Z',
        },
        {
          id: 'key-2',
          name: 'Integration Key',
          createdAt: '2024-03-22T08:15:00Z',
          lastUsed: '2024-04-25T09:10:00Z',
        },
      ]);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  };

  const fetchActiveSessions = async () => {
    // Mock API call
    try {
      // In a real app, this would be an actual API call
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock data
      setActiveSessions([
        {
          id: 'session-1',
          device: 'Chrome on Windows',
          location: 'New York, USA',
          lastActive: '2024-04-30T09:45:00Z', // Current session
        },
        {
          id: 'session-2',
          device: 'Safari on iPhone',
          location: 'New York, USA',
          lastActive: '2024-04-29T16:20:00Z',
        },
      ]);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // In a real app, this would be an actual API call
      if (updateUser) {
        await updateUser({ name });
      } else {
        throw new Error('updateUser function is not available');
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // In a real app, this would be an actual API call
      await axios.post(
        '/api/auth/change-password',
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage({ type: 'success', text: 'Password changed successfully!' });
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage({ type: 'error', text: 'Failed to change password' });
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    // In a real app, save this preference to backend
  };

  const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTimezone(e.target.value);
    // In a real app, save this preference to backend
  };

  const handleNotificationChange = (
    type: 'email' | 'inApp',
    setting: 'alerts' | 'updates' | 'deviceStatus',
    value: boolean
  ) => {
    if (type === 'email') {
      setEmailNotifications(prev => ({ ...prev, [setting]: value }));
    } else {
      setInAppNotifications(prev => ({ ...prev, [setting]: value }));
    }
    // In a real app, save these preferences to backend
  };

  const generateApiKey = async () => {
    const name = prompt('Enter a name for this API key:');
    if (!name) return;

    try {
      // In a real app, this would be an actual API call
      await new Promise(resolve => setTimeout(resolve, 500));

      const newKey = {
        id: `key-${Date.now()}`,
        name,
        createdAt: new Date().toISOString(),
      };

      setApiKeys(prev => [...prev, newKey]);
      setMessage({ type: 'success', text: 'API key generated successfully!' });
    } catch (error) {
      console.error('Error generating API key:', error);
      setMessage({ type: 'error', text: 'Failed to generate API key' });
    }
  };

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      // In a real app, this would be an actual API call
      await new Promise(resolve => setTimeout(resolve, 500));

      setApiKeys(prev => prev.filter(key => key.id !== keyId));
      setMessage({ type: 'success', text: 'API key deleted successfully!' });
    } catch (error) {
      console.error('Error deleting API key:', error);
      setMessage({ type: 'error', text: 'Failed to delete API key' });
    }
  };

  const terminateSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to terminate this session?')) {
      return;
    }

    try {
      // In a real app, this would be an actual API call
      await new Promise(resolve => setTimeout(resolve, 500));

      setActiveSessions(prev => prev.filter(session => session.id !== sessionId));
      setMessage({ type: 'success', text: 'Session terminated successfully!' });
    } catch (error) {
      console.error('Error terminating session:', error);
      setMessage({ type: 'error', text: 'Failed to terminate session' });
    }
  };

  const toggleTwoFactor = async () => {
    if (twoFactorEnabled) {
      if (
        !confirm(
          'Are you sure you want to disable two-factor authentication? This will make your account less secure.'
        )
      ) {
        return;
      }
    } else {
      setShowTwoFactorSetup(true);
      return;
    }

    try {
      // In a real app, this would be an actual API call
      await new Promise(resolve => setTimeout(resolve, 500));

      setTwoFactorEnabled(!twoFactorEnabled);
      if (twoFactorEnabled) {
        setMessage({
          type: 'success',
          text: 'Two-factor authentication disabled!',
        });
      }
    } catch (error) {
      console.error('Error toggling 2FA:', error);
      setMessage({
        type: 'error',
        text: 'Failed to update two-factor authentication',
      });
    }
  };

  const setupTwoFactor = async () => {
    try {
      // In a real app, this would handle 2FA setup
      await new Promise(resolve => setTimeout(resolve, 500));

      setTwoFactorEnabled(true);
      setShowTwoFactorSetup(false);
      setMessage({
        type: 'success',
        text: 'Two-factor authentication enabled!',
      });
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      setMessage({
        type: 'error',
        text: 'Failed to set up two-factor authentication',
      });
    }
  };

  // Format date strings for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Check if session is current user's session
  const isCurrentSession = (sessionId: string) => {
    const currentSession = activeSessions.find(
      session =>
        new Date(session.lastActive).getTime() ===
        Math.max(...activeSessions.map(s => new Date(s.lastActive).getTime()))
    );
    return currentSession?.id === sessionId;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">User Settings</h1>

      {message && (
        <div
          className={`mb-6 rounded-md p-4 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="space-y-8 md:col-span-2">
          {/* Profile Settings */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center text-lg font-semibold">
              <UserIcon size={20} className="mr-2 text-blue-500" />
              Profile Settings
            </h2>
            <form onSubmit={handleProfileUpdate}>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  disabled
                />
                <p className="mt-1 text-xs text-gray-500">
                  Contact an administrator to change your email address
                </p>
              </div>
              <button
                type="submit"
                className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Password Change */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center text-lg font-semibold">
              <Lock size={20} className="mr-2 text-blue-500" />
              Change Password
            </h2>
            <form onSubmit={handlePasswordChange}>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  minLength={8}
                />
                <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  minLength={8}
                />
              </div>
              <button
                type="submit"
                className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>

          {/* Notification Preferences */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center text-lg font-semibold">
              <Bell size={20} className="mr-2 text-blue-500" />
              Notification Preferences
            </h2>

            <div className="mb-6">
              <h3 className="mb-3 font-medium text-gray-700">Email Notifications</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">System Alerts</span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={emailNotifications.alerts}
                      onChange={e => handleNotificationChange('email', 'alerts', e.target.checked)}
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">System Updates</span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={emailNotifications.updates}
                      onChange={e => handleNotificationChange('email', 'updates', e.target.checked)}
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Device Status Changes</span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={emailNotifications.deviceStatus}
                      onChange={e =>
                        handleNotificationChange('email', 'deviceStatus', e.target.checked)
                      }
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 font-medium text-gray-700">In-App Notifications</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">System Alerts</span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={inAppNotifications.alerts}
                      onChange={e => handleNotificationChange('inApp', 'alerts', e.target.checked)}
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">System Updates</span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={inAppNotifications.updates}
                      onChange={e => handleNotificationChange('inApp', 'updates', e.target.checked)}
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Device Status Changes</span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={inAppNotifications.deviceStatus}
                      onChange={e =>
                        handleNotificationChange('inApp', 'deviceStatus', e.target.checked)
                      }
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* UI Preferences */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center text-lg font-semibold">
              <Monitor size={20} className="mr-2 text-blue-500" />
              UI Preferences
            </h2>

            <div className="mb-6">
              <h3 className="mb-3 font-medium text-gray-700">Theme</h3>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => handleThemeChange('light')}
                  className={`flex items-center rounded-md px-4 py-2 ${
                    theme === 'light'
                      ? 'border border-blue-300 bg-blue-100 text-blue-700'
                      : 'border border-gray-300 bg-gray-100 text-gray-700'
                  }`}
                >
                  <Sun size={18} className="mr-2" />
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeChange('dark')}
                  className={`flex items-center rounded-md px-4 py-2 ${
                    theme === 'dark'
                      ? 'border border-blue-300 bg-blue-100 text-blue-700'
                      : 'border border-gray-300 bg-gray-100 text-gray-700'
                  }`}
                >
                  <Moon size={18} className="mr-2" />
                  Dark
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeChange('system')}
                  className={`flex items-center rounded-md px-4 py-2 ${
                    theme === 'system'
                      ? 'border border-blue-300 bg-blue-100 text-blue-700'
                      : 'border border-gray-300 bg-gray-100 text-gray-700'
                  }`}
                >
                  <Monitor size={18} className="mr-2" />
                  System
                </button>
              </div>
            </div>

            <div>
              <h3 className="mb-3 font-medium text-gray-700">Timezone</h3>
              <select
                value={timezone}
                onChange={handleTimezoneChange}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {timezones.map(tz => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                This affects how dates and times are displayed throughout the application
              </p>
            </div>
          </div>

          {/* API Key Management */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center text-lg font-semibold">
              <Key size={20} className="mr-2 text-blue-500" />
              API Key Management
            </h2>

            <div className="mb-4">
              <button
                type="button"
                onClick={generateApiKey}
                className="rounded-md border border-blue-500 px-4 py-2 text-blue-500 hover:bg-blue-50"
              >
                Generate New API Key
              </button>
            </div>

            {apiKeys.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      >
                        Name
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      >
                        Created
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      >
                        Last Used
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {apiKeys.map(key => (
                      <tr key={key.id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {key.name}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {formatDate(key.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {key.lastUsed ? formatDate(key.lastUsed) : 'Never'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          <button
                            type="button"
                            onClick={() => deleteApiKey(key.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">You haven't created any API keys yet.</p>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {/* Security Settings */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center text-lg font-semibold">
              <Shield size={20} className="mr-2 text-blue-500" />
              Security Settings
            </h2>

            {/* Two-Factor Authentication */}
            <div className="mb-6">
              <h3 className="mb-2 font-medium text-gray-700">Two-Factor Authentication</h3>
              <p className="mb-4 text-sm text-gray-500">
                Add an extra layer of security to your account by requiring a verification code in
                addition to your password.
              </p>

              {showTwoFactorSetup ? (
                <div className="mb-4 rounded-md bg-gray-50 p-4">
                  <h4 className="mb-2 font-medium text-gray-700">
                    Setup Two-Factor Authentication
                  </h4>
                  {/* Add any setup content here */}
                  <button
                    onClick={setupTwoFactor}
                    className="mt-4 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                  >
                    Enable Two-Factor Authentication
                  </button>
                </div>
              ) : (
                <div className="flex items-center">
                  <label className="relative mr-4 inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={twoFactorEnabled}
                      onChange={toggleTwoFactor}
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
                  </label>
                  <span>{twoFactorEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              )}
            </div>

            {/* Session Management */}
            <div>
              <h3 className="mb-2 font-medium text-gray-700">Active Sessions</h3>
              <p className="mb-4 text-sm text-gray-500">
                These are your currently active sessions. You can terminate any session except your
                current one.
              </p>

              {activeSessions.length > 0 ? (
                <div className="space-y-2">
                  {activeSessions.map(session => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between rounded-md bg-gray-50 p-3"
                    >
                      <div>
                        <div className="text-sm font-medium">{session.device}</div>
                        <div className="text-xs text-gray-500">
                          {session.location} • {formatDate(session.lastActive)}
                          {isCurrentSession(session.id) && (
                            <span className="ml-2 rounded-full bg-green-100 px-1.5 py-0.5 text-xs text-green-800">
                              Current
                            </span>
                          )}
                        </div>
                      </div>
                      {!isCurrentSession(session.id) && (
                        <button
                          onClick={() => terminateSession(session.id)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Terminate
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No active sessions</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;
