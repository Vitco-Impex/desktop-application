/**
 * Session Service - Session validation for auto attendance
 * Reads session from renderer process via IPC or from secure storage
 */

import { BrowserWindow } from 'electron';

// Local type definitions
interface SessionState {
  isValid: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  accessToken?: string;
  refreshToken?: string;
}

class SessionService {
  private mainWindow: BrowserWindow | null = null;

  /**
   * Set main window reference for IPC communication
   */
  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  /**
   * Get session state from renderer process via IPC
   */
  async getSessionFromRenderer(): Promise<SessionState> {
    if (!this.mainWindow) {
      return { isValid: false };
    }

    try {
      // Send IPC message to renderer to get session
      const session = await this.mainWindow.webContents.executeJavaScript(`
        (() => {
          try {
            const authData = localStorage.getItem('auth-storage');
            if (!authData) {
              return { isValid: false };
            }
            
            const parsed = JSON.parse(authData);
            const state = parsed.state || parsed;
            
            if (!state.refreshToken || !state.user) {
              return { isValid: false };
            }
            
            return {
              isValid: true,
              user: state.user,
              accessToken: state.accessToken,
              refreshToken: state.refreshToken,
            };
          } catch (error) {
            console.error('Failed to read session:', error);
            return { isValid: false };
          }
        })()
      `);

      return session as SessionState;
    } catch (error) {
      console.error('[SessionService] Failed to get session from renderer:', error);
      return { isValid: false };
    }
  }

  /**
   * Validate session
   * Checks if session exists and has required fields
   */
  async validateSession(): Promise<SessionState> {
    // Try to get session from renderer
    const session = await this.getSessionFromRenderer();

    if (!session.isValid) {
      return { isValid: false };
    }

    // Basic validation - check if required fields exist
    if (!session.user || !session.refreshToken) {
      return { isValid: false };
    }

    // Additional validation could be done here:
    // - Check token expiration
    // - Verify with backend
    // For now, we rely on backend validation during API calls

    return session;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.validateSession();
    return session.isValid;
  }

  /**
   * Get access token for API calls
   */
  async getAccessToken(): Promise<string | null> {
    const session = await this.validateSession();
    return session.accessToken || null;
  }

  /**
   * Get user info
   */
  async getUser(): Promise<SessionState['user']> {
    const session = await this.validateSession();
    return session.user;
  }

  /**
   * Refresh access token using refresh token
   * Makes API call from main process and updates renderer's localStorage
   */
  async refreshAccessToken(): Promise<string | null> {
    const session = await this.getSessionFromRenderer();
    
    if (!session.isValid || !session.refreshToken) {
      return null;
    }

    try {
      if (!this.mainWindow) {
        return null;
      }

      // Get API base URL from renderer
      const apiBaseUrl = await this.mainWindow.webContents.executeJavaScript(`
        (() => {
          try {
            return window.__API_BASE_URL__ || 'http://127.0.0.1:3001/api/v1';
          } catch (error) {
            return 'http://127.0.0.1:3001/api/v1';
          }
        })()
      `);

      // Use axios from main process to call refresh endpoint
      const axios = require('axios');
      const http = require('http');
      const https = require('https');
      
      const response = await axios.post(
        `${apiBaseUrl}/auth/refresh`,
        { refreshToken: session.refreshToken },
        {
          timeout: 10000,
          httpAgent: new http.Agent({ family: 4 }),
          httpsAgent: new https.Agent({ family: 4 }),
        }
      );

      if (response.data?.success && response.data?.data?.accessToken) {
        const newAccessToken = response.data.data.accessToken;
        const newRefreshToken = response.data.data.refreshToken || session.refreshToken;

        // Update localStorage in renderer process
        await this.mainWindow.webContents.executeJavaScript(`
          (() => {
            try {
              const authData = localStorage.getItem('auth-storage');
              if (authData) {
                const parsed = JSON.parse(authData);
                const state = parsed.state || parsed;
                const updatedState = {
                  ...state,
                  accessToken: ${JSON.stringify(newAccessToken)},
                  refreshToken: ${JSON.stringify(newRefreshToken)},
                };
                localStorage.setItem('auth-storage', JSON.stringify({
                  state: updatedState,
                  version: parsed.version || 0,
                }));
              }
            } catch (error) {
              console.error('Failed to update localStorage:', error);
            }
          })()
        `);
        
        return newAccessToken;
      }

      return null;
    } catch (error: any) {
      console.error('[SessionService] Failed to refresh access token:', error.response?.data || error.message);
      return null;
    }
  }
}

export const sessionService = new SessionService();

