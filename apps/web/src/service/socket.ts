import { io, type Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:4000';

let _socket: Socket | null = null;

/** Returns singleton Socket.IO client with JWT auth (required by G3-D03 server hardening). */
export function getSocket(token?: string | null): Socket {
  if (!_socket || !_socket.connected) {
    _socket = io(API_URL, {
      auth: token ? { token } : {},
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return _socket;
}

export function subscribeFinance(tenantId: string, callback: (data: unknown) => void, token?: string | null): () => void {
  const socket = getSocket(token);
  const event = `finance:${tenantId}`;
  socket.on(event, callback);
  return () => socket.off(event, callback);
}
