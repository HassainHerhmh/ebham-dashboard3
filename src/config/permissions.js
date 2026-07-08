export const roleOptions = [
  { value: 'admin', label: 'مدير النظام' },
  { value: 'manager', label: 'مشرف' },
  { value: 'employee', label: 'موظف' },
];

export const permissionActions = [
  { key: 'view', label: 'قراءة' },
  { key: 'add', label: 'إضافة' },
  { key: 'edit', label: 'تعديل' },
  { key: 'delete', label: 'حذف' },
  { key: 'print', label: 'طباعة' },
];

export const permissionGroups = [
  {
    key: 'main',
    label: 'الرئيسية',
    children: [
      { key: 'dashboard', label: 'لوحة التحكم', path: '/' },
      { key: 'users', label: 'المستخدمين', path: '/users' },
      { key: 'user_permissions', label: 'الصلاحيات', path: '/users/permissions' },
    ],
  },
  {
    key: 'operations',
    label: 'العمليات',
    children: [
      { key: 'captains', label: 'الكباتن', path: '/captains' },
      { key: 'shifts', label: 'الدوام', path: '/shifts' },
      { key: 'messages', label: 'الرسائل', path: '/messages' },
      { key: 'orders', label: 'الطلبات', path: '/orders' },
    ],
  },
  {
    key: 'finance',
    label: 'الماليات',
    children: [
      { key: 'finance', label: 'الماليات', path: '/finance' },
    ],
  },
  {
    key: 'reports',
    label: 'التقارير',
    children: [
      { key: 'reports_attendance', label: 'تقارير الكباتن', path: '/reports/attendance' },
      { key: 'reports_sales', label: 'تقارير المبيعات', path: '/reports/sales' },
      { key: 'reports_commissions', label: 'تقارير العمولات', path: '/reports/commissions' },
      { key: 'reports_rent', label: 'تقارير الإيجار', path: '/reports/rent' },
      { key: 'reports_stores', label: 'تقارير المحلات', path: '/reports/stores' },
      { key: 'reports_account_statement', label: 'كشف الحساب', path: '/reports/account-statement' },
    ],
  },
];

export const permissionSections = permissionGroups.reduce((sections, group) => {
  group.children.forEach((section) => {
    if (!sections.some((item) => item.key === section.key)) {
      sections.push(section);
    }
  });
  return sections;
}, []);

export function getRoleLabel(role) {
  const value = String(role || '').toLowerCase();
  return roleOptions.find((item) => item.value === value)?.label || role || '—';
}
