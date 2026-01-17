/**
 * useAsyncOperation - Generic hook for async operations with loading/error states
 * Reduces boilerplate for components that need to handle async operations
 */

import { useState, useCallback } from 'react';
import { extractErrorMessage } from '@/utils/error';

export interface UseAsyncOperationOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  defaultErrorMessage?: string;
}

export interface UseAsyncOperationReturn<T> {
  execute: (operation: () => Promise<T>) => Promise<T | undefined>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Generic hook for async operations
 */
export function useAsyncOperation<T = void>(
  options: UseAsyncOperationOptions<T> = {}
): UseAsyncOperationReturn<T> {
  const { onSuccess, onError, defaultErrorMessage = 'An error occurred' } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (operation: () => Promise<T>): Promise<T | undefined> => {
      setLoading(true);
      setError(null);

      try {
        const result = await operation();
        onSuccess?.(result);
        return result;
      } catch (err) {
        const errorMessage = extractErrorMessage(err, defaultErrorMessage);
        setError(errorMessage);
        onError?.(errorMessage);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [onSuccess, onError, defaultErrorMessage]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { execute, loading, error, clearError };
}
