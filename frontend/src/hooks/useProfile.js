import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProfile, updateProfile } from '../services/profileService';

/**
 * useProfile — Query hook to fetch the current user's profile and role.
 */
export const useProfile = () => {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await getProfile();
      return res.data;
    },
    // Keep data fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * useUpdateProfile — Mutation hook to update the current user's profile.
 * On success: optimistically updates the cache then invalidates to trigger
 * a background refetch for full consistency.
 */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await updateProfile(payload);
      return res.data;   // { role, profile }
    },
    onSuccess: (data) => {
      // Optimistically patch the cached GET response so the UI updates
      // immediately without waiting for the refetch round-trip.
      queryClient.setQueryData(['profile'], (old) => {
        if (!old) return old;
        return {
          ...old,
          profile: data?.profile ?? old.profile,
        };
      });
      // Then invalidate to ensure full consistency with MongoDB
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};
