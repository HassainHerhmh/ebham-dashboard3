import { Fragment, useEffect, useState } from 'react';
import { ChevronDown, FileDown, X } from 'lucide-react';
import { api } from '../api';
import {
  PERIOD_LABELS,
  todayKey,
  getFilterRange,
  formatFilterHint,
  formatMoney,
  formatDateKey,
} from './reportsShared';

function entryLabel(entry) {
  if (entry.order_number) return `طلب #${entry.order_number}`;
  return 'فاتورة يدوية';
}

const EXPORT_COLUMNS = [
  { key: 'date', label: 'التاريخ' },
  { key: 'captain', label: 'الكابتن' },
  { key: 'captain_number', label: 'رقم الكابتن' },
  { key: 'invoice', label: 'الفاتورة' },
  { key: 'amount', label: 'المبلغ' },
];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

export default function ReportsStores() {
  const [period, setPeriod] = useState('month');
  const [date, setDate] = useState(todayKey());
  const [fromDate, setFromDate] = useState(todayKey());
  const [toDate, setToDate] = useState(todayKey());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedStores, setExpandedStores] = useState(() => new Set());
  const [selectedStore, setSelectedStore] = useState(null);
  const [selectedColumns, setSelectedColumns] = useState(
    () => EXPORT_COLUMNS.map((column) => column.key)
  );

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

  const toggleExportColumn = (columnKey, checked) => {
    setSelectedColumns((prev) => (
      checked
        ? [...prev, columnKey]
        : prev.filter((key) => key !== columnKey)
    ));
  };

  const exportStorePdf = () => {
    if (!selectedStore) return;

    const columns = EXPORT_COLUMNS.filter((column) =>
      selectedColumns.includes(column.key)
    );

    if (columns.length === 0) {
      window.alert('يرجى تحديد عمود واحد على الأقل');
      return;
    }

    // Open the print window directly from the button click to avoid popup blocking.
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      window.alert('يرجى السماح بفتح النوافذ المنبثقة لهذا الموقع');
      return;
    }

    const tableRows = selectedStore.entries.map((entry) => {
      const cells = columns.map((column) => {
        let value = '';

        switch (column.key) {
          case 'date':
            value = formatDateKey(entry.sales_date);
            break;
          case 'captain':
            value = entry.captain_name || '-';
            break;
          case 'captain_number':
            value = entry.captain_number || '-';
            break;
          case 'invoice':
            value = entryLabel(entry);
            break;
          case 'amount':
            value = `${formatMoney(entry.amount)} ر.ي`;
            break;
          default:
            value = '';
        }

        return `<td>${escapeHtml(value)}</td>`;
      }).join('');

      return `<tr>${cells}</tr>`;
    }).join('');

    const tableHeaders = columns
      .map((column) => `<th>${escapeHtml(column.label)}</th>`)
      .join('');

    const storeName = escapeHtml(selectedStore.store_name);
    const from = escapeHtml(formatDateKey(range.from));
    const to = escapeHtml(formatDateKey(range.to));
    const totalSales = escapeHtml(formatMoney(selectedStore.total_sales));
    const entriesCount = escapeHtml(selectedStore.entries_count);

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>تقرير ${storeName}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              direction: rtl;
              text-align: right;
              font-family: Tahoma, Arial, sans-serif;
              color: #222;
              padding: 24px;
              margin: 0;
            }
            .report-heading {
              text-align: center;
              margin-bottom: 24px;
            }
            .report-heading h2 {
              margin: 0 0 10px;
              font-size: 23px;
            }
            .report-heading h3 {
              margin: 0 0 8px;
              font-size: 18px;
            }
            .report-heading p {
              margin: 0;
              color: #555;
            }
            .summary {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              flex-wrap: wrap;
              padding: 14px 16px;
              margin-bottom: 20px;
              background: #f5f5f5;
              border: 1px solid #e5e5e5;
              border-radius: 8px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #d8d8d8;
              padding: 10px 8px;
              text-align: center;
              vertical-align: middle;
            }
            th {
              background: #f0f0f0;
              font-weight: 700;
            }
            tr { page-break-inside: avoid; }
            @page { margin: 14mm; }
            @media print {
              body { padding: 0; }
              .summary { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
              th { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <header class="report-heading">
            <h2>تقرير مبيعات المحل</h2>
            <h3>${storeName}</h3>
            <p>من ${from} إلى ${to}</p>
          </header>

          <section class="summary">
            <strong>إجمالي المبيعات: ${totalSales} ر.ي</strong>
            <strong>عدد السجلات: ${entriesCount}</strong>
          </section>

          <table>
            <thead><tr>${tableHeaders}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>

          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
    setSelectedStore(null);
  };

  return (
    <>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 report-print-hidden">
        <div>
          <h2>تقارير المحلات</h2>
          <p>تجميع المبيعات حسب المحل خلال الفترة المحددة</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
          طباعة
        </button>
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
            {period === 'range' ? (
              <>
                <input
                  className="finance-filter-date-input"
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                />
                <input
                  className="finance-filter-date-input"
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                />
              </>
            ) : (
              <input
                className="finance-filter-date-input"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
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
              <div className="stat-card">
                <div className="number">{report.summary.stores_count}</div>
                <div className="label">عدد المحلات</div>
              </div>
              <div className="stat-card">
                <div className="number">{formatMoney(report.summary.total_sales)}</div>
                <div className="label">إجمالي المبيعات</div>
              </div>
              <div className="stat-card">
                <div className="number">{report.summary.entries_count}</div>
                <div className="label">عدد السجلات</div>
              </div>
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
                  {report.stores.map((store) => {
                    const expanded = expandedStores.has(store.store_id);

                    return (
                      <Fragment key={store.store_id}>
                        <tr className={`report-store-row${expanded ? ' is-expanded' : ''}`}>
                          <td>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '10px',
                              }}
                            >
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

                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => {
                                  setSelectedColumns(EXPORT_COLUMNS.map((column) => column.key));
                                  setSelectedStore(store);
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <FileDown size={16} />
                                تصدير PDF
                              </button>
                            </div>
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
                                    {store.entries.map((entry) => (
                                      <tr
                                        key={
                                          entry.id ||
                                          `${entry.sales_date}-${entry.captain_id}-${entry.amount}`
                                        }
                                      >
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

      {selectedStore && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedStore(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(0, 0, 0, 0.5)',
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="store-export-title"
            className="card"
            style={{
              width: '100%',
              maxWidth: '460px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '22px',
              background: 'var(--card-bg, #fff)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '12px',
              }}
            >
              <h3 id="store-export-title" style={{ margin: 0 }}>تصدير تقرير PDF</h3>
              <button
                type="button"
                className="btn btn-secondary"
                aria-label="إغلاق"
                onClick={() => setSelectedStore(null)}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ marginBottom: '16px' }}>
              المحل: <strong>{selectedStore.store_name}</strong>
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                marginBottom: '14px',
              }}
            >
              <strong>الأعمدة التي ستظهر في التقرير</strong>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedColumns((prev) => (
                    prev.length === EXPORT_COLUMNS.length
                      ? []
                      : EXPORT_COLUMNS.map((column) => column.key)
                  ));
                }}
              >
                {selectedColumns.length === EXPORT_COLUMNS.length ? 'إلغاء الكل' : 'تحديد الكل'}
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '14px',
                marginBottom: '24px',
              }}
            >
              {EXPORT_COLUMNS.map((column) => (
                <label
                  key={column.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(column.key)}
                    onChange={(event) => toggleExportColumn(column.key, event.target.checked)}
                  />
                  {column.label}
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={selectedColumns.length === 0}
                onClick={exportStorePdf}
              >
                <FileDown size={16} />
                تصدير PDF
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setSelectedStore(null)}
              >
                إلغاء
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
