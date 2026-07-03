import './fonts'; // self-hosted @font-face declarations — must come first
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SettingsProvider } from '@/context/SettingsProvider';
import { ensurePersistentStorage } from './pwa';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>,
);

// Keep the offline model/asset caches from being evicted (Phase 5, PWA).
void ensurePersistentStorage();
