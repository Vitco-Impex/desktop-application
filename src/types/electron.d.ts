/**
 * Electron API Type Definitions
 */

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

export interface ElectronAPI {
  platform: string;
  getCurrentWifi: () => Promise<WifiInfo>;
  getCurrentNetwork: () => Promise<NetworkInfo>;
  openLogsViewer: () => Promise<boolean>;
  getLogPath: () => Promise<string>;
  triggerAutoCheckInOnLogin: () => Promise<any>;
  triggerAutoCheckInOnAuthInit: () => Promise<any>;
  getAutoCheckInEnabled: () => Promise<{ enabled: boolean }>;
  setAutoCheckInEnabled: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
  getApiBaseUrl: () => Promise<string>;
  startProxyServer: () => Promise<{ success: boolean; port?: number; ipAddress?: string | null; error?: string }>;
  stopProxyServer: () => Promise<{ success: boolean; error?: string }>;
  getProxyStatus: () => Promise<{ success: boolean; isRunning?: boolean; port?: number; connectedClients?: number; ipAddress?: string | null; error?: string }>;
  getProxyAutoStartEnabled: () => Promise<{ enabled: boolean }>;
  setProxyAutoStartEnabled: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
  autoStartProxyIfDesired: () => Promise<{ success: boolean; reason?: string; error?: string; status?: any }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

