import React from 'react';

/**
 * Reusable skeleton loader components for loading states.
 * Usage:
 *   <SkeletonCard />          — single card placeholder
 *   <SkeletonTaskList />      — task list placeholder (3 rows)
 *   <SkeletonStats />         — 2x2 stats grid placeholder
 */

const pulse = 'animate-pulse bg-white/5 rounded-lg';

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`${pulse} h-24 w-full ${className}`} />
  );
}

export function SkeletonText({ width = 'w-full', height = 'h-3' }) {
  return <div className={`${pulse} ${width} ${height} rounded`} />;
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="animate-pulse bg-white/10 rounded w-6 h-6" />
          <div className="animate-pulse bg-white/5 rounded h-3 w-20" />
          <div className="animate-pulse bg-white/10 rounded h-8 w-12" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTaskList({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-4">
          <div className="animate-pulse bg-white/10 rounded-lg w-10 h-10 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="animate-pulse bg-white/10 rounded h-3 w-3/4" />
            <div className="animate-pulse bg-white/5 rounded h-2.5 w-1/2" />
          </div>
          <div className="animate-pulse bg-white/5 rounded-full h-6 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonWorkspaceList({ rows = 3 }) {
  return (
    <div className="space-y-2">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
          <div className="animate-pulse bg-white/10 rounded-full w-8 h-8 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="animate-pulse bg-white/10 rounded h-3 w-24" />
            <div className="animate-pulse bg-white/5 rounded h-2 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-6">
        <SkeletonStats />
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
          <div className="animate-pulse bg-white/10 rounded h-4 w-40" />
          <SkeletonTaskList rows={4} />
        </div>
      </div>
      <div className="col-span-1 space-y-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <div className="animate-pulse bg-white/10 rounded h-4 w-24" />
          <div className="animate-pulse bg-white/5 rounded-lg h-11 w-full" />
          <div className="animate-pulse bg-white/10 rounded-lg h-11 w-full" />
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <div className="animate-pulse bg-white/10 rounded h-4 w-20" />
          <SkeletonWorkspaceList rows={3} />
        </div>
      </div>
    </div>
  );
}
