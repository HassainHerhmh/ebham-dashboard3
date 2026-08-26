import { useEffect, useState } from 'react';
import { Download, HardDrive, RefreshCw } from 'lucide-react';
import { api, mediaUrl } from '../api';
import { hasPermission } from '../utils/permissions';

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const size = value / (1024 ** index);
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDateTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('ar-YE');
  } catch {
    return value;
  }
}

export default function Backup({ user }) {
  const canEdit = hasPermission(user, 'backup', 'edit');
  const [config, setConfig] = useState({
    backup_path: './backups',
    backup_time: '21:00',
    is_active: true,
    retention_days: 30,
    resolved_path: '',
  });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [cfg, rows] = await Promise.all([
        api.getBackupConfig(),
        api.getBackupHistory(),
      ]);
      setConfig({
        ...cfg,
        is_active: Boolean(cfg.is_active),
        retention_days: Number(cfg.retention_days || 30),
      });
      setHistory(rows);
    } catch (err) {
      setError(err.message || 'تعذر تحميل إعدادات النسخ الاحتياطي');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setMsg('');
    setError('');
    try {
      const saved = await api.saveBackupConfig({
        backup_path: config.backup_path.trim(),
        backup_time: config.backup_time,
        is_active: config.is_active ? 1 : 0,
        retention_days: Number(config.retention_days || 30),
      });
      setConfig({
        ...saved,
        is_active: Boolean(saved.is_active),
        retention_days: Number(saved.retention_days || 30),
      });
      setMsg('تم حفظ إعدادات النسخ الاحتياطي');
      await load();
    } catch (err) {
      setError(err.message || 'تعذر حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const handleRunNow = async () => {
    if (!canEdit) return;
    setRunning(true);
    setMsg('');
    setError('');
    try {
      const result = await api.runBackupNow();
      if (result.skipped) {
        setMsg('تم إنشاء نسخة اليوم مسبقاً');
      } else {
        setMsg(`تم إنشاء النسخة: ${result.file_name}`);
      }
      await load();
    } catch (err) {
      setError(err.message || 'تعذر إنشاء النسخة الاحتياطية');
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2>النسخ الاحتياطي</h2>
          <p>نسخ احتياطي يومي تلقائي لقاعدة البيانات — افتراضياً الساعة 9:00 مساءً بتوقيت اليمن</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          تحديث
        </button>
      </div>

      {msg && <p className="text-sm font-medium text-green-600 mb-4">{msg}</p>}
      {error && <p className="text-sm font-medium text-red-600 mb-4">{error}</p>}

      <div className="card shift-reminder-card mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <HardDrive size={18} />
              النسخ التلقائي
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              يتم إنشاء ملف SQL مضغوط يومياً في المسار المحدد
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(config.is_active)}
              disabled={!canEdit}
              onChange={(e) => setConfig({ ...config, is_active: e.target.checked })}
            />
            <span className="font-medium">تفعيل النسخ اليومي</span>
          </label>
        </div>

        {loading ? (
          <div className="empty-state">جاري التحميل...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="form-row">
              <div className="form-group flex-1">
                <label>مسار حفظ النسخ</label>
                <input
                  value={config.backup_path || './backups'}
                  disabled={!canEdit}
                  onChange={(e) => setConfig({ ...config, backup_path: e.target.value })}
                  placeholder="./backups أو مسار مطلق على السيرفر"
                />
                <span className="text-xs text-gray-500">
                  المسار الفعلي: {config.resolved_path || '—'}
                </span>
              </div>
              <div className="form-group">
                <label>وقت النسخ يومياً</label>
                <input
                  type="time"
                  value={config.backup_time || '21:00'}
                  disabled={!canEdit}
                  onChange={(e) => setConfig({ ...config, backup_time: e.target.value })}
                />
                <span className="text-xs text-gray-500">9:00 مساءً = 21:00</span>
              </div>
              <div className="form-group">
                <label>مدة الاحتفاظ (أيام)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={config.retention_days || 30}
                  disabled={!canEdit}
                  onChange={(e) => setConfig({ ...config, retention_days: e.target.value })}
                />
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3 text-sm space-y-1">
              <div><strong>آخر نسخة:</strong> {formatDateTime(config.last_backup_at)}</div>
              <div><strong>الملف:</strong> {config.last_backup_file || '—'}</div>
              <div><strong>الحالة:</strong> {config.last_backup_status || '—'}</div>
              {config.last_backup_error && (
                <div className="text-red-600"><strong>آخر خطأ:</strong> {config.last_backup_error}</div>
              )}
            </div>

            {canEdit && (
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                  {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleRunNow}
                  disabled={running}
                >
                  {running ? 'جاري النسخ...' : 'نسخ الآن'}
                </button>
              </div>
            )}
          </form>
        )}
      </div>

      <div className="card">
        <h3 className="text-lg font-bold mb-4">سجل النسخ</h3>
        {history.length === 0 ? (
          <div className="empty-state">لا توجد نسخ احتياطية بعد</div>
        ) : (
          <div className="table-wrap overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>الملف</th>
                  <th>الحجم</th>
                  <th>التاريخ</th>
                  <th>تحميل</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.file_name}>
                    <td>{row.file_name}</td>
                    <td>{formatBytes(row.size_bytes)}</td>
                    <td>{formatDateTime(row.created_at)}</td>
                    <td>
                      <a
                        className="btn btn-secondary btn-sm inline-flex items-center gap-1"
                        href={mediaUrl(`/api/backup/download/${encodeURIComponent(row.file_name)}`)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Download size={14} />
                        تحميل
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
