/**
 * useSocket — authenticated Socket.IO connection with real-time cache updates.
 *
 * Design decisions:
 *
 * 1. AUTH TIMING — socket only connects after userId is confirmed.
 *    The connection effect depends on [userId], so it never runs for
 *    unauthenticated users and re-runs if the user changes.
 *
 * 2. OPTIMISTIC task_created — inserts the new task directly into page 1
 *    of the cache so the UI updates instantly, then schedules a background
 *    refetch to sync pagination counts.
 *
 * 3. NOTIFICATION CONSISTENCY — both `notifications` array and `unreadCount`
 *    are updated atomically in a single setQueryData call.
 *
 * 4. TASK DELETE CONSISTENCY — removes from cache immediately, then triggers
 *    a background invalidation so pagination totals stay accurate.
 *
 * 5. ACTIVITY SCOPING — activity query key includes userId so each user's
 *    feed is cached independently.
 *
 * Events handled:
 *   activity       — workspace activity feed (local state)
 *   task_created   — optimistic insert + background refetch
 *   task_updated   — optimistic patch in all cached pages
 *   task_deleted   — optimistic remove + background invalidation
 *   notification   — atomic notification cache update
 */
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { queryClient } from '../lib/queryClient';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Notification cache key — must match Layout.jsx usage
const notifKey = () => ['notifications'];

// Activity cache key — scoped per user (Step 5)
export const activityKey = (userId, limit) => ['activity', userId ?? 'anon', limit];

export function useSocket(workspaceId, userId) {
  const socketRef  = useRef(null);
  const [activities, setActivities] = useState([]);

  // ── Step 2: Connect only after userId is available ────────────────────────
  useEffect(() => {
    if (!userId) return; // Guard: never connect unauthenticated

    // Create socket once per authenticated session
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        path:                '/socket.io/',
        transports:          ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay:    2000,
      });
    }

    const socket = socketRef.current;

    const onConnect = () => {
      // Join personal room immediately on (re)connect
      socket.emit('join_user_room', { userId });
    };

    socket.on('connect', onConnect);

    // If already connected (reconnect scenario), join immediately
    if (socket.connected) {
      socket.emit('join_user_room', { userId });
    }

    // ── Step 3: Notification cache — atomic update ────────────────────────
    const onNotification = ({ notification }) => {
      queryClient.setQueryData(notifKey(), (old) => {
        // Preserve exact cache shape: { success, data: { notifications, unreadCount } }
        const prev = old?.data ?? { notifications: [], unreadCount: 0 };
        const deduped = prev.notifications.some(n => n._id === notification._id)
          ? prev.notifications
          : [notification, ...prev.notifications].slice(0, 50);

        return {
          ...old,
          data: {
            ...prev,
            notifications: deduped,
            unreadCount:   prev.unreadCount + (notification.isRead ? 0 : 1),
          },
        };
      });
    };

    socket.on('notification', onNotification);

    return () => {
      socket.off('connect',      onConnect);
      socket.off('notification', onNotification);
    };
  }, [userId]);

  // ── Workspace room + task/activity events ─────────────────────────────────
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !workspaceId || !userId) return;

    socket.emit('join_workspace', { workspaceId });

    // ── Activity feed — prepend to cache immediately, then invalidate ────────
    const onActivity = (activity) => {
      // Prepend the real-time activity object directly into the cache.
      // This ensures the feed updates instantly without waiting for a refetch.
      queryClient.setQueriesData(
        { queryKey: ['activity', userId] },
        (old) => {
          if (!old) return old;
          const existing = old.data ?? [];
          
          // Deduplicate: don't add if the activity ID already exists
          const isDupe = existing.some(e => e._id === activity._id);
          if (isDupe) return old;

          return {
            ...old,
            data: [activity, ...existing].slice(0, 50),
          };
        }
      );

      // Schedule a background refetch to ensure data consistency
      queryClient.invalidateQueries({
        queryKey:    ['activity', userId],
        refetchType: 'inactive',
      });
    };

    // ── Step 1: Optimistic task_created ───────────────────────────────────
    const onTaskCreated = ({ task }) => {
      // Insert into page 1 of the cache immediately (optimistic)
      queryClient.setQueriesData(
        { queryKey: ['tasks', 'list', workspaceId] },
        (old) => {
          if (!old) return old;
          // Only prepend to page 1 to avoid duplicates across pages
          const isPageOne = old.meta?.page === 1 || old.page === 1;
          if (!isPageOne) return old;
          const alreadyExists = old.data?.some(t => t._id === task._id);
          if (alreadyExists) return old;
          return {
            ...old,
            data:  [task, ...(old.data ?? [])],
            total: (old.total ?? 0) + 1,
            meta:  old.meta ? { ...old.meta, total: (old.meta.total ?? 0) + 1 } : old.meta,
          };
        }
      );
      // Background refetch to sync pagination totals accurately
      queryClient.invalidateQueries({
        queryKey: ['tasks', 'list', workspaceId],
        refetchType: 'inactive', // only refetch pages not currently rendered
      });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'summary', workspaceId] });
      // Also refresh activity feed — a new task means new activity entries for students
      queryClient.invalidateQueries({ queryKey: ['activity', userId] });
    };

    // ── task_updated: optimistic patch ────────────────────────────────────
    const onTaskUpdated = ({ task }) => {
      queryClient.setQueriesData(
        { queryKey: ['tasks', 'list', workspaceId] },
        (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map(t => t._id === task._id ? { ...t, ...task } : t),
          };
        }
      );
    };

    // ── Step 4: task_deleted — remove + background refetch ────────────────
    const onTaskDeleted = ({ taskId }) => {
      // Optimistic removal from all cached pages
      queryClient.setQueriesData(
        { queryKey: ['tasks', 'list', workspaceId] },
        (old) => {
          if (!old?.data) return old;
          const filtered = old.data.filter(t => t._id !== taskId);
          const removed  = old.data.length - filtered.length;
          return {
            ...old,
            data:  filtered,
            total: Math.max(0, (old.total ?? 0) - removed),
            meta:  old.meta
              ? { ...old.meta, total: Math.max(0, (old.meta.total ?? 0) - removed) }
              : old.meta,
          };
        }
      );
      // Background invalidation to keep pagination counts accurate
      queryClient.invalidateQueries({
        queryKey:    ['tasks', 'list', workspaceId],
        refetchType: 'inactive',
      });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'summary', workspaceId] });
    };

    socket.on('activity',     onActivity);
    socket.on('task_created', onTaskCreated);
    socket.on('task_updated', onTaskUpdated);
    socket.on('task_deleted', onTaskDeleted);

    // ── submission / graded / feedback → refresh activity feed ───────────────
    const onActivityInvalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['activity', userId] });
    };
    socket.on('submission', onActivityInvalidate);
    socket.on('graded',     onActivityInvalidate);
    socket.on('feedback',   onActivityInvalidate);

    return () => {
      socket.off('activity',     onActivity);
      socket.off('task_created', onTaskCreated);
      socket.off('task_updated', onTaskUpdated);
      socket.off('task_deleted', onTaskDeleted);
      socket.off('submission',   onActivityInvalidate);
      socket.off('graded',       onActivityInvalidate);
      socket.off('feedback',     onActivityInvalidate);
    };
  }, [workspaceId, userId]);

  // ── Disconnect on full unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  return { activities };
}
