import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { probeServerHealth, getApiBaseUrl } from '../services/api';

interface NetworkContextType {
  isOnline: boolean;
  isOfflineMode: boolean;
  isReconnecting: boolean;
  offlineSince: Date | null;
  lastSyncTime: Date | null;
  initialCheckDone: boolean;
  initialConnectionFailed: boolean;
  continueOffline: () => void;
  triggerReconnection: () => Promise<boolean>;
  registerSyncCallback: (key: string, callback: () => Promise<void>) => () => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

const OFFLINE_PREFERENCE_KEY = 'jachai_user_offline_preference_v1';

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(OFFLINE_PREFERENCE_KEY) === 'true';
    } catch (e) {
      return false;
    }
  });

  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [offlineSince, setOfflineSince] = useState<Date | null>(() => {
    return typeof navigator !== 'undefined' && !navigator.onLine ? new Date() : null;
  });
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(new Date());
  const [initialCheckDone, setInitialCheckDone] = useState<boolean>(false);
  const [initialConnectionFailed, setInitialConnectionFailed] = useState<boolean>(false);

  const syncCallbacksRef = useRef<Map<string, () => Promise<void>>>(new Map());

  const registerSyncCallback = useCallback((key: string, callback: () => Promise<void>) => {
    syncCallbacksRef.current.set(key, callback);
    return () => {
      syncCallbacksRef.current.delete(key);
    };
  }, []);

  const runAllSyncCallbacks = useCallback(async () => {
    const callbacks = Array.from(syncCallbacksRef.current.values());
    if (callbacks.length === 0) return;

    try {
      await Promise.allSettled(callbacks.map((cb) => cb()));
      setLastSyncTime(new Date());
    } catch (err) {
      console.warn('Network sync error:', err);
    }
  }, []);

  const triggerReconnection = useCallback(async (): Promise<boolean> => {
    setIsReconnecting(true);
    try {
      const serverReachable = await probeServerHealth(getApiBaseUrl());
      if (serverReachable) {
        setIsOnline(true);
        setIsOfflineMode(false);
        setOfflineSince(null);
        setInitialConnectionFailed(false);
        try {
          localStorage.removeItem(OFFLINE_PREFERENCE_KEY);
        } catch (e) {}

        await runAllSyncCallbacks();
        setIsReconnecting(false);
        return true;
      } else {
        setIsOnline(false);
        if (!offlineSince) setOfflineSince(new Date());
        setIsReconnecting(false);
        return false;
      }
    } catch (e) {
      setIsOnline(false);
      setIsReconnecting(false);
      return false;
    }
  }, [offlineSince, runAllSyncCallbacks]);

  const continueOffline = useCallback(() => {
    setIsOfflineMode(true);
    setInitialConnectionFailed(false);
    try {
      localStorage.setItem(OFFLINE_PREFERENCE_KEY, 'true');
    } catch (e) {}
  }, []);

  // Initial connection probe on app start
  useEffect(() => {
    let isMounted = true;

    async function initialProbe() {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (isMounted) {
          setIsOnline(false);
          setOfflineSince(new Date());
          setInitialCheckDone(true);
        }
        return;
      }

      if (isMounted) {
        setIsOnline(true);
        setInitialCheckDone(true);
      }

      // Check if server is actually answering in background
      try {
        const serverReachable = await probeServerHealth(getApiBaseUrl());
        if (isMounted && serverReachable) {
          setIsOnline(true);
          setInitialConnectionFailed(false);
        }
      } catch {
        // Silently continue without blocking
      }
    }

    initialProbe();

    return () => {
      isMounted = false;
    };
  }, [isOfflineMode]);

  // Network State Listeners (online / offline)
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setOfflineSince(null);
      await triggerReconnection();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setOfflineSince(new Date());
    };

    // Window Focus / Visibility Change background sync
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && navigator.onLine && !isOfflineMode) {
        // Re-check and run background sync silently
        runAllSyncCallbacks();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [triggerReconnection, runAllSyncCallbacks, isOfflineMode]);

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        isOfflineMode,
        isReconnecting,
        offlineSince,
        lastSyncTime,
        initialCheckDone,
        initialConnectionFailed,
        continueOffline,
        triggerReconnection,
        registerSyncCallback,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = (): NetworkContextType => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};
