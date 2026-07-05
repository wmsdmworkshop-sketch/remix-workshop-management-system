import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import CustomerPortalApp from './CustomerPortalApp.tsx';
import '../index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CustomerPortalApp />
  </StrictMode>,
);
