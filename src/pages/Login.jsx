import { useEffect, useState } from 'react';
import { User, Lock, LogIn, LayoutDashboard, Clock, MessageSquare, Truck, Users } from 'lucide-react';
import { api, storePlatformUser } from '../api';
import { normalizePermissions } from '../utils/permissions';

const LOCAL_LOCK_KEY = 'platform_login_lock_until';
const MIN_PASSWORD_LEN = 4;
const MAX_PASSWORD_LEN = 128;

function getLocalLockUntil() {
  const raw = localStorage.getItem(LOCAL_LOCK_KEY);
  const value = Number(raw || 0);
  return Number.isFinite(value) ? value : 0;
}

function setLocalLock(seconds) {
  localStorage.setItem(LOCAL_LOCK_KEY, String(Date.now() + seconds * 1000));
}

function clearLocalLock() {
  localStorage.removeItem(LOCAL_LOCK_KEY);
}

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [website, setWebsite] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockUntil, setLockUntil] = useState(getLocalLockUntil);

  const locked = lockUntil > Date.now();
  const lockSecondsLeft = locked ? Math.ceil((lockUntil - Date.now()) / 1000) : 0;

  useEffect(() => {
    if (!locked) return undefined;
    const timer = setInterval(() => {
      const next = getLocalLockUntil();
      setLockUntil(next);
      if (next <= Date.now()) clearLocalLock();
    }, 1000);
    return () => clearInterval(timer);
  }, [locked, lockUntil]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (locked || loading) return;
    if (website) return;

    const userKey = username.trim();
    if (!userKey || password.length < MIN_PASSWORD_LEN) {
      setError('أدخل بيانات الدخول بشكل صحيح');
      return;
    }
    if (password.length > MAX_PASSWORD_LEN) {
      setError('البريد الإلكتروني أو رقم الهاتف أو كلمة المرور غير صحيحة');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { user } = await api.platformLogin(userKey, password, website);
      const normalizedUser = {
        ...user,
        permissions: normalizePermissions(user.permissions),
      };
      clearLocalLock();
      storePlatformUser(normalizedUser);
      onLogin(normalizedUser);
    } catch (err) {
      if (err.status === 429) {
        const seconds = Number(err.retryAfter) || 1800;
        setLocalLock(seconds);
        setLockUntil(Date.now() + seconds * 1000);
        setError(`تم حظر المحاولات مؤقتاً. انتظر ${seconds} ثانية ثم حاول مجدداً.`);
      } else {
        setError(err.message || 'فشل تسجيل الدخول');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" dir="rtl">
      <div className="login-bg-circle login-bg-circle-1" />
      <div className="login-bg-circle login-bg-circle-2" />
      <div className="login-bg-circle login-bg-circle-3" />

      <div className="login-float login-float-1">
        <Clock size={20} />
        <span>دوام</span>
      </div>
      <div className="login-float login-float-2">
        <MessageSquare size={20} />
        <span>رسائل</span>
      </div>
      <div className="login-float login-float-3">
        <Truck size={20} />
        <span>كباتن</span>
      </div>
      <div className="login-float login-float-4">
        <Users size={20} />
        <span>فريق</span>
      </div>

      <div className="login-wrap">
        <div className="login-brand">
          <div className="login-brand-icon">
            <LayoutDashboard size={32} color="#fff" strokeWidth={1.8} />
          </div>
          <h1>منصة إبهام</h1>
          <p>إدارة الدوام والرسائل</p>
        </div>

        <div className="login-card">
          <h2>تسجيل الدخول</h2>
          <p className="login-subtitle">أدخل بيانات حسابك للمتابعة</p>

          <form onSubmit={handleSubmit}>
            {error && <p className="login-error">{error}</p>}
            {locked && (
              <p className="login-lock-notice">
                المحاولات مقفلة مؤقتاً — المتبقي {lockSecondsLeft} ثانية
              </p>
            )}

            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="login-honeypot"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            <div className="login-input-wrap">
              <User size={18} className="login-input-icon" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="البريد الإلكتروني أو رقم الهاتف"
                autoComplete="username"
                disabled={locked || loading}
                required
              />
            </div>

            <div className="login-input-wrap">
              <Lock size={18} className="login-input-icon" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="كلمة المرور"
                autoComplete="current-password"
                minLength={MIN_PASSWORD_LEN}
                maxLength={MAX_PASSWORD_LEN}
                disabled={locked || loading}
                required
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading || locked}>
              <LogIn size={20} />
              {loading ? 'جاري الدخول...' : locked ? `انتظر ${lockSecondsLeft} ث` : 'دخول'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
