import { QueryClient } from '@tanstack/react-query';

/**
 * Shared QueryClient instance.
 *
 * Configuration:
 * - staleTime: 30s  — data is considered fresh for 30 seconds after fetch
 * - gcTime:    5min — unused cache entries are garbage-collected after 5 minutes
 * - retry: 1        — retry failed requests once before showing error
 * - refetchOnWindowFocus: true — re-fetch when user returns to the tab
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            30 * 1000,   // 30 seconds
      gcTime:               5 * 60 * 1000, // 5 minutes
      retry:                1,
      refetchOnWindowFocus: true,
      refetchOnReconnect:   true,
    },
    mutations: {
      retry: 0,
    },
  },
});
