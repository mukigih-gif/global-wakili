// frontend/hooks/useNotifications.ts
import { useEffect } from 'react';
import Pusher from 'pusher-js';
import { toast } from 'react-hot-toast';

export const useNotifications = (userId: string) => {
  useEffect(() => {
    if (!userId) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      // Ensure you handle authentication for private channels if using Pusher Auth
      // authEndpoint: '/api/pusher/auth', 
    });

    const channel = pusher.subscribe(`private-user-${userId}`);

    channel.bind('new-notification', (data: any) => {
      toast.success(`${data.title}: ${data.message}`, {
        duration: 6000,
        icon: data.icon || '⚖️',
        style: {
          border: '1px solid #1e293b',
          padding: '16px',
          color: '#1e293b',
        },
      });
      
      // Optional: Play a subtle notification ping sound
      // new Audio('/sounds/notification.mp3').play().catch(() => {});
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [userId]);
};