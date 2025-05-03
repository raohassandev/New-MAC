import {
  CreditCard,
  HardDrive,
  Home,
  Menu,
  Settings,
  Sliders,
  Thermometer,
  Users,
  Wrench,
  User,
  X,
  Activity,
} from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import { toast } from 'react-toastify';

import { useAuth } from '../context/AuthContext';

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleLogout = () => {
    logout();
    // No need to navigate manually, the ProtectedRoute will handle redirection
  };

  // Check if user has specific permissions
  const hasPermission = (permission: string) => {
    return user?.permissions?.includes(permission) || false;
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`fixed z-30 h-full w-64 bg-indigo-800 text-white transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'left-0' : '-left-64'
        }`}
      >
        <div className="flex items-center justify-between border-b border-indigo-700 p-4">
          <Link to="/" className="flex items-center gap-2">
            <HardDrive size={24} />
            <h1 className="text-xl font-bold">MacSys</h1>
          </Link>
          <button onClick={toggleSidebar} className="rounded-md p-1 hover:bg-indigo-700 md:hidden">
            <X size={20} />
          </button>
        </div>

        <nav className="mt-4">
          <div className="px-4 py-2 text-xs font-semibold uppercase text-indigo-300">Main</div>
          <NavItem to="/dashboard" icon={<Home size={18} />} label="Dashboard" end={true} />
          <NavItem to="/devices" icon={<HardDrive size={18} />} label="Devices" />
          <NavItem to="/profiles" icon={<Thermometer size={18} />} label="Cooling Profiles" />
          <NavItem to="/templates" icon={<CreditCard size={18} />} label="Device Templates" />
          <NavItem to="/system" icon={<Activity size={18} />} label="System Monitor" />

          {/* Only show admin section if user has proper permissions */}
          {hasPermission('manage_users') && (
            <>
              <div className="mt-6 px-4 py-2 text-xs font-semibold uppercase text-indigo-300">
                Administration
              </div>
              <NavItem to="/users" icon={<Users size={18} />} label="User Management" />
              <NavItem to="/roles" icon={<Sliders size={18} />} label="Roles & Permissions" />
              <NavItem to="/deployment" icon={<Wrench size={18} />} label="Deployment Tools" />
              <NavItem to="/settings" icon={<Settings size={18} />} label="System Settings" />
            </>
          )}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-indigo-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white">
                <User size={16} />
              </div>
              <div className="ml-2">
                <p className="text-sm font-medium">{user?.name || 'User'}</p>
                <p className="text-xs text-indigo-300">{user?.role || 'Role'}</p>
              </div>
            </div>
            {/* Logout button - disabled in dev mode */}
            <button
              onClick={() => toast.info('Logout disabled in development mode')}
              title="Disabled in development mode"
              className="text-indigo-300 opacity-50 hover:text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm9 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-1 8a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'ml-64' : 'ml-0'
        }`}
      >
        {/* Header */}
        <header className="flex h-16 items-center justify-between bg-white px-4 shadow-sm">
          <button onClick={toggleSidebar} className="rounded-md p-2 hover:bg-gray-100">
            <Menu size={20} />
          </button>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <Link to="/profile" className="flex items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white">
                  <User size={16} />
                </div>
                <span className="ml-2">{user?.name || 'User'}</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// Navigation Item Component
interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, end = false }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center px-4 py-2 text-sm ${
        isActive ? 'bg-indigo-900 text-white' : 'text-indigo-100 hover:bg-indigo-700'
      }`
    }
    end={end}
  >
    <span className="mr-3">{icon}</span>
    <span>{label}</span>
  </NavLink>
);

export default MainLayout;
