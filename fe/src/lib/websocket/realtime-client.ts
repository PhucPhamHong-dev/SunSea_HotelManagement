import { io, type Socket } from 'socket.io-client';
import { appEnv } from '../config/env';
import { authService } from '../auth/auth-service';
import { useRealtimeStore } from '../../stores/realtime.store';

let socket: Socket | undefined;

export function getRealtimeSocket(): Socket {
  if (socket) return socket;
  const store = useRealtimeStore.getState();
  store.setStatus('connecting');
  socket = io(appEnv.websocketUrl, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
  });
  socket.on('connect', () => {
    useRealtimeStore.getState().setStatus('connected');
  });
  socket.on('disconnect', () => {
    useRealtimeStore.getState().setStatus('disconnected');
  });
  socket.on('connect_error', () => {
    useRealtimeStore.getState().setStatus('disconnected');
  });
  socket.on('realtime.session.refresh_required', async () => {
    try {
      await authService.refresh();
      socket?.connect();
    } catch {
      useRealtimeStore.getState().setStatus('disconnected');
    }
  });
  return socket;
}
