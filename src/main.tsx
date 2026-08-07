import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AmbientOrbs } from './components/Common/AmbientOrbs.tsx';
import './index.css';

document.documentElement.lang = 'fr';
document.documentElement.classList.remove('dark');
document.documentElement.style.colorScheme = 'dark';

try {
  localStorage.removeItem('facturacfa_theme');
} catch {
  /* ignore */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <>
      <AmbientOrbs />
      <App />
    </>
  </StrictMode>
);
