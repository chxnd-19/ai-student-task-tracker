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
import { Brain, Clock, Zap, AlertTriangle, CheckCircle2, RefreshCw, Calendar, Ban } from 'lucide-react';
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
  const { data: plan = [], isLoading, isError, refresh, isFetching, generatedAt } =
    useAIPlan(classId);

  const priorityDot = {
    high:   'bg-rose-500',
    medium: 'bg-amber-500',
    low:    'bg-emerald-500',
  };

  const priorityLabel = {
    high:   'High Priority',
    medium: 'Medium Priority',
    low:    'Low Priority',
  };

  // "Generated just now" / "Generated X min ago" — uses server timestamp
  const updatedLabel = generatedAt
    ? (() => {
        const diffMs  = Date.now() - new Date(generatedAt).getTime();
        const diffMin = Math.floor(diffMs / 60000);
        return diffMin < 1 ? 'Generated just now' : `Generated ${diffMin}m ago`;
      })()
    : null;

  // Separate active vs overdue vs closed blocks for rendering
  const activeBlocks  = plan.filter(b => b.type === 'active');
  const overdueBlocks = plan.filter(b => b.type === 'overdue');
  const closedBlocks  = plan.filter(b => b.type === 'closed');

  return (
    <Section
      icon={<Calendar size={14} className="text-blue-400" />}
      title="Today's Study Plan"
      onRefresh={refresh}
      isRefreshing={isFetching}
    >
      {/* Timestamp */}
      {updatedLabel && !isFetching && (
        <p className="text-[10px] text-white/20 mb-2 -mt-1">{updatedLabel}</p>
      )}
      {isFetching && (
        <p className="text-[10px] text-purple-400/60 mb-2 -mt-1 flex items-center gap-1">
          <RefreshCw size={9} className="animate-spin" /> Refreshing…
        </p>
      )}

      {isLoading ? (
        <div className="space-y-1">
          {[...Array(3)].map((_, i) => <SkeletonRow key={i} wide />)}
        </div>
      ) : isError ? (
        <p className="text-xs text-rose-400/70 py-2">Could not load plan.</p>
      ) : plan.length === 0 ? (
        <div className="text-center py-6">
          <Calendar size={22} className="mx-auto text-white/10 mb-2" />
          <p className="text-xs text-white/30 font-medium">No tasks to plan</p>
          <p className="text-[10px] text-white/20 mt-1">
            Add more tasks to get a smarter study plan.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Late-night banner — shown when all active blocks are for tomorrow */}
          {activeBlocks.length > 0 && activeBlocks[0].day === 'tomorrow' && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-3">
              <span className="text-sm">🌙</span>
              <p className="text-[10px] text-blue-300 leading-relaxed">
                It's late. Your plan is scheduled for <span className="font-bold">tomorrow morning</span>.
              </p>
            </div>
          )}

          {/* ── STEP 5: Overdue blocks — red cards, no "Starts now" ── */}
          {overdueBlocks.length > 0 && (
            <>
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-400/70 px-1 pt-1">
                Missed Tasks
              </p>
              {overdueBlocks.map((block, i) => (
                <div
                  key={block.task_id || `overdue-${i}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg border bg-rose-500/10 border-rose-500/30"
                >
                  {/* Overdue icon column */}
                  <div className="shrink-0 text-center min-w-[60px]">
                    <p className="text-[10px] font-bold text-rose-400 leading-tight">OVERDUE</p>
                    <div className="w-px h-3 bg-white/10 mx-auto my-0.5" />
                    <p className="text-[10px] text-amber-300/80 tabular-nums leading-tight font-semibold">
                      {block.suggested_time}
                    </p>
                  </div>

                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityDot[block.priority] ?? 'bg-white/20'}`} />
                      <p className="text-xs font-medium text-rose-200 truncate">{block.title}</p>
                    </div>
                    <p className="text-[10px] text-rose-400/60 truncate">
                      {block.message}
                    </p>
                    {/* Dynamic reason from backend slot-finder */}
                    <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                      ⚠ {block.reason || 'Reschedule suggested'}
                    </span>
                  </div>

                  <ScoreBadge score={block.ai_score} />
                </div>
              ))}

              {activeBlocks.length > 0 && (
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20 px-1 pt-2">
                  Today's Schedule
                </p>
              )}
            </>
          )}

          {/* ── STEP 5: Closed blocks — grey cards, no action ── */}
          {closedBlocks.length > 0 && (
            <>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/20 px-1 pt-1">
                Submission Closed
              </p>
              {closedBlocks.map((block, i) => (
                <div
                  key={block.task_id || `closed-${i}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg border bg-white/[0.02] border-white/5 opacity-50"
                >
                  {/* Closed icon column */}
                  <div className="shrink-0 text-center min-w-[60px]">
                    <Ban size={14} className="mx-auto text-white/20 mb-0.5" />
                    <p className="text-[9px] text-white/20 leading-tight">CLOSED</p>
                  </div>

                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityDot[block.priority] ?? 'bg-white/10'}`} />
                      <p className="text-xs font-medium text-white/30 truncate line-through">{block.title}</p>
                    </div>
                    <p className="text-[10px] text-white/20 truncate">{block.message}</p>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── Active scheduled blocks ── */}
          {activeBlocks.map((block, i) => (
            <div
              key={block.task_id || i}
              className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                block.starts_now
                  ? 'bg-purple-500/10 border-purple-500/30 hover:border-purple-500/50'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              {/* Time column — 12h AM/PM */}
              <div className="shrink-0 text-center min-w-[60px]">
                <p className={`text-[10px] font-bold tabular-nums leading-tight ${
                  block.starts_now ? 'text-purple-400' : 'text-blue-400'
                }`}>{block.start}</p>
                <div className="w-px h-3 bg-white/10 mx-auto my-0.5" />
                <p className="text-[10px] text-white/30 tabular-nums leading-tight">{block.end}</p>
              </div>

              {/* Task info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {block.priority && (
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityDot[block.priority] ?? 'bg-white/20'}`} />
                  )}
                  <p className="text-xs font-medium text-white/80 truncate">{block.title}</p>
                </div>
                <p className="text-[10px] text-white/30 truncate">
                  {priorityLabel[block.priority] ?? 'Medium Priority'} · {block.duration} min
                  {block.subject ? ` · ${block.subject}` : ''}
                </p>
                {/* STEP 6: "Starts now" only when backend confirms it AND type is active */}
                {block.starts_now && block.type !== 'overdue' && (
                  <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                    ▶ Starts now
                  </span>
                )}
                {block.day === 'tomorrow' && (
                  <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                    Tomorrow
                  </span>
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

  // Top 5 already sorted by backend; filter closed tasks, then memoize slice
  const topTasks = useMemo(
    () => rawTasks.filter(t => !t.is_submission_closed && t.type !== 'closed').slice(0, 5),
    [rawTasks]
  );

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
