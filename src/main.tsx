/**
 * Project Pyari — Entry Point
 * ============================
 * Mounts the App shell into the DOM.
 * GSAP plugins are registered via the gsapSetup import in App.tsx.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
