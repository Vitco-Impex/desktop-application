/**
 * WindowFocusRecovery Component
 * Handles focus recovery when the Electron window regains focus
 * This fixes issues where input fields become unclickable until the user switches apps
 * 
 * Architecture:
 * - Tracks last valid focused input element
 * - Repairs focus silently when broken state is detected
 * - Click watchdog detects clicks that don't result in focus
 * - Health watchdog periodically checks and repairs focus state
 */

import { useEffect, useRef } from 'react';

// Helper to check if an element is focusable
function isFocusable(element: Element | null): boolean {
  if (!element || element === document.body) return false;
  
  const tagName = element.tagName.toLowerCase();
  const focusableTags = ['input', 'select', 'textarea', 'button', 'a'];
  
  if (focusableTags.includes(tagName)) return true;
  
  const tabIndex = element.getAttribute('tabindex');
  if (tabIndex !== null && tabIndex !== '-1') return true;
  
  if (element.getAttribute('contenteditable') === 'true') return true;
  
  return false;
}

// Helper to find first focusable element in document
function findFirstFocusable(): HTMLElement | null {
  const selector = 'input, select, textarea, button, a[href], [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
  const elements = document.querySelectorAll<HTMLElement>(selector);
  
  for (const el of elements) {
    if (isFocusable(el) && el.offsetParent !== null) {
      // Check if element is visible (offsetParent is null for hidden elements)
      return el;
    }
  }
  
  return null;
}

// Helper to check if activeElement is valid and connected
function isValidActiveElement(element: Element | null): boolean {
  if (!element || element === document.body) return false;
  if (!element.isConnected) return false;
  return isFocusable(element);
}

export const WindowFocusRecovery: React.FC = () => {
  // Track last valid focused input element
  const lastValidFocusedRef = useRef<HTMLElement | null>(null);
  
  // Click watchdog: track click target and timer
  const clickTargetRef = useRef<HTMLElement | null>(null);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRepairTimeRef = useRef<number>(0);
  const REPAIR_COOLDOWN = 500; // ms - prevent repair loops

  // Silent focus repair function
  const performSilentRepair = useRef((shouldCallMain: boolean = false) => {
    const now = Date.now();
    if (now - lastRepairTimeRef.current < REPAIR_COOLDOWN) {
      return; // Cooldown active
    }
    lastRepairTimeRef.current = now;

    const activeElement = document.activeElement as HTMLElement;
    
    // If activeElement is body, null, or disconnected, repair is needed
    if (!isValidActiveElement(activeElement)) {
      // Blur broken element if present
      if (activeElement && !activeElement.isConnected) {
        activeElement.blur();
      }
      
      // Focus window
      window.focus();
      
      // Try to refocus last valid element, or first focusable
      let targetToFocus: HTMLElement | null = null;
      
      if (lastValidFocusedRef.current && 
          lastValidFocusedRef.current.isConnected && 
          isFocusable(lastValidFocusedRef.current)) {
        targetToFocus = lastValidFocusedRef.current;
      } else {
        targetToFocus = findFirstFocusable();
      }
      
      if (targetToFocus) {
        try {
          targetToFocus.focus({ preventScroll: true });
        } catch (e) {
          // Focus failed, ignore
        }
      }
      
      // Optionally call main process recovery (only from click watchdog to avoid loops)
      if (shouldCallMain && typeof window !== 'undefined' && (window as any).electronAPI?.forceFocusWindow) {
        try {
          (window as any).electronAPI.forceFocusWindow();
        } catch (e) {
          // IPC failed, ignore
        }
      }
    }
    // If activeElement is valid and connected, do nothing - don't steal focus
  });

  useEffect(() => {
    // 1. Track last valid focused input on focusin
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.isConnected && isFocusable(target) && target !== document.body) {
        lastValidFocusedRef.current = target;
      }
    };

    // 2. Silent focus repair on window:focus-recovery event
    const handleFocusRecovery = () => {
      performSilentRepair.current(false); // Don't call main - already triggered from main
    };

    // 3. Click watchdog: detect clicks that don't result in focus
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Clear any existing timer
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      
      // Only track clicks on focusable elements
      if (!isFocusable(target)) {
        return;
      }
      
      clickTargetRef.current = target;
      
      // After 100ms, check if focus landed on target
      clickTimerRef.current = setTimeout(() => {
        const activeElement = document.activeElement as HTMLElement;
        
        // Check if focus landed on target or a descendant
        const focusLanded = activeElement === clickTargetRef.current || 
                           (clickTargetRef.current && clickTargetRef.current.contains(activeElement));
        
        if (!focusLanded) {
          // Broken state: click didn't result in focus
          performSilentRepair.current(true); // Call main process recovery
        }
        
        clickTimerRef.current = null;
      }, 100);
    };

    // 4. Health watchdog: periodically check and repair focus state
    const healthWatchdogInterval = setInterval(() => {
      // Only run if window has focus
      if (!document.hasFocus()) {
        return;
      }
      
      // If activeElement is invalid but we have a last valid, refocus it
      const activeElement = document.activeElement as HTMLElement;
      
      if (!isValidActiveElement(activeElement)) {
        if (lastValidFocusedRef.current && 
            lastValidFocusedRef.current.isConnected && 
            isFocusable(lastValidFocusedRef.current)) {
          // Silently refocus last known valid input
          try {
            lastValidFocusedRef.current.focus({ preventScroll: true });
          } catch (e) {
            // Focus failed, ignore
          }
        }
      }
    }, 2500); // Every 2.5 seconds

    // Attach event listeners
    document.addEventListener('focusin', handleFocusIn, true);
    window.addEventListener('window:focus-recovery', handleFocusRecovery);
    document.addEventListener('mousedown', handleMouseDown, true);

    // Cleanup
    return () => {
      document.removeEventListener('focusin', handleFocusIn, true);
      window.removeEventListener('window:focus-recovery', handleFocusRecovery);
      document.removeEventListener('mousedown', handleMouseDown, true);
      
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
      
      clearInterval(healthWatchdogInterval);
    };
  }, []);

  // This component doesn't render anything
  return null;
};
