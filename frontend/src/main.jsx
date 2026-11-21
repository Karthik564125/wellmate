// App entry point: mounts the React tree with router, language, role and toast providers.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import './App.css';
import App from './App.jsx';
import { LanguageProvider } from './i18n/LanguageContext.jsx';
import { RoleProvider } from './context/RoleContext.jsx';
import { ToastProvider } from './components/ToastProvider.jsx';

// Mount the app into the #root element with all global providers wrapped around it.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <RoleProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </RoleProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
);
