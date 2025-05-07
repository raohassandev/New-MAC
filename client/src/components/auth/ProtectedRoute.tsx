import { Outlet } from 'react-router-dom';

// Development mode version of ProtectedRoute - allows all access
const ProtectedRoute = () => {
  // Always show protected content in development mode
  return <Outlet />;
};

export default ProtectedRoute;
