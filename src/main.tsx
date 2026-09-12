// Entry point for the WORKSHOP console only.
//
// This must stay the first import: config/api.ts patches window.fetch on load,
// so that relative /api/ calls resolve against the production backend in the
// Capacitor/native build. Anything importing fetch-using code before it would
// capture the unpatched function.
import './config/api.ts';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// REMOVED: the `isPortal` branch that conditionally rendered CustomerPortalApp.
//
// It was dead in two independent ways. The customer portal has its OWN entry
// point — customer-index.html loads /src/customer-portal/main.tsx, built by
// vite.customer.config.ts into dist/customer-portal/ — so this file never runs
// for the portal. And the check was for "/portal" while the portal is actually
// served at "/customer-portal/" (server.ts routes it, and the Vite config sets
// base: '/customer-portal/'). Verified live: /customer-portal/ loads
// customer-*.js, while /portal falls through to the workshop's own index-*.js.
//
// So the branch could never be taken in the only bundle that contains it, while
// still pulling the entire portal into the workshop bundle. Worse, /portal was
// a live trap: it returned the WORKSHOP bundle, isPortal evaluated true, and a
// visitor got CustomerPortalApp rendered out of the wrong build. Nothing linked
// there, but it was reachable by typing it.
//
// Removing the branch drops the portal from this bundle and makes /portal
// behave like any other unrecognised path — the workshop app, which then
// redirects it per the role guard.

// Mark which application is mounted so CSS can tell the two apart. They share
// index.css, but they are NOT the same product: the workshop console is dark
// (its global rule forces a near-white text colour) while the customer portal
// is genuinely light, with white cards and modals. Without this marker a rule
// written for one silently applies to the other — which is exactly how the
// light-container contrast fix would have made the customer's estimate-approval
// and payment modals unreadable. The portal sets its own marker in its entry.
document.documentElement.classList.add('app-workshop');

// BrowserRouter gives the workshop's screens real URLs — deep links, browser
// Back/Forward, and refresh on a nested path.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
