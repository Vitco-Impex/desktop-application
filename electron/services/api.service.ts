/**
 * API Service - Backend communication for main process
 * Uses axios for HTTP requests
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import http from 'http';
import https from 'https';
import { sessionService } from './session.service';

// Local type definitions (to avoid importing from renderer)
interface AttendanceStatusResponse {
  status: 'NOT_STARTED' | 'CHECKED_IN' | 'CHECKED_OUT';
  today?: any;
  canCheckIn: boolean;
  canCheckOut: boolean;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  status: string;
  source: string;
  totalDuration?: number;
  createdAt: string;
  updatedAt: string;
}

interface CheckInRequest {
  source: string;
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  wifi?: {
    ssid: string;
    bssid?: string;
  };
  ethernet?: {
    macAddress: string;
  };
  systemFingerprint?: string;
}

interface CheckOutRequest {
  source: string;
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  wifi?: {
    ssid: string;
    bssid?: string;
  };
  ethernet?: {
    macAddress: string;
  };
  systemFingerprint?: string;
  checkOutTime?: string; // ISO string - optional, for recovery check-outs at specific time
}

interface WifiValidationRequest {
  ssid?: string;
  bssid?: string;
  macAddress?: string;
}

interface WifiValidationResponse {
  allowed: boolean;
  reason?: string;
  wifiNetworkId?: string;
}

const API_TIMEOUT = 30000;

class ApiService {
  private instance: AxiosInstance;
  private apiBaseUrl: string | null = null;
  private baseUrlPromise: Promise<string> | null = null;

  constructor() {
    // Initialize with a placeholder - will be updated from renderer
    // Use 127.0.0.1 instead of localhost to force IPv4 and avoid IPv6 issues
    this.instance = axios.create({
      baseURL: 'http://127.0.0.1:3001/api/v1', // Temporary default (IPv4 to avoid ::1 issues)
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
      // Force IPv4 by using family: 4 in httpAgent
      httpAgent: new http.Agent({ family: 4 }),
      httpsAgent: new https.Agent({ family: 4 }),
    });

    this.setupInterceptors();
  }

  /**
   * Get API base URL from renderer process (cached after first call)
   */
  private async getApiBaseUrl(): Promise<string> {
    // Return cached URL if available
    if (this.apiBaseUrl) {
      return this.apiBaseUrl;
    }

    // If there's already a request in progress, wait for it
    if (this.baseUrlPromise) {
      return this.baseUrlPromise;
    }

    // Create new promise to fetch URL
    this.baseUrlPromise = (async () => {
      try {
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getAllWindows()[0];
        
        if (!mainWindow) {
          console.warn('[ApiService] Main window not available, using default API URL');
          return 'http://127.0.0.1:3001/api/v1';
        }

        // Wait for window to be ready if needed
        if (mainWindow.webContents.isLoading()) {
          await new Promise<void>((resolve) => {
            mainWindow.webContents.once('did-finish-load', () => resolve());
          });
        }

        // Small delay to ensure renderer has set the global variable
        await new Promise(resolve => setTimeout(resolve, 500));

        let apiBaseUrl = await mainWindow.webContents.executeJavaScript(`
          (() => {
            try {
              return window.__API_BASE_URL__ || 'http://127.0.0.1:3001/api/v1';
            } catch (error) {
              console.error('Failed to get API base URL:', error);
              return 'http://127.0.0.1:3001/api/v1';
            }
          })()
        `);
        
        // Normalize URL: Replace localhost with 127.0.0.1 to force IPv4
        apiBaseUrl = apiBaseUrl.replace(/localhost/g, '127.0.0.1');
          
        console.log('[ApiService] Got API base URL from renderer (normalized):', apiBaseUrl);
        this.apiBaseUrl = apiBaseUrl;
        this.instance.defaults.baseURL = apiBaseUrl;
        // Ensure IPv4 is used by updating agents (family: 4 forces IPv4)
        this.instance.defaults.httpAgent = new http.Agent({ family: 4 });
        this.instance.defaults.httpsAgent = new https.Agent({ family: 4 });
        return apiBaseUrl;
      } catch (error) {
        console.error('[ApiService] Failed to get API base URL from renderer:', error);
        const defaultUrl = 'http://127.0.0.1:3001/api/v1';
        this.apiBaseUrl = defaultUrl;
        return defaultUrl;
      } finally {
        this.baseUrlPromise = null;
      }
    })();

    return this.baseUrlPromise;
  }

  /**
   * Ensure API base URL is set before making requests
   */
  private async ensureBaseUrl(): Promise<void> {
    await this.getApiBaseUrl();
  }

  /**
   * Setup request/response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor - Add auth token
    this.instance.interceptors.request.use(
      async (config) => {
        const token = await sessionService.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - Handle errors
    this.instance.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error: AxiosError) => {
        // Handle 401 Unauthorized - token might be expired
        if (error.response?.status === 401) {
          console.error('[ApiService] Authentication failed - session may be expired');
          // Don't retry - let the caller handle it
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Get attendance status
   */
  async getAttendanceStatus(): Promise<AttendanceStatusResponse> {
    await this.ensureBaseUrl();
    try {
      const response = await this.instance.get('/attendance/status');
      return response.data.data;
    } catch (error: any) {
      // Handle connection errors gracefully
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        const errorMessage = `Cannot connect to server at ${this.instance.defaults.baseURL}. Please ensure the server is running.`;
        console.error('[ApiService] Connection error:', errorMessage);
        const connectionError: any = new Error(errorMessage);
        connectionError.code = error.code;
        connectionError.isConnectionError = true;
        throw connectionError;
      }
      console.error('[ApiService] Failed to get attendance status:', error);
      throw error;
    }
  }

  /**
   * Validate network (WiFi or Ethernet)
   */
  async validateNetwork(request: WifiValidationRequest): Promise<WifiValidationResponse> {
    await this.ensureBaseUrl();
    try {
      const response = await this.instance.post('/wifi/validate', request);
      return response.data.data;
    } catch (error) {
      console.error('[ApiService] Failed to validate network:', error);
      throw error;
    }
  }

  /**
   * Extract error message from axios error response
   */
  private extractErrorMessage(error: any): string {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'Unknown error occurred';
  }

  /**
   * Check in
   */
  async checkIn(request: CheckInRequest): Promise<AttendanceRecord> {
    await this.ensureBaseUrl();
    try {
      const response = await this.instance.post('/attendance/check-in', request);
      return response.data.data;
    } catch (error: any) {
      console.error('[ApiService] Failed to check in:', error);
      
      // Extract user-friendly error message
      const errorMessage = this.extractErrorMessage(error);
      
      // Create a custom error with the message
      const customError: any = new Error(errorMessage);
      customError.statusCode = error.response?.status || 500;
      customError.response = error.response;
      
      throw customError;
    }
  }

  /**
   * Check out
   */
  async checkOut(request: CheckOutRequest): Promise<AttendanceRecord> {
    await this.ensureBaseUrl();
    try {
      const response = await this.instance.post('/attendance/check-out', request);
      return response.data.data;
    } catch (error: any) {
      console.error('[ApiService] Failed to check out:', error);
      
      // Extract user-friendly error message
      const errorMessage = this.extractErrorMessage(error);
      
      // Create a custom error with the message
      const customError: any = new Error(errorMessage);
      customError.statusCode = error.response?.status || 500;
      customError.response = error.response;
      
      throw customError;
    }
  }

  /**
   * Get instance for custom requests
   */
  getInstance(): AxiosInstance {
    return this.instance;
  }
}

export const apiService = new ApiService();

