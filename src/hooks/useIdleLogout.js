import { useEffect } from 'react';

export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
export const ACTIVITY_KEY = 'platform_last_activity';

export function touchActivity() {
  localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
}

export function clearActivity() {
  localStorage.removeItem(ACTIVITY_KEY);
}

export function isSessionExpired() {
  const raw = localStorage.getItem(ACTIVITY_KEY);
  if (!raw) return true;
  const last = Number(raw);
  if (!Number.isFinite(last)) return true;
  return Date.now() - last > IDLE_TIMEOUT_MS;
}

export default function useIdleLogout(onLogout) {
  useEffect(() => {
    touchActivity();

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    const onActivity = () => touchActivity();
    events.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));

    const interval = setInterval(() => {
      if (isSessionExpired()) onLogout();
    }, 30000);

    const onStorage = (event) => {
      if (event.key === ACTIVITY_KEY && isSessionExpired()) onLogout();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      events.forEach((event) => window.removeEventListener(event, onActivity));
      clearInterval(interval);
      window.removeEventListener('storage', onStorage);
    };
  }, [onLogout]);
}
