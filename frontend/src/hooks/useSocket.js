/**
 * useSocket — Socket.IO connection with real-time cache invalidation.
 *
 * Events handled:
 *   activity       — workspace activity feed update
 *   task_created   — invalidate task list for this workspace
 *   task_updated   — invalidate task list for this workspace
 *   task_deleted   — invalidate task list for this workspace
 *   notification   — prepend to notification cache
 *
 * The hook also joins the user's personal room for per-user notifications.
 */
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { queryClient } from '../lib/queryClient';
import { taskKeys } from './useTasks';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function useSocket(workspaceId, userId) {
  const socketRef  = useRef(null);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    // Connect once — reuse across workspace changes
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        path:       '/socket.io/',
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay:    2000,
      });

      const socket = socketRef.current;

      socket.on('connect', () => {
        // Join personal room for per-user notifications
        if (userId) {
          socket.emit('join_user_room', { userId });
        }
      });

      // ── Per-user notification ─────────────────────────────────────────────
      socket.on('notification', ({ notification }) => {
        // Prepend to notifications cache
        queryClient.setQueryData(['notifications'], (old) => {
          if (!old) return old;
          const list = old.data?.notifications ?? [];
          return {
            ...old,
            data: {
              ...old.data,
              notifications: [notification, ...list].slice(0, 50),
              unreadCount: (old.data?.unreadCount ?? 0) + 1,
            },
          };
        });
      });
    }

    return () => {
      // Don't disconnect on workspace change — only on unmount
    };
  }, [userId]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !workspaceId) return;

    // Join workspace room
    socket.emit('join_workspace', { workspaceId });

    // ── Activity feed ─────────────────────────────────────────────────────────
    const onActivity = (data) => {
      setActivities(prev => [data, ...prev].slice(0, 50));
    };

    // ── Task events → invalidate TanStack Query cache ─────────────────────────
    const onTaskCreated = () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'summary', workspaceId] });
      // Also refresh activity feed
      queryClient.invalidateQueries({ queryKey: ['activity'] });
    };

    const onTaskUpdated = ({ task }) => {
      // Optimistically update the specific task in all cached pages
      queryClient.setQueriesData(
        { queryKey: ['tasks', 'list', workspaceId] },
        (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map(t => t._id === task._id ? task : t),
          };
        }
      );
    };

    const onTaskDeleted = ({ taskId }) => {
      // Remove from all cached pages
      queryClient.setQueriesData(
        { queryKey: ['tasks', 'list', workspaceId] },
        (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.filter(t => t._id !== taskId),
          };
        }
      );
      queryClient.invalidateQueries({ queryKey: ['tasks', 'summary', workspaceId] });
    };

    socket.on('activity',     onActivity);
    socket.on('task_created', onTaskCreated);
    socket.on('task_updated', onTaskUpdated);
    socket.on('task_deleted', onTaskDeleted);

    return () => {
      socket.off('activity',     onActivity);
      socket.off('task_created', onTaskCreated);
      socket.off('task_updated', onTaskUpdated);
      socket.off('task_deleted', onTaskDeleted);
    };
  }, [workspaceId]);

  // Cleanup on full unmount
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  return { activities };
}
