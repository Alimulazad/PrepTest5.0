import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { NetworkProvider } from './context/NetworkContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import AdminApp from './AdminApp';
import './index.css';
import 'katex/dist/katex.min.css';

const adminQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      staleTime: 1000 * 30, // 30 seconds for admin telemetry freshness
    },
  },
});

const rootElement = document.getElementById('admin-root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={adminQueryClient}>
          <NetworkProvider>
            <BrowserRouter basename="/admin-portal">
              <ThemeProvider>
                <ToastProvider>
                  <AdminApp />
                </ToastProvider>
              </ThemeProvider>
            </BrowserRouter>
          </NetworkProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}
