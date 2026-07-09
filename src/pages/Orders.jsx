import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Search, Wifi } from 'lucide-react';
import { api, mediaUrl } from '../api';
import { useNotifications } from '../context/NotificationsContext';

const STATUS_LABELS = {
  new: 'جديد',
  assigned: 'تم التعيين',
  in_progress: 'قيد التنفيذ',
  on_delivery: 'قيد التوصيل',
  done: 'مكتمل',
  cancelled: 'ملغي',
};

const PAYMENT_LABELS = {
  cash: 'نقد',
  transfer: 'حوالة',
  credit: 'آجل',
};

const STATUS_TABS = [
  { key: 'all', label: 'الكل' },
  { key: 'new', label: 'جديد' },
  { key: 'assigned', label: 'تم التعيين' },
  { key: 'in_progress', label: 'قيد التنفيذ' },
  { key: 'on_delivery', label: 'قيد التوصيل' },
  { key: 'done', label: 'مكتمل' },
  { key: 'cancelled', label: 'ملغي' },
];

const DATE_FILTERS = [
  { key: 'today', label: 'اليوم' },
  { key: 'week', label: 'هذا الأسبوع' },
  { key: 'all', label: 'الكل' },
];

const POLL_MS = 5000;
const EXTERNAL_STORE_ID = '__external__';

function captainLabel(captains, captainId) {
  const captain = captains.find(c => c.id === captainId);
  if (!captain) return 'الكابتن';
  return captain.captain_number ? `${captain.name} (${captain.captain_number})` : captain.name;
}

function orderCaptainLabel(order, captains) {
  if (order.captain_id) return captainLabel(captains, order.captain_id);
  if (order.captain_name) {
    return order.captain_number ? `${order.captain_name} (${order.captain_number})` : order.captain_name;
  }
  return 'بدون تعيين';
}

function isTerminalOrderStatus(status) {
  return status === 'done' || status === 'cancelled';
}

