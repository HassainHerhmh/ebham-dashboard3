const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const BASE = API_ORIGIN ? `${API_ORIGIN}/api` : '/api';
const USER_KEY = 'platform_user';

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storePlatformUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearPlatformUser() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('platform_token');
  localStorage.removeItem('platform_last_activity');
}

export function mediaUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return API_ORIGIN ? `${API_ORIGIN}${path}` : path;
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'حدث خطأ');
    err.status = res.status;
    err.retryAfter = data.retry_after;
    throw err;
  }
  return data;
}

export const api = {
  platformLogin: (username, password, website = '') => request('/platform-auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, website })
  }),

  getUsers: () => request('/users'),
  createUser: (formData) => request('/users', { method: 'POST', body: formData }),
  updateUser: (id, formData) => request(`/users/${id}`, { method: 'PUT', body: formData }),
  toggleUserStatus: (id) => request(`/users/${id}/status`, { method: 'PATCH' }),
  resetUserPassword: (id, password) => request(`/users/${id}/reset-password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  getUserPermissions: (id) => request(`/users/${id}/permissions`),
  saveUserPermissions: (id, data) => request(`/users/${id}/permissions`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),

  getCaptains: () => request('/captains'),
  getCaptain: (id) => request(`/captains/${id}`),
  createCaptain: (formData) => request('/captains', { method: 'POST', body: formData }),
  updateCaptain: (id, formData) => request(`/captains/${id}`, { method: 'PUT', body: formData }),
  resetCaptainPassword: (id, password) => request(`/captains/${id}/reset-password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  }),
  deleteCaptain: (id) => request(`/captains/${id}`, { method: 'DELETE' }),

  getCaptainGroups: () => request('/captain-groups'),
  createCaptainGroup: (name) => request('/captain-groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }),
  updateCaptainGroup: (id, name) => request(`/captain-groups/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  }),
  deleteCaptainGroup: (id) => request(`/captain-groups/${id}`, { method: 'DELETE' }),

  getShifts: (captainId) => request(`/shifts${captainId ? `?captain_id=${captainId}` : ''}`),
  saveShifts: (captainId, shifts) => request(`/shifts/captain/${captainId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shifts })
  }),

  getMessages: () => request('/sms/messages'),
  createMessage: (data) => request('/sms/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  updateMessage: (id, data) => request(`/sms/messages/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  deleteMessage: (id) => request(`/sms/messages/${id}`, { method: 'DELETE' }),
  sendNow: (messageId) => request('/sms/send-now', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message_id: messageId })
  }),

  getSmsLog: (limit = 50) => request(`/sms/log?limit=${limit}`),
  getGatewayStatus: () => request('/sms/gateway-status'),

  getShiftReminder: () => request('/sms/shift-reminder'),
  saveShiftReminder: (data) => request('/sms/shift-reminder', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }),
  previewShiftReminder: () => request('/sms/shift-reminder/test', { method: 'POST' }),
  sendShiftReminderNow: (data) => request('/sms/shift-reminder/send-now', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data || {}),
  }),

  getAttendanceReport: ({ period = 'day', date, captain_id, group_id } = {}) => {
    const params = new URLSearchParams({ period });
    if (date) params.set('date', date);
    if (captain_id) params.set('captain_id', captain_id);
    if (group_id) params.set('group_id', group_id);
    return request(`/attendance/report?${params}`);
  },
  getAttendanceMonthlyReport: ({ date, captain_id, group_id } = {}) => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (captain_id) params.set('captain_id', captain_id);
    if (group_id) params.set('group_id', group_id);
    const qs = params.toString();
    return request(`/reports/attendance-monthly${qs ? `?${qs}` : ''}`);
  },
  saveAttendanceOverride: ({ captain_id, check_date, status, note }) => request('/attendance/override', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ captain_id, check_date, status, note }),
  }),
  clearAttendanceOverride: (captain_id, check_date) => {
    const params = new URLSearchParams({ captain_id, check_date });
    return request(`/attendance/override?${params}`, { method: 'DELETE' });
  },

  getFinanceConfig: () => request('/finance/config'),
  saveFinanceConfig: (data) => request('/finance/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  getFinanceStores: () => request('/finance/stores'),
  createFinanceStore: (name, discount_percent = 0) => request('/finance/stores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, discount_percent }),
  }),
  updateFinanceStore: (id, payload) => request(`/finance/stores/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }),
  deleteFinanceStore: (id) => request(`/finance/stores/${id}`, { method: 'DELETE' }),
  getFinanceDiscounts: () => request('/finance/discounts'),
  createFinanceDiscount: (data) => request('/finance/discounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  updateFinanceDiscount: (id, data) => request(`/finance/discounts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  deleteFinanceDiscount: (id) => request(`/finance/discounts/${id}`, { method: 'DELETE' }),
  getCaptainFinance: (captainId, { salesDate, period, date } = {}) => {
    const params = new URLSearchParams();
    if (salesDate) params.set('sales_date', salesDate);
    if (period) params.set('period', period);
    if (date) params.set('date', date);
    const qs = params.toString();
    return request(`/finance/captain/${captainId}${qs ? `?${qs}` : ''}`);
  },
  saveCaptainFinance: (captainId, data) => request(`/finance/captain/${captainId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  getCaptainVouchers: (captainId) => request(`/finance/captain/${captainId}/vouchers`),
  getFinanceVouchers: (captainId) => {
    const qs = captainId ? `?captain_id=${captainId}` : '';
    return request(`/finance/vouchers${qs}`);
  },
  createVoucher: (captainId, data) => request(`/finance/captain/${captainId}/vouchers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  deleteVoucher: (id) => request(`/finance/vouchers/${id}`, { method: 'DELETE' }),
  updateVoucher: (id, data) => request(`/finance/vouchers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  createTransferVoucher: (data) => request('/finance/transfer-vouchers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  updateTransferVoucher: (groupId, data) => request(`/finance/transfer-vouchers/${groupId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  getInvoicePostings: () => request('/finance/invoice-postings'),
  deleteInvoicePosting: (id) => request(`/finance/invoice-postings/${id}`, { method: 'DELETE' }),
  saveCaptainCommission: (captainId, data) => request(`/finance/captain/${captainId}/commission`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  getCommissionPostings: () => request('/finance/commission-postings'),
  deleteCommissionPosting: (id) => request(`/finance/commission-postings/${id}`, { method: 'DELETE' }),
  getSalesReport: ({ period = 'day', date, from, to, captain_id } = {}) => {
    const params = new URLSearchParams({ period });
    if (date) params.set('date', date);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (captain_id) params.set('captain_id', captain_id);
    return request(`/reports/sales?${params}`);
  },
  getCommissionReport: ({ period = 'day', date, from, to, captain_id } = {}) => {
    const params = new URLSearchParams({ period });
    if (date) params.set('date', date);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (captain_id) params.set('captain_id', captain_id);
    return request(`/reports/commissions?${params}`);
  },
  getRentReport: ({ period = 'day', date, from, to, captain_id } = {}) => {
    const params = new URLSearchParams({ period });
    if (date) params.set('date', date);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (captain_id) params.set('captain_id', captain_id);
    return request(`/reports/rent?${params}`);
  },
  getStoresReport: ({ period = 'day', date, from, to } = {}) => {
    const params = new URLSearchParams({ period });
    if (date) params.set('date', date);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return request(`/reports/stores?${params}`);
  },
  getAccountStatement: ({ period = 'month', date, from, to, captain_id, store_id, mode, include_opening } = {}) => {
    const params = new URLSearchParams({ period });
    if (date) params.set('date', date);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (captain_id) params.set('captain_id', captain_id);
    if (store_id) params.set('store_id', store_id);
    if (mode) params.set('mode', mode);
    if (include_opening === false) params.set('include_opening', 'false');
    return request(`/reports/account-statement?${params}`);
  },
  listOrderCustomers: (q = '') => request(`/orders/customers?q=${encodeURIComponent(q)}`),
  listOrders: (status) => request(`/orders${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  createOrder: (data) => request('/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  updateOrder: (id, data) => request(`/orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  getOrderInvoices: (orderId) => request(`/orders/${orderId}/invoices`),
  getChatThreads: () => request('/chat/threads'),
  getChatMessages: (captainId) => request(`/chat/${captainId}`),
  markChatRead: (captainId) => request(`/chat/${captainId}/read`, { method: 'POST' }),
  sendChatMessage: async (captainId, { message, sender_id, sender_name, file } = {}) => {
    const form = new FormData();
    if (message) form.append('message', message);
    if (sender_id) form.append('sender_id', sender_id);
    if (sender_name) form.append('sender_name', sender_name);
    if (file) form.append('attachment', file);
    return request(`/chat/${captainId}`, { method: 'POST', body: form });
  },
};

export const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/** ترتيب العرض من السبت */
export const WEEK_ORDER_SATURDAY = [6, 0, 1, 2, 3, 4, 5];

export function sortShiftsFromSaturday(shifts) {
  return [...shifts].sort(
    (a, b) => WEEK_ORDER_SATURDAY.indexOf(a.day_of_week) - WEEK_ORDER_SATURDAY.indexOf(b.day_of_week)
  );
}

/** عرض 12 ساعة مع ص / م — مثل 8:00 ص أو 6:57 م */
export function formatTime24Ar(time) {
  if (!time || typeof time !== 'string') return '';
  const m = time.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return time;
  let h = Number(m[1]);
  const mins = Number(m[2]);
  if (Number.isNaN(h)) return time;

  const period = h >= 12 ? 'م' : 'ص';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;

  if (mins === 0) return `${h} ${period}`;
  return `${h}:${String(mins).padStart(2, '0')} ${period}`;
}

export function formatTimeRangeAr(start, end) {
  return `${formatTime24Ar(start)} — ${formatTime24Ar(end)}`;
}

export const REPEAT_LABELS = { once: 'مرة واحدة', daily: 'يومياً', weekly: 'أسبوعياً' };

export const ROLE_LABELS = { admin: 'مدير النظام', manager: 'مشرف', employee: 'موظف' };
