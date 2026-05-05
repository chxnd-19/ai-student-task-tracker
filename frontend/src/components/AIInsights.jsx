/**
 * AIInsights — AI Study Intelligence panel.
 *
 * Renders three sections:
 *   1. Insights   — warning/encouragement strings from the backend
 *   2. Daily Plan — time-blocked study schedule
 *   3. Suggested  — top tasks sorted by AI score
 *
 * All data is fetched via TanStack Query hooks (useAIInsights, useAIPlan,
 * useAIPriority). Each section has its own loading skeleton, error state,
 * and empty state. The component is wrapped in React.memo.
 */
import React, { memo, useMemo } from 'react';
import { Brain, Clock, Zap, AlertTriangle, CheckCircle2, RefreshCw, Calendar } from 'lucide-react';
import { useAIInsights, useAIPlan, useAIPriority } from '../hooks/useAI';

// ── Score badge ───────────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
  const pct   = Math.min(100, Math.round((score / 10) * 100));
  const color = score >= 7 ? 'text-rose-400'
              : score >= 4 ? 'text-amber-400'
              :              'text-emerald-400';
  return (
    <span className={`text-xs font-bold tabular-nums ${color}`}>
      {score.toFixed(1)}
    </span>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow({ wide = false }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="animate-pulse bg-white/10 rounded-full w-6 h-6 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className={`animate-pulse bg-white/10 rounded h-2.5 ${wide ? 'w-3/4' : 'w-1/2'}`} />
        <div className="animate-pulse bg-white/5 rounded h-2 w-1/3" />
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ icon, title, children, onRefresh, isRefreshing }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-white/80">
          {icon}
          {title}
        </h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg text-white/20 hover:text-white hover:bg-white/5 transition-all disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Insights section ──────────────────────────────────────────────────────────
const InsightsSection = memo(function InsightsSection({ classId }) {
  const { data: insights = [], isLoading, isError, refetch, isFetching } =
    useAIInsights(classId);

  return (
    <Section
      icon={<Zap size={14} className="text-amber-400" />}
      title="Insights"
      onRefresh={refetch}
      isRefreshing={isFetching}
    >
      {isLoading ? (
        <div className="space-y-1">
          {[...Array(2)].map((_, i) => <SkeletonRow key={i} wide />)}
        </div>
      ) : isError ? (
        <p className="text-xs text-rose-400/70 py-2">Could not load insights.</p>
      ) : insights.length === 0 ? (
        <p className="text-xs text-white/30 py-2">No insights available.</p>
      ) : (
        <ul className="space-y-2">
          {insights.map((msg, i) => {
            const isWarning = msg.startsWith('⚠️') || msg.startsWith('🔥');
            return (
              <li
                key={i}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg text-xs leading-relaxed ${
                  isWarning
                    ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                }`}
              >
                {isWarning
                  ? <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                  : <CheckCircle2  size={13} className="shrink-0 mt-0.5" />
                }
                {msg}
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
});

// ── Daily plan section ────────────────────────────────────────────────────────
const DailyPlanSection = memo(function DailyPlanSection({ classId }) {
  const { data: plan = [], isLoading, isError, refetch, isFetching } =
    useAIPlan(classId);

  return (
    <Section
      icon={<Calendar size={14} className="text-blue-400" />}
      title="Today's Study Plan"
      onRefresh={refetch}
      isRefreshing={isFetching}
    >
      {isLoading ? (
        <div className="space-y-1">
          {[...Array(3)].map((_, i) => <SkeletonRow key={i} wide />)}
        </div>
      ) : isError ? (
        <p className="text-xs text-rose-400/70 py-2">Could not load plan.</p>
      ) : plan.length === 0 ? (
        <p className="text-xs text-white/30 py-2">No tasks to plan. You're all caught up!</p>
      ) : (
        <div className="space-y-2">
          {plan.map((block, i) => (
            <div
              key={block.task_id || i}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all"
            >
              {/* Time column */}
              <div className="shrink-0 text-center min-w-[52px]">
                <p className="text-[10px] font-bold text-blue-400 tabular-nums">{block.start}</p>
                <div className="w-px h-3 bg-white/10 mx-auto my-0.5" />
                <p className="text-[10px] text-white/30 tabular-nums">{block.end}</p>
              </div>
              {/* Task info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white/80 truncate">{block.title}</p>
                {block.subject && (
                  <p className="text-[10px] text-white/30 truncate">{block.subject}</p>
                )}
              </div>
              <ScoreBadge score={block.ai_score} />
            </div>
          ))}
        </div>
      )}
    </Section>
  );
});

// ── Suggested tasks section ───────────────────────────────────────────────────
const SuggestedSection = memo(function SuggestedSection({ classId }) {
  const { data: rawTasks = [], isLoading, isError, refetch, isFetching } =
    useAIPriority(classId);

  // Top 5 already sorted by backend; memoize slice for safety
  const topTasks = useMemo(() => rawTasks.slice(0, 5), [rawTasks]);

  const priorityColors = {
    high:   'text-rose-400 bg-rose-500/10 border-rose-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    low:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  };

  return (
    <Section
      icon={<Brain size={14} className="text-purple-400" />}
      title="Suggested Tasks"
      onRefresh={refetch}
      isRefreshing={isFetching}
    >
      {isLoading ? (
        <div className="space-y-1">
          {[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : isError ? (
        <p className="text-xs text-rose-400/70 py-2">Could not load suggestions.</p>
      ) : topTasks.length === 0 ? (
        <p className="text-xs text-white/30 py-2">No tasks to suggest.</p>
      ) : (
        <div className="space-y-2">
          {topTasks.map((task, i) => {
            const pri = (task.priority || 'medium').toLowerCase();
            return (
              <div
                key={task._id || task.id || i}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all"
              >
                {/* Rank */}
                <span className="text-[10px] font-black text-white/20 w-4 shrink-0 text-center">
                  {i + 1}
                </span>
                {/* Task info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/80 truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {task.dueDate && (
                      <span className="text-[10px] text-white/30 flex items-center gap-1">
                        <Clock size={9} />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                {/* Priority badge */}
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase tracking-wide shrink-0 ${priorityColors[pri] ?? priorityColors.medium}`}>
                  {pri}
                </span>
                {/* AI score */}
                <ScoreBadge score={task.ai_score ?? 0} />
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
});

// ── Main component ────────────────────────────────────────────────────────────
function AIInsights({ classId }) {
  if (!classId) return null;

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-white/5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/20 flex items-center justify-center">
          <Brain size={14} className="text-purple-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">AI Study Intelligence</h2>
          <p className="text-[10px] text-white/30">Personalised recommendations</p>
        </div>
      </div>

      <InsightsSection  classId={classId} />
      <div className="border-t border-white/5" />
      <DailyPlanSection classId={classId} />
      <div className="border-t border-white/5" />
      <SuggestedSection classId={classId} />
    </div>
  );
}

export default memo(AIInsights);
