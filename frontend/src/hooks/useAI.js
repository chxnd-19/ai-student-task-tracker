/**
 * useAI — TanStack Query hooks for the AI Study Intelligence module.
 *
 * Query key design (all primitives):
 *   ['ai', 'priority', classId]
 *   ['ai', 'plan',     classId]
 *   ['ai', 'insights', classId]
 *
 * staleTime: 0 for plan (always recompute — plan is time-sensitive)
 *            2 min for priority/insights
 *
 * useAIPlan returns a `refresh` function that calls invalidateQueries
 * so the cache is fully cleared and a fresh fetch runs immediately.
 */
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPriority, getPlan, getInsights } from '../services/aiService';

// ── Query keys ────────────────────────────────────────────────────────────────
export const aiKeys = {
  priority: (classId) => ['ai', 'priority', classId ?? 'all'],
  plan:     (classId) => ['ai', 'plan',     classId ?? 'all'],
  insights: (classId) => ['ai', 'insights', classId ?? 'all'],
};

const AI_STALE_TIME      = 2 * 60 * 1000;  // 2 minutes
const PLAN_STALE_TIME    = 0;               // plan is always stale — recompute on every focus

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
 * useAIPlan — dynamic, time-aware daily study plan.
 *
 * Response shape from backend: { success, data: { generated_at, plan: [...] } }
 * The hook unwraps this and exposes:
 *   data         — the plan array
 *   generatedAt  — ISO timestamp string from the server
 *   refresh      — invalidates cache and forces a fresh fetch
 */
export function useAIPlan(classId, options = {}) {
  const qc = useQueryClient();

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: aiKeys.plan(classId) });
  }, [qc, classId]);

  const query = useQuery({
    queryKey:             aiKeys.plan(classId),
    queryFn:              () => getPlan(classId),
    // Unwrap { generated_at, plan } from data envelope
    select:               (res) => ({
      plan:        res.data?.plan        ?? [],
      generatedAt: res.data?.generated_at ?? null,
    }),
    staleTime:            PLAN_STALE_TIME,
    refetchOnWindowFocus: true,
    enabled:              !!classId,
    ...options,
  });

  return {
    ...query,
    data:        query.data?.plan        ?? [],
    generatedAt: query.data?.generatedAt ?? null,
    refresh,
  };
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
