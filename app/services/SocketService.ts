import { io, Socket } from 'socket.io-client';
import { API_BASE } from './api';

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;

  const url = API_BASE.replace('/api', '');

  socket = io(url, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[Socket] Connecté');
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Déconnecté:', reason);
  });

  socket.on('connect_error', (err) => {
    console.log('[Socket] Erreur connexion:', err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}
