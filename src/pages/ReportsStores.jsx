import { useEffect, useState } from 'react';
import { api } from '../api';
import { PERIOD_LABELS, todayKey, getFilterRange, formatFilterHint, formatMoney, formatDateKey } from './reportsShared';

export default function ReportsStores() {
  const [period, setPeriod] = useState('month');
  const [date, setDate] = useState(todayKey());
  const [fromDate, setFromDate] = useState(todayKey());
  const [toDate, setToDate] = useState(todayKey());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const range = getFilterRange(period, date, fromDate, toDate);

  useEffect(() => {
    setLoading(true);
    api.getStoresReport({
      period,
      date,
      from: period === 'range' ? fromDate : undefined,
      to: period === 'range' ? toDate : undefined,
    })
      .then(setReport)
      .finally(() => setLoading(false));
  }, [period, date, fromDate, toDate]);

  return (
    <>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 report-print-hidden">
        <div>
          <h2>تقارير المحلات</h2>
          <p>تجميع المبيعات حسب المحل خلال الفترة المحددة</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => window.print()}>طباعة</button>
      </div>

      <div className="card mb-5 report-print-hidden">
        <div className="finance-tabs-bar">
          <div className="finance-filter-periods">
            {Object.entries(PERIOD_LABELS).map(([key, label]) => (
              <button key={key} type="button" className={`finance-filter-period-btn ${period === key ? 'active' : ''}`} onClick={() => setPeriod(key)}>{label}</button>
            ))}
          </div>
          <div className="finance-page-filter">
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
          <h3>تقرير المحلات</h3>
          <p>من {formatDateKey(range.from)} إلى {formatDateKey(range.to)}</p>
        </div>

        {loading ? (
          <div className="empty-state">جاري التحميل...</div>
        ) : !report || report.stores.length === 0 ? (
          <div className="empty-state">لا توجد بيانات للفترة المحددة</div>
        ) : (
          <>
            <div className="stats-grid report-print-hidden">
              <div className="stat-card"><div className="number">{report.summary.stores_count}</div><div className="label">عدد المحلات</div></div>
              <div className="stat-card"><div className="number">{formatMoney(report.summary.total_sales)}</div><div className="label">إجمالي المبيعات</div></div>
              <div className="stat-card"><div className="number">{report.summary.entries_count}</div><div className="label">عدد السجلات</div></div>
            </div>

            <div className="report-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>المحل</th>
                    <th>إجمالي المبيعات</th>
                    <th>عدد الكباتن</th>
                    <th>عدد السجلات</th>
                  </tr>
                </thead>
                <tbody>
                  {report.stores.map(store => (
                    <tr key={store.store_id}>
                      <td>{store.store_name}</td>
                      <td>{formatMoney(store.total_sales)} ر.ي</td>
                      <td>{store.captains_count}</td>
                      <td>{store.entries_count}</td>
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
