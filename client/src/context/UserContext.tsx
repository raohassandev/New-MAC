import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react';

import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

// Define types for user management
export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'engineer' | 'admin';
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface UserContextType {
  users: User[];
  isLoading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  createUser: (userData: Partial<User>) => Promise<User>;
  updateUser: (userId: string, userData: Partial<User>) => Promise<User>;
  deleteUser: (userId: string) => Promise<void>;
  getUserById: (userId: string) => User | undefined;
  resetPassword: (userId: string) => Promise<void>;
  setUserPermissions: (userId: string, permissions: string[]) => Promise<User>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { token, user: currentUser } = useAuth();

  // Fetch all users
  const fetchUsers = async () => {
    if (!token || !currentUser || currentUser.role !== 'admin') {
      setError('Unauthorized access');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new user
  const createUser = async (userData: Partial<User>): Promise<User> => {
    if (!token || !currentUser || currentUser.role !== 'admin') {
      throw new Error('Unauthorized access');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/users', userData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update the users list with the new user
      setUsers(prevUsers => [...prevUsers, response.data]);

      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to create user';
      setError(errorMsg);
      console.error('Error creating user:', err);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Update an existing user
  const updateUser = async (userId: string, userData: Partial<User>): Promise<User> => {
    if (!token || !currentUser || currentUser.role !== 'admin') {
      throw new Error('Unauthorized access');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.put(`/api/users/${userId}`, userData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update the users list with the updated user
      setUsers(prevUsers => prevUsers.map(user => (user._id === userId ? response.data : user)));

      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to update user';
      setError(errorMsg);
      console.error('Error updating user:', err);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a user
  const deleteUser = async (userId: string): Promise<void> => {
    if (!token || !currentUser || currentUser.role !== 'admin') {
      throw new Error('Unauthorized access');
    }

    setIsLoading(true);
    setError(null);

    try {
      await axios.delete(`/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Remove the deleted user from the list
      setUsers(prevUsers => prevUsers.filter(user => user._id !== userId));
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to delete user';
      setError(errorMsg);
      console.error('Error deleting user:', err);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Get a user by ID
  const getUserById = (userId: string): User | undefined => {
    return users.find(user => user._id === userId);
  };

  // Reset a user's password
  const resetPassword = async (userId: string): Promise<void> => {
    if (!token || !currentUser || currentUser.role !== 'admin') {
      throw new Error('Unauthorized access');
    }

    setIsLoading(true);
    setError(null);

    try {
      await axios.post(
        `/api/users/${userId}/reset-password`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to reset password';
      setError(errorMsg);
      console.error('Error resetting password:', err);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Set user permissions
  const setUserPermissions = async (userId: string, permissions: string[]): Promise<User> => {
    if (!token || !currentUser || currentUser.role !== 'admin') {
      throw new Error('Unauthorized access');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.put(
        `/api/users/${userId}/permissions`,
        { permissions },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Update the users list with the updated permissions
      setUsers(prevUsers => prevUsers.map(user => (user._id === userId ? response.data : user)));

      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to update permissions';
      setError(errorMsg);
      console.error('Error updating permissions:', err);
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto fetch users when component mounts if user is admin
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchUsers();
    }
  }, [currentUser]);

  const value = {
    users,
    isLoading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    getUserById,
    resetPassword,
    setUserPermissions,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUsers = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUsers must be used within a UserProvider');
  }
  return context;
};
