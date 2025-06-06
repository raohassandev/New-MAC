import './index.css';
import 'react-toastify/dist/ReactToastify.css';

import App from './App';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ToastContainer } from 'react-toastify';
import { ReduxProvider } from './redux';

// We need BrowserRouter to make hooks like useNavigate work
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ReduxProvider>
      <BrowserRouter>
        <App />
        <ToastContainer position="top-right" autoClose={5000} />
      </BrowserRouter>
    </ReduxProvider>
  </React.StrictMode>
);
