import { useEffect, useState } from 'react';
import { api } from '../api';
import { PERIOD_LABELS, todayKey, formatDateKey } from './reportsShared';

const STATUS_CELL = {
  present: 'ح',
  absent: 'غ',
  off: 'إ',
};

export default function ReportsAttendance() {
  const [captains, setCaptains] = useState([]);
  const [date, setDate] = useState(todayKey());
  const [captainId, setCaptainId] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getCaptains().then(setCaptains);
  }, []);

  useEffect(() => {
    setLoading(true);
    api.getAttendanceMonthlyReport({ date, captain_id: captainId || undefined })
      .then(setReport)
      .finally(() => setLoading(false));
  }, [date, captainId]);

  return (
    <>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 report-print-hidden">
        <div>
          <h2>تقارير الكباتن</h2>
          <p>الحضور والغياب الشهري مع إمكانية الطباعة</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
          طباعة
        </button>
      </div>

      <div className="card mb-5 report-print-hidden">
        <div className="attendance-filters">
          <div className="form-group">
            <label>الفترة</label>
            <div className="attendance-period-btns">
              <button type="button" className="btn btn-primary" disabled>{PERIOD_LABELS.month}</button>
            </div>
          </div>
          <div className="form-group">
            <label>الشهر المرجعي</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>الكابتن</label>
            <select value={captainId} onChange={e => setCaptainId(e.target.value)}>
              <option value="">كل الكباتن</option>
              {captains.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.captain_number})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card report-page">
        {report && (
          <div className="report-print-header">
            <h3>تقرير حضور الكباتن الشهري</h3>
            <p>من {formatDateKey(report.from)} إلى {formatDateKey(report.to)}</p>
          </div>
        )}

        {loading ? (
          <div className="empty-state">جاري التحميل...</div>
        ) : !report || report.rows.length === 0 ? (
          <div className="empty-state">لا توجد بيانات للشهر المحدد</div>
        ) : (
          <>
            <div className="attendance-summary report-print-hidden">
              <div className="attendance-stat attendance-stat--present">
                <span className="attendance-stat-num">{report.summary.present}</span>
                <span className="attendance-stat-label">حاضر</span>
              </div>
              <div className="attendance-stat attendance-stat--absent">
                <span className="attendance-stat-num">{report.summary.absent}</span>
                <span className="attendance-stat-label">غائب</span>
              </div>
              <div className="attendance-stat attendance-stat--off">
                <span className="attendance-stat-num">{report.summary.off}</span>
                <span className="attendance-stat-label">إجازة</span>
              </div>
            </div>

            <div className="report-table-wrap">
              <table className="attendance-matrix-table">
                <thead>
                  <tr>
                    <th>الكابتن</th>
                    <th>الرقم</th>
                    {report.days.map(day => (
                      <th key={day.date} className="attendance-matrix-day">
                        <div>{day.day}</div>
                        <small>{day.day_name}</small>
                      </th>
                    ))}
                    <th>حاضر</th>
                    <th>غائب</th>
                    <th>إجازة</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row) => (
                    <tr key={row.captain_id}>
                      <td>{row.captain_name}</td>
                      <td>{row.captain_number}</td>
                      {row.cells.map((cell) => (
                        <td
                          key={cell.date}
                          className={`attendance-matrix-cell attendance-matrix-cell--${cell.status}`}
                          title={cell.checked_in_time || cell.day_name}
                        >
                          {STATUS_CELL[cell.status]}
                        </td>
                      ))}
                      <td>{row.summary.present}</td>
                      <td>{row.summary.absent}</td>
                      <td>{row.summary.off}</td>
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
