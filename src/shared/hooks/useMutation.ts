/**
 * useMutation - Generic React Query mutation hook wrapper
 */

import {
  useMutation as useReactQueryMutation,
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';

export interface UseMutationOptions<TData = unknown, TError = Error, TVariables = void>
  extends Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> {
  mutationFn: (variables: TVariables) => Promise<TData>;
}

/**
 * Generic mutation hook with optimistic updates support
 */
export function useMutation<TData = unknown, TError = Error, TVariables = void>(
  options: UseMutationOptions<TData, TError, TVariables>
): UseMutationResult<TData, TError, TVariables> {
  return useReactQueryMutation<TData, TError, TVariables>(options);
}
