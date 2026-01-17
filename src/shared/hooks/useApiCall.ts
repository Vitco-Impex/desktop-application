/**
 * useApiCall - Hook for API calls with React Query integration
 * Wrapper around useMutation for consistent API call handling
 */

import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { extractErrorMessage } from '@/utils/error';

export interface UseApiCallOptions<TData, TVariables> 
  extends Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccessMessage?: string;
  onErrorMessage?: string;
}

/**
 * Hook for API calls with consistent error handling
 */
export function useApiCall<TData = unknown, TVariables = void>(
  options: UseApiCallOptions<TData, TVariables>
) {
  const { mutationFn, onSuccessMessage, onErrorMessage, ...restOptions } = options;

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables: TVariables) => {
      try {
        return await mutationFn(variables);
      } catch (error) {
        const errorMessage = extractErrorMessage(error, onErrorMessage || 'Operation failed');
        throw new Error(errorMessage);
      }
    },
    ...restOptions,
  });
}
