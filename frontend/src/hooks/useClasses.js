/**
 * useClasses — TanStack Query hooks for class/workspace data.
 *
 * Replaces manual useState + useEffect fetch patterns.
 * All hooks share the same cache key so updates propagate everywhere.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// ── Query keys ────────────────────────────────────────────────────────────────
export const classKeys = {
  all:  ['classes'],
  list: () => [...classKeys.all, 'list'],
};

// ── Fetchers ──────────────────────────────────────────────────────────────────
const fetchClasses = async () => {
  const res = await api.get('/api/classes');
  return res.data.data || [];
};

const createClassFn = async (payload) => {
  const res = await api.post('/api/classes', payload);
  return res.data.data;
};

const joinClassFn = async (code) => {
  const res = await api.post('/api/classes/join', { code });
  return res.data.data;
};

const deleteClassFn = async (classId) => {
  await api.delete(`/api/classes/${classId}`);
  return classId;
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * useClasses — fetch the current user's classes.
 * Automatically re-fetches on window focus and reconnect.
 */
export function useClasses() {
  return useQuery({
    queryKey: classKeys.list(),
    queryFn:  fetchClasses,
  });
}

/**
 * useCreateClass — mutation to create a new class.
 * Invalidates the class list on success.
 */
export function useCreateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createClassFn,
    onSuccess: (newClass) => {
      qc.setQueryData(classKeys.list(), (old = []) => [...old, newClass]);
    },
  });
}

/**
 * useJoinClass — mutation to join a class by code.
 * Adds the new class to the cache without a full refetch.
 */
export function useJoinClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: joinClassFn,
    onSuccess: (joined) => {
      qc.setQueryData(classKeys.list(), (old = []) => {
        if (old.some(c => c._id === joined._id)) return old;
        return [...old, joined];
      });
    },
  });
}

/**
 * useDeleteClass — mutation to delete a class.
 * Removes it from the cache immediately (optimistic-style).
 */
export function useDeleteClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteClassFn,
    onSuccess: (deletedId) => {
      qc.setQueryData(classKeys.list(), (old = []) =>
        old.filter(c => c._id !== deletedId)
      );
    },
  });
}
