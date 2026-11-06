import './instrument.js' // Sentry — tem de ser o primeiro import
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import outputs from '../amplify_outputs.json'
import { PersistGate } from 'redux-persist/integration/react'
import { store, persistor } from './Api/store.js'
import { Provider } from 'react-redux'
import App from './App.jsx'
import './index.css'
import './i18n/config.js'

Amplify.configure(outputs);

// Silently reload once when Vite fails to fetch a lazy-loaded chunk.
// This typically happens after a new deploy invalidates old chunk hashes.
// Falls back to showing the ErrorBoundary after 2 failed attempts.
window.addEventListener('vite:preloadError', () => {
    const count = parseInt(sessionStorage.getItem('vite:reloadCount') || '0');
    if (count < 2) {
        sessionStorage.setItem('vite:reloadCount', String(count + 1));
        window.location.reload();
    } else {
        sessionStorage.removeItem('vite:reloadCount');
    }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <App />
      </PersistGate>
    </Provider>
  </React.StrictMode>,
)