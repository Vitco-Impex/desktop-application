/**
 * Authentication Service
 */

import { api } from './api';
import { LoginRequest, LoginResponse, RefreshTokenResponse } from '@/types';

export class AuthService {
  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await api.post<{ success: boolean; data: LoginResponse; message: string }>('/auth/login', credentials);
      const loginData = response.data.data;

      if (!loginData || !loginData.user || !loginData.accessToken) {
        throw new Error('Invalid response format from server');
      }

      return loginData;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const response = await api.post<{ success: boolean; data: RefreshTokenResponse; message: string }>('/auth/refresh', {
      refreshToken,
    });
    const tokenData = response.data.data;
    if (!tokenData) {
      throw new Error('Invalid response format from server');
    }
    return tokenData;
  }

  /**
   * Get current user
   */
  async getCurrentUser() {
    const response = await api.get<{ success: boolean; data: any }>('/auth/me');
    // Extract data from wrapped response
    return response.data.data || response.data;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error: any) {
      // Don't throw - logout should always succeed locally even if server call fails
      throw error;
    }
  }
}

export const authService = new AuthService();

