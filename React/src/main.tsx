import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerLicense } from '@syncfusion/ej2-base';
import { App } from './App';
import { applySyncfusionTheme } from './syncfusion-theme';
import './styles.css';

const licenseKey = import.meta.env.VITE_SYNCFUSION_LICENSE_KEY;
if (licenseKey) registerLicense(licenseKey);
const initialTheme =
  window.localStorage.getItem('executive-kpi-analytics:theme') === 'dark' ? 'dark' : 'light';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

void applySyncfusionTheme(initialTheme).then(() => document.getElementById('app-boot')?.remove());
