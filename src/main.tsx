import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import FrontendView from './views/FrontendView.tsx';
import AdminView from './views/AdminView.tsx';
import './index.css';

const rootEl = document.getElementById('root');
const frontendEl = document.getElementById('workpro-calc-frontend-root');
const adminEl = document.getElementById('workpro-calc-admin-root');

if (rootEl) {
  // Preview mode in AI Studio
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} else if (frontendEl) {
  // Frontend mode in WordPress (Shortcode)
  createRoot(frontendEl).render(
    <StrictMode>
      <FrontendView />
    </StrictMode>
  );
} else if (adminEl) {
  // Admin mode in WordPress (Plugin Settings Page)
  createRoot(adminEl).render(
    <StrictMode>
      <AdminView />
    </StrictMode>
  );
}
