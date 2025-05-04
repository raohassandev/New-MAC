// Pages
import Dashboard from './pages/Dashboard';
import DeviceDetails from './pages/DeviceDetails';
import DeviceManagement from './pages/DeviceManagement';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import NotFound from './pages/NotFound';
import ProfileEditor from './pages/ProfileEditor';
import ProfileManagement from './pages/ProfileManagement';
import Register from './pages/Register';
import Settings from './pages/Settings';
import SystemMonitor from './pages/SystemMonitor';
import TemplateManagement from './pages/TemplateManagement';
import { createBrowserRouter } from 'react-router-dom';

// Create the router
const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'devices',
        children: [
          {
            index: true,
            element: <DeviceManagement />,
          },
          {
            path: ':deviceId',
            element: <DeviceDetails />,
          },
        ],
      },
      {
        path: 'profiles',
        children: [
          {
            index: true,
            element: <ProfileManagement />,
          },
          {
            path: 'new',
            element: <ProfileEditor />,
          },
          {
            path: ':profileId',
            element: <ProfileEditor />,
          },
        ],
      },
      {
        path: 'templates',
        element: <TemplateManagement />,
      },
      {
        path: 'system',
        element: <SystemMonitor />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
    ],
  },
]);

export default router;
