import { io } from 'socket.io-client';

export const socket = io('http://localhost:4000');

export const subscribeFinance = (tenantId: string, callback: any) => {
  socket.on(`finance:${tenantId}`, callback);
};