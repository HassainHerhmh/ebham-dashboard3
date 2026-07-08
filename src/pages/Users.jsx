import { useState, useEffect } from 'react';
import { Pencil, UserX, UserCheck, KeyRound } from 'lucide-react';
import { api, ROLE_LABELS, mediaUrl } from '../api';

function UserAvatar({ user }) {
  if (user.photo) {
    return (
      <div className="avatar">
        <img src={mediaUrl(user.photo)} alt={user.name} />
      </div>
    );
  }
  return <div className="avatar">{user.name.charAt(0)}</div>;
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', role: 'employee', password: '', photo: null
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetForm, setResetForm] = useState({ password: '', confirm: '' });
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const load = () => api.getUsers().then(setUsers);
  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm({ name: '', email: '', phone: '', role: 'employee', password: '', photo: null });
    setError('');
    setModal('add');
  };

  const openEdit = (u) => {
    setForm({
      name: u.name,
      email: u.email || '',
      phone: u.phone || '',
      role: u.role,
      password: '',
      photo: null,
      id: u.id,
      status: u.status
    });
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
      fd.append('email', form.email);
      fd.append('phone', form.phone);
      fd.append('role', form.role);
      if (form.password) fd.append('password', form.password);
      if (form.photo) fd.append('photo', form.photo);
      if (modal === 'edit' && form.status) fd.append('status', form.status);

      if (modal === 'edit') {
        await api.updateUser(form.id, fd);
      } else {
        if (!form.password) {
          setError('كلمة المرور مطلوبة');
          setLoading(false);
          return;
        }
        await api.createUser(fd);
      }
      setModal(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    await api.toggleUserStatus(id);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    await api.deleteUser(id);
    load();
  };

  const openResetPassword = (user) => {
    setResetTarget(user);
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
      await api.resetUserPassword(resetTarget.id, resetForm.password);
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
          <h2>المستخدمين</h2>
          <p>إدارة مستخدمي المنصة وصلاحياتهم</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ إضافة مستخدم</button>
      </div>

      <div className="card overflow-hidden !p-0">
        {users.length === 0 ? (
          <div className="empty-state">لا يوجد مستخدمين — أضف أول مستخدم</div>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>الصورة</th>
                  <th>الاسم</th>
                  <th>البريد</th>
                  <th>الهاتف</th>
                  <th>الدور</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id}>
                    <td>{i + 1}</td>
                    <td><UserAvatar user={u} /></td>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.email || '—'}</td>
                    <td>{u.phone || '—'}</td>
                    <td><span className="badge badge-blue">{ROLE_LABELS[u.role] || u.role}</span></td>
                    <td>
                      <span className={`font-semibold text-sm ${u.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                        {u.status === 'active' ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-blue-600 text-sm"
                          onClick={() => openEdit(u)}
                        >
                          <Pencil size={14} />
                          تعديل
                        </button>
                        <button
                          className="inline-flex items-center gap-1 text-purple-600 hover:underline text-sm"
                          onClick={() => openResetPassword(u)}
                        >
                          <KeyRound size={14} />
                          كلمة المرور
                        </button>
                        <button
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm"
                          onClick={() => handleToggleStatus(u.id)}
                        >
                          {u.status === 'active' ? <UserX size={14} /> : <UserCheck size={14} />}
                          {u.status === 'active' ? 'تعطيل' : 'تفعيل'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}>حذف</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'edit' ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}</h3>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>الاسم</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>البريد الإلكتروني</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>رقم الهاتف</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="967770000000" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>الدور</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    <option value="admin">مدير النظام</option>
                    <option value="manager">مشرف</option>
                    <option value="employee">موظف</option>
                  </select>
                </div>
                {modal === 'edit' && (
                  <div className="form-group">
                    <label>الحالة</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option value="active">نشط</option>
                      <option value="inactive">معطل</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>{modal === 'edit' ? 'كلمة المرور (اتركها فارغة بدون تغيير)' : 'كلمة المرور'}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required={modal === 'add'}
                />
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
              المستخدم: <strong>{resetTarget.name}</strong>
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
