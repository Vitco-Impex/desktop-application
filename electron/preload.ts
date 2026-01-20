import { contextBridge, ipcRenderer } from 'electron';

export interface WifiInfo {
  ssid: string | null;
  bssid: string | null;
}

export interface NetworkInfo {
  type: 'wifi' | 'ethernet' | 'none';
  wifi?: {
    ssid: string;
    bssid: string | null;
  };
  ethernet?: {
    macAddress: string;
    adapterName?: string;
  };
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform information
  platform: process.platform,
  
  // Wi-Fi detection (deprecated, use getCurrentNetwork instead)
  getCurrentWifi: (): Promise<WifiInfo> => {
    return ipcRenderer.invoke('get-current-wifi');
  },
  
  // Network detection (WiFi or Ethernet)
  getCurrentNetwork: (): Promise<NetworkInfo> => {
    return ipcRenderer.invoke('get-current-network');
  },
  
  // System logs
  openLogsViewer: (): Promise<boolean> => {
    return ipcRenderer.invoke('open-logs-viewer');
  },
  
  getLogPath: (): Promise<string> => {
    return ipcRenderer.invoke('get-log-path');
  },
  
  // Auto attendance
  triggerAutoCheckInOnLogin: (): Promise<any> => {
    return ipcRenderer.invoke('auto-attendance:on-login');
  },
  
  triggerAutoCheckInOnAuthInit: (): Promise<any> => {
    return ipcRenderer.invoke('auto-attendance:on-auth-init');
  },
  
  getAutoCheckInEnabled: (): Promise<{ enabled: boolean }> => {
    return ipcRenderer.invoke('auto-attendance:get-enabled');
  },
  
  setAutoCheckInEnabled: (enabled: boolean): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('auto-attendance:set-enabled', enabled);
  },
  
  // Get API base URL from renderer (which has access to Vite env vars)
  getApiBaseUrl: (): Promise<string> => {
    return ipcRenderer.invoke('get-api-base-url');
  },
  
  // Proxy server controls
  startProxyServer: (): Promise<{ success: boolean; port?: number; ipAddress?: string | null; error?: string }> => {
    return ipcRenderer.invoke('proxy:start');
  },
  
  stopProxyServer: (): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('proxy:stop');
  },
  
  getProxyStatus: (): Promise<{ success: boolean; isRunning?: boolean; port?: number; connectedClients?: number; ipAddress?: string | null; isRegistered?: boolean; lastRegistrationAttempt?: Date | null; lastRegistrationError?: string | null; mainServerUrl?: string; error?: string }> => {
    return ipcRenderer.invoke('proxy:status');
  },

  getProxyAutoStartEnabled: (): Promise<{ enabled: boolean }> => {
    return ipcRenderer.invoke('proxy:get-autostart-enabled');
  },

  setProxyAutoStartEnabled: (enabled: boolean): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('proxy:set-autostart-enabled', enabled);
  },

  autoStartProxyIfDesired: (): Promise<{ success: boolean; reason?: string; error?: string; status?: any }> => {
    return ipcRenderer.invoke('proxy:auto-start-if-desired');
  },

  // Force focus window (renderer-initiated focus recovery)
  forceFocusWindow: (): void => {
    ipcRenderer.send('force-focus-window');
  },
});

// Listen for IPC messages from main process
ipcRenderer.on('open-logs-viewer', () => {
  // Dispatch custom event that App component can listen to
  // In preload script, we need to use window which is available in renderer context
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-logs-viewer'));
  }
});

// Listen for window focus recovery IPC from main process
ipcRenderer.on('window:focus-recovery', () => {
  // Dispatch custom event for focus recovery
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('window:focus-recovery'));
  }
});

