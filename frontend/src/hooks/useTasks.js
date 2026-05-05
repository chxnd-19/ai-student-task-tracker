/**
 * useTasks — TanStack Query hooks for task data.
 *
 * Query key design:
 *   ['tasks', 'list', classId, page, sort, limit]
 *   ['tasks', 'summary', classId]
 *
 * Keys use primitive values (not objects) so React Query can compare them
 * correctly by value. Mutations invalidate only the relevant class slice.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchTasks, createTask, updateTask, deleteTask, fetchTaskSummary,
} from '../services/taskService';

// ── Structured query keys (all primitives — no object params) ─────────────────
export const taskKeys = {
  all:     () => ['tasks'],
  lists:   () => ['tasks', 'list'],
  list:    (classId, page = 1, sort = null, limit = 20) =>
             ['tasks', 'list', classId ?? 'all', page, sort ?? 'default', limit],
  summary: (classId) => ['tasks', 'summary', classId ?? 'all'],
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * useTasks — fetch paginated tasks for a class.
 * @param {{ classId, page, sort, limit }} params
 * @param {object} options — additional useQuery options
 */
export function useTasks({ classId, page = 1, sort = null, limit = 20 } = {}, options = {}) {
  return useQuery({
    queryKey: taskKeys.list(classId, page, sort, limit),
    queryFn:  () => fetchTasks({ classId, page, sort, limit }),
    ...options,
  });
}

/**
 * useTaskSummary — fetch task status counts for a student.
 * @param {string|null} classId
 */
export function useTaskSummary(classId, options = {}) {
  return useQuery({
    queryKey: taskKeys.summary(classId),
    queryFn:  () => fetchTaskSummary(classId),
    select:   (res) => res.data ?? { pending: 0, submitted: 0, overdue: 0, late: 0 },
    ...options,
  });
}

/**
 * useCreateTask — mutation to create a task.
 * Invalidates all task lists for the relevant class.
 */
export function useCreateTask(classId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      // Invalidate all pages/sorts for this class
      qc.invalidateQueries({ queryKey: ['tasks', 'list', classId ?? 'all'] });
      qc.invalidateQueries({ queryKey: taskKeys.summary(classId) });
    },
  });
}

/**
 * useUpdateTask — mutation to update a task.
 * Invalidates the task list for the relevant class.
 */
export function useUpdateTask(classId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateTask(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', 'list', classId ?? 'all'] });
    },
  });
}

/**
 * useDeleteTask — mutation to delete a task.
 * Optimistically removes from cache, then invalidates to sync.
 */
export function useDeleteTask(classId, page = 1) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTask,
    onSuccess: (_, deletedId) => {
      // Optimistic removal from current page
      qc.setQueryData(taskKeys.list(classId, page), (old) => {
        if (!old) return old;
        return { ...old, data: old.data.filter(t => t._id !== deletedId) };
      });
      // Invalidate all pages to keep counts accurate
      qc.invalidateQueries({ queryKey: ['tasks', 'list', classId ?? 'all'] });
      qc.invalidateQueries({ queryKey: taskKeys.summary(classId) });
    },
  });
}
