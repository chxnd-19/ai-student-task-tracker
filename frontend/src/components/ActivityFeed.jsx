/**
 * ActivityFeed — real-time activity log viewer.
 *
 * Query key: ['activity', userId, limit]
 * Scoped per user so each user's feed is cached independently.
 * Renders structured detail metadata (task title, class name, email)
 * alongside human-readable action labels.
 */
import React, { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, RefreshCw, LogIn, UserPlus, BookOpen,
  CheckCircle2, Trash2, Edit3, Users, Key,
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
  'auth.login':              { label: 'Logged in',               icon: LogIn,        color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
  'auth.signup':             { label: 'Signed up',               icon: UserPlus,     color: 'text-purple-400',  bg: 'bg-purple-500/10'  },
  'auth.forgot_password':    { label: 'Requested password reset', icon: Key,          color: 'text-amber-400',   bg: 'bg-amber-500/10'   },
  'auth.password_reset':     { label: 'Reset password',           icon: Key,          color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  'task.create':             { label: 'Created a task',           icon: BookOpen,     color: 'text-purple-400',  bg: 'bg-purple-500/10'  },
  'task.update':             { label: 'Updated a task',           icon: Edit3,        color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
  'task.delete':             { label: 'Deleted a task',           icon: Trash2,       color: 'text-rose-400',    bg: 'bg-rose-500/10'    },
  'submission.submit':       { label: 'Submitted an assignment',  icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  'class.create':            { label: 'Created a class',          icon: Users,        color: 'text-purple-400',  bg: 'bg-purple-500/10'  },
  'class.join':              { label: 'Joined a class',           icon: Users,        color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
};

const DEFAULT_META = { label: null, icon: Activity, color: 'text-white/40', bg: 'bg-white/5' };

function getActionMeta(action) {
  return ACTION_META[action] ?? DEFAULT_META;
}

/**
 * Build a human-readable subtitle from structured detail metadata.
 * Prefers named fields (taskTitle, className, email) over raw key:value.
 */
function buildSubtitle(detail = {}) {
  if (!detail || Object.keys(detail).length === 0) return null;

  const parts = [];
  if (detail.taskTitle)  parts.push(detail.taskTitle);
  if (detail.className)  parts.push(detail.className);
  if (detail.email)      parts.push(detail.email);
  if (detail.role)       parts.push(detail.role);

  if (parts.length > 0) return parts.join(' · ');

  // Fallback: render remaining keys, skip internal ones
  const skip = new Set(['ip', 'reason', 'expected_role', 'actual_role']);
  return Object.entries(detail)
    .filter(([k]) => !skip.has(k))
    .map(([, v]) => String(v))
    .join(' · ') || null;
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
  const label    = meta.label ?? log.action.replace(/\./g, ' → ');
  const subtitle = buildSubtitle(log.detail);

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
      <div className={`w-7 h-7 rounded-full ${meta.bg} border border-white/10 flex items-center justify-center shrink-0 mt-0.5`}>
        <Icon size={12} className={meta.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/70 leading-relaxed">{label}</p>
        {subtitle && (
          <p className="text-[10px] text-white/30 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      <span className="text-[10px] text-white/20 shrink-0 mt-0.5 whitespace-nowrap">
        {timeAgo(log.createdAt)}
      </span>
    </div>
  );
});

// ── Main component ────────────────────────────────────────────────────────────
function ActivityFeed({ limit = 10, showTitle = true }) {
  const { user } = useAuth();
  const userId   = user?.id ?? null;

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: activityKey(userId, limit),   // Step 5: user-scoped key
    queryFn:  () => fetchActivityLogs({ limit }),
    staleTime: 60 * 1000,
    enabled:   !!userId,                    // only fetch when authenticated
  });

  const logs = data?.data ?? [];

  return (
    <div>
      {showTitle && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Activity size={15} className="text-purple-400" />
            Recent Activity
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
        <p className="text-xs text-white/30 text-center py-4">No activity yet.</p>
      ) : (
        <div>
          {logs.map(log => (
            <LogRow key={log._id ?? log.createdAt} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(ActivityFeed);
