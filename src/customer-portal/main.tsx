// Entry point for the CUSTOMER PORTAL. Built separately by
// vite.customer.config.ts into dist/customer-portal/ and served at
// /customer-portal/ — this is a different bundle from the workshop console.
//
// Must stay the first import: config/api.ts patches window.fetch on load so
// that relative /api/ calls resolve against the production backend in the
// Capacitor/native build. The portal issues relative /api/ requests of its own,
// and this entry did not import it at all — so the interceptor was never
// installed here. Harmless on the web, where relative paths resolve same-origin
// anyway, but the portal's API calls would not have been rewritten in a native
// build. Importing it costs nothing on the web and removes that trap.
import '../config/api.ts';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import CustomerPortalApp from './CustomerPortalApp.tsx';
import '../index.css';

// Mark this as the portal so the shared stylesheet can tell the two apps apart.
// index.css is imported by BOTH, and the workshop's light-container contrast
// rules are scoped to .app-workshop precisely so they do not darken the
// portal's white cards and modals. Without this class the portal simply gets
// none of those rules, which is the correct outcome — it is set explicitly so
// the pairing is visible rather than implied by absence.
document.documentElement.classList.add('app-portal');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CustomerPortalApp />
  </StrictMode>,
);
