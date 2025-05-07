import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { vi } from 'vitest';

// Mock react-toastify
vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock local storage for consistent test behavior
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Test component that uses the auth context
const TestComponent = () => {
  const { user, isAuthenticated, login, logout, updateUser } = useAuth();

  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
      <div data-testid="user-info">{user ? `${user.name} (${user.email})` : 'No user'}</div>
      <button onClick={() => login('test@example.com', 'password')}>Login</button>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={() => updateUser({ name: 'Updated Name' })}>Update User</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks for each test
    mockLocalStorage.clear.mockClear();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
  });

  test('provides authentication context to children', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // In the default demo state, the user should be authenticated
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    expect(screen.getByTestId('user-info')).toHaveTextContent('Demo User (demo@example.com)');
  });

  test('login function shows success toast', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Login'));

    expect(toast.success).toHaveBeenCalledWith('Login successful!');
  });

  test('logout function shows info toast', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Logout'));

    expect(toast.info).toHaveBeenCalledWith(
      'Logout clicked (but staying logged in for development)'
    );
  });

  test('updateUser function shows success toast and logs update', () => {
    // Mock console.log to track calls
    const originalConsoleLog = console.log;
    console.log = vi.fn();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Update User'));

    expect(toast.success).toHaveBeenCalledWith('Profile updated successfully');
    expect(console.log).toHaveBeenCalledWith('Updated user data:', { name: 'Updated Name' });

    // Restore console.log
    console.log = originalConsoleLog;
  });

  test('provides demo user and auth state in context', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Check if the demo user info is shown in the UI
    expect(screen.getByTestId('user-info')).toHaveTextContent('Demo User');
    expect(screen.getByTestId('user-info')).toHaveTextContent('demo@example.com');

    // Verify that the authentication state is set correctly
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
  });

  test('throws error when useAuth is used outside AuthProvider', () => {
    // Spy on console.error to suppress expected error messages from rendering
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    // Restore console.error
    console.error = originalError;
  });
});
