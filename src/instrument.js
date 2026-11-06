// Sentry init — tem de correr antes de qualquer outro código da app (ver import em main.jsx).
// Baseline: erros + tracing. Gated no DSN: sem VITE_SENTRY_DSN o SDK nem arranca e todas
// as chamadas Sentry.* ficam no-op (seguro em dev/CI sem projeto configurado).
import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router-dom';

const dsn = import.meta.env.VITE_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      // Spans de page-load e navegação, com nomes de rota do react-router v6+.
      Sentry.reactRouterBrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
    ],
    // Amostragem: tudo em dev, 20% em produção para conter volume/custo.
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
  });
}
