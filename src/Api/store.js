import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import * as Sentry from '@sentry/react';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import userReducer from '../Redux/Auth/userSlice';
import eventControlsReducer from '../Redux/Event/eventControlsSlice.js';
import eventSliceReducer from '../Redux/Event/eventSlice.js';
import supplierReducer from '../Redux/Suppliers/supplierSlice.js';
import supplierControlsReducer from '../Redux/Suppliers/supplierControlsSlice.js';
import { eventApi} from './services/eventApi.js';
import { participantApi} from './services/participantApi.js';
import { dependentApi } from './services/dependentsApi.js';
import { supplierApi } from './services/supplierApi.js';
import { eventSupplierApi } from './services/eventSupplierApi.js';
import { folderApi } from './services/folderApi.js';
import { collaboratorApi } from './services/collaboratorApi.js';
import { roleApi } from './services/roleApi.js';
import { notionApi } from './services/notionApi.js';
import { fidelizeApi } from './services/fidelizeApi.js';
import { scheduleApi } from './services/scheduleApi.js';
import { billingApi } from './services/billingApi.js';
import toastReducer from '../Redux/UI/toastSlice';
import { RESET_STORE } from './actionType';

// Configuração do Redux Persist
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['user', 'event', 'supplier'],
};

// Combinar os reducers
const appReducer = combineReducers({
  user: userReducer,
  [eventApi.reducerPath]: eventApi.reducer,
  [participantApi.reducerPath]: participantApi.reducer,
  [dependentApi.reducerPath]: dependentApi.reducer,
  [supplierApi.reducerPath]: supplierApi.reducer,
  [eventSupplierApi.reducerPath]: eventSupplierApi.reducer,
  [folderApi.reducerPath]: folderApi.reducer,
  [collaboratorApi.reducerPath]: collaboratorApi.reducer,
  [roleApi.reducerPath]: roleApi.reducer,
  [notionApi.reducerPath]: notionApi.reducer,
  [fidelizeApi.reducerPath]: fidelizeApi.reducer,
  [scheduleApi.reducerPath]: scheduleApi.reducer,
  [billingApi.reducerPath]: billingApi.reducer,
  toast: toastReducer,
  eventControls: eventControlsReducer,
  event: eventSliceReducer,
  supplier: supplierReducer,
  supplierControls: supplierControlsReducer,
});

// Root reducer with reset functionality
const rootReducer = (state, action) => {
  if (action.type === RESET_STORE) {
    // Clear Redux store
    state = undefined;

    // Clear persistor
    storage.removeItem('persist:root');
  }
  return appReducer(state, action);
};

// Criar o reducer persistente
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Criar a Redux store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) => {
    const middleware = getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    });

    // Verificar se cada API tem a propriedade middleware antes de adicionar
    const apiMiddlewares = [
      eventApi.middleware,
      participantApi.middleware,
      dependentApi.middleware,
      supplierApi.middleware,
      eventSupplierApi.middleware,
      folderApi.middleware,
      collaboratorApi.middleware,
      roleApi.middleware,
      notionApi.middleware,
      fidelizeApi.middleware,
      scheduleApi.middleware,
      billingApi.middleware,
    ].filter(Boolean); // Remover valores undefined/null

    return middleware.concat(apiMiddlewares);
  },
  // Anexa ações Redux (tipo + estado) ao contexto de cada evento Sentry. No-op sem DSN.
  enhancers: (getDefaultEnhancers) => getDefaultEnhancers().concat(Sentry.createReduxEnhancer()),
});

// Criar o persistor
export const persistor = persistStore(store);

// Configurar os listeners para RTK Query
// Custom handler: apenas online/offline, sem refetchOnFocus (evita re-renders excessivos ao mudar de tab)
setupListeners(store.dispatch, (dispatch, { onOnline, onOffline }) => {
  const handleOnline = () => dispatch(onOnline());
  const handleOffline = () => dispatch(onOffline());
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
});

// Action creator for resetting the store (used only by resetStoreAndPersistor below)
const resetStore = () => ({ type: RESET_STORE });

// Function to reset both store and persistor
export const resetStoreAndPersistor = () => {
  store.dispatch(resetStore());
  persistor.purge();
};