function formatOrderTime(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatStatusTimeline(order) {
  const rows = [];
  if (order.assigned_at) rows.push({ icon: '👤', time: formatOrderTime(order.assigned_at), label: 'تعيين' });
  if (order.in_progress_at) rows.push({ icon: '⚙️', time: formatOrderTime(order.in_progress_at), label: 'تنفيذ' });
  if (order.on_delivery_at) rows.push({ icon: '🚚', time: formatOrderTime(order.on_delivery_at), label: 'توصيل' });
  if (order.done_at) rows.push({ icon: '✔️', time: formatOrderTime(order.done_at), label: 'مكتمل' });
  if (order.cancelled_at) rows.push({ icon: '❌', time: formatOrderTime(order.cancelled_at), label: 'ملغي' });
  if (!rows.length && order.updated_at) {
    rows.push({ icon: '🕒', time: formatOrderTime(order.updated_at), label: 'تحديث' });
  }
  return rows;
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear()
    && d1.getMonth() === d2.getMonth()
    && d1.getDate() === d2.getDate();
}

function buildOrderToast({ userName, displayIndex, customerName, patch, currentOrder, captains }) {
  const user = userName || 'مستخدم';
  const orderRef = displayIndex ? `الطلب رقم ${displayIndex}` : 'الطلب';

  if (patch.captain_id !== undefined) {
    const prevId = currentOrder?.captain_id || null;
    const nextId = patch.captain_id || null;
    if (nextId && nextId !== prevId) {
      return `المستخدم ${user} حدّث ${orderRef} للعميل ${customerName} بتعيين الكابتن ${captainLabel(captains, nextId)}`;
    }
    if (!nextId && prevId) {
      return `المستخدم ${user} حدّث ${orderRef} للعميل ${customerName} بإلغاء تعيين الكابتن`;
    }
  }

  if (patch.status !== undefined && patch.status !== currentOrder?.status) {
    const statusLabel = STATUS_LABELS[patch.status] || patch.status;
    return `المستخدم ${user} حدّث ${orderRef} للعميل ${customerName} بتغيير الحالة إلى ${statusLabel}`;
  }

  if (patch.address_text !== undefined) {
    return `المستخدم ${user} حدّث ${orderRef} للعميل ${customerName} بتحديث العنوان`;
  }

  if (patch.map_link !== undefined) {
    return `المستخدم ${user} حدّث ${orderRef} للعميل ${customerName} بتحديث رابط الموقع`;
  }

  if (patch.payment_type !== undefined && patch.payment_type !== currentOrder?.payment_type) {
    const paymentLabel = PAYMENT_LABELS[patch.payment_type] || patch.payment_type;
    return `المستخدم ${user} حدّث ${orderRef} للعميل ${customerName} بطريقة الدفع ${paymentLabel}`;
  }

  return `المستخدم ${user} حدّث ${orderRef} للعميل ${customerName}`;
}

function buildCaptainStatusNotification(order, captains) {
  const captain = captains.find(c => c.id === order.captain_id);
  const captainName = order.updated_by_user_name || captain?.name || 'الكابتن';
  const orderRef = order.display_number || '—';
  const customerName = order.customer_name || '';
  const statusLabel = STATUS_LABELS[order.status] || order.status;
  return `الكابتن ${captainName} حدّث حالة الطلب رقم ${orderRef} للعميل ${customerName} إلى ${statusLabel}`;
}

function isCaptainStatusUpdate(order) {
  return Boolean(order.captain_id && order.updated_by_user_id === order.captain_id);
}

function userPayload(user) {
  return user ? { user_id: user.id, user_name: user.name } : {};
}

function orderUserLabel(order) {
  return order?.updated_by_user_name || order?.created_by_user_name || '—';
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('ar-YE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function orderGrandTotal(order) {
  if (order.grand_total !== undefined) return Number(order.grand_total || 0);
  const invoice = order.invoice_total !== undefined
    ? Number(order.invoice_total || 0)
    : (order.items || []).reduce((sum, item) => sum + (item.is_external ? 0 : Number(item.invoice_amount || 0)), 0);
  const external = order.external_total !== undefined
    ? Number(order.external_total || 0)
    : (order.items || []).reduce((sum, item) => sum + (item.is_external ? Number(item.invoice_amount || 0) : 0), 0);
  return invoice + external + Number(order.delivery_fee || 0);
}

function itemStoreLabel(item) {
  if (item.is_external) return 'طلب خارجي';
  return item.store_name || 'بدون محل';
}

function orderToForm(order) {
  const items = order?.items?.length
    ? order.items.map((item) => ({
      store_id: item.is_external ? EXTERNAL_STORE_ID : (item.store_id || ''),
      details: item.details || '',
      invoice_amount: item.is_external ? (item.invoice_amount || '') : '',
    }))
    : [{ store_id: '', details: '', invoice_amount: '' }];

  return {
    customer_name: order?.customer_name || '',
    customer_phone: order?.customer_phone || '',
    address_text: order?.address_text || '',
    map_link: order?.map_link || '',
    delivery_fee: order?.delivery_fee ?? '',
    payment_type: order?.payment_type || 'cash',
    captain_id: order?.captain_id || '',
    status: order?.status || 'new',
    items,
  };
}

function buildItemsPayload(items) {
  return items.map((item) => ({
    store_id: item.store_id === EXTERNAL_STORE_ID ? null : item.store_id,
    details: item.details,
    is_external: item.store_id === EXTERNAL_STORE_ID,
    invoice_amount: item.store_id === EXTERNAL_STORE_ID ? Number(item.invoice_amount || 0) : 0,
  }));
}

function mergeOrdersFromServer(serverOrders, localOrders, savingId, fieldSnapshot) {
  const localMap = new Map(localOrders.map(o => [o.id, o]));
  return serverOrders.map((serverOrder, index) => {
    const local = localMap.get(serverOrder.id);
    if (!local || savingId === serverOrder.id) {
      return { ...serverOrder, display_number: index + 1 };
    }

    const merged = { ...serverOrder };
    for (const field of ['address_text', 'map_link']) {
      const key = `${serverOrder.id}:${field}`;
      if (fieldSnapshot.current[key] !== undefined) {
        merged[field] = local[field];
      }
    }
    return { ...merged, display_number: index + 1 };
  });
}

export default function Orders({ user }) {
  const [orders, setOrders] = useState([]);
  const [captains, setCaptains] = useState([]);
  const [stores, setStores] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info');
  const [orderModal, setOrderModal] = useState({ open: false, mode: 'add', orderId: null });
  const [editingLocked, setEditingLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [liveUpdates, setLiveUpdates] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const [invoicePreview, setInvoicePreview] = useState({ open: false, order: null });
  const fieldSnapshot = useRef({});
  const savingIdRef = useRef(null);
  const ordersSnapshotRef = useRef(new Map());
  const { pushNotification } = useNotifications();
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    address_text: '',
    map_link: '',
    delivery_fee: '',
    payment_type: 'cash',
    captain_id: '',
    status: 'new',
    items: [{ store_id: '', details: '', invoice_amount: '' }],
  });

  const customerMap = useMemo(
    () => new Map(customers.map(c => [String(c.name || '').trim(), c])),
    [customers]
  );

  useEffect(() => {
    savingIdRef.current = savingId;
  }, [savingId]);

  const notify = (message, type = 'info') => {
    setMsgType(type);
    setMsg(message);
    pushNotification(message, type);
  };

  const load = async () => {
    const [ordersRows, captainsRows, storesRows, customerRows] = await Promise.all([
      api.listOrders(),
      api.getCaptains(),
      api.getFinanceStores(),
      api.listOrderCustomers(''),
    ]);
    setOrders((ordersRows || []).map((order, index) => ({ ...order, display_number: index + 1 })));
    ordersSnapshotRef.current = new Map(
      (ordersRows || []).map((order) => [order.id, { status: order.status || 'new' }])
    );
    setCaptains(captainsRows || []);
    setStores(storesRows || []);
    setCustomers(customerRows || []);
    setLastRefreshedAt(new Date());
  };

  const refreshOrdersSilent = useCallback(async () => {
    if (savingIdRef.current || orderModal.open) return;
    try {
      const ordersRows = await api.listOrders();
      const withNumbers = (ordersRows || []).map((order, index) => ({ ...order, display_number: index + 1 }));

      for (const next of withNumbers) {
        if (savingIdRef.current === next.id) continue;
        const snap = ordersSnapshotRef.current.get(next.id);
        if (!snap) {
          ordersSnapshotRef.current.set(next.id, { status: next.status || 'new' });
          continue;
        }
        if (snap.status !== (next.status || 'new') && isCaptainStatusUpdate(next)) {
          const message = buildCaptainStatusNotification(next, captains);
          pushNotification(message, 'info');
          setMsgType('info');
          setMsg(message);
        }
        ordersSnapshotRef.current.set(next.id, { status: next.status || 'new' });
      }

      setOrders(prev => mergeOrdersFromServer(withNumbers, prev, savingIdRef.current, fieldSnapshot));
      setLastRefreshedAt(new Date());
    } catch {
      // تجاهل أخطاء التحديث الخلفي
    }
  }, [orderModal.open, captains, pushNotification]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } catch {
      notify('تعذر تحديث الطلبات', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load().catch(() => notify('تعذر تحميل صفحة الطلبات', 'error'));
  }, []);

  useEffect(() => {
    if (!msg) return;
    const id = setTimeout(() => setMsg(''), 3000);
    return () => clearTimeout(id);
  }, [msg]);

  useEffect(() => {
    if (!liveUpdates) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshOrdersSilent();
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [liveUpdates, refreshOrdersSilent]);

  const filteredByDate = useMemo(() => {
    const now = new Date();
    if (dateFilter === 'all') return orders;
    if (dateFilter === 'today') {
      return orders.filter(o => {
        const d = new Date(o.created_at);
        return !Number.isNaN(d.getTime()) && isSameDay(d, now);
      });
    }
    return orders.filter(o => {
      const d = new Date(o.created_at);
      return !Number.isNaN(d.getTime()) && (now.getTime() - d.getTime()) <= 7 * 24 * 60 * 60 * 1000;
    });
  }, [orders, dateFilter]);

  const statusCounts = useMemo(() => {
    const counts = { all: filteredByDate.length };
    for (const tab of STATUS_TABS) {
      if (tab.key === 'all') continue;
      counts[tab.key] = filteredByDate.filter(o => (o.status || 'new') === tab.key).length;
    }
    return counts;
  }, [filteredByDate]);

  const visibleOrders = useMemo(() => {
    let list = filteredByDate;
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter((order, idx) => {
        const details = (order.items || []).map(i => `${i.store_name} ${i.details}`).join(' ');
        const displayNo = String(order.display_number || idx + 1);
        return (
          order.customer_name?.toLowerCase().includes(term)
          || order.customer_phone?.includes(term)
          || displayNo.includes(term)
          || order.address_text?.toLowerCase().includes(term)
          || details.toLowerCase().includes(term)
          || (order.captain_name || '').toLowerCase().includes(term)
        );
      });
    }
    if (activeTab !== 'all') {
      list = list.filter(o => (o.status || 'new') === activeTab);
    }
    return list;
  }, [filteredByDate, searchTerm, activeTab]);

  const closeOrderModal = () => {
    setOrderModal({ open: false, mode: 'add', orderId: null });
    setEditingLocked(false);
  };

  const openInvoicePreview = (order) => {
    setInvoicePreview({ open: true, order });
  };

  const openAdd = () => {
    setMsg('');
    setEditingLocked(false);
    setForm({
      customer_name: '',
      customer_phone: '',
      address_text: '',
      map_link: '',
      delivery_fee: '',
      payment_type: 'cash',
      captain_id: '',
      status: 'new',
      items: [{ store_id: '', details: '', invoice_amount: '' }],
    });
    setOrderModal({ open: true, mode: 'add', orderId: null });
  };

  const openEdit = (order) => {
    setMsg('');
    setEditingLocked(isTerminalOrderStatus(order.status));
    setForm(orderToForm(order));
    setOrderModal({ open: true, mode: 'edit', orderId: order.id });
  };

  const applySavedCustomer = (name) => {
    const row = customerMap.get(String(name || '').trim());
    if (!row) return;
    setForm(prev => ({
      ...prev,
      customer_name: row.name || prev.customer_name,
      customer_phone: row.phone || prev.customer_phone,
      address_text: row.address_text || prev.address_text,
      map_link: row.map_link || prev.map_link,
    }));
  };

  const setItem = (idx, field, value) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i !== idx) return item;
        if (field === 'store_id') {
          const external = value === EXTERNAL_STORE_ID;
          return {
            ...item,
            store_id: value,
            invoice_amount: external ? item.invoice_amount : '',
          };
        }
        return { ...item, [field]: value };
      }),
    }));
  };

  const addItemRow = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { store_id: '', details: '', invoice_amount: '' }],
    }));
  };

  const removeItemRow = (idx) => {
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) || [{ store_id: '', details: '' }] }));
  };

  const saveOrder = async (e) => {
    e.preventDefault();
    if (!form.customer_name.trim()) return notify('اسم العميل مطلوب', 'error');
    if (!form.customer_phone.trim()) return notify('رقم الهاتف مطلوب', 'error');
    if (!form.items.some(i => String(i.details || '').trim())) return notify('أدخل تفاصيل الطلب', 'error');
    setSaving(true);
    setMsg('');
    try {
      const payload = {
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        address_text: form.address_text,
        map_link: form.map_link,
        delivery_fee: Number(form.delivery_fee || 0),
        payment_type: form.payment_type,
        items: buildItemsPayload(form.items),
        ...userPayload(user),
      };

      if (orderModal.mode === 'edit') {
        let captain_id = form.captain_id || null;
        let status = form.status;
        if (!editingLocked) {
          if (captain_id && (status === 'new' || !status)) status = 'assigned';
          else if (!captain_id && status === 'assigned') status = 'new';
        }
        await api.updateOrder(orderModal.orderId, {
          ...payload,
          captain_id: editingLocked ? undefined : captain_id,
          status: editingLocked ? undefined : status,
        });
        closeOrderModal();
        await load();
        notify(`تم تعديل الطلب للعميل ${form.customer_name}`);
      } else {
        const created = await api.createOrder(payload);
        closeOrderModal();
        await load();
        notify(`المستخدم ${user?.name || 'مستخدم'} أضاف الطلب للعميل ${created.customer_name}`);
      }
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const snapshotKey = (orderId, field) => `${orderId}:${field}`;

  const rememberField = (orderId, field, value) => {
    fieldSnapshot.current[snapshotKey(orderId, field)] = String(value || '').trim();
  };

  const clearFieldSnapshot = (orderId, field) => {
    delete fieldSnapshot.current[snapshotKey(orderId, field)];
  };

  const fieldChanged = (orderId, field, value) => {
    const before = fieldSnapshot.current[snapshotKey(orderId, field)];
    return before !== undefined && before !== String(value || '').trim();
  };

  const updateLocalOrder = (orderId, patch) => {
    setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, ...patch } : o)));
  };

  const saveOrderPatch = async (orderId, patch) => {
    setSavingId(orderId);
    setMsg('');
    const currentOrder = orders.find(o => o.id === orderId) || null;
    const displayIndex = currentOrder?.display_number || null;
    try {
      const updated = await api.updateOrder(orderId, { ...patch, ...userPayload(user) });
      if (updated) {
        setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, ...updated, display_number: o.display_number } : o)));
        ordersSnapshotRef.current.set(orderId, { status: updated.status || 'new' });
        const customerName = updated.customer_name || currentOrder?.customer_name || '';
        notify(buildOrderToast({
          userName: user?.name,
          displayIndex,
          customerName,
          patch,
          currentOrder,
          captains,
        }));
      }
    } catch (err) {
      notify(err.message, 'error');
      await load();
    } finally {
      setSavingId(null);
      for (const field of ['address_text', 'map_link']) {
        if (patch[field] !== undefined) clearFieldSnapshot(orderId, field);
      }
    }
  };

  return (
    <>
      {msg && (
        <div className={`toast ${msgType === 'error' ? 'toast--error' : 'toast--info'}`}>
          {msg}
        </div>
      )}

      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2>الطلبات</h2>
          <p>إدارة الطلبات وتعيين الكباتن</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`orders-live-btn ${liveUpdates ? 'is-on' : ''}`}
            onClick={() => setLiveUpdates(v => !v)}
            title="التحديث التلقائي"
          >
            <Wifi size={16} />
            {liveUpdates ? 'مباشر' : 'متوقف'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleManualRefresh} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'جاري التحديث...' : 'تحديث'}
          </button>
          <button type="button" className="btn btn-primary" onClick={openAdd}>+ إضافة طلب</button>
        </div>
      </div>

      <div className="orders-toolbar card">
        <div className="orders-search-wrap">
          <Search size={16} className="orders-search-icon" />
          <input
            type="text"
            className="orders-search-input"
            placeholder="بحث بالاسم / الهاتف / رقم الطلب / العنوان / التفاصيل"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="orders-tabs">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              className={`orders-tab ${activeTab === tab.key ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              <span className="orders-tab__count">({statusCounts[tab.key] || 0})</span>
            </button>
          ))}
        </div>

        <div className="orders-toolbar__footer">
          <div className="orders-date-filters">
            {DATE_FILTERS.map(filter => (
              <button
                key={filter.key}
                type="button"
                className={`orders-date-btn ${dateFilter === filter.key ? 'is-active' : ''}`}
                onClick={() => setDateFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          {lastRefreshedAt && (
            <span className="orders-last-refresh">
              آخر تحديث: {lastRefreshedAt.toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      <div className="card !p-0 overflow-hidden">
        {visibleOrders.length === 0 ? (
          <div className="empty-state p-6">لا توجد طلبات مطابقة للبحث أو الفلتر</div>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>العميل</th>
                  <th>الجوال</th>
                  <th>تفاصيل الطلب</th>
                  <th>العنوان</th>
                  <th>رابط الموقع</th>
                  <th>الكابتن</th>
                  <th>الحالة</th>
                  <th>طريقة الدفع</th>
                  <th>الإجمالي</th>
                  <th>عرض فواتير</th>
                  <th>وقت الحركة</th>
                  <th>المستخدم</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => (
                  <tr key={order.id} className={savingId === order.id ? 'opacity-70' : ''}>
                    <td>{order.display_number}</td>
                    <td>{order.customer_name}</td>
                    <td>{order.customer_phone || '—'}</td>
                    <td className="min-w-[180px]">{(order.items || []).map(i => `${itemStoreLabel(i)}: ${i.details}`).join(' | ') || '—'}</td>
                    <td className="min-w-[140px]">
                      <input
                        className="orders-table-input"
                        value={order.address_text || ''}
                        onFocus={e => rememberField(order.id, 'address_text', e.target.value)}
                        onChange={e => updateLocalOrder(order.id, { address_text: e.target.value })}
                        onBlur={e => {
                          const value = e.target.value.trim();
                          if (fieldChanged(order.id, 'address_text', value)) {
                            saveOrderPatch(order.id, { address_text: value });
                          } else {
                            clearFieldSnapshot(order.id, 'address_text');
                          }
                        }}
                        placeholder="عنوان العميل"
                      />
                    </td>
                    <td className="min-w-[80px] text-center">
                      {order.map_link ? (
                        <a
                          className="btn btn-secondary btn-sm"
                          href={order.map_link}
                          target="_blank"
                          rel="noreferrer"
                        >
                          GPS
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="min-w-[160px]">
                      {isTerminalOrderStatus(order.status) ? (
                        <span className="orders-captain-locked">
                          {orderCaptainLabel(order, captains)}
                        </span>
                      ) : (
                        <select
                          className="finance-filter-select w-full min-w-0"
                          value={order.captain_id || ''}
                          onChange={e => {
                            const captain_id = e.target.value || null;
                            let nextStatus = order.status || 'new';
                            if (captain_id && (nextStatus === 'new' || !nextStatus)) {
                              nextStatus = 'assigned';
                            } else if (!captain_id && nextStatus === 'assigned') {
                              nextStatus = 'new';
                            }
                            updateLocalOrder(order.id, { captain_id, status: nextStatus });
                            saveOrderPatch(order.id, { captain_id, status: nextStatus });
                          }}
                        >
                          <option value="">بدون تعيين</option>
                          {captains.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.captain_number})</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="min-w-[130px]">
                      {isTerminalOrderStatus(order.status) ? (
                        <span className={`order-status-badge status-${order.status}`}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      ) : (
                        <select
                          className="finance-filter-select w-full min-w-0"
                          value={order.status || 'new'}
                          disabled={savingId === order.id}
                          onChange={e => {
                            const status = e.target.value;
                            updateLocalOrder(order.id, { status });
                            saveOrderPatch(order.id, { status });
                          }}
                        >
                          {Object.entries(STATUS_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      )}
                      {savingId === order.id && <div className="orders-saving-hint">جاري التحديث...</div>}
                    </td>
                    <td className="min-w-[120px]">
                      <select
                        className="finance-filter-select w-full min-w-0"
                        value={order.payment_type || 'cash'}
                        onChange={e => {
                          const payment_type = e.target.value;
                          updateLocalOrder(order.id, { payment_type });
                          saveOrderPatch(order.id, { payment_type });
                        }}
                      >
                        {Object.entries(PAYMENT_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="min-w-[100px] font-semibold whitespace-nowrap">
                      {formatMoney(orderGrandTotal(order))} ر.ي
                    </td>
                    <td className="min-w-[110px]">
                      {(order.invoice_attachments || []).length > 0 ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openInvoicePreview(order)}
                        >
                          عرض ({order.invoice_attachments.length})
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="min-w-[120px]">
                      <div className="orders-timeline">
                        {formatStatusTimeline(order).map((row, i) => (
                          <div key={`${order.id}-tl-${i}`} className="orders-timeline__row">
                            <span>{row.icon}</span>
                            <span>{row.time}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>{orderUserLabel(order)}</td>
                    <td className="min-w-[120px]">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEdit(order)}
                        disabled={savingId === order.id}
                      >
                        تعديل الطلب
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {orderModal.open && (
        <div className="modal-overlay" onClick={closeOrderModal}>
          <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
            <h3>{orderModal.mode === 'edit' ? 'تعديل الطلب' : 'إضافة طلب'}</h3>
            <form onSubmit={saveOrder}>
              <div className="form-row">
                <div className="form-group">
                  <label>اسم العميل</label>
                  <input
                    list="customers-list"
                    value={form.customer_name}
                    onChange={e => setForm({ ...form, customer_name: e.target.value })}
                    onBlur={e => applySavedCustomer(e.target.value)}
                    required
                  />
                  <datalist id="customers-list">
                    {customers.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>
                <div className="form-group">
                  <label>رقم الجوال</label>
                  <input
                    value={form.customer_phone}
                    onChange={e => setForm({ ...form, customer_phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="finance-admin-section mt-2">
                <h4 className="font-bold mb-3">تفاصيل الطلب حسب المحل</h4>
                {form.items.map((item, idx) => {
                  const isExternal = item.store_id === EXTERNAL_STORE_ID;
                  return (
                  <div className="form-row" key={idx}>
                    <div className="form-group">
                      <label>المحل</label>
                      <select value={item.store_id} onChange={e => setItem(idx, 'store_id', e.target.value)}>
                        <option value="">اختر محل</option>
                        <option value={EXTERNAL_STORE_ID}>طلب خارجي (خدمة — لا تُحسب فاتورة)</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>تفاصيل الطلب</label>
                      <input
                        value={item.details}
                        onChange={e => setItem(idx, 'details', e.target.value)}
                        placeholder={isExternal ? 'مثال: توصيل خارجي / خدمة' : 'مثال: 2 دجاج + 1 مشروب'}
                      />
                    </div>
                    {isExternal && (
                      <div className="form-group">
                        <label>مبلغ الخدمة (اختياري)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.invoice_amount}
                          onChange={e => setItem(idx, 'invoice_amount', e.target.value)}
                          placeholder="يُدخله الكابتن لاحقاً"
                        />
                      </div>
                    )}
                    <div className="form-group flex items-end">
                      {form.items.length > 1 && (
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => removeItemRow(idx)}>حذف</button>
                      )}
                    </div>
                  </div>
                  );
                })}
                <button type="button" className="btn btn-secondary btn-sm" onClick={addItemRow}>+ إضافة محل آخر</button>
              </div>

              <div className="form-row mt-4">
                <div className="form-group">
                  <label>عنوان العميل (نصي)</label>
                  <input value={form.address_text} onChange={e => setForm({ ...form, address_text: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>رابط موقع العميل</label>
                  <input value={form.map_link} onChange={e => setForm({ ...form, map_link: e.target.value })} placeholder="https://maps..." />
                </div>
                <div className="form-group">
                  <label>رسوم التوصيل</label>
                  <input type="number" min="0" step="1" value={form.delivery_fee} onChange={e => setForm({ ...form, delivery_fee: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>طريقة الدفع</label>
                  <select value={form.payment_type} onChange={e => setForm({ ...form, payment_type: e.target.value })}>
                    {Object.entries(PAYMENT_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {orderModal.mode === 'edit' && (
                <div className="form-row mt-2">
                  <div className="form-group">
                    <label>الكابتن</label>
                    <select
                      value={form.captain_id}
                      disabled={editingLocked}
                      onChange={e => setForm({ ...form, captain_id: e.target.value })}
                    >
                      <option value="">بدون تعيين</option>
                      {captains.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.captain_number})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>الحالة</label>
                    <select
                      value={form.status}
                      disabled={editingLocked}
                      onChange={e => setForm({ ...form, status: e.target.value })}
                    >
                      {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  {editingLocked && (
                    <div className="form-group flex items-end">
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        الطلب مكتمل/ملغي — لا يمكن تغيير الكابتن أو الحالة
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'جاري الحفظ...' : (orderModal.mode === 'edit' ? 'حفظ التعديلات' : 'حفظ الطلب')}
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeOrderModal}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {invoicePreview.open && (
        <div className="modal-overlay" onClick={() => setInvoicePreview({ open: false, order: null })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>فواتير الطلب #{invoicePreview.order?.display_number}</h3>
            {(invoicePreview.order?.invoice_attachments || []).length === 0 ? (
              <p className="text-sm text-gray-500">لا توجد مرفقات</p>
            ) : (
              <div className="space-y-2 mt-3">
                {invoicePreview.order.invoice_attachments.map((item, idx) => (
                  <a
                    key={item.id}
                    href={mediaUrl(item.file_path)}
                    target="_blank"
                    rel="noreferrer"
                    className="block border rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    {item.file_name || `مرفق ${idx + 1}`}
                  </a>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setInvoicePreview({ open: false, order: null })}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
