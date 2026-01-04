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
  private mdnsService: any = null; // Bonjour service instance
  private currentIpAddress: string | null = null;
  private deviceName: string = '';

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

    // Get main server URL from API service
    // The API service gets it from the renderer process
    try {
      const { BrowserWindow } = require('electron');
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        const url = await mainWindow.webContents.executeJavaScript(`
          return window.__API_BASE_URL__ || 'http://127.0.0.1:3001/api/v1';
        `);
        // Replace localhost with 127.0.0.1 to force IPv4
        this.mainServerUrl = url.replace(/localhost/g, '127.0.0.1');
      } else {
        this.mainServerUrl = 'http://127.0.0.1:3001/api/v1';
      }
    } catch (error) {
      console.warn('[ProxyServer] Failed to get API URL, using default:', error);
      this.mainServerUrl = 'http://127.0.0.1:3001/api/v1';
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
          // Register with main server
          await this.registerWithServer();
          
          // Register mDNS service
          await this.registerMdnsService();
          
          // Start heartbeat
          this.startHeartbeat();
          
          console.log(`[ProxyServer] Started on ${this.currentIpAddress}:${this.port}`);
          resolve({ port: this.port, ipAddress: this.currentIpAddress });
        } catch (error: any) {
          console.error('[ProxyServer] Failed to register proxy:', error);
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
    
    // Unregister mDNS service
    await this.unregisterMdnsService();
    
    // Unregister from main server
    try {
      await this.unregisterFromServer();
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
   * Non-blocking - proxy will continue even if registration fails
   */
  private async registerWithServer(): Promise<void> {
    try {
      const user = await sessionService.getUser();
      if (!user || !user.id) {
        console.warn('[ProxyServer] Cannot register - user not authenticated');
        return;
      }

      // Get fresh session to ensure we have a valid token
      let session = await sessionService.getSessionFromRenderer();
      if (!session.isValid || !session.accessToken) {
        console.warn('[ProxyServer] Cannot register - no valid session');
        return;
      }

      let accessToken = session.accessToken;

      // Try to register with current token
      try {
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
          console.log('[ProxyServer] ✅ Registered with main server');
          return;
        } else {
          console.warn('[ProxyServer] Registration returned error:', response.data.message);
        }
      } catch (error: any) {
        // If 401, try to refresh token and retry
        if (error.response?.status === 401) {
          console.log('[ProxyServer] Token expired, attempting to refresh...');
          const newToken = await sessionService.refreshAccessToken();
          
          if (newToken) {
            console.log('[ProxyServer] Token refreshed, retrying registration...');
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
                console.log('[ProxyServer] ✅ Registered with main server (after token refresh)');
                return;
              }
            } catch (retryError: any) {
              console.warn('[ProxyServer] ⚠️ Registration failed after token refresh:', retryError.response?.data?.message || retryError.message);
            }
          } else {
            console.warn('[ProxyServer] ⚠️ Failed to refresh token. Proxy will still work via mDNS discovery.');
          }
        }
        
        // Don't throw - allow proxy to run even if registration fails
        // mDNS discovery will still work
        console.warn('[ProxyServer] ⚠️ Registration failed:', error.response?.data?.message || error.message, '- Proxy will still work via mDNS discovery.');
      }
    } catch (error: any) {
      // Don't throw - allow proxy to run even if registration fails
      // mDNS discovery will still work
      console.warn('[ProxyServer] ⚠️ Registration error:', error.message, '- Proxy will still work via mDNS discovery.');
    }
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
        name: `Vitco Proxy - ${this.deviceName}`,
        type: '_vitco-attendance-proxy._tcp',
        port: this.port,
        txt: {
          userId: (await sessionService.getUser())?.id || '',
          deviceName: this.deviceName,
        },
      });

      console.log(`[ProxyServer] ✅ Registered mDNS service: Vitco Proxy - ${this.deviceName}`);
      console.log(`[ProxyServer] 📡 Service type: _vitco-attendance-proxy._tcp`);
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
   * Get server status
   */
  getStatus(): { isRunning: boolean; port: number; connectedClients: number; ipAddress: string | null } {
    return {
      isRunning: this.isRunning,
      port: this.port,
      connectedClients: this.connectedClients,
      ipAddress: this.currentIpAddress,
    };
  }
}

export const proxyServerService = new ProxyServerService();

