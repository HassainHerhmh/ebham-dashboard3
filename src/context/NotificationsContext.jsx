import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { showDesktopNotification } from '../notifications/desktopNotifications';

const STORAGE_KEY = 'platform_notifications';
const MAX_NOTIFICATIONS = 50;

const NotificationsContext = createContext(null);

function loadStoredNotifications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState(loadStoredNotifications);

  const persist = useCallback((list) => {
    const trimmed = list.slice(0, MAX_NOTIFICATIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    setNotifications(trimmed);
  }, []);

  const pushNotification = useCallback((message, type = 'info', options = {}) => {
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      message,
      type,
      read: false,
      at: new Date().toISOString(),
    };
    setNotifications((prev) => {
      const next = [item, ...prev].slice(0, MAX_NOTIFICATIONS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    showDesktopNotification({
      title: options.title || 'إبهام — منصة إبهام',
      body: message,
      tag: options.tag || item.id,
      onClick: options.onClick,
    });
    return item;
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const markRead = useCallback((id) => {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearNotifications = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setNotifications([]);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      pushNotification,
      markAllRead,
      markRead,
      clearNotifications,
    }),
    [notifications, unreadCount, pushNotification, markAllRead, markRead, clearNotifications]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return ctx;
}
