import { ReactNode, createContext, useContext } from 'react';
import { User } from '../types/user.types';
import { toast } from 'react-toastify';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

// Create a context with a default undefined value
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo user for development mode
const DEMO_USER: User = {
  _id: 'demo_user_id',
  email: 'demo@example.com',
  name: 'Demo User',
  role: 'admin',
  permissions: [
    'view_devices',
    'add_devices',
    'edit_devices',
    'delete_devices',
    'manage_devices',
    'view_profiles',
    'add_profiles',
    'edit_profiles',
    'delete_profiles',
    'manage_profiles',
  ],
};

// Set a permanent demo token in local storage with format that matches the expected JWT format
// This follows the format the server is looking for (with three parts and demo_signature)
const DEMO_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRlbW9fdXNlcl9pZCJ9.demo_signature';
localStorage.setItem('token', DEMO_TOKEN);
localStorage.setItem('user', JSON.stringify(DEMO_USER));

export function AuthProvider({ children }: { children: ReactNode }) {
  // Simple dev mode implementation - always logged in with demo user
  const login = async (_email: string, _password: string) => {
    toast.success('Login successful!');
  };

  const logout = () => {
    toast.info('Logout clicked (but staying logged in for development)');
  };

  const updateUser = async (userData: Partial<User>) => {
    toast.success('Profile updated successfully');
    console.log('Updated user data:', userData);
  };

  // Fixed values for development
  const value: AuthContextType = {
    user: DEMO_USER,
    token: DEMO_TOKEN,
    isAuthenticated: true,
    isLoading: false,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
