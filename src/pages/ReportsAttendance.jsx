import { useEffect, useState } from 'react';
import { api } from '../api';
import { PERIOD_LABELS, todayKey, formatDateKey } from './reportsShared';

const STATUS_CELL = {
  present: 'ح',
  absent: 'غ',
  excused: '×',
  off: 'إ',
};

const STATUS_OPTIONS = [
  { value: 'present', label: 'حاضر' },
  { value: 'absent', label: 'غائب' },
  { value: 'excused', label: 'غائب بعذر' },
  { value: 'off', label: 'إجازة' },
];

export default function ReportsAttendance() {
  const [captains, setCaptains] = useState([]);
  const [groups, setGroups] = useState([]);
  const [date, setDate] = useState(todayKey());
  const [captainId, setCaptainId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editCell, setEditCell] = useState(null);
  const [editForm, setEditForm] = useState({ status: 'present', note: '' });
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const filteredCaptains = groupId
    ? captains.filter(c => c.group_id === groupId)
    : captains;

  const loadReport = () => {
    setLoading(true);
    api.getAttendanceMonthlyReport({
      date,
      captain_id: captainId || undefined,
      group_id: groupId || undefined,
    })
      .then(setReport)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.getCaptains().then(setCaptains);
    api.getCaptainGroups().then(setGroups);
  }, []);

  useEffect(() => {
    loadReport();
  }, [date, captainId, groupId]);

  const openEditCell = (row, cell) => {
    setEditCell({
      captain_id: row.captain_id,
      captain_name: row.captain_name,
      date: cell.date,
      day_name: cell.day_name,
      current_status: cell.status,
      is_manual: cell.is_manual,
    });
    setEditForm({ status: cell.status, note: cell.note || '' });
    setEditError('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editCell) return;
    setEditLoading(true);
    setEditError('');
    try {
      await api.saveAttendanceOverride({
        captain_id: editCell.captain_id,
        check_date: editCell.date,
        status: editForm.status,
        note: editForm.note,
      });
      setEditCell(null);
      loadReport();
    } catch (err) {
      setEditError(err.message || 'تعذر حفظ التعديل');
    } finally {
      setEditLoading(false);
    }
  };

  const handleResetCell = async () => {
    if (!editCell) return;
    setEditLoading(true);
    setEditError('');
    try {
      await api.clearAttendanceOverride(editCell.captain_id, editCell.date);
      setEditCell(null);
      loadReport();
    } catch (err) {
      setEditError(err.message || 'تعذر إعادة التعيين');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 report-print-hidden">
        <div>
          <h2>تقارير الكباتن</h2>
          <p>الحضور والغياب الشهري مع إمكانية الطباعة والتعديل</p>
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
            <label>المجموعة</label>
            <select value={groupId} onChange={e => { setGroupId(e.target.value); setCaptainId(''); }}>
              <option value="">كل المجموعات</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>الكابتن</label>
            <select value={captainId} onChange={e => setCaptainId(e.target.value)}>
              <option value="">كل الكباتن</option>
              {filteredCaptains.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.captain_number})</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">اضغط على أي خلية في الجدول لتعديل التحضير</p>
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
              <div className="attendance-stat attendance-stat--excused">
                <span className="attendance-stat-num">{report.summary.excused || 0}</span>
                <span className="attendance-stat-label">غائب بعذر</span>
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
                    <th>بعذر</th>
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
                          className={`attendance-matrix-cell attendance-matrix-cell--${cell.status} attendance-matrix-cell--editable${cell.is_manual ? ' is-manual' : ''}`}
                          title={[cell.checked_in_time, cell.note, cell.day_name].filter(Boolean).join(' — ')}
                          onClick={() => openEditCell(row, cell)}
                        >
                          {STATUS_CELL[cell.status]}
                        </td>
                      ))}
                      <td>{row.summary.present}</td>
                      <td>{row.summary.absent}</td>
                      <td>{row.summary.excused || 0}</td>
                      <td>{row.summary.off}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {editCell && (
        <div className="modal-overlay report-print-hidden" onClick={() => setEditCell(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>تعديل التحضير</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {editCell.captain_name} — {formatDateKey(editCell.date)} ({editCell.day_name})
            </p>
            {editError && <p className="text-red-500 text-sm mb-3">{editError}</p>}
            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label>الحالة</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>ملاحظة (اختياري)</label>
                <input
                  value={editForm.note}
                  onChange={e => setEditForm({ ...editForm, note: e.target.value })}
                  placeholder="سبب الغياب أو ملاحظة..."
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary" disabled={editLoading}>
                  {editLoading ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                {editCell.is_manual && (
                  <button type="button" className="btn btn-secondary" disabled={editLoading} onClick={handleResetCell}>
                    إعادة تلقائي
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={() => setEditCell(null)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
