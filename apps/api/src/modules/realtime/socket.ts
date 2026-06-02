import http from 'http';
import { Server, type Socket } from 'socket.io';

import { verifyToken } from '../../lib/jwt';

const TENANT_ROOM = (tenantId: string) => `tenant:${tenantId}`;

let io: Server | null = null;

function resolveCorsOrigins(): string[] | boolean {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) {
    return process.env.NODE_ENV === 'production' ? [] : true;
  }
  return raw.split(',').map(o => o.trim()).filter(Boolean);
}

export function initSocket(server: http.Server): Server {
  io = new Server(server, {
    cors: {
      origin: resolveCorsOrigins(),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Reject connections that do not carry a valid tenant-scoped JWT
  io.use((socket: Socket, next) => {
    try {
      const raw =
        (socket.handshake.auth?.token as string | undefined) ??
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

      if (!raw) {
        return next(new Error('SOCKET_AUTH_REQUIRED'));
      }

      const payload = verifyToken(raw);

      if (!payload.tenantId) {
        return next(new Error('SOCKET_TENANT_REQUIRED'));
      }

      socket.data.userId = payload.userId;
      socket.data.tenantId = payload.tenantId;
      socket.data.isSuperAdmin = payload.isSuperAdmin;

      return next();
    } catch {
      return next(new Error('SOCKET_AUTH_FAILED'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const tenantId = socket.data.tenantId as string;

    // Scope this socket to its tenant's room — it will only receive
    // events emitted to that room, never to another tenant's room
    void socket.join(TENANT_ROOM(tenantId));

    socket.on('disconnect', () => {
      void socket.leave(TENANT_ROOM(tenantId));
    });
  });

  return io;
}

export function emitFinanceUpdate(tenantId: string, payload: unknown): void {
  if (!io) return;
  io.to(TENANT_ROOM(tenantId)).emit(`finance:${tenantId}`, payload);
}

export function getSocketServer(): Server | null {
  return io;
}
