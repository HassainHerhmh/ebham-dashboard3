import { useEffect, useState } from 'react';
import { api } from '../api';
import { PERIOD_LABELS, todayKey, getFilterRange, formatFilterHint, formatMoney, formatDateKey, formatDateTime } from './reportsShared';

export default function ReportsSales() {
  const [captains, setCaptains] = useState([]);
  const [period, setPeriod] = useState('month');
  const [date, setDate] = useState(todayKey());
  const [fromDate, setFromDate] = useState(todayKey());
  const [toDate, setToDate] = useState(todayKey());
  const [captainId, setCaptainId] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const range = getFilterRange(period, date, fromDate, toDate);

  useEffect(() => {
    api.getCaptains().then(setCaptains);
  }, []);

  useEffect(() => {
    setLoading(true);
    api.getSalesReport({
      period,
      date,
      from: period === 'range' ? fromDate : undefined,
      to: period === 'range' ? toDate : undefined,
      captain_id: captainId || undefined,
    })
      .then(setReport)
      .finally(() => setLoading(false));
  }, [period, date, fromDate, toDate, captainId]);

  return (
    <>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 report-print-hidden">
        <div>
          <h2>تقارير المبيعات</h2>
          <p>ملخص فواتير الكباتن والحوالات/الديون</p>
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
            <select className="finance-filter-select" value={captainId} onChange={e => setCaptainId(e.target.value)}>
              <option value="">كل الكباتن</option>
              {captains.map(c => <option key={c.id} value={c.id}>{c.name} ({c.captain_number})</option>)}
            </select>
            {period === 'range' ? (
              <>
                <input className="finance-filter-date-input" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                <input className="finance-filter-date-input" type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
              </>
            ) : (
              <input className="finance-filter-date-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
            )}
            <span className="finance-filter-hint">{formatFilterHint(period, range)}</span>
          </div>
        </div>
      </div>

      <div className="card report-page">
        <div className="report-print-header">
          <h3>تقرير مبيعات الكباتن</h3>
          <p>من {formatDateKey(range.from)} إلى {formatDateKey(range.to)}</p>
        </div>

        {loading ? (
          <div className="empty-state">جاري التحميل...</div>
        ) : !report || report.rows.length === 0 ? (
          <div className="empty-state">لا توجد بيانات للفترة المحددة</div>
        ) : (
          <>
            <div className="stats-grid report-print-hidden">
              <div className="stat-card"><div className="number">{formatMoney(report.summary.total_invoices)}</div><div className="label">إجمالي الفواتير</div></div>
              <div className="stat-card"><div className="number">{report.summary.orders_count || 0}</div><div className="label">عدد الطلبات</div></div>
              <div className="stat-card"><div className="number">{formatMoney(report.summary.transfers_debts)}</div><div className="label">الحوالات + الديون</div></div>
              <div className="stat-card"><div className="number">{formatMoney(report.summary.total_commission)}</div><div className="label">إجمالي العمولة</div></div>
              <div className="stat-card"><div className="number">{formatMoney(report.summary.captain_net_commission)}</div><div className="label">صافي عمولة الكابتن</div></div>
              <div className="stat-card"><div className="number">{formatMoney(report.summary.rent)}</div><div className="label">الإيجار</div></div>
              <div className="stat-card"><div className="number">{formatMoney(report.summary.remaining_for_company)}</div><div className="label">المتبقي للشركة</div></div>
            </div>

            <div className="report-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>الكابتن</th>
                    <th>الرقم</th>
                    <th>إجمالي الفواتير</th>
                    <th>عدد الطلبات</th>
                    <th>الحوالات + الديون</th>
                    <th>العمولة</th>
                    <th>صافي عمولة الكابتن</th>
                    <th>الإيجار</th>
                    <th>المتبقي للشركة</th>
                    <th>التاريخ</th>
                    <th>تاريخ الترحيل</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map(row => (
                    <tr key={row.id}>
                      <td>{row.captain_name}</td>
                      <td>{row.captain_number}</td>
                      <td>{formatMoney(row.total_invoices)} ر.ي</td>
                      <td>{Number(row.orders_count || 0)}</td>
                      <td>{formatMoney(row.transfers_debts)} ر.ي</td>
                      <td>{formatMoney(row.total_commission)} ر.ي</td>
                      <td>{formatMoney(row.captain_net_commission)} ر.ي</td>
                      <td>{formatMoney(row.rent)} ر.ي</td>
                      <td><strong>{formatMoney(row.remaining_for_company)} ر.ي</strong></td>
                      <td>{formatDateKey(row.sales_date)}</td>
                      <td>{formatDateTime(row.posted_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
