import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import api, { getToken } from './api';
import { connectSocket, disconnectSocket } from './SocketService';

interface NotificationItem {
  id: number;
  type: string;
  titre: string;
  message: string;
  est_lue: number;
  created_at: string;
}

interface NotificationContextType {
  unreadCount: number;
  notifications: NotificationItem[];
  lastNotification: NotificationItem | null;
  clearLastNotification: () => void;
  refresh: () => Promise<void>;
  marquerLue: (id: number) => Promise<void>;
  toutLire: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  notifications: [],
  lastNotification: null,
  clearLastNotification: () => {},
  refresh: async () => {},
  marquerLue: async () => {},
  toutLire: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [lastNotification, setLastNotification] = useState<NotificationItem | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearLastNotification = useCallback(() => {
    setLastNotification(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await api.notifications.nonLues();
      const list = Array.isArray(data) ? data : [];
      setNotifications(list);
      setUnreadCount(list.length);
    } catch {
      // ignore polling errors
    }
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 60000);

    const token = getToken();
    if (token) {
      const socket = connectSocket(token);
      socket.on('new-notification', (notif: NotificationItem) => {
        setLastNotification(notif);
        setNotifications(prev => [notif, ...prev]);
        setUnreadCount(prev => prev + 1);
      });
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      disconnectSocket();
    };
  }, [refresh]);

  const marquerLue = useCallback(async (id: number) => {
    try {
      await api.notifications.marquerLue(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  }, []);

  const toutLire = useCallback(async () => {
    try {
      await api.notifications.toutLire();
      setNotifications([]);
      setUnreadCount(0);
    } catch { /* ignore */ }
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, notifications, lastNotification, clearLastNotification, refresh, marquerLue, toutLire }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
