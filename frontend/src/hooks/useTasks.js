/**
 * useTasks — TanStack Query hooks for task data.
 *
 * Replaces manual useState + useEffect fetch patterns in dashboards.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTasks, createTask, updateTask, deleteTask, fetchTaskSummary } from '../services/taskService';

// ── Query keys ────────────────────────────────────────────────────────────────
export const taskKeys = {
  all:     ['tasks'],
  list:    (params) => [...taskKeys.all, 'list', params],
  summary: (classId) => [...taskKeys.all, 'summary', classId ?? 'all'],
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * useTasks — fetch paginated tasks for a class.
 * @param {object} params — { classId, sort, page, limit }
 * @param {object} options — additional useQuery options
 */
export function useTasks(params = {}, options = {}) {
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn:  () => fetchTasks(params),
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
    select:   (res) => res.data,
    ...options,
  });
}

/**
 * useCreateTask — mutation to create a task.
 * Invalidates the task list for the relevant class.
 */
export function useCreateTask(classId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.list({ classId }) });
    },
  });
}

/**
 * useUpdateTask — mutation to update a task.
 */
export function useUpdateTask(classId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateTask(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.list({ classId }) });
    },
  });
}

/**
 * useDeleteTask — mutation to delete a task.
 * Removes it from the cache immediately.
 */
export function useDeleteTask(classId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTask,
    onSuccess: (_, deletedId) => {
      qc.setQueryData(taskKeys.list({ classId }), (old) => {
        if (!old) return old;
        return { ...old, data: old.data.filter(t => t._id !== deletedId) };
      });
    },
  });
}
