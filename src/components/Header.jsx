import { useEffect, useRef, useState } from 'react';
import { Sun, Moon, Bell, User, Menu, LogOut, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROLE_LABELS, mediaUrl } from '../api';
import { useNotifications } from '../context/NotificationsContext';
import { hasPermission } from '../utils/permissions';

function formatNotificationTime(value) {
  try {
    return new Date(value).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '';
  }
}

export default function Header({ user, onMenuClick, onLogout }) {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('theme') === 'dark'
  );
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const {
    notifications,
    unreadCount,
    markAllRead,
    markRead,
    clearNotifications,
  } = useNotifications();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const toggleNotifications = () => {
    setOpen((prev) => {
      const next = !prev;
      if (!prev && unreadCount > 0) markAllRead();
      return next;
    });
  };

  const canOpenChat = hasPermission(user, 'chat', 'view');

  return (
    <header className="app-header px-4 md:px-6 py-4 flex items-center justify-between transition-colors duration-300">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-full hover:bg-blue-50 dark:hover:bg-gray-700 transition-all"
        >
          <Menu size={20} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div className="app-header__brand">
          <p className="text-sm font-bold">إبهام</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">منصة إدارة الدوام</p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <button
          type="button"
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          title={darkMode ? 'الوضع المضيء' : 'الوضع الليلي'}
        >
          {darkMode ? (
            <Sun size={20} className="text-yellow-500" />
          ) : (
            <Moon size={20} className="text-gray-600" />
          )}
        </button>

        <div className="relative" ref={panelRef}>
          <button
            type="button"
            onClick={toggleNotifications}
            className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            title="الإشعارات"
          >
            <Bell size={20} className="text-gray-600 dark:text-gray-300" />
            {unreadCount > 0 && (
              <span className="notifications-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {open && (
            <div className="notifications-panel">
              <div className="notifications-panel__header">
                <strong>الإشعارات</strong>
                {notifications.length > 0 && (
                  <button type="button" className="notifications-panel__clear" onClick={clearNotifications}>
                    مسح الكل
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="notifications-panel__empty">لا توجد إشعارات</div>
              ) : (
                <ul className="notifications-panel__list">
                  {notifications.map((item) => (
                    <li
                      key={item.id}
                      className={`notifications-panel__item ${item.read ? '' : 'is-unread'} ${item.type === 'error' ? 'is-error' : ''}`}
                      onClick={() => markRead(item.id)}
                    >
                      <p>{item.message}</p>
                      <span>{formatNotificationTime(item.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {canOpenChat && (
          <button
            type="button"
            onClick={() => navigate('/chat')}
            className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            title="الدردشة"
          >
            <MessageCircle size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
        )}

        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-all"
          title="تسجيل الخروج"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">خروج</span>
        </button>

        <div className="flex items-center gap-2 mr-1">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name || 'مستخدم'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{ROLE_LABELS[user?.role] || 'منصة إبهام'}</p>
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
          >
            {user?.photo ? (
              <img src={mediaUrl(user.photo)} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={16} className="text-white" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
