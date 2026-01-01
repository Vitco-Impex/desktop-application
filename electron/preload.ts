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
  
  // Get API base URL from renderer (which has access to Vite env vars)
  getApiBaseUrl: (): Promise<string> => {
    return ipcRenderer.invoke('get-api-base-url');
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

