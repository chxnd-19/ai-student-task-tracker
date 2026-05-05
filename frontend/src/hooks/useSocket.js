import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const useSocket = (workspaceId) => {
  const socketRef = useRef(null);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    if (!workspaceId) return;

    // Initialize socket connection
    socketRef.current = io(SOCKET_URL, {
      path: '/socket.io/',
      transports: ['websocket'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to socket server');
      socket.emit('join_workspace', { workspaceId });
    });

    socket.on('activity', (data) => {
      setActivities((prev) => [data, ...prev].slice(0, 50)); // Keep last 50
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });

    return () => {
      socket.disconnect();
    };
  }, [workspaceId]);

  return { activities };
};
