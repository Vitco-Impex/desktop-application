/**
 * Dialog utilities with automatic focus recovery for Electron
 * 
 * These wrappers ensure that after native dialogs close, focus is properly
 * restored to the Electron window to prevent input fields from becoming unclickable.
 */

/**
 * Wrapper for window.confirm() that automatically restores focus after the dialog closes
 * @param message The confirmation message
 * @returns true if user clicked OK, false if Cancel
 */
export function confirmWithFocusRecovery(message: string): boolean {
  const result = window.confirm(message);
  
  // Restore focus after native confirm dialog closes
  // This prevents input fields from becoming unclickable in Electron
  if (typeof window !== 'undefined' && (window as any).electronAPI?.forceFocusWindow) {
    try {
      (window as any).electronAPI.forceFocusWindow();
    } catch (e) {
      // IPC failed, ignore - focus recovery is best-effort
    }
  }
  
  return result;
}
