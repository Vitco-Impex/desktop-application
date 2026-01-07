/**
 * Proxy Server Service - Electron Main Process
 * Runs HTTP/WebSocket server to proxy attendance requests
 */

import { createServer, Server, IncomingMessage, ServerResponse } from 'http';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { sessionService } from './session.service';
import { apiService } from './api.service';

interface ProxyServerConfig {
  port: number;
  mainServerUrl: string;
}

class ProxyServerService {
  private server: Server | null = null;
  private isRunning: boolean = false;
  private port: number = 3002;
  private mainServerUrl: string = '';
  private connectedClients: number = 0;
  private apiClient: AxiosInstance;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reregistrationInterval: NodeJS.Timeout | null = null;
  private mdnsService: any = null; // Bonjour service instance
  private currentIpAddress: string | null = null;
  private deviceName: string = '';
  private isRegistered: boolean = false;
  private lastRegistrationAttempt: Date | null = null;
  private lastRegistrationError: string | null = null;

  constructor() {
    this.apiClient = axios.create({
      timeout: 30000,
    });
  }

  /**
   * Start proxy server
   */
  async startProxyServer(): Promise<{ port: number; ipAddress: string | null }> {
    if (this.isRunning) {
      return {
        port: this.port,
        ipAddress: this.currentIpAddress,
      };
    }

    // Get main server URL from renderer process (same approach as ApiService)
    // First, try to get it from apiService instance if already set (more reliable)
    const apiServiceBaseUrl = apiService.getInstance().defaults.baseURL;
    if (apiServiceBaseUrl && apiServiceBaseUrl !== 'http://127.0.0.1:3001/api/v1') {
      // apiService already has the correct URL
      this.mainServerUrl = apiServiceBaseUrl as string;
      console.log('[ProxyServer] Got API base URL from apiService:', this.mainServerUrl);
    } else {
      // Fallback: get it directly from renderer (same approach as ApiService)
      try {
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getAllWindows()[0];
        
        if (!mainWindow) {
          console.warn('[ProxyServer] Main window not available, using default API URL');
          this.mainServerUrl = 'http://127.0.0.1:3001/api/v1';
        } else {
          // Wait for window to be ready if needed
          if (mainWindow.webContents.isLoading()) {
            await new Promise<void>((resolve) => {
              mainWindow.webContents.once('did-finish-load', () => resolve());
            });
          }

          // Small delay to ensure renderer has set the global variable
          await new Promise(resolve => setTimeout(resolve, 500));

          const url = await mainWindow.webContents.executeJavaScript(`
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
          this.mainServerUrl = url.replace(/localhost/g, '127.0.0.1');
          console.log('[ProxyServer] Got API base URL from renderer (normalized):', this.mainServerUrl);
        }
      } catch (error: any) {
        console.error('[ProxyServer] Failed to get API URL from renderer:', error);
        console.warn('[ProxyServer] Using default API URL: http://127.0.0.1:3001/api/v1');
        this.mainServerUrl = 'http://127.0.0.1:3001/api/v1';
      }
    }

    // Get local IP address
    this.currentIpAddress = await this.getLocalIPAddress();
    if (!this.currentIpAddress) {
      throw new Error('Failed to get local IP address');
    }

    // Get device name
    const os = require('os');
    this.deviceName = os.hostname() || 'Desktop Proxy';

    // Create HTTP server
    this.server = createServer((req, res) => {
      this.handleRequest(req, res);
    });

    // Start listening
    return new Promise((resolve, reject) => {
      if (!this.server) {
        reject(new Error('Server not initialized'));
        return;
      }

      this.server.listen(this.port, '0.0.0.0', async () => {
        this.isRunning = true;
        
        try {
          // Register with main server (with retry logic)
          const registered = await this.registerWithServer();
          if (registered) {
            console.log(`[ProxyServer] ✅ Proxy server registered successfully`);
          } else {
            console.warn(`[ProxyServer] ⚠️ Proxy server running but not registered with main server`);
          }
          
          // Register mDNS service
          await this.registerMdnsService();
          
          // Start heartbeat
          this.startHeartbeat();
          
          // Start periodic re-registration check (every 5 minutes)
          this.startReregistrationCheck();
          
          console.log(`[ProxyServer] ✅ Started on ${this.currentIpAddress}:${this.port}`);
          resolve({ port: this.port, ipAddress: this.currentIpAddress });
        } catch (error: any) {
          console.error('[ProxyServer] ❌ Failed to start proxy:', error);
          // Still resolve - server is running, registration can be retried
          resolve({ port: this.port, ipAddress: this.currentIpAddress });
        }
      });

      this.server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`Port ${this.port} is already in use`));
        } else {
          reject(error);
        }
      });
    });
  }

  /**
   * Stop proxy server
   */
  async stopProxyServer(): Promise<void> {
    // Stop heartbeat
    this.stopHeartbeat();
    
    // Stop re-registration check
    this.stopReregistrationCheck();
    
    // Unregister mDNS service
    await this.unregisterMdnsService();
    
    // Unregister from main server
    try {
      await this.unregisterFromServer();
      this.isRegistered = false;
    } catch (error) {
      console.error('[ProxyServer] Failed to unregister from server:', error);
    }

    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          this.isRunning = false;
          this.connectedClients = 0;
          this.currentIpAddress = null;
          this.isRegistered = false;
          this.lastRegistrationAttempt = null;
          this.lastRegistrationError = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle HTTP request - forward to main server or handle health check
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Handle health check endpoint
    if (req.url === '/health' && req.method === 'GET') {
      const user = await sessionService.getUser();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        proxy: {
          ip: this.currentIpAddress,
          port: this.port,
          isRunning: this.isRunning,
          userId: user?.id || null,
          deviceName: this.deviceName,
        },
      }));
      return;
    }

    try {
      // Read request body
      const body = await this.readRequestBody(req);

      // Forward request to main server
      const url = `${this.mainServerUrl}${req.url}`;
      const options: any = {
        method: req.method,
        url,
        headers: {
          ...req.headers,
          host: undefined, // Remove host header
        },
        data: body,
        validateStatus: () => true, // Don't throw on any status
      };

      const response = await this.apiClient.request(options);

      // Convert Axios headers to Node.js HTTP headers format
      const headers: Record<string, string | string[]> = {};
      Object.keys(response.headers).forEach((key) => {
        const value = response.headers[key];
        if (value !== undefined) {
          headers[key] = Array.isArray(value) ? value : String(value);
        }
      });

      // Forward response to client
      res.writeHead(response.status, headers);
      res.end(JSON.stringify(response.data));
    } catch (error: any) {
      res.writeHead(500);
      res.end(JSON.stringify({
        success: false,
        message: error.message || 'Proxy error',
      }));
    }
  }

  /**
   * Read request body from stream
   */
  private readRequestBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      req.on('end', () => {
        resolve(Buffer.concat(chunks).toString());
      });
      req.on('error', reject);
    });
  }

  /**
   * Get local IP address
   */
  private async getLocalIPAddress(): Promise<string | null> {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    
    return null;
  }

  /**
   * Register proxy server with main server
   * Includes retry logic with exponential backoff
   * Non-blocking - proxy will continue even if registration fails
   */
  private async registerWithServer(retryCount: number = 0, maxRetries: number = 3): Promise<boolean> {
    const startTime = Date.now();
    this.lastRegistrationAttempt = new Date();
    
    try {
      const user = await sessionService.getUser();
      if (!user || !user.id) {
        console.warn('[ProxyServer] ❌ Cannot register - user not authenticated');
        this.isRegistered = false;
        return false;
      }

      // Get fresh session to ensure we have a valid token
      let session = await sessionService.getSessionFromRenderer();
      if (!session.isValid || !session.accessToken) {
        console.warn('[ProxyServer] ❌ Cannot register - no valid session');
        this.isRegistered = false;
        return false;
      }

      let accessToken = session.accessToken;

      // Try to register with current token
      try {
        console.log(`[ProxyServer] 🔄 Registering proxy server (attempt ${retryCount + 1}/${maxRetries + 1})...`);
        console.log(`[ProxyServer] 📍 IP: ${this.currentIpAddress}, Port: ${this.port}, Device: ${this.deviceName}`);
        
        const response = await this.apiClient.post(
          `${this.mainServerUrl}/proxy/register`,
          {
            ipAddress: this.currentIpAddress,
            port: this.port,
            deviceName: this.deviceName,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (response.data.success) {
          const duration = Date.now() - startTime;
          console.log(`[ProxyServer] ✅ Successfully registered with main server (took ${duration}ms)`);
          this.isRegistered = true;
          this.lastRegistrationError = null; // Clear error on success
          return true;
        } else {
          const errorMsg = response.data.message || 'Registration failed';
          console.warn('[ProxyServer] ⚠️ Registration returned error:', errorMsg);
          this.isRegistered = false;
          this.lastRegistrationError = errorMsg;
          
          // Retry if we haven't exceeded max retries
          if (retryCount < maxRetries) {
            return await this.retryRegistration(retryCount, maxRetries);
          }
          return false;
        }
      } catch (error: any) {
        // If 401, try to refresh token and retry
        if (error.response?.status === 401) {
          console.log('[ProxyServer] 🔑 Token expired, attempting to refresh...');
          const newToken = await sessionService.refreshAccessToken();
          
          if (newToken) {
            console.log('[ProxyServer] ✅ Token refreshed, retrying registration...');
            try {
              const retryResponse = await this.apiClient.post(
                `${this.mainServerUrl}/proxy/register`,
                {
                  ipAddress: this.currentIpAddress,
                  port: this.port,
                  deviceName: this.deviceName,
                },
                {
                  headers: {
                    Authorization: `Bearer ${newToken}`,
                  },
                }
              );

              if (retryResponse.data.success) {
                const duration = Date.now() - startTime;
                console.log(`[ProxyServer] ✅ Registered with main server after token refresh (took ${duration}ms)`);
                this.isRegistered = true;
                this.lastRegistrationError = null; // Clear error on success
                return true;
              } else {
                const errorMsg = retryResponse.data.message || 'Registration failed after token refresh';
                console.warn('[ProxyServer] ⚠️ Registration failed after token refresh:', errorMsg);
                this.isRegistered = false;
                this.lastRegistrationError = errorMsg;
                
                // Retry if we haven't exceeded max retries
                if (retryCount < maxRetries) {
                  return await this.retryRegistration(retryCount, maxRetries);
                }
                return false;
              }
            } catch (retryError: any) {
              const errorMsg = retryError.response?.data?.message || retryError.message || 'Registration failed after token refresh';
              console.error('[ProxyServer] ❌ Registration failed after token refresh:', {
                status: retryError.response?.status,
                message: errorMsg,
                code: retryError.code,
              });
              this.isRegistered = false;
              this.lastRegistrationError = errorMsg;
              
              // Retry if we haven't exceeded max retries
              if (retryCount < maxRetries) {
                return await this.retryRegistration(retryCount, maxRetries);
              }
              return false;
            }
          } else {
            const errorMsg = 'Failed to refresh authentication token';
            console.warn('[ProxyServer] ⚠️ Failed to refresh token. Proxy will still work via mDNS discovery.');
            this.isRegistered = false;
            this.lastRegistrationError = errorMsg;
            return false;
          }
        }
        
        // Log detailed error information
        const errorDetails = {
          attempt: retryCount + 1,
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          code: error.code,
          url: `${this.mainServerUrl}/proxy/register`,
        };
        console.error('[ProxyServer] ❌ Registration failed:', errorDetails);
        
        // Build user-friendly error message
        let errorMessage = 'Registration failed';
        if (error.response?.status === 401) {
          errorMessage = 'Authentication failed - please log in again';
        } else if (error.response?.status === 403) {
          errorMessage = 'Permission denied - you may not have proxy permissions';
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          errorMessage = `Cannot reach server at ${this.mainServerUrl}`;
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
          errorMessage = 'Connection timeout - server may be unreachable';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        this.lastRegistrationError = errorMessage;
        this.isRegistered = false;
        
        // Retry if we haven't exceeded max retries
        if (retryCount < maxRetries) {
          return await this.retryRegistration(retryCount, maxRetries);
        }
        
        // Don't throw - allow proxy to run even if registration fails
        // mDNS discovery will still work
        console.warn('[ProxyServer] ⚠️ Registration failed after all retries. Proxy will still work via mDNS discovery.');
        return false;
      }
    } catch (error: any) {
      // Don't throw - allow proxy to run even if registration fails
      // mDNS discovery will still work
      const errorMsg = error.message || 'Unknown error during registration';
      console.error('[ProxyServer] ❌ Registration error:', {
        message: errorMsg,
        stack: error.stack,
      });
      this.lastRegistrationError = errorMsg;
      this.isRegistered = false;
      return false;
    }
  }

  /**
   * Retry registration with exponential backoff
   */
  private async retryRegistration(retryCount: number, maxRetries: number): Promise<boolean> {
    // Exponential backoff: 1s, 2s, 4s
    const delay = Math.min(1000 * Math.pow(2, retryCount), 4000);
    console.log(`[ProxyServer] ⏳ Retrying registration in ${delay}ms...`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return await this.registerWithServer(retryCount + 1, maxRetries);
  }

  /**
   * Unregister proxy server from main server
   */
  private async unregisterFromServer(): Promise<void> {
    let accessToken = await sessionService.getAccessToken();
    if (!accessToken) {
      console.warn('[ProxyServer] Cannot unregister - no access token');
      return;
    }

    try {
      await this.apiClient.delete(`${this.mainServerUrl}/proxy/unregister`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      console.log('[ProxyServer] Unregistered from main server');
    } catch (error: any) {
      // If 401, try to refresh token and retry
      if (error.response?.status === 401) {
        const newToken = await sessionService.refreshAccessToken();
        if (newToken) {
          try {
            await this.apiClient.delete(`${this.mainServerUrl}/proxy/unregister`, {
              headers: {
                Authorization: `Bearer ${newToken}`,
              },
            });
            console.log('[ProxyServer] Unregistered from main server (after token refresh)');
            return;
          } catch (retryError: any) {
            console.warn('[ProxyServer] Unregistration failed after token refresh:', retryError.response?.data || retryError.message);
          }
        }
      }
      console.warn('[ProxyServer] Unregistration error:', error.response?.data || error.message);
      // Don't throw - unregistration failure shouldn't prevent shutdown
    }
  }

  /**
   * Register mDNS service (Bonjour/Zeroconf)
   */
  private async registerMdnsService(): Promise<void> {
    try {
      // Try to require bonjour package
      let Bonjour: any;
      try {
        Bonjour = require('bonjour');
      } catch (error) {
        console.warn('[ProxyServer] bonjour package not installed, skipping mDNS registration');
        return;
      }

      const bonjour = Bonjour();
      this.mdnsService = bonjour.publish({
        name: `Company OS Proxy - ${this.deviceName}`,
        type: '_companyos-attendance-proxy._tcp',
        port: this.port,
        txt: {
          userId: (await sessionService.getUser())?.id || '',
          deviceName: this.deviceName,
        },
      });

      console.log(`[ProxyServer] ✅ Registered mDNS service: Company OS Proxy - ${this.deviceName}`);
      console.log(`[ProxyServer] 📡 Service type: _companyos-attendance-proxy._tcp`);
      console.log(`[ProxyServer] 📡 Port: ${this.port}`);
      console.log(`[ProxyServer] 📡 IP: ${this.currentIpAddress}`);
      console.log(`[ProxyServer] 💡 Mobile devices on the same WiFi can now discover this proxy`);
    } catch (error: any) {
      console.warn('[ProxyServer] Failed to register mDNS service:', error.message);
      // Don't throw - mDNS is optional
    }
  }

  /**
   * Unregister mDNS service
   */
  private async unregisterMdnsService(): Promise<void> {
    if (this.mdnsService) {
      try {
        this.mdnsService.stop();
        this.mdnsService = null;
        console.log('[ProxyServer] Unregistered mDNS service');
      } catch (error: any) {
        console.warn('[ProxyServer] Failed to unregister mDNS service:', error.message);
      }
    }
  }

  /**
   * Start heartbeat to keep registration alive
   */
  private startHeartbeat(): void {
    // Clear existing interval if any
    this.stopHeartbeat();

    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(async () => {
      try {
        let accessToken = await sessionService.getAccessToken();
        if (!accessToken) {
          console.warn('[ProxyServer] Cannot send heartbeat - no access token');
          return;
        }

        try {
          await this.apiClient.post(
            `${this.mainServerUrl}/proxy/heartbeat`,
            {},
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
        } catch (error: any) {
          // If 401, try to refresh token and retry
          if (error.response?.status === 401) {
            const newToken = await sessionService.refreshAccessToken();
            if (newToken) {
              try {
                await this.apiClient.post(
                  `${this.mainServerUrl}/proxy/heartbeat`,
                  {},
                  {
                    headers: {
                      Authorization: `Bearer ${newToken}`,
                    },
                  }
                );
                return;
              } catch (retryError: any) {
                console.warn('[ProxyServer] Heartbeat failed after token refresh:', retryError.response?.data || retryError.message);
              }
            }
          }
          throw error;
        }
      } catch (error: any) {
        console.warn('[ProxyServer] Heartbeat failed:', error.response?.data || error.message);
      }
    }, 30000); // 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Start periodic re-registration check
   * Checks every 5 minutes to handle IP address changes
   */
  private startReregistrationCheck(): void {
    // Clear existing interval if any
    this.stopReregistrationCheck();

    // Check every 5 minutes
    this.reregistrationInterval = setInterval(async () => {
      if (!this.isRunning) {
        return;
      }

      // Check if IP address has changed
      const newIpAddress = await this.getLocalIPAddress();
      if (newIpAddress && newIpAddress !== this.currentIpAddress) {
        console.log(`[ProxyServer] 🔄 IP address changed from ${this.currentIpAddress} to ${newIpAddress}, re-registering...`);
        this.currentIpAddress = newIpAddress;
        await this.registerWithServer();
      } else if (!this.isRegistered) {
        // If not registered, try to register again
        console.log('[ProxyServer] 🔄 Proxy not registered, attempting registration...');
        await this.registerWithServer();
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Stop periodic re-registration check
   */
  private stopReregistrationCheck(): void {
    if (this.reregistrationInterval) {
      clearInterval(this.reregistrationInterval);
      this.reregistrationInterval = null;
    }
  }

  /**
   * Get server status
   */
  getStatus(): { 
    isRunning: boolean; 
    port: number; 
    connectedClients: number; 
    ipAddress: string | null;
    isRegistered: boolean;
    lastRegistrationAttempt: Date | null;
    lastRegistrationError: string | null;
    mainServerUrl: string;
  } {
    return {
      isRunning: this.isRunning,
      port: this.port,
      connectedClients: this.connectedClients,
      ipAddress: this.currentIpAddress,
      isRegistered: this.isRegistered,
      lastRegistrationAttempt: this.lastRegistrationAttempt,
      lastRegistrationError: this.lastRegistrationError,
      mainServerUrl: this.mainServerUrl,
    };
  }
}

export const proxyServerService = new ProxyServerService();

