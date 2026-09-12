import './config/api.ts';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App.tsx';
import CustomerPortalApp from './customer-portal/CustomerPortalApp.tsx';
import './index.css';

// Route-based rendering: /portal → Customer Portal, everything else → Workshop
const isPortal = window.location.pathname.startsWith('/portal');

// The workshop app is wrapped in a BrowserRouter so its screens have real URLs
// — deep links, browser Back/Forward and refresh on a nested path. The customer
// portal is a SEPARATE application with its own auth and its own build, and is
// deliberately left outside this router: the choice above happens before either
// app mounts, and mixing their history would couple two independent sessions.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPortal ? (
      <CustomerPortalApp />
    ) : (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )}
  </StrictMode>,
);
