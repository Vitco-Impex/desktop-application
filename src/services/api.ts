/**
 * API Service - Axios instance configuration
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '@/config';
import { authStore } from '@/store/authStore';

class ApiService {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: config.api.baseURL,
      timeout: config.api.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor - Add auth token
    this.instance.interceptors.request.use(
      (config) => {
        const token = authStore.getState().accessToken;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        // For FormData, don't set Content-Type - browser will set it with boundary
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type'];
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - Handle errors and token refresh
    this.instance.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          const { refreshToken } = authStore.getState();

          if (refreshToken) {
            try {
              // Try to refresh token
              const { authService } = await import('./auth.service');
              const tokenData = await authService.refreshToken(refreshToken);

              // Update store with new tokens
              authStore.getState().login(
                authStore.getState().user!,
                tokenData.accessToken,
                tokenData.refreshToken,
                tokenData.sessionId
              );

              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${tokenData.accessToken}`;
              return this.instance(originalRequest);
            } catch (refreshError: any) {
              // Refresh failed, logout user
              console.error('[ApiService] Token refresh failed:', {
                message: refreshError?.message,
                status: refreshError?.response?.status,
                data: refreshError?.response?.data,
              });
              authStore.getState().logout();
              return Promise.reject(refreshError);
            }
          } else {
            // No refresh token, logout
            authStore.getState().logout();
          }
        }

        return Promise.reject(error);
      }
    );
  }

  public getInstance(): AxiosInstance {
    return this.instance;
  }
}

export const apiService = new ApiService();
export const api = apiService.getInstance();

