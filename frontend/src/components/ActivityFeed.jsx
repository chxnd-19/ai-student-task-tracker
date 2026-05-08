/**
 * ActivityFeed — real-time activity log viewer.
 *
 * Query key: ['activity', userId, limit] — scoped per user.
 * Real-time updates arrive via useSocket → TanStack Query cache prepend.
 * Each row shows: avatar initial · userName · action · subtitle · time ago
 */
import React, { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, RefreshCw, LogIn, UserPlus, BookOpen,
  CheckCircle2, Trash2, Edit3, Users, Key, Award, MessageSquare,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { activityKey } from '../hooks/useSocket';

// ── Fetcher ───────────────────────────────────────────────────────────────────
const fetchActivityLogs = async ({ page = 1, limit = 10 } = {}) => {
  const res = await api.get('/api/activity', { params: { page, limit } });
  return res.data;
};

// ── Action metadata ───────────────────────────────────────────────────────────
const ACTION_META = {
  'auth.login':        { label: 'logged in',                    icon: LogIn,        color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
  'auth.signup':       { label: 'signed up',                    icon: UserPlus,     color: 'text-purple-400',  bg: 'bg-purple-500/10'  },
  'auth.forgot_password': { label: 'requested a password reset', icon: Key,         color: 'text-amber-400',   bg: 'bg-amber-500/10'   },
  'auth.password_reset':  { label: 'reset their password',       icon: Key,         color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  'task.create':       { label: 'created an assignment',         icon: BookOpen,     color: 'text-purple-400',  bg: 'bg-purple-500/10'  },
  'task_created':      { label: 'posted a new assignment',       icon: BookOpen,     color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
  'task.update':       { label: 'updated an assignment',         icon: Edit3,        color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
  'task.delete':       { label: 'deleted an assignment',         icon: Trash2,       color: 'text-rose-400',    bg: 'bg-rose-500/10'    },
  'submission.submit': { label: 'submitted an assignment',       icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  'submission':        { label: 'submitted an assignment',       icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  'graded':            { label: 'graded your submission',        icon: Award,        color: 'text-amber-400',   bg: 'bg-amber-500/10'   },
  'feedback':          { label: 'left feedback on your work',    icon: MessageSquare,color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
  'class.create':      { label: 'created a class',               icon: Users,        color: 'text-purple-400',  bg: 'bg-purple-500/10'  },
  'class.join':        { label: 'joined a class',                icon: Users,        color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
};

const DEFAULT_META = { label: 'performed an action', icon: Activity, color: 'text-white/40', bg: 'bg-white/5' };

function getActionMeta(action) {
  return ACTION_META[action] ?? DEFAULT_META;
}

/** Extract userName from wherever it might live in the log. */
function getUserName(log) {
  return (
    log.userName ||
    log.metadata?.userName ||
    log.detail?.userName ||
    null
  );
}

/** Build a subtitle from structured metadata/detail fields (task title, class name, score). */
function buildSubtitle(log) {
  const meta = log.metadata || log.detail || {};
  if (!meta || Object.keys(meta).length === 0) return null;
  const parts = [];
  if (meta.taskTitle)  parts.push(meta.taskTitle);
  if (meta.className)  parts.push(meta.className);
  if (meta.score !== undefined && meta.score !== null)
    parts.push(`Score: ${meta.score}/100`);
  if (parts.length > 0) return parts.join(' · ');
  return null;
}

function timeAgo(dateStr) {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ── Single log row ────────────────────────────────────────────────────────────
const LogRow = memo(function LogRow({ log }) {
  const meta     = getActionMeta(log.action);
  const Icon     = meta.icon;
  const userName = getUserName(log);
  const subtitle = buildSubtitle(log);

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
      {/* Icon avatar */}
      <div className={`w-7 h-7 rounded-full ${meta.bg} border border-white/10 flex items-center justify-center shrink-0 mt-0.5`}>
        <Icon size={12} className={meta.color} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Primary line: "Alex created an assignment" */}
        <p className="text-xs text-white/70 leading-relaxed">
          {userName ? (
            <>
              <span className="font-semibold text-white/90">{userName}</span>
              {' '}
              <span>{meta.label}</span>
            </>
          ) : (
            <span className="capitalize">{meta.label}</span>
          )}
        </p>
        {/* Subtitle: task title or class name */}
        {subtitle && (
          <p className="text-[10px] text-white/30 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>

      {/* Time */}
      <span className="text-[10px] text-white/20 shrink-0 mt-0.5 whitespace-nowrap">
        {timeAgo(log.timestamp || log.createdAt)}
      </span>
    </div>
  );
});

// ── Main component ────────────────────────────────────────────────────────────
function ActivityFeed({ limit = 10, showTitle = true }) {
  const { user } = useAuth();
  const userId   = user?.id ?? null;

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey:  activityKey(userId, limit),
    queryFn:   () => fetchActivityLogs({ limit }),
    staleTime: 10 * 1000,   // 10 seconds — activity feed should feel fresh
    enabled:   !!userId,
  });

  const logs = data?.data ?? [];

  return (
    <div>
      {showTitle && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Activity size={15} className="text-purple-400" />
            Live Activity
          </h3>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 rounded-lg text-white/20 hover:text-white hover:bg-white/5 transition-all disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="animate-pulse bg-white/10 rounded-full w-7 h-7 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="animate-pulse bg-white/10 rounded h-2.5 w-3/4" />
                <div className="animate-pulse bg-white/5 rounded h-2 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <p className="text-xs text-white/30 text-center py-4">Could not load activity.</p>
      ) : logs.length === 0 ? (
        <div className="text-center py-6">
          <Activity size={24} className="mx-auto text-white/10 mb-2" />
          <p className="text-xs text-white/30 font-medium">No activity yet</p>
          <p className="text-[10px] text-white/20 mt-1 max-w-[180px] mx-auto leading-relaxed">
            Start by completing or submitting a task.
          </p>
        </div>
      ) : (
        <div>
          {logs.map(log => (
            <LogRow key={log._id ?? log.timestamp} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(ActivityFeed);
