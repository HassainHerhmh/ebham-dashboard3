import { useEffect, useState } from 'react';
import { api } from '../api';
import { PERIOD_LABELS, todayKey, getFilterRange, formatFilterHint, formatMoney, formatDateKey, formatDateTime } from './reportsShared';

const PAYMENT_FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'credit', label: 'آجل' },
  { key: 'transfer', label: 'حوالة' },
];

const PAYMENT_BADGE = {
  credit: 'badge badge-yellow',
  transfer: 'badge badge-blue',
};

export default function ReportsCreditTransfer() {
  const [captains, setCaptains] = useState([]);
  const [period, setPeriod] = useState('month');
  const [date, setDate] = useState(todayKey());
  const [fromDate, setFromDate] = useState(todayKey());
  const [toDate, setToDate] = useState(todayKey());
  const [captainId, setCaptainId] = useState('');
  const [paymentType, setPaymentType] = useState('all');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const range = getFilterRange(period, date, fromDate, toDate);

  useEffect(() => {
    api.getCaptains().then(setCaptains);
  }, []);

  useEffect(() => {
    setLoading(true);
    api.getCreditTransferReport({
      period,
      date,
      from: period === 'range' ? fromDate : undefined,
      to: period === 'range' ? toDate : undefined,
      captain_id: captainId || undefined,
      payment_type: paymentType === 'all' ? undefined : paymentType,
    })
      .then(setReport)
      .finally(() => setLoading(false));
  }, [period, date, fromDate, toDate, captainId, paymentType]);

  return (
    <>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 report-print-hidden">
        <div>
          <h2>تقرير الآجل والحوالات</h2>
          <p>طلبات الدفع آجل أو حوالة — حسب الكابتن والفترة</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => window.print()}>طباعة</button>
      </div>

      <div className="card mb-5 report-print-hidden">
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
          <div className="finance-page-filter">
            <select className="finance-filter-select" value={captainId} onChange={(e) => setCaptainId(e.target.value)}>
              <option value="">كل الكباتن</option>
              {captains.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.captain_number})</option>
              ))}
            </select>
            <select className="finance-filter-select" value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
              {PAYMENT_FILTERS.map((item) => (
                <option key={item.key} value={item.key}>{item.label}</option>
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
      </div>

      <div className="card report-page">
        <div className="report-print-header">
          <h3>تقرير الطلبات الآجلة والحوالات</h3>
          <p>
            من {formatDateKey(range.from)} إلى {formatDateKey(range.to)}
            {' — '}
            {PAYMENT_FILTERS.find((item) => item.key === paymentType)?.label || 'الكل'}
          </p>
        </div>

        {loading ? (
          <div className="empty-state">جاري التحميل...</div>
        ) : !report || report.rows.length === 0 ? (
          <div className="empty-state">لا توجد طلبات آجلة أو حوالات في الفترة المحددة</div>
        ) : (
          <>
            <div className="stats-grid report-print-hidden">
              <div className="stat-card">
                <div className="number">{report.summary.orders_count}</div>
                <div className="label">عدد الطلبات</div>
              </div>
              <div className="stat-card">
                <div className="number">{formatMoney(report.summary.total_amount)}</div>
                <div className="label">الإجمالي</div>
              </div>
              <div className="stat-card">
                <div className="number">{report.summary.credit_count}</div>
                <div className="label">طلبات آجل</div>
              </div>
              <div className="stat-card">
                <div className="number">{formatMoney(report.summary.credit_amount)}</div>
                <div className="label">مبلغ الآجل</div>
              </div>
              <div className="stat-card">
                <div className="number">{report.summary.transfer_count}</div>
                <div className="label">طلبات حوالة</div>
              </div>
              <div className="stat-card">
                <div className="number">{formatMoney(report.summary.transfer_amount)}</div>
                <div className="label">مبلغ الحوالات</div>
              </div>
            </div>

            <div className="report-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>التاريخ</th>
                    <th>الكابتن</th>
                    <th>العميل</th>
                    <th>الجوال</th>
                    <th>النوع</th>
                    <th>المبلغ</th>
                    <th>الفاتورة</th>
                    <th>خارجي</th>
                    <th>التوصيل</th>
                    <th>الترحيل</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.order_number || '—'}</td>
                      <td>{formatDateKey(row.order_date)}</td>
                      <td>
                        {row.captain_name}
                        {row.captain_number ? ` (${row.captain_number})` : ''}
                      </td>
                      <td>{row.customer_name || '—'}</td>
                      <td>{row.customer_phone || '—'}</td>
                      <td>
                        <span className={PAYMENT_BADGE[row.payment_type] || 'badge badge-gray'}>
                          {row.payment_label}
                        </span>
                      </td>
                      <td><strong>{formatMoney(row.amount)} ر.ي</strong></td>
                      <td>{formatMoney(row.invoice_total_net)} ر.ي</td>
                      <td>{formatMoney(row.external_total)} ر.ي</td>
                      <td>{formatMoney(row.delivery_fee)} ر.ي</td>
                      <td>
                        {row.finance_posted
                          ? formatDateTime(row.finance_posted_at)
                          : <span className="badge badge-gray">غير مرحّل</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={6}><strong>الإجمالي</strong></td>
                    <td><strong>{formatMoney(report.summary.total_amount)} ر.ي</strong></td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
