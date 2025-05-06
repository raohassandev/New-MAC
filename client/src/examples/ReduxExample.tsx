import React from 'react';
import { useAppDispatch, useAppSelector } from '../redux';
import { 
  toggleTheme, 
  setTheme, 
  ThemeMode, 
  selectActiveTheme 
} from '../redux/features/theme';
import { 
  addNotification, 
  removeNotification, 
  toggleSidebar 
} from '../redux/reducers/globalSlice';
import { ThemeToggle } from '../components/theme';

/**
 * Example component showing how to use the Redux store
 */
const ReduxExample: React.FC = () => {
  const dispatch = useAppDispatch();
  const activeTheme = useAppSelector(selectActiveTheme);
  const notifications = useAppSelector(state => state.global.notifications);
  const sidebarCollapsed = useAppSelector(state => state.global.sidebar.collapsed);

  // Theme controls
  const handleThemeToggle = () => {
    dispatch(toggleTheme());
  };

  const handleSetTheme = (mode: ThemeMode) => {
    dispatch(setTheme(mode));
  };

  // Notification controls
  const handleAddNotification = () => {
    dispatch(
      addNotification({
        type: 'info',
        message: 'This is a test notification',
        autoClose: true,
        timeout: 3000,
      })
    );
  };

  const handleRemoveNotification = (id: string) => {
    dispatch(removeNotification(id));
  };

  // Sidebar controls
  const handleToggleSidebar = () => {
    dispatch(toggleSidebar());
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Redux Example</h1>
      
      {/* Theme Section */}
      <section className="mb-6 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-2">Theme</h2>
        <p className="mb-2">Current theme: {activeTheme}</p>
        
        <div className="flex gap-2 mb-4">
          <button 
            onClick={handleThemeToggle} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Toggle Theme
          </button>
          
          <ThemeToggle className="border rounded" />
          
          <button 
            onClick={() => handleSetTheme('light')} 
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Light
          </button>
          
          <button 
            onClick={() => handleSetTheme('dark')} 
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900"
          >
            Dark
          </button>
          
          <button 
            onClick={() => handleSetTheme('system')} 
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            System
          </button>
        </div>
      </section>
      
      {/* Notifications Section */}
      <section className="mb-6 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-2">Notifications</h2>
        
        <button 
          onClick={handleAddNotification} 
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 mb-4"
        >
          Add Notification
        </button>
        
        {notifications.length === 0 ? (
          <p>No notifications</p>
        ) : (
          <ul className="space-y-2">
            {notifications.map(notification => (
              <li 
                key={notification.id} 
                className={`p-2 rounded flex justify-between ${
                  notification.type === 'info' 
                    ? 'bg-blue-100' 
                    : notification.type === 'success'
                    ? 'bg-green-100'
                    : notification.type === 'warning'
                    ? 'bg-yellow-100'
                    : 'bg-red-100'
                }`}
              >
                <span>{notification.message}</span>
                <button 
                  onClick={() => handleRemoveNotification(notification.id)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      
      {/* Sidebar Section */}
      <section className="p-4 border rounded">
        <h2 className="text-xl font-semibold mb-2">Sidebar</h2>
        <p className="mb-2">
          Sidebar is currently: {sidebarCollapsed ? 'Collapsed' : 'Expanded'}
        </p>
        
        <button 
          onClick={handleToggleSidebar} 
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Toggle Sidebar
        </button>
      </section>
    </div>
  );
};

export default ReduxExample;