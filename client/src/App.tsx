import './index.css';
import 'react-toastify/dist/ReactToastify.css';

import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DeviceProvider } from './context/DeviceContext';
import Dashboard from './pages/Dashboard';
import DeviceDetails from './pages/DeviceDetails';
import DeviceDriverDetails from './pages/DeviceDriverDetails';
import DeviceDriverManagement from './pages/DeviceDriverManagement';
import DeviceManagement from './pages/DeviceManagement';
import MainLayout from './layouts/MainLayout';
import NotFound from './pages/NotFound';
import Settings from './pages/Settings';
import SystemMonitor from './pages/SystemMonitor';
import XmlStructureView from './pages/XmlStructureView';

// Development mode App component with simplified routing
function App() {
  return (
    <AuthProvider>
      <DeviceProvider>
        <Routes>
          {/* Login/Register routes (redirect to dashboard in dev mode) */}
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          <Route path="/register" element={<Navigate to="/dashboard" replace />} />

          {/* Main app routes - all accessible without authentication in dev mode */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="devices">
              <Route index element={<DeviceManagement />} />
              <Route path=":deviceId" element={<DeviceDetails />} />
            </Route>
            <Route path="device-drivers">
              <Route index element={<DeviceDriverManagement />} />
              <Route path=":driverId" element={<DeviceDriverDetails />} />
            </Route>
            <Route path="system" element={<SystemMonitor />} />
            <Route path="settings" element={<Settings />} />
            <Route path="project-structure" element={<XmlStructureView />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Fallback redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </DeviceProvider>
    </AuthProvider>
  );
}

export default App;
