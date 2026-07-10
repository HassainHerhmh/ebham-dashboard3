let permissionRequested = false;

export function isDesktopNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestDesktopNotificationPermission() {
  if (!isDesktopNotificationSupported()) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  if (permissionRequested) return Notification.permission;
  permissionRequested = true;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function showDesktopNotification({ title, body, tag, onClick } = {}) {
  if (!isDesktopNotificationSupported()) return null;
  if (Notification.permission !== 'granted') return null;
  if (!title && !body) return null;

  try {
    const notification = new Notification(title || 'إبهام', {
      body: body || '',
      tag: tag || undefined,
      icon: '/favicon.ico',
      dir: 'rtl',
      lang: 'ar',
    });
    notification.onclick = () => {
      window.focus();
      if (typeof onClick === 'function') onClick();
      notification.close();
    };
    return notification;
  } catch {
    return null;
  }
}
