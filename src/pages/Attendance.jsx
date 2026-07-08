import { useState, useEffect } from 'react';
import { api } from '../api';

const PERIOD_LABELS = { day: 'يوم', week: 'أسبوع', month: 'شهر' };

const STATUS_LABELS = {
  present: 'حاضر',
  absent: 'غائب',
  off: 'إجازة',
};

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function statusBadge(status) {
  if (status === 'present') return 'badge badge-green';
  if (status === 'absent') return 'badge badge-red';
  return 'badge badge-gray';
}

export default function Attendance() {
  const [captains, setCaptains] = useState([]);
  const [period, setPeriod] = useState('day');
  const [date, setDate] = useState(todayKey());
  const [captainId, setCaptainId] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getCaptains().then(setCaptains);
  }, []);

  const loadReport = () => {
    setLoading(true);
    api.getAttendanceReport({ period, date, captain_id: captainId || undefined })
      .then(setReport)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReport();
  }, [period, date, captainId]);

  return (
    <>
      <div className="page-header">
        <h2>تقارير الحضور</h2>
        <p>متابعة حضور وغياب الكباتن — بصمة التطبيق</p>
      </div>

      <div className="card mb-5">
        <div className="attendance-filters">
          <div className="form-group">
            <label>الفترة</label>
            <div className="attendance-period-btns">
              {Object.entries(PERIOD_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`btn ${period === key ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPeriod(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>التاريخ</label>
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

      {report && (
        <>
          <div className="attendance-summary">
            <div className="attendance-stat attendance-stat--present">
              <span className="attendance-stat-num">{report.summary.present}</span>
              <span className="attendance-stat-label">حاضر</span>
            </div>
            <div className="attendance-stat attendance-stat--absent">
              <span className="attendance-stat-num">{report.summary.absent}</span>
              <span className="attendance-stat-label">غائب</span>
            </div>
            {period === 'day' && (
              <div className="attendance-stat attendance-stat--off">
                <span className="attendance-stat-num">{report.summary.off}</span>
                <span className="attendance-stat-label">إجازة</span>
              </div>
            )}
          </div>

          <div className="card">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              من {report.from} إلى {report.to}
            </p>

            {loading ? (
              <p className="empty-state">جاري التحميل...</p>
            ) : report.rows.length === 0 ? (
              <p className="empty-state">لا توجد سجلات للفترة المحددة</p>
            ) : (
              <div className="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>الكابتن</th>
                      <th>الرقم</th>
                      {period !== 'day' && <th>التاريخ</th>}
                      {period !== 'day' && <th>اليوم</th>}
                      <th>الحالة</th>
                      <th>وقت البصمة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row, i) => (
                      <tr key={`${row.captain_id}-${row.date}-${i}`}>
                        <td>{row.captain_name}</td>
                        <td>{row.captain_number}</td>
                        {period !== 'day' && <td>{row.date}</td>}
                        {period !== 'day' && <td>{row.day_name}</td>}
                        <td>
                          <span className={statusBadge(row.status)}>
                            {STATUS_LABELS[row.status]}
                          </span>
                        </td>
                        <td>{row.checked_in_time || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
