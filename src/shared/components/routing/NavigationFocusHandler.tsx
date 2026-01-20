/**
 * NavigationFocusHandler Component
 * Triggers focus recovery after React Router navigation/route changes.
 * Ensures window accepts input immediately after navigation completes.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { runOverlayAudit } from '@/shared/utils/overlayAudit';

const DEBUG_FOCUS = import.meta.env.DEBUG_FOCUS === '1' || import.meta.env.VITE_DEBUG_FOCUS === '1';

const logFocus = (...args: any[]) => {
  if (DEBUG_FOCUS) {
    console.log('[NavigationFocusHandler]', ...args);
  }
};

export const NavigationFocusHandler: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    // Wait for render to settle after navigation
    const timeoutId = setTimeout(() => {
      logFocus('Navigation completed', { pathname: location.pathname, hash: location.hash });

      // Audit for invisible overlays that might block input
      const blockers = runOverlayAudit();
      if (blockers.length > 0 && DEBUG_FOCUS) {
        logFocus(`Found ${blockers.length} potential overlay blockers after navigation`);
      }

      // Trigger focus recovery via main process
      if (typeof (window as any).electronAPI?.forceFocusWindow === 'function') {
        (window as any).electronAPI.forceFocusWindow();
      } else {
        logFocus('electronAPI.forceFocusWindow not available');
      }
    }, 100); // Wait 100ms for render to settle

    return () => {
      clearTimeout(timeoutId);
    };
  }, [location.pathname, location.hash]);

  // This component doesn't render anything
  return null;
};
