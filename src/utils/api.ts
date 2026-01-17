/**
 * API Response Utilities
 * Consistent handling of API responses
 */

import { AxiosResponse } from 'axios';

/**
 * Standard API response format from backend
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Extract data from API response
 * Handles both wrapped { success, data } and direct data responses
 */
export function extractApiData<T>(response: AxiosResponse<ApiResponse<T> | T>): T {
  const responseData = response.data;
  
  // Check if response is wrapped in { success, data } format
  if (responseData && typeof responseData === 'object' && 'data' in responseData) {
    const wrapped = responseData as ApiResponse<T>;
    if (wrapped.success !== undefined && wrapped.data !== undefined) {
      return wrapped.data;
    }
  }
  
  // Return direct data
  return responseData as T;
}

/**
 * Create consistent API error
 */
export function createApiError(message: string, status?: number, data?: any): Error {
  const error = new Error(message) as any;
  error.status = status;
  error.data = data;
  return error;
}
