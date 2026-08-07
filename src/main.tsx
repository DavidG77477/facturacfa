import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './hooks/useTheme';
import './index.css';

document.documentElement.lang = 'fr';

// Applique le thème avant le 1er rendu pour éviter un flash clair/sombre
try {
  const stored = localStorage.getItem('facturacfa_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = stored === 'dark' || stored === 'light' ? stored : prefersDark ? 'dark' : 'light';
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
} catch {
  /* ignore */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
