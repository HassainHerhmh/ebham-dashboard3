export const PERIOD_LABELS = { day: 'يوم', week: 'أسبوع', month: 'شهر', range: 'فترة' };

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getFilterRange(period, dateKey, fromDate, toDate) {
  if (period === 'range') {
    const from = fromDate || dateKey;
    const to = toDate || dateKey;
    return from <= to ? { from, to } : { from: to, to: from };
  }
  const [y, m, d] = dateKey.split('-').map(Number);
  const ref = new Date(y, m - 1, d);
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

  if (period === 'day') return { from: dateKey, to: dateKey };
  if (period === 'month') {
    const last = new Date(y, m, 0).getDate();
    return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(last)}` };
  }
  const daysSinceSat = (ref.getDay() + 1) % 7;
  const sat = new Date(ref);
  sat.setDate(ref.getDate() - daysSinceSat);
  const fri = new Date(sat);
  fri.setDate(sat.getDate() + 6);
  return { from: fmt(sat), to: fmt(fri) };
}

export function formatFilterHint(period, range) {
  if (period === 'day') return range.from;
  return `${range.from} — ${range.to}`;
}

export function formatMoney(n) {
  return Number(n || 0).toLocaleString('ar-YE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatDateKey(key) {
  if (!key) return '—';
  const d = new Date(`${key}T12:00:00`);
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString('ar-YE', { dateStyle: 'medium' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' });
}
