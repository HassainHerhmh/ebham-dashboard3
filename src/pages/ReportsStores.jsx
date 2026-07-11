import { Fragment, useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { api } from '../api';
import { PERIOD_LABELS, todayKey, getFilterRange, formatFilterHint, formatMoney, formatDateKey } from './reportsShared';

function entryLabel(entry) {
  if (entry.order_number) return `طلب #${entry.order_number}`;
  return 'فاتورة يدوية';
}

export default function ReportsStores() {
  const [period, setPeriod] = useState('month');
  const [date, setDate] = useState(todayKey());
  const [fromDate, setFromDate] = useState(todayKey());
  const [toDate, setToDate] = useState(todayKey());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedStores, setExpandedStores] = useState(() => new Set());
  const range = getFilterRange(period, date, fromDate, toDate);

  useEffect(() => {
    setLoading(true);
    setExpandedStores(new Set());
    api.getStoresReport({
      period,
      date,
      from: period === 'range' ? fromDate : undefined,
      to: period === 'range' ? toDate : undefined,
    })
      .then(setReport)
      .finally(() => setLoading(false));
  }, [period, date, fromDate, toDate]);

  const toggleStore = (storeId) => {
    setExpandedStores((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) next.delete(storeId);
      else next.add(storeId);
      return next;
    });
  };

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
                  {report.stores.map(store => {
                    const expanded = expandedStores.has(store.store_id);
                    return (
                      <Fragment key={store.store_id}>
                        <tr className={`report-store-row${expanded ? ' is-expanded' : ''}`}>
                          <td>
                            <button
                              type="button"
                              className="report-store-toggle"
                              onClick={() => toggleStore(store.store_id)}
                              aria-expanded={expanded}
                            >
                              <ChevronDown
                                className={`report-store-toggle__chevron${expanded ? ' is-open' : ''}`}
                                size={18}
                                aria-hidden
                              />
                              <span>{store.store_name}</span>
                            </button>
                          </td>
                          <td>{formatMoney(store.total_sales)} ر.ي</td>
                          <td>{store.captains_count}</td>
                          <td>{store.entries_count}</td>
                        </tr>
                        {expanded && (
                          <tr className="report-store-detail-row report-print-hidden">
                            <td colSpan={4}>
                              <div className="report-store-invoices">
                                <div className="report-store-invoices__title">
                                  فواتير {store.store_name} ({store.entries_count})
                                </div>
                                <table className="report-store-invoices__table">
                                  <thead>
                                    <tr>
                                      <th>التاريخ</th>
                                      <th>الكابتن</th>
                                      <th>الفاتورة</th>
                                      <th>المبلغ</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {store.entries.map(entry => (
                                      <tr key={entry.id || `${entry.sales_date}-${entry.captain_id}-${entry.amount}`}>
                                        <td>{formatDateKey(entry.sales_date)}</td>
                                        <td>
                                          {entry.captain_name}
                                          {entry.captain_number ? ` (${entry.captain_number})` : ''}
                                        </td>
                                        <td>{entryLabel(entry)}</td>
                                        <td>{formatMoney(entry.amount)} ر.ي</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
