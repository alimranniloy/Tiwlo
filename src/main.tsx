import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { ActionConfirmationProvider } from './components/ActionConfirmation.tsx';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ActionConfirmationProvider>
      <App />
    </ActionConfirmationProvider>
  </StrictMode>,
);
