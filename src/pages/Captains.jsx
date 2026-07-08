import { useState, useEffect } from 'react';
import { Pencil, KeyRound } from 'lucide-react';
import { api, mediaUrl } from '../api';

function CaptainAvatar({ captain }) {
  if (captain.photo) {
    return (
      <div className="avatar">
        <img src={mediaUrl(captain.photo)} alt={captain.name} />
      </div>
    );
  }
  return <div className="avatar">{captain.name.charAt(0)}</div>;
}

function formatMoney(n) {
  return Number(n || 0).toLocaleString('ar-YE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function Captains() {
  const [captains, setCaptains] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', captain_number: '', username: '', password: '123456', photo: null });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetForm, setResetForm] = useState({ password: '', confirm: '' });
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const load = () => api.getCaptains().then(setCaptains);
  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm({ name: '', phone: '', captain_number: '', username: '', password: '123456', photo: null });
    setError('');
    setModal('add');
  };

  const openEdit = (c) => {
    setForm({ name: c.name, phone: c.phone, captain_number: c.captain_number, username: c.username || '', password: '', photo: null, id: c.id });
    setError('');
    setModal('edit');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('phone', form.phone);
      fd.append('captain_number', form.captain_number);
      fd.append('username', form.username);
      if (form.password) fd.append('password', form.password);
      if (form.photo) fd.append('photo', form.photo);

      if (modal === 'edit') {
        await api.updateCaptain(form.id, fd);
      } else {
        await api.createCaptain(fd);
      }
      setModal(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا الكابتن؟')) return;
    await api.deleteCaptain(id);
    load();
  };

  const openResetPassword = (captain) => {
    setResetTarget(captain);
    setResetForm({ password: '', confirm: '' });
    setResetError('');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resetForm.password.length < 6) {
      setResetError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (resetForm.password !== resetForm.confirm) {
      setResetError('كلمتا المرور غير متطابقتين');
      return;
    }
    setResetLoading(true);
    setResetError('');
    try {
      await api.resetCaptainPassword(resetTarget.id, resetForm.password);
      setResetTarget(null);
      alert('تم إعادة تعيين كلمة المرور بنجاح');
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2>الكباتن</h2>
          <p>إدارة الكباتن وبياناتهم</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ إضافة كابتن</button>
      </div>

      <div className="card">
        {captains.length === 0 ? (
          <div className="empty-state">لا يوجد كباتن — أضف أول كابتن</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>الصورة</th>
                <th>الاسم</th>
                <th>اسم المستخدم</th>
                <th>رقم الكابتن</th>
                <th>الهاتف</th>
                <th>الرصيد</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {captains.map(c => (
                <tr key={c.id}>
                  <td><CaptainAvatar captain={c} /></td>
                  <td><strong>{c.name}</strong></td>
                  <td><span className="badge badge-blue">{c.username || '—'}</span></td>
                  <td><span className="badge badge-green">{c.captain_number}</span></td>
                  <td>{c.phone}</td>
                  <td>
                    <strong className={Number(c.balance) > 0 ? 'text-red-600' : Number(c.balance) < 0 ? 'text-green-600' : ''}>
                      {formatMoney(c.balance)} ر.ي
                    </strong>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-blue-600 text-sm"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil size={14} />
                        تعديل
                      </button>
                      <button
                        className="inline-flex items-center gap-1 text-purple-600 hover:underline text-sm"
                        onClick={() => openResetPassword(c)}
                      >
                        <KeyRound size={14} />
                        كلمة المرور
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'edit' ? 'تعديل كابتن' : 'إضافة كابتن جديد'}</h3>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>الاسم</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>اسم المستخدم</label>
                <input
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  placeholder="c001"
                  required
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>رقم الكابتن</label>
                  <input value={form.captain_number} onChange={e => setForm({ ...form, captain_number: e.target.value })} placeholder="C001" required />
                </div>
                <div className="form-group">
                  <label>رقم الهاتف</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="967771234567" required />
                </div>
              </div>
              <div className="form-group">
                <label>{modal === 'edit' ? 'كلمة المرور (اتركها فارغة بدون تغيير)' : 'كلمة المرور'}</label>
                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="123456" />
              </div>
              <div className="form-group">
                <label>الصورة</label>
                <input type="file" accept="image/*" onChange={e => setForm({ ...form, photo: e.target.files[0] })} />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetTarget && (
        <div className="modal-overlay" onClick={() => setResetTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>إعادة تعيين كلمة المرور</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              الكابتن: <strong>{resetTarget.name}</strong> ({resetTarget.captain_number})
            </p>
            {resetError && <p className="text-red-500 text-sm mb-3">{resetError}</p>}
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label>كلمة المرور الجديدة</label>
                <input
                  type="password"
                  value={resetForm.password}
                  onChange={e => setResetForm({ ...resetForm, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label>تأكيد كلمة المرور</label>
                <input
                  type="password"
                  value={resetForm.confirm}
                  onChange={e => setResetForm({ ...resetForm, confirm: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary" disabled={resetLoading}>
                  {resetLoading ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setResetTarget(null)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
