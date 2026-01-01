/**
 * Auth Initializer Component
 * Checks for existing session on app startup and auto-logs in
 */

import React, { useEffect, useState } from 'react';
import { authStore } from '@/store/authStore';

export const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const initializeAuth = authStore((state) => state.initializeAuth);
  const isInitializing = authStore((state) => state.isInitializing);

  useEffect(() => {
    const init = async () => {
      await initializeAuth();
      setIsInitialized(true);
    };

    init();
  }, [initializeAuth]);

  // Show loading state while initializing
  if (!isInitialized || isInitializing) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '14px',
        color: 'var(--color-text-secondary)'
      }}>
        Loading...
      </div>
    );
  }

  return <>{children}</>;
};

