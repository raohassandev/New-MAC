// Pages
import Dashboard from './pages/Dashboard';
import DeviceDetails from './pages/DeviceDetails';
import DeviceDriverDetails from './pages/DeviceDriverDetails';
import DeviceDriverManagement from './pages/DeviceDriverManagement';
import DeviceManagement from './pages/DeviceManagement';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import NotFound from './pages/NotFound';
import Register from './pages/Register';
import Settings from './pages/Settings';
import SystemArchitecture from './pages/SystemArchitecture';
import SystemConfiguration from './pages/SystemConfiguration';
import SystemMonitor from './pages/SystemMonitor';
import XmlStructureView from './pages/XmlStructureView';
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
        path: 'device-drivers',
        children: [
          {
            index: true,
            element: <DeviceDriverManagement />,
          },
          {
            path: ':driverId',
            element: <DeviceDriverDetails />,
          },
        ],
      },
      {
        path: 'system',
        element: <SystemMonitor />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
      {
        path: 'system-configuration',
        element: <SystemConfiguration />,
      },
      {
        path: 'project-structure',
        element: <XmlStructureView />,
      },
      {
        path: 'system-architecture',
        element: <SystemArchitecture />,
      },
    ],
  },
]);

export default router;
