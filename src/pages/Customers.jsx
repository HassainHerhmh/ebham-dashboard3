import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Pencil, RefreshCw, Search } from 'lucide-react';
import { api } from '../api';
import { hasPermission } from '../utils/permissions';

const emptyForm = () => ({
  id: '',
  name: '',
  phone: '',
  address_text: '',
  map_link: '',
});

export default function Customers({ user }) {
  const canEdit = hasPermission(user, 'orders', 'edit');
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (query = searchTerm) => {
    setRefreshing(true);
    try {
      const rows = await api.listCustomers(query.trim());
      setCustomers(rows);
      setError('');
    } catch (err) {
      setError(err.message || 'تعذر تحميل العملاء');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, load]);

  const visibleCustomers = useMemo(() => customers, [customers]);

  const openEdit = (row) => {
    setForm({
      id: row.id,
      name: row.name || '',
      phone: row.phone || '',
      address_text: row.address_text || '',
      map_link: row.map_link || '',
    });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setError('');
    setMsg('');
    try {
      await api.updateCustomer(form.id, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address_text: form.address_text.trim(),
        map_link: form.map_link.trim(),
      });
      setMsg('تم تحديث بيانات العميل');
      setModalOpen(false);
      await load(searchTerm);
    } catch (err) {
      setError(err.message || 'تعذر حفظ بيانات العميل');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2>العملاء</h2>
          <p>بيانات العملاء المحفوظة — الاسم، الهاتف، العنوان، ورابط GPS</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => load(searchTerm)} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
          {refreshing ? 'جاري التحديث...' : 'تحديث'}
        </button>
      </div>

      {msg && <p className="text-sm font-medium text-green-600 mb-4">{msg}</p>}
      {error && !modalOpen && <p className="text-sm font-medium text-red-600 mb-4">{error}</p>}

      <div className="card mb-5">
        <div className="orders-search-wrap mb-4">
          <Search size={16} className="orders-search-icon" />
          <input
            type="text"
            className="orders-search-input"
            placeholder="بحث بالاسم / الهاتف / العنوان"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="empty-state">جاري التحميل...</div>
        ) : visibleCustomers.length === 0 ? (
          <div className="empty-state">لا يوجد عملاء مطابقون للبحث</div>
        ) : (
          <div className="table-wrap overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>العميل</th>
                  <th>الهاتف</th>
                  <th>العنوان</th>
                  <th>عدد الطلبات</th>
                  <th>رابط GPS</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {visibleCustomers.map((row) => (
                  <tr key={row.id}>
                    <td className="font-medium">{row.name || '—'}</td>
                    <td>{row.phone || '—'}</td>
                    <td className="min-w-[180px]">{row.address_text || '—'}</td>
                    <td className="text-center font-semibold">{row.order_count ?? 0}</td>
                    <td className="min-w-[160px]">
                      {row.map_link ? (
                        <a
                          href={row.map_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline break-all"
                        >
                          <ExternalLink size={14} />
                          فتح الموقع
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {canEdit ? (
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(row)}>
                          <Pencil size={14} />
                          تعديل
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => !saving && setModalOpen(false)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <h3>تعديل بيانات العميل</h3>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <label>
                <span>اسم العميل</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </label>
              <label>
                <span>رقم الهاتف</span>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="7xxxxxxxx"
                />
              </label>
              <label>
                <span>العنوان</span>
                <input
                  value={form.address_text}
                  onChange={(e) => setForm({ ...form, address_text: e.target.value })}
                />
              </label>
              <label>
                <span>رابط GPS</span>
                <input
                  value={form.map_link}
                  onChange={(e) => setForm({ ...form, map_link: e.target.value })}
                  placeholder="https://maps..."
                />
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
