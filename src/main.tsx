import "./integrations/supabase/passwordRecoveryState";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from 'react-helmet-async';
import App from "./App.tsx";
import "./index.css";
import { setupGlobalErrorHandling } from "./lib/errorReporter";
import { reportWebVitals } from "./lib/performanceMonitor";
import { removeUnsafeLegacyCaches } from "./lib/pwaCacheSafety";

// Load theme and high contrast before rendering to prevent flash
const loadInitialTheme = () => {
  const stored = localStorage.getItem('theme');
  const storedContrast = localStorage.getItem('highContrast') === 'true';
  const theme = stored || 'system';
  const root = document.documentElement;
  
  root.classList.remove('light', 'dark', 'high-contrast');
  
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }

  // Apply high contrast if enabled
  if (storedContrast) {
    root.classList.add('high-contrast');
  }
};

const bootstrap = async () => {
  loadInitialTheme();
  await removeUnsafeLegacyCaches();

  // Initialize global error handling and performance monitoring
  setupGlobalErrorHandling();
  reportWebVitals();

  createRoot(document.getElementById("root")!).render(
    <HelmetProvider>
      <App />
    </HelmetProvider>
  );

  // Remove initial loader after React has mounted
  const initialLoader = document.getElementById('initial-loader');
  if (initialLoader) {
    initialLoader.remove();
  }
};

void bootstrap().catch(() => {
  const root = document.getElementById('root');
  if (root) {
    root.textContent = 'Synapse konnte den alten Datencache nicht sicher entfernen. Bitte lade die App neu.';
  }
});
