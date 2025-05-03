import { Activity, AlertTriangle, Home, Settings, X } from 'lucide-react';

import { NavLink } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar = ({ isOpen, toggleSidebar }: SidebarProps) => {
  const navItems = [
    { path: '/dashboard', name: 'Dashboard', icon: <Home size={20} /> },
    { path: '/system', name: 'System Monitor', icon: <Activity size={20} /> },
    { path: '/alerts', name: 'Alerts', icon: <AlertTriangle size={20} /> },
    { path: '/settings', name: 'Settings', icon: <Settings size={20} /> },
  ];

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black opacity-50 transition-opacity md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 transform overflow-y-auto bg-gray-800 transition duration-300 md:relative md:flex md:translate-x-0 md:flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between bg-gray-900 px-4 py-3 text-white">
          <span className="text-xl font-semibold">MACSYS</span>
          <button onClick={toggleSidebar} className="text-white focus:outline-none md:hidden">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 bg-gray-800 px-2 py-4">
          <ul className="space-y-1">
            {navItems.map(item => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center rounded-md px-4 py-2 text-gray-100 transition-colors ${
                      isActive ? 'bg-gray-700' : 'hover:bg-gray-700'
                    }`
                  }
                >
                  {item.icon}
                  <span className="ml-3">{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div className="bg-gray-900 p-4 text-xs text-gray-400">
          <p>MACSYS v1.0.0</p>
          <p>© 2025 MACSYS Systems</p>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
