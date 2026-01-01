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
}

export const sessionService = new SessionService();

