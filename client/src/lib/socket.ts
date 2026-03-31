import { io, Socket } from 'socket.io-client';
import { API_BASE, isMockMode } from '@/services/api';
import { refreshData } from './dataLoader';

let socket: Socket | null = null;

export const initSocket = (userId: string) => {
  if (isMockMode()) return;
  if (socket) return;
  
  // Extract base URL from API_BASE (e.g., http://localhost:5000/api -> http://localhost:5000)
  const baseURL = API_BASE.replace('/api', '');

  socket = io(baseURL, {
    withCredentials: true,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('data_changed', async (payload: { types: string[] }) => {
    if (payload && payload.types && Array.isArray(payload.types)) {
      payload.types.forEach(type => {
        refreshData(type, userId);
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
