import React, { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, RefreshCw } from 'lucide-react';
import api from '../services/api';

// ── Fetcher ───────────────────────────────────────────────────────────────────
const fetchActivityLogs = async ({ page = 1, limit = 10 } = {}) => {
  const res = await api.get('/api/activity', { params: { page, limit } });
  return res.data;
};

// ── Action label map ──────────────────────────────────────────────────────────
const ACTION_LABELS = {
  'auth.login':              'Logged in',
  'auth.signup':             'Signed up',
  'auth.forgot_password':    'Requested password reset',
  'auth.password_reset':     'Reset password',
  'task.create':             'Created a task',
  'task.update':             'Updated a task',
  'task.delete':             'Deleted a task',
  'submission.submit':       'Submitted an assignment',
  'class.create':            'Created a class',
  'class.join':              'Joined a class',
};

function actionLabel(action) {
  return ACTION_LABELS[action] || action.replace(/\./g, ' → ');
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
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
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
      <div className="w-7 h-7 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
        <Activity size={12} className="text-purple-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/70 leading-relaxed">{actionLabel(log.action)}</p>
        {log.detail && Object.keys(log.detail).length > 0 && (
          <p className="text-[10px] text-white/30 mt-0.5 truncate">
            {Object.entries(log.detail)
              .filter(([k]) => !['ip'].includes(k))
              .map(([k, v]) => `${k}: ${v}`)
              .join(' · ')}
          </p>
        )}
      </div>
      <span className="text-[10px] text-white/20 shrink-0 mt-0.5">{timeAgo(log.createdAt)}</span>
    </div>
  );
});

// ── Main component ────────────────────────────────────────────────────────────
function ActivityFeed({ limit = 10, showTitle = true }) {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['activity', limit],
    queryFn:  () => fetchActivityLogs({ limit }),
    staleTime: 60 * 1000, // 1 minute
  });

  const logs = data?.data || [];

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
          {logs.map(log => <LogRow key={log._id || log.createdAt} log={log} />)}
        </div>
      )}
    </div>
  );
}

export default memo(ActivityFeed);
