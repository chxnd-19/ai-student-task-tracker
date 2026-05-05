/**
 * useClasses — TanStack Query hooks for class/workspace data.
 *
 * Query key design:
 *   ['classes', 'list'] — all classes for the current user
 *
 * All mutations update the cache directly to avoid unnecessary refetches.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// ── Structured query keys ─────────────────────────────────────────────────────
export const classKeys = {
  all:  () => ['classes'],
  list: () => ['classes', 'list'],
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
 * Re-fetches on window focus and reconnect (from QueryClient defaults).
 */
export function useClasses() {
  return useQuery({
    queryKey: classKeys.list(),
    queryFn:  fetchClasses,
  });
}

/**
 * useCreateClass — mutation to create a new class.
 * Appends to cache without a full refetch.
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
 * Adds the new class to the cache; deduplicates by _id.
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
 * Removes from cache immediately (optimistic).
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
