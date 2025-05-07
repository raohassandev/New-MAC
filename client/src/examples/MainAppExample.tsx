import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ReduxProvider } from '../redux';
import ReduxExample from './ReduxExample';

/**
 * Example showing how to use the ReduxProvider to wrap the application
 * Note: This is just an example, you should integrate this in your actual main.tsx file
 */
const MainAppExample: React.FC = () => {
  // You can create a loading component to show while redux-persist is rehydrating
  const LoadingComponent = () => (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="text-xl font-semibold">Loading application state...</div>
    </div>
  );

  return (
    <ReduxProvider loading={<LoadingComponent />}>
      <Router>
        {/* Your entire application goes here */}
        <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors duration-200 dark:bg-gray-900 dark:text-gray-100">
          <header className="bg-white p-4 shadow dark:bg-gray-800">
            <h1 className="text-2xl font-bold">My Application</h1>
          </header>

          <main className="container mx-auto p-4">
            <ReduxExample />
          </main>

          <footer className="bg-white p-4 text-center shadow dark:bg-gray-800">
            <p>Redux with Redux Persist Example</p>
          </footer>
        </div>
      </Router>
    </ReduxProvider>
  );
};

export default MainAppExample;

/**
 * To use this in your main.tsx file:
 *
 * import React from 'react';
 * import ReactDOM from 'react-dom/client';
 * import { ReduxProvider } from './redux';
 * import App from './App';
 * import './index.css';
 *
 * ReactDOM.createRoot(document.getElementById('root')!).render(
 *   <React.StrictMode>
 *     <ReduxProvider>
 *       <App />
 *     </ReduxProvider>
 *   </React.StrictMode>
 * );
 */
