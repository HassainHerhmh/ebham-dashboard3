import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  Download,
  Folder,
  FolderOpen,
  FolderPlus,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState('');
  const [browseData, setBrowseData] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

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

  const loadBrowse = async (pathValue = '') => {
    setBrowseLoading(true);
    setBrowseError('');
    try {
      const data = await api.browseBackupPath(pathValue);
      setBrowseData(data);
    } catch (err) {
      setBrowseError(err.message || 'تعذر عرض المجلدات');
    } finally {
      setBrowseLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openPicker = async () => {
    setPickerOpen(true);
    setNewFolderName('');
    await loadBrowse(config.resolved_path || config.backup_path || '');
  };

  const handleSelectCurrentFolder = () => {
    if (!browseData?.stored_path) return;
    setConfig((prev) => ({
      ...prev,
      backup_path: browseData.stored_path,
      resolved_path: browseData.current_path,
    }));
    setPickerOpen(false);
  };

  const handleCreateFolder = async () => {
    if (!browseData?.current_path || !newFolderName.trim()) return;
    setCreatingFolder(true);
    setBrowseError('');
    try {
      const data = await api.createBackupFolder(browseData.current_path, newFolderName.trim());
      setBrowseData(data);
      setNewFolderName('');
      setMsg('تم إنشاء المجلد');
    } catch (err) {
      setBrowseError(err.message || 'تعذر إنشاء المجلد');
    } finally {
      setCreatingFolder(false);
    }
  };

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
                <div className="flex flex-wrap gap-2">
                  <input
                    className="flex-1 min-w-[220px]"
                    value={config.backup_path || './backups'}
                    readOnly
                    placeholder="اختر مجلد الحفظ"
                  />
                  {canEdit && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={openPicker}>
                      <FolderOpen size={14} />
                      اختيار المسار
                    </button>
                  )}
                </div>
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

      {pickerOpen && (
        <div className="modal-overlay" onClick={() => setPickerOpen(false)}>
          <div className="modal card max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="flex items-center gap-2">
              <FolderOpen size={18} />
              اختيار مجلد النسخ الاحتياطي
            </h3>

            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {(browseData?.roots || []).map((root) => (
                  <button
                    key={root.path}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => loadBrowse(root.path)}
                  >
                    {root.label}
                  </button>
                ))}
                {browseData?.parent_path && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm inline-flex items-center gap-1"
                    onClick={() => loadBrowse(browseData.parent_path)}
                  >
                    <ChevronLeft size={14} />
                    رجوع
                  </button>
                )}
              </div>

              <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3 text-sm break-all">
                <strong>المجلد الحالي:</strong> {browseData?.current_path || '—'}
              </div>

              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  <input
                    className="flex-1 min-w-[180px]"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="اسم مجلد جديد"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm inline-flex items-center gap-1"
                    onClick={handleCreateFolder}
                    disabled={creatingFolder || !newFolderName.trim()}
                  >
                    <FolderPlus size={14} />
                    {creatingFolder ? 'جاري الإنشاء...' : 'مجلد جديد'}
                  </button>
                </div>
              )}

              {browseError && <p className="text-sm text-red-600">{browseError}</p>}

              <div className="border rounded-lg overflow-hidden max-h-[360px] overflow-y-auto">
                {browseLoading ? (
                  <div className="empty-state">جاري عرض الملفات...</div>
                ) : (browseData?.entries || []).length === 0 ? (
                  <div className="empty-state">المجلد فارغ</div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>الاسم</th>
                        <th>النوع</th>
                        <th>الحجم</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(browseData?.entries || []).map((entry) => (
                        <tr
                          key={entry.path}
                          className={entry.type === 'directory' ? 'cursor-pointer hover:bg-blue-50/60 dark:hover:bg-gray-700/40' : ''}
                          onClick={() => {
                            if (entry.type === 'directory') loadBrowse(entry.path);
                          }}
                        >
                          <td className="font-medium inline-flex items-center gap-2">
                            {entry.type === 'directory' ? <Folder size={14} /> : <HardDrive size={14} />}
                            {entry.name}
                          </td>
                          <td>{entry.type === 'directory' ? 'مجلد' : 'ملف'}</td>
                          <td>{entry.type === 'file' ? formatBytes(entry.size_bytes) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="flex flex-wrap gap-2 justify-end">
                <button type="button" className="btn btn-secondary" onClick={() => setPickerOpen(false)}>
                  إلغاء
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!browseData?.stored_path}
                  onClick={handleSelectCurrentFolder}
                >
                  اختيار هذا المجلد
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
