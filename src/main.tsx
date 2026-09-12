import './config/api.ts';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App.tsx';
import CustomerPortalApp from './customer-portal/CustomerPortalApp.tsx';
import './index.css';

// Route-based rendering: /portal → Customer Portal, everything else → Workshop
const isPortal = window.location.pathname.startsWith('/portal');

// Mark which of the two applications is mounted so CSS can tell them apart.
// They share index.css, but they are NOT the same product: the workshop console
// is dark-themed (its global rule forces a near-white text colour), while the
// customer portal is genuinely light and uses white cards and modals. Without
// this marker, a rule written for one silently applies to the other — which is
// exactly how the light-container contrast fix would have made the customer's
// estimate-approval and payment modals unreadable.
document.documentElement.classList.add(isPortal ? 'app-portal' : 'app-workshop');

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
