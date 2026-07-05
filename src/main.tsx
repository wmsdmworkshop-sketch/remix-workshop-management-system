import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import CustomerPortalApp from './customer-portal/CustomerPortalApp.tsx';
import './index.css';

// Route-based rendering: /portal → Customer Portal, everything else → Workshop
const isPortal = window.location.pathname.startsWith('/portal');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPortal ? <CustomerPortalApp /> : <App />}
  </StrictMode>,
);
