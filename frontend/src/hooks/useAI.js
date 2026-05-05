/**
 * useAI — TanStack Query hooks for the AI Study Intelligence module.
 *
 * Query key design (all primitives):
 *   ['ai', 'priority', classId]
 *   ['ai', 'plan',     classId]
 *   ['ai', 'insights', classId]
 *
 * staleTime: 2 minutes — AI scores don't change second-to-second.
 * enabled:   only fetches when classId is available.
 */
import { useQuery } from '@tanstack/react-query';
import { getPriority, getPlan, getInsights } from '../services/aiService';

// ── Query keys ────────────────────────────────────────────────────────────────
export const aiKeys = {
  priority: (classId) => ['ai', 'priority', classId ?? 'all'],
  plan:     (classId) => ['ai', 'plan',     classId ?? 'all'],
  insights: (classId) => ['ai', 'insights', classId ?? 'all'],
};

const AI_STALE_TIME = 2 * 60 * 1000; // 2 minutes

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * useAIPriority — tasks with ai_score, sorted highest first.
 */
export function useAIPriority(classId, options = {}) {
  return useQuery({
    queryKey:  aiKeys.priority(classId),
    queryFn:   () => getPriority(classId),
    select:    (res) => res.data ?? [],
    staleTime: AI_STALE_TIME,
    enabled:   !!classId,
    ...options,
  });
}

/**
 * useAIPlan — daily study plan time blocks.
 */
export function useAIPlan(classId, options = {}) {
  return useQuery({
    queryKey:  aiKeys.plan(classId),
    queryFn:   () => getPlan(classId),
    select:    (res) => res.data ?? [],
    staleTime: AI_STALE_TIME,
    enabled:   !!classId,
    ...options,
  });
}

/**
 * useAIInsights — insight and warning strings.
 */
export function useAIInsights(classId, options = {}) {
  return useQuery({
    queryKey:  aiKeys.insights(classId),
    queryFn:   () => getInsights(classId),
    select:    (res) => res.data ?? [],
    staleTime: AI_STALE_TIME,
    enabled:   !!classId,
    ...options,
  });
}
