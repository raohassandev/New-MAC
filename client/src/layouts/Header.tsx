import { Bell, LogOut, Menu, Settings, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header = ({ toggleSidebar }: HeaderProps) => {
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
    if (notificationsOpen) setNotificationsOpen(false);
  };

  const toggleNotifications = () => {
    setNotificationsOpen(!notificationsOpen);
    if (userMenuOpen) setUserMenuOpen(false);
  };

  return (
    <header className="z-10 bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center">
          <button
            onClick={toggleSidebar}
            className="text-gray-500 focus:text-gray-700 focus:outline-none md:hidden"
          >
            <Menu size={20} />
          </button>
          <h1 className="ml-2 text-xl font-semibold text-gray-700 md:ml-0">MACSYS</h1>
        </div>

        <div className="flex items-center space-x-3">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={toggleNotifications}
              className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 focus:outline-none"
            >
              <Bell size={20} />
              <span className="absolute right-0 top-0 block h-2 w-2 rounded-full bg-red-500"></span>
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-md bg-white shadow-lg">
                <div className="border-b border-gray-200 bg-gray-100 px-3 py-2">
                  <p className="text-sm font-medium text-gray-700">Notifications</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <div className="border-b border-gray-200 px-3 py-2 hover:bg-gray-50">
                    <p className="text-sm text-gray-700">System alert: High CPU usage detected</p>
                    <p className="text-xs text-gray-500">5 minutes ago</p>
                  </div>
                  <div className="border-b border-gray-200 px-3 py-2 hover:bg-gray-50">
                    <p className="text-sm text-gray-700">Maintenance scheduled for tomorrow</p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                  <div className="px-3 py-2 hover:bg-gray-50">
                    <p className="text-sm text-gray-700">New software update available</p>
                    <p className="text-xs text-gray-500">1 day ago</p>
                  </div>
                </div>
                <div className="cursor-pointer px-3 py-2 text-center text-sm text-blue-500 hover:bg-gray-50">
                  View all notifications
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={toggleUserMenu}
              className="flex items-center text-gray-500 focus:outline-none"
            >
              <span className="mr-2 hidden text-sm md:block">{user?.username || user?.name}</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white">
                <User size={16} />
              </div>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 z-20 mt-2 w-48 rounded-md bg-white py-1 shadow-lg">
                <a
                  href="/profile"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <User size={16} className="mr-2" />
                  Profile
                </a>
                <a
                  href="/settings"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Settings size={16} className="mr-2" />
                  Settings
                </a>
                <button
                  onClick={logout}
                  className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  <LogOut size={16} className="mr-2" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
