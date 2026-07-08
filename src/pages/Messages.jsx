import { useState, useEffect } from 'react';
import { api, REPEAT_LABELS } from '../api';

const PLACEHOLDERS = [
  { key: '{name}', label: 'اسم الكابتن' },
  { key: '{day}', label: 'يوم الغد' },
  { key: '{period1}', label: 'الفترة الأولى' },
  { key: '{period2}', label: 'الفترة الثانية' },
  { key: '{schedule}', label: 'الجدول الكامل' },
  { key: '{break}', label: 'الراحة' },
];

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [captains, setCaptains] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    title: '', body: '', captain_id: '', scheduled_at: '', repeat_type: 'once'
  });
  const [reminder, setReminder] = useState({
    send_time: '09:00',
    body_work: '',
    body_off: '',
    is_active: 0,
  });
  const [preview, setPreview] = useState('');
  const [reminderMsg, setReminderMsg] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);
  const [error, setError] = useState('');
  const [gateway, setGateway] = useState({ pending: 0, sent: 0, failed: 0, online: false });

  const load = () => {
    api.getMessages().then(setMessages);
    api.getCaptains().then(setCaptains);
    api.getGatewayStatus().then(r => setGateway(r.stats)).catch(() => {});
    api.getShiftReminder().then(setReminder).catch(() => {});
  };

  useEffect(() => {
    load();
    const t = setInterval(() => {
      api.getGatewayStatus().then(r => setGateway(r.stats)).catch(() => {});
    }, 10000);
    return () => clearInterval(t);
  }, []);

  const openAdd = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm({ title: '', body: '', captain_id: '', scheduled_at: local, repeat_type: 'once' });
    setError('');
    setModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.createMessage({
        ...form,
        captain_id: form.captain_id || null,
        scheduled_at: new Date(form.scheduled_at).toISOString()
      });
      setModal(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveReminder = async () => {
    setReminderMsg('');
    try {
      await api.saveShiftReminder({
        send_time: reminder.send_time,
        body_work: reminder.body_work,
        body_off: reminder.body_off,
        is_active: reminder.is_active ? 1 : 0,
      });
      setReminderMsg('تم حفظ تذكير دوام الغد');
      load();
    } catch (err) {
      setReminderMsg(err.message);
    }
  };

  const handlePreviewReminder = async () => {
    try {
      const res = await api.previewShiftReminder();
      setPreview(res.preview);
    } catch (err) {
      setPreview(err.message);
    }
  };

  const handleSendReminderNow = async () => {
    if (!confirm('إرسال تذكير دوام الغد الآن لجميع الكباتن؟')) return;
    setSendingReminder(true);
    setReminderMsg('');
    try {
      const res = await api.sendShiftReminderNow({
        body_work: reminder.body_work,
        body_off: reminder.body_off,
      });
      setReminderMsg(`تم إضافة ${res.queued} رسالة لطابور الإرسال — البوابة سترسلها تلقائياً`);
      load();
    } catch (err) {
      setReminderMsg(err.message);
    } finally {
      setSendingReminder(false);
    }
  };

  const handleSendNow = async (id) => {
    const res = await api.sendNow(id);
    alert(`تم إضافة ${res.queued || 1} رسالة لطابور الإرسال — البوابة سترسلها تلقائياً`);
    load();
  };

  const handleToggle = async (msg) => {
    await api.updateMessage(msg.id, { is_active: msg.is_active ? 0 : 1 });
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('حذف هذه الرسالة؟')) return;
    await api.deleteMessage(id);
    load();
  };

  const getCaptainName = (id) => {
    if (!id) return 'جميع الكباتن';
    const c = captains.find(x => x.id === id);
    return c ? c.name : '—';
  };

  const insertPlaceholder = (field, key) => {
    setReminder(prev => ({ ...prev, [field]: `${prev[field] || ''}${key}` }));
  };

  return (
    <>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2>تنسيق الرسائل</h2>
          <p>جدولة رسائل نصية للكباتن — مرة واحدة أو متكررة</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ رسالة جديدة</button>
      </div>

      <div className="card shift-reminder-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold">تذكير دوام الغد</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              كل يوم في الوقت المحدد يرسل للكباتن رسالة عن دوام الغد حسب جدولهم
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(reminder.is_active)}
              onChange={e => setReminder({ ...reminder, is_active: e.target.checked ? 1 : 0 })}
            />
            <span className="font-medium">تفعيل التذكير اليومي</span>
          </label>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>وقت الإرسال يومياً</label>
            <input
              type="time"
              value={reminder.send_time || '09:00'}
              onChange={e => setReminder({ ...reminder, send_time: e.target.value })}
            />
            <span className="text-xs text-gray-500">مثال: 9:00 ص — يرسل عن دوام الغد</span>
          </div>
        </div>

        <div className="form-group">
          <label>نص رسالة يوم الدوام</label>
          <textarea
            rows={3}
            value={reminder.body_work || ''}
            onChange={e => setReminder({ ...reminder, body_work: e.target.value })}
            placeholder="مرحباً {name}، غداً {day} دوامك: {period1} — {period2}"
          />
        </div>

        <div className="form-group">
          <label>نص رسالة يوم الإجازة</label>
          <textarea
            rows={2}
            value={reminder.body_off || ''}
            onChange={e => setReminder({ ...reminder, body_off: e.target.value })}
            placeholder="مرحباً {name}، غداً {day} يوم إجازة"
          />
        </div>

        <div className="placeholder-chips">
          {PLACEHOLDERS.map(p => (
            <button
              key={p.key}
              type="button"
              className="placeholder-chip"
              title={p.label}
              onClick={() => insertPlaceholder('body_work', p.key)}
            >
              {p.key}
            </button>
          ))}
        </div>

        {preview && (
          <div className="reminder-preview">
            <strong>معاينة:</strong> {preview}
          </div>
        )}

        {reminderMsg && (
          <p className={`text-sm mt-2 ${reminderMsg.includes('تم') ? 'text-green-600' : 'text-red-500'}`}>
            {reminderMsg}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-3">
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveReminder}>
            حفظ التذكير
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSendReminderNow}
            disabled={sendingReminder}
          >
            {sendingReminder ? 'جاري الإرسال...' : 'إرسال الآن'}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handlePreviewReminder}>
            معاينة (كابتن تجريبي)
          </button>
        </div>
      </div>

      <div className="card flex flex-wrap items-center gap-4 mb-0">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${gateway.online ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm font-medium">
            بوابة SMS: {gateway.online ? 'متصلة' : 'غير متصلة'}
          </span>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          معلقة: <strong>{gateway.pending}</strong> | مُرسلة: <strong>{gateway.sent}</strong> | فاشلة: <strong>{gateway.failed}</strong>
        </span>
      </div>

      <div className="card">
        {messages.length === 0 ? (
          <div className="empty-state">لا توجد رسائل مجدولة يدوية</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>العنوان</th>
                <th>المستلم</th>
                <th>التوقيت</th>
                <th>التكرار</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {messages.map(m => (
                <tr key={m.id}>
                  <td>
                    <strong>{m.title}</strong>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {m.body.substring(0, 60)}{m.body.length > 60 ? '...' : ''}
                    </div>
                  </td>
                  <td>{getCaptainName(m.captain_id)}</td>
                  <td>{new Date(m.scheduled_at).toLocaleString('ar-YE')}</td>
                  <td><span className="badge badge-blue">{REPEAT_LABELS[m.repeat_type]}</span></td>
                  <td>
                    <span className={`badge ${m.is_active ? 'badge-green' : 'badge-gray'}`}>
                      {m.is_active ? 'نشطة' : 'متوقفة'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-primary btn-sm" onClick={() => handleSendNow(m.id)}>إرسال الآن</button>{' '}
                    <button className="btn btn-secondary btn-sm" onClick={() => handleToggle(m)}>{m.is_active ? 'إيقاف' : 'تفعيل'}</button>{' '}
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m.id)}>حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>رسالة جديدة</h3>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>عنوان الرسالة</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>نص الرسالة</label>
                <textarea rows={4} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>المستلم</label>
                <select value={form.captain_id} onChange={e => setForm({ ...form, captain_id: e.target.value })}>
                  <option value="">جميع الكباتن</option>
                  {captains.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.captain_number})</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>وقت الإرسال</label>
                  <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>التكرار</label>
                  <select value={form.repeat_type} onChange={e => setForm({ ...form, repeat_type: e.target.value })}>
                    <option value="once">مرة واحدة</option>
                    <option value="daily">يومياً</option>
                    <option value="weekly">أسبوعياً</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">حفظ وجدولة</button>
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
