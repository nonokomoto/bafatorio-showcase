import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.jsx';
import { initializeI18n } from './i18n/index.js';
import './styles.css';

async function bootstrap() {
  await initializeI18n();

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

bootstrap();
