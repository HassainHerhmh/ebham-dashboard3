import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Truck,
  Clock,
  MessageSquare,
  MessageCircle,
  ClipboardCheck,
  Wallet,
  ShoppingCart,
  BarChart3,
  FileText,
  ChevronDown,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { hasPermission } from '../utils/permissions';

const DASHBOARD_ITEM = { path: '/', label: 'لوحة التحكم', icon: LayoutDashboard, section: 'dashboard' };

const MENU = [
  { path: '/captains', label: 'الكباتن', icon: Truck, section: 'captains' },
  { path: '/shifts', label: 'الدوام', icon: Clock, section: 'shifts' },
  { path: '/messages', label: 'الرسائل', icon: MessageSquare, section: 'messages' },
  { path: '/chat', label: 'الدردشة', icon: MessageCircle, section: 'chat' },
  { path: '/finance', label: 'الماليات', icon: Wallet, section: 'finance' },
  { path: '/orders', label: 'الطلبات', icon: ShoppingCart, section: 'orders' },
];

const REPORTS_MENU = [
  { path: '/reports/attendance', label: 'تقارير الكباتن', icon: ClipboardCheck, section: 'reports_attendance' },
  { path: '/reports/sales', label: 'تقارير المبيعات', icon: Wallet, section: 'reports_sales' },
  { path: '/reports/commissions', label: 'تقارير العمولات', icon: Wallet, section: 'reports_commissions' },
  { path: '/reports/rent', label: 'تقارير الإيجار', icon: Wallet, section: 'reports_rent' },
  { path: '/reports/stores', label: 'تقارير المحلات', icon: Wallet, section: 'reports_stores' },
  { path: '/reports/account-statement', label: 'كشف حساب', icon: FileText, section: 'reports_account_statement' },
];

export default function Sidebar({ isOpen, onClose, user }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);

  const canShow = (section) => hasPermission(user, section, 'view');

  const showDashboard = canShow(DASHBOARD_ITEM.section);
  const visibleMenu = MENU.filter((item) => canShow(item.section));
  const visibleReports = REPORTS_MENU.filter((item) => canShow(item.section));
  const showUsers = canShow('users');
  const showUserPermissions = canShow('user_permissions');
  const showUsersGroup = showUsers || showUserPermissions;

  const linkBase = `flex items-center ${collapsed ? 'justify-center' : 'gap-3'} rounded-lg px-4 py-2.5 text-slate-600 dark:text-gray-300 hover:bg-blue-50/80 dark:hover:bg-gray-700 transition-all`;
  const activeClass = 'bg-blue-50 dark:bg-blue-900/25 text-blue-700 dark:text-blue-300 font-semibold shadow-sm border border-blue-100/80 dark:border-blue-800/40';
  const reportsActive = location.pathname.startsWith('/reports');

  return (
    <aside
      className={`app-sidebar fixed inset-y-0 right-0 transform ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } md:translate-x-0 md:sticky md:top-0 ${
        collapsed ? 'w-20' : 'w-64'
      } h-screen max-h-screen overflow-hidden dark:bg-gray-800 z-50 transition-all duration-300`}
    >
      <div className="h-full flex flex-col">
        <div className="app-sidebar__head p-5 flex justify-between items-center">
          {!collapsed && (
            <h2 className="app-sidebar__title text-xl">لوحة الإدارة</h2>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            title={collapsed ? 'توسيع' : 'طي'}
          >
            {collapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 pb-8 space-y-1 custom-scrollbar">
          {showDashboard && (
            <Link
              to={DASHBOARD_ITEM.path}
              onClick={onClose}
              className={`${linkBase} ${location.pathname === DASHBOARD_ITEM.path ? activeClass : ''}`}
              title={collapsed ? DASHBOARD_ITEM.label : undefined}
            >
              <LayoutDashboard size={18} />
              {!collapsed && <span>{DASHBOARD_ITEM.label}</span>}
            </Link>
          )}

          {showUsersGroup && (
            <div className="space-y-1">
              {showUsers && (
                <Link
                  to="/users"
                  onClick={onClose}
                  className={`${linkBase} ${location.pathname === '/users' ? activeClass : ''}`}
                  title={collapsed ? 'المستخدمين' : undefined}
                >
                  <Users size={18} />
                  {!collapsed && <span>المستخدمين</span>}
                </Link>
              )}

              {!collapsed && showUserPermissions && (
                <Link
                  to="/users/permissions"
                  onClick={onClose}
                  className={`sidebar-submenu-link mr-4 ${location.pathname === '/users/permissions' ? 'active' : ''}`}
                >
                  <ShieldCheck size={16} />
                  <span>الصلاحيات</span>
                </Link>
              )}
            </div>
          )}

          {visibleMenu.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={onClose}
                className={`${linkBase} ${active ? activeClass : ''}`}
                title={collapsed ? label : undefined}
              >
                <Icon size={18} />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}

          {visibleReports.length > 0 && (
            <div className="sidebar-group">
              {collapsed ? (
                <Link
                  to={visibleReports[0].path}
                  onClick={onClose}
                  className={`${linkBase} ${reportsActive ? activeClass : ''}`}
                  title="تقارير"
                >
                  <BarChart3 size={18} />
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setReportsOpen(!reportsOpen)}
                    className={`${linkBase} ${reportsActive ? activeClass : ''} w-full justify-between`}
                  >
                    <span className="flex items-center gap-3">
                      <BarChart3 size={18} />
                      <span>تقارير</span>
                    </span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${reportsOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {reportsOpen && (
                    <div className="sidebar-submenu">
                      {visibleReports.map(({ path, label, icon: Icon }) => {
                        const active = location.pathname === path;
                        return (
                          <Link
                            key={path}
                            to={path}
                            onClick={onClose}
                            className={`sidebar-submenu-link ${active ? 'active' : ''}`}
                          >
                            <Icon size={16} />
                            <span>{label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </nav>

        {!collapsed && (
          <div className="app-sidebar__foot p-4 text-xs text-center">
            منصة إبهام
          </div>
        )}
      </div>
    </aside>
  );
}
