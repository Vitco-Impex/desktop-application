/**
 * useDataQuery - Generic React Query hook wrapper
 */

import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';

export interface UseDataQueryOptions<TData = unknown, TError = Error> 
  extends Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> {
  queryKey: (string | number | boolean | null | undefined)[];
  queryFn: () => Promise<TData>;
}

/**
 * Generic query hook with default configuration
 * - Default stale time: 5 minutes
 * - Default cache time: 10 minutes
 * - Retry logic with exponential backoff
 */
export function useDataQuery<TData = unknown, TError = Error>(
  options: UseDataQueryOptions<TData, TError>
): UseQueryResult<TData, TError> {
  const {
    staleTime = 5 * 60 * 1000, // 5 minutes
    gcTime = 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry = 3,
    retryDelay = (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    ...restOptions
  } = options;

  return useQuery<TData, TError>({
    staleTime,
    gcTime,
    retry,
    retryDelay,
    ...restOptions,
  });
}
