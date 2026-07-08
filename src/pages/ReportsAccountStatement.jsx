import { useEffect, useState } from 'react';
import { api } from '../api';
import { PERIOD_LABELS, todayKey, getFilterRange, formatFilterHint, formatMoney, formatDateKey } from './reportsShared';

const REF_LABELS = {
  opening: 'رصيد سابق',
  order: 'فاتورة طلب',
  credit: 'آجل',
  transfer: 'حوالة',
  invoice_posting: 'ترحيل فواتير',
  company_commission: 'عمولة الشركة',
  rent: 'إيجار',
  receipt: 'سند قبض',
  disbursement: 'سند صرف',
  transfer_in: 'تحويل وارد',
  transfer_out: 'تحويل صادر',
};

function getDisplayDebit(row) {
  if (row.is_opening) return row.balance < 0 ? Math.abs(row.balance) : 0;
  return Number(row.debit || 0);
}

function getDisplayCredit(row) {
  if (row.is_opening) return row.balance >= 0 ? Math.abs(row.balance) : 0;
  return Number(row.credit || 0);
}

function balanceClass(balance) {
  return balance >= 0
    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
}

export default function ReportsAccountStatement() {
  const [captains, setCaptains] = useState([]);
  const [period, setPeriod] = useState('day');
  const [date, setDate] = useState(todayKey());
  const [fromDate, setFromDate] = useState(todayKey());
  const [toDate, setToDate] = useState(todayKey());
  const [captainId, setCaptainId] = useState('');
  const [mode, setMode] = useState('detailed');
  const [includeOpening, setIncludeOpening] = useState(true);
  const [search, setSearch] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const range = getFilterRange(period, date, fromDate, toDate);

  useEffect(() => {
    api.getCaptains().then(setCaptains);
  }, []);

  useEffect(() => {
    if (!captainId) {
      setReport(null);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    api.getAccountStatement({
      period,
      date,
      from: period === 'range' ? fromDate : undefined,
      to: period === 'range' ? toDate : undefined,
      captain_id: captainId,
      mode,
      include_opening: includeOpening,
    })
      .then(setReport)
      .catch((err) => {
        setReport(null);
        setError(err.message || 'تعذر تحميل كشف الحساب');
      })
      .finally(() => setLoading(false));
  }, [period, date, fromDate, toDate, captainId, mode, includeOpening]);

  const rows = (report?.rows || []).filter((row) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      row.notes?.toLowerCase().includes(q)
      || row.reference_id?.toString().toLowerCase().includes(q)
      || (REF_LABELS[row.reference_type] || row.reference_type)?.toLowerCase().includes(q)
    );
  });

  const captainLabel = report?.captain
    ? `${report.captain.name} (${report.captain.captain_number})`
    : '—';

  return (
    <>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 report-print-hidden">
        <div>
          <h2>كشف حساب الكابتن</h2>
          <p>حركة مالية تفصيلية: طلبات، عمولات، سندات، ورصيد جاري</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => window.print()}>طباعة</button>
      </div>

      <div className="card mb-5 report-print-hidden space-y-4">
        <div className="finance-tabs-bar">
          <div className="finance-filter-periods">
            {Object.entries(PERIOD_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`finance-filter-period-btn ${period === key ? 'active' : ''}`}
                onClick={() => setPeriod(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="finance-page-filter flex-wrap">
            <select
              className="finance-filter-select"
              value={captainId}
              onChange={(e) => setCaptainId(e.target.value)}
            >
              <option value="">اختر الكابتن...</option>
              {captains.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.captain_number})</option>
              ))}
            </select>
            {period === 'range' ? (
              <>
                <input className="finance-filter-date-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                <input className="finance-filter-date-input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </>
            ) : (
              <input className="finance-filter-date-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            )}
            <span className="finance-filter-hint">{formatFilterHint(period, range)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              type="button"
              className={`px-3 py-1.5 rounded-md text-sm font-semibold ${mode === 'detailed' ? 'bg-white dark:bg-gray-800 shadow' : ''}`}
              onClick={() => setMode('detailed')}
            >
              تحليلي (طلبات)
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-md text-sm font-semibold ${mode === 'summary' ? 'bg-white dark:bg-gray-800 shadow' : ''}`}
              onClick={() => setMode('summary')}
            >
              تجميعي (يومي)
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input type="checkbox" checked={includeOpening} onChange={(e) => setIncludeOpening(e.target.checked)} />
            مع الرصيد السابق
          </label>
          <input
            type="text"
            className="finance-filter-select max-w-xs"
            placeholder="بحث في البيان..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card report-page">
        <div className="report-print-header">
          <h3>كشف حساب الكابتن التحليلي</h3>
          <p>الكابتن: {captainLabel}</p>
          <p>من {formatDateKey(range.from)} إلى {formatDateKey(range.to)}</p>
        </div>

        {!captainId && (
          <p className="text-gray-500 dark:text-gray-400 py-8 text-center">اختر كابتناً لعرض كشف الحساب</p>
        )}

        {error && <p className="text-red-600 py-4 text-center">{error}</p>}
        {loading && captainId && <p className="text-gray-500 py-8 text-center">جاري التحميل...</p>}

        {!loading && captainId && report && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 report-print-hidden">
              <div className="rounded-xl border dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/40">
                <p className="text-xs text-gray-500">رصيد افتتاحي</p>
                <p className="font-bold text-lg">{formatMoney(report.summary.opening_balance)}</p>
              </div>
              <div className="rounded-xl border dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/40">
                <p className="text-xs text-gray-500">رصيد ختامي</p>
                <p className="font-bold text-lg">{formatMoney(Math.abs(report.summary.closing_balance))}</p>
                <span className={`text-xs px-2 py-0.5 rounded ${balanceClass(report.summary.closing_balance)}`}>
                  {report.summary.closing_status}
                </span>
              </div>
              <div className="rounded-xl border dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/40">
                <p className="text-xs text-gray-500">إجمالي مدين</p>
                <p className="font-bold text-lg text-red-600">{formatMoney(report.summary.total_debit)}</p>
              </div>
              <div className="rounded-xl border dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/40">
                <p className="text-xs text-gray-500">إجمالي دائن</p>
                <p className="font-bold text-lg text-green-600">{formatMoney(report.summary.total_credit)}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table statement-table w-full text-sm">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>المستند</th>
                    <th>المرجع</th>
                    <th>مدين</th>
                    <th>دائن</th>
                    <th>الرصيد</th>
                    <th>الحالة</th>
                    <th>البيان</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-gray-500 py-8">لا توجد حركات في هذه الفترة</td>
                    </tr>
                  ) : rows.map((row, idx) => (
                    <tr key={`${row.reference_type}-${row.reference_id}-${idx}`} className={row.is_opening ? 'bg-blue-50/60 dark:bg-blue-900/20 font-semibold' : ''}>
                      <td>{row.is_opening ? '—' : formatDateKey(row.journal_date)}</td>
                      <td>{REF_LABELS[row.reference_type] || row.reference_type}</td>
                      <td>{row.is_opening ? '—' : (row.reference_id || '—')}</td>
                      <td className="text-red-600 font-semibold">{formatMoney(getDisplayDebit(row))}</td>
                      <td className="text-green-600 font-semibold">{formatMoney(getDisplayCredit(row))}</td>
                      <td className="font-bold">{formatMoney(Math.abs(row.balance))}</td>
                      <td>
                        <span className={`text-xs px-2 py-0.5 rounded ${balanceClass(row.balance)}`}>
                          {row.balance_status}
                        </span>
                      </td>
                      <td className="text-right max-w-md">{row.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="font-bold bg-yellow-50 dark:bg-yellow-900/20">
                      <td colSpan={3}>الإجمالي</td>
                      <td className="text-red-700">{formatMoney(report.summary.total_debit)}</td>
                      <td className="text-green-700">{formatMoney(report.summary.total_credit)}</td>
                      <td>{formatMoney(Math.abs(report.summary.closing_balance))}</td>
                      <td>
                        <span className={`text-xs px-2 py-0.5 rounded ${balanceClass(report.summary.closing_balance)}`}>
                          {report.summary.closing_status}
                        </span>
                      </td>
                      <td>{report.summary.entries_count} حركة</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
