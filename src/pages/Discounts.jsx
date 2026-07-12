import { useEffect, useState } from 'react';
import { Pencil, Percent, Trash2 } from 'lucide-react';
import { api } from '../api';

const TYPE_LABELS = {
  store: 'خصم محل',
  delivery: 'خصم توصيل',
};

const DATE_MODE_LABELS = {
  day: 'يوم محدد',
  range: 'فترة',
};

const emptyForm = () => ({
  id: '',
  discount_type: 'store',
  store_id: '',
  discount_percent: '',
  date_mode: 'day',
  discount_date: '',
  discount_from: '',
  discount_to: '',
  note: '',
});

function formatDateLabel(row) {
  if (row.date_mode === 'range') {
    return `${row.discount_from} — ${row.discount_to}`;
  }
  return row.discount_date || '—';
}

function isDiscountActiveToday(row) {
  const today = new Date().toISOString().slice(0, 10);
  if (row.date_mode === 'range') {
    const from = row.discount_from;
    const to = row.discount_to;
    if (!from || !to) return false;
    const safeFrom = from <= to ? from : to;
    const safeTo = from <= to ? to : from;
    return today >= safeFrom && today <= safeTo;
  }
  return row.discount_date === today;
}

export default function Discounts() {
  const [stores, setStores] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [storeRows, discountRows] = await Promise.all([
        api.getFinanceStores(),
        api.getFinanceDiscounts(),
      ]);
      setStores(storeRows);
      setDiscounts(discountRows);
    } catch (err) {
      setError(err.message || 'تعذر تحميل الخصومات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = discounts.filter((row) => {
    if (filterType === 'all') return true;
    return row.discount_type === filterType;
  });

  const openAdd = (type = 'store') => {
    setForm({ ...emptyForm(), discount_type: type });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setForm({
      id: row.id,
      discount_type: row.discount_type,
      store_id: row.store_id || '',
      discount_percent: String(row.discount_percent || ''),
      date_mode: row.date_mode || 'day',
      discount_date: row.discount_date || '',
      discount_from: row.discount_from || '',
      discount_to: row.discount_to || '',
      note: row.note || '',
    });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMsg('');
    const payload = {
      discount_type: form.discount_type,
      store_id: form.discount_type === 'store' ? form.store_id : null,
      discount_percent: Number(form.discount_percent),
      date_mode: form.date_mode,
      discount_date: form.date_mode === 'day' ? form.discount_date : null,
      discount_from: form.date_mode === 'range' ? form.discount_from : null,
      discount_to: form.date_mode === 'range' ? form.discount_to : null,
      note: form.note,
    };
    try {
      if (form.id) {
        await api.updateFinanceDiscount(form.id, payload);
        setMsg('تم تحديث الخصم');
      } else {
        await api.createFinanceDiscount(payload);
        setMsg('تم إضافة الخصم');
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err.message || 'تعذر حفظ الخصم');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!confirm('حذف هذا الخصم؟')) return;
    setMsg('');
    try {
      await api.deleteFinanceDiscount(row.id);
      setMsg('تم حذف الخصم');
      await load();
    } catch (err) {
      setMsg(err.message || 'تعذر حذف الخصم');
    }
  };

  return (
    <>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2>إعداد الخصومات</h2>
          <p>خصومات المحلات ورسوم التوصيل — تطبق فقط خلال التاريخ أو الفترة المحددة</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => openAdd('delivery')}>
            + خصم توصيل
          </button>
          <button type="button" className="btn btn-primary" onClick={() => openAdd('store')}>
            + خصم محل
          </button>
        </div>
      </div>

      {msg && <p className="text-sm font-medium text-green-600 mb-4">{msg}</p>}

      <div className="card mb-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">عرض:</span>
          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            {[
              { key: 'all', label: 'الكل' },
              { key: 'store', label: 'المحلات' },
              { key: 'delivery', label: 'التوصيل' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                className={`px-3 py-1.5 rounded-md text-sm font-semibold ${filterType === item.key ? 'bg-white dark:bg-gray-800 shadow' : ''}`}
                onClick={() => setFilterType(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="empty-state">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">لا توجد خصومات — أضف خصم محل أو خصم توصيل</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>النوع</th>
                <th>المحل</th>
                <th>النسبة %</th>
                <th>التطبيق</th>
                <th>التاريخ / الفترة</th>
                <th>الحالة</th>
                <th>ملاحظة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className={`badge ${row.discount_type === 'delivery' ? 'badge-green' : 'badge-blue'}`}>
                      {TYPE_LABELS[row.discount_type] || row.discount_type}
                    </span>
                  </td>
                  <td>{row.discount_type === 'store' ? (row.store_name || '—') : '—'}</td>
                  <td><strong>{Number(row.discount_percent)}%</strong></td>
                  <td>{DATE_MODE_LABELS[row.date_mode] || row.date_mode}</td>
                  <td>{formatDateLabel(row)}</td>
                  <td>
                    {isDiscountActiveToday(row) ? (
                      <span className="badge badge-green">فعّال اليوم</span>
                    ) : (
                      <span className="badge badge-gray">غير فعّال الآن</span>
                    )}
                  </td>
                  <td className="max-w-xs">{row.note || '—'}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="inline-flex items-center gap-1 text-sm text-blue-600" onClick={() => openEdit(row)}>
                        <Pencil size={14} />
                        تعديل
                      </button>
                      <button type="button" className="inline-flex items-center gap-1 text-sm text-red-600" onClick={() => handleDelete(row)}>
                        <Trash2 size={14} />
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900">
        <div className="flex items-start gap-3">
          <Percent className="text-blue-600 mt-0.5" size={20} />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <strong>مهم:</strong> الخصم يُطبّق فقط في <strong>اليوم المحدد</strong> أو داخل <strong>الفترة المحددة</strong>.
            خارج هذا التاريخ لا يُحسب أي خصم تلقائياً على الطلبات أو الفواتير.
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <h3>{form.id ? 'تعديل خصم' : 'إضافة خصم'}</h3>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>نوع الخصم</label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => setForm({ ...form, discount_type: e.target.value, store_id: '' })}
                  >
                    <option value="store">خصم محل</option>
                    <option value="delivery">خصم رسوم التوصيل</option>
                  </select>
                </div>
                {form.discount_type === 'store' && (
                  <div className="form-group">
                    <label>المحل</label>
                    <select
                      value={form.store_id}
                      onChange={(e) => setForm({ ...form, store_id: e.target.value })}
                      required
                    >
                      <option value="">اختر المحل...</option>
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>نسبة الخصم %</label>
                  <input
                    type="number"
                    min="0.1"
                    max="100"
                    step="0.1"
                    value={form.discount_percent}
                    onChange={(e) => setForm({ ...form, discount_percent: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>طريقة التاريخ</label>
                  <select
                    value={form.date_mode}
                    onChange={(e) => setForm({ ...form, date_mode: e.target.value })}
                  >
                    <option value="day">يوم محدد</option>
                    <option value="range">فترة (من — إلى)</option>
                  </select>
                </div>
              </div>

              {form.date_mode === 'day' ? (
                <div className="form-group">
                  <label>تاريخ الخصم</label>
                  <input
                    type="date"
                    value={form.discount_date}
                    onChange={(e) => setForm({ ...form, discount_date: e.target.value })}
                    required
                  />
                </div>
              ) : (
                <div className="form-row">
                  <div className="form-group">
                    <label>من تاريخ</label>
                    <input
                      type="date"
                      value={form.discount_from}
                      onChange={(e) => setForm({ ...form, discount_from: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>إلى تاريخ</label>
                    <input
                      type="date"
                      value={form.discount_to}
                      onChange={(e) => setForm({ ...form, discount_to: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>ملاحظة (اختياري)</label>
                <input
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="سبب الخصم أو تفاصيل..."
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
