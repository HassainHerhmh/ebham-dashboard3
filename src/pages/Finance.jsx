import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';

const TABS = [
  { id: 'stores', label: 'إعداد المحلات' },
  { id: 'invoices', label: 'إعداد الفواتير' },
  { id: 'commission', label: 'إعداد العمولة' },
  { id: 'vouchers', label: 'السندات' },
];

function formatMoney(n) {
  return Number(n || 0).toLocaleString('ar-YE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const PERIOD_LABELS = { day: 'يوم', week: 'أسبوع', month: 'شهر' };

function getFilterRange(period, dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const ref = new Date(y, m - 1, d);
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

  if (period === 'day') return { from: dateKey, to: dateKey };
  if (period === 'month') {
    const last = new Date(y, m, 0).getDate();
    return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(last)}` };
  }
  const daysSinceSat = (ref.getDay() + 1) % 7;
  const sat = new Date(ref);
  sat.setDate(ref.getDate() - daysSinceSat);
  const fri = new Date(sat);
  fri.setDate(sat.getDate() + 6);
  return { from: fmt(sat), to: fmt(fri) };
}

function recordDateKey(record, dateField, fallbackField) {
  const pick = (val) => {
    if (!val) return '';
    if (val instanceof Date) return val.toISOString().slice(0, 10);
    const raw = String(val);
    const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
  };
  return pick(record[dateField]) || pick(record[fallbackField]);
}

function filterByPeriodAndCaptain(rows, { from, to, captainId, dateField, fallbackField }) {
  return rows.filter((row) => {
    if (captainId && row.captain_id !== captainId) return false;
    const key = recordDateKey(row, dateField, fallbackField);
    return key && key >= from && key <= to;
  });
}

function formatDateKey(key) {
  if (!key) return '—';
  const d = new Date(`${key}T12:00:00`);
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString('ar-YE', { dateStyle: 'medium' });
}

function formatFilterHint(period, range) {
  if (period === 'day') return range.from;
  return `${range.from} — ${range.to}`;
}

export default function Finance() {
  const [tab, setTab] = useState('stores');
  const [stores, setStores] = useState([]);
  const [captains, setCaptains] = useState([]);
  const [config, setConfig] = useState({ company_commission_rate: 20 });
  const [storeModal, setStoreModal] = useState(false);
  const [newStore, setNewStore] = useState('');
  const [storeError, setStoreError] = useState('');
  const [msg, setMsg] = useState('');
  const [voucherModal, setVoucherModal] = useState(null);
  const [voucherForm, setVoucherForm] = useState({ amount: '', note: '', voucher_date: todayKey() });
  const [transferModal, setTransferModal] = useState(false);
  const [editingTransferGroupId, setEditingTransferGroupId] = useState(null);
  const [transferForm, setTransferForm] = useState({
    from_captain_id: '',
    to_captain_id: '',
    amount: '',
    note: '',
    voucher_date: todayKey(),
  });
  const [postings, setPostings] = useState([]);
  const [commissionPostings, setCommissionPostings] = useState([]);
  const [editingVoucherId, setEditingVoucherId] = useState(null);
  const [modalCaptainId, setModalCaptainId] = useState('');
  const [commissionModal, setCommissionModal] = useState(false);
  const [editingCommissionPostingId, setEditingCommissionPostingId] = useState(null);
  const [editingCommissionOriginalCaptainId, setEditingCommissionOriginalCaptainId] = useState('');
  const [editingCommissionOriginalSalesDate, setEditingCommissionOriginalSalesDate] = useState('');
  const [modalCommissionCaptainId, setModalCommissionCaptainId] = useState('');
  const [modalCommissionSalesDate, setModalCommissionSalesDate] = useState(todayKey);
  const [modalCommissionForm, setModalCommissionForm] = useState({ rent: 0, total_commission: 0 });
  const [modalCommissionLoading, setModalCommissionLoading] = useState(false);
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [editingInvoicePostingId, setEditingInvoicePostingId] = useState(null);
  const [editingInvoiceOriginalCaptainId, setEditingInvoiceOriginalCaptainId] = useState('');
  const [editingInvoiceOriginalSalesDate, setEditingInvoiceOriginalSalesDate] = useState('');
  const [modalInvoiceCaptainId, setModalInvoiceCaptainId] = useState('');
  const [modalInvoiceSalesDate, setModalInvoiceSalesDate] = useState(todayKey);
  const [modalInvoiceForm, setModalInvoiceForm] = useState({ transfers_debts: 0, orders_count: 0, invoices: {} });
  const [modalInvoiceLines, setModalInvoiceLines] = useState([]);
  const [modalInvoiceLoading, setModalInvoiceLoading] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState('month');
  const [filterDate, setFilterDate] = useState(todayKey);
  const [filterCaptainId, setFilterCaptainId] = useState('');
  const [allVouchers, setAllVouchers] = useState([]);

  const loadAllVouchers = () => api.getFinanceVouchers().then(setAllVouchers).catch(() => setAllVouchers([]));

  const loadStores = () => api.getFinanceStores().then(setStores);
  const loadPostings = () => api.getInvoicePostings().then(setPostings).catch(() => setPostings([]));
  const loadCommissionPostings = () => api.getCommissionPostings().then(setCommissionPostings).catch(() => setCommissionPostings([]));
  const loadCaptains = () => api.getCaptains().then(setCaptains);

  const emptyInvoices = () => Object.fromEntries(stores.map(s => [s.id, '']));

  const fillModalInvoiceForm = (data) => {
    const invMap = emptyInvoices();
    const lines = data?.invoices || [];
    const orderSumByStore = new Map();
    for (const inv of lines) {
      if (!inv.order_id) continue;
      orderSumByStore.set(
        inv.store_id,
        (orderSumByStore.get(inv.store_id) || 0) + (Number(inv.amount) || 0)
      );
    }
    for (const inv of lines) {
      if (inv.order_id) continue;
      const orderSum = orderSumByStore.get(inv.store_id) || 0;
      const manualAmount = Number(inv.amount) || 0;
      if (orderSum > 0) {
        const extra = manualAmount - orderSum;
        if (extra > 0.01) invMap[inv.store_id] = extra;
      } else if (manualAmount > 0) {
        invMap[inv.store_id] = manualAmount;
      }
    }
    setModalInvoiceLines(lines);
    setModalInvoiceForm({
      transfers_debts: data?.transfers_debts ?? 0,
      orders_count: data?.orders_count ?? 0,
      invoices: invMap,
    });
  };

  const loadModalInvoiceData = async (id, salesDate) => {
    if (!id || !salesDate) return;
    setModalInvoiceLoading(true);
    try {
      const data = await api.getCaptainFinance(id, { salesDate });
      fillModalInvoiceForm(data);
    } catch {
      setModalInvoiceForm({ transfers_debts: 0, orders_count: 0, invoices: emptyInvoices() });
      setModalInvoiceLines([]);
    } finally {
      setModalInvoiceLoading(false);
    }
  };

  const openInvoiceModal = async (posting = null) => {
    setMsg('');
    if (posting) {
      const salesDate = posting.sales_date || todayKey();
      setEditingInvoicePostingId(posting.id);
      setEditingInvoiceOriginalCaptainId(posting.captain_id);
      setEditingInvoiceOriginalSalesDate(salesDate);
      setModalInvoiceCaptainId(posting.captain_id);
      setModalInvoiceSalesDate(salesDate);
      setInvoiceModal(true);
      await loadModalInvoiceData(posting.captain_id, salesDate);
      return;
    }

    const captainIdDefault = filterCaptainId || captains[0]?.id || '';
    const salesDateDefault = todayKey();
    setEditingInvoicePostingId(null);
    setEditingInvoiceOriginalCaptainId('');
    setEditingInvoiceOriginalSalesDate('');
    setModalInvoiceCaptainId(captainIdDefault);
    setModalInvoiceSalesDate(salesDateDefault);
    setModalInvoiceForm({ transfers_debts: 0, orders_count: 0, invoices: emptyInvoices() });
    setInvoiceModal(true);
    if (captainIdDefault) {
      await loadModalInvoiceData(captainIdDefault, salesDateDefault);
    }
  };

  const closeInvoiceModal = () => {
    setInvoiceModal(false);
    setEditingInvoicePostingId(null);
    setEditingInvoiceOriginalCaptainId('');
    setEditingInvoiceOriginalSalesDate('');
    setModalInvoiceLoading(false);
  };

  useEffect(() => {
    loadStores();
    loadCaptains();
    loadPostings();
    loadCommissionPostings();
    loadAllVouchers();
    api.getFinanceConfig().then(setConfig).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'invoices') loadPostings();
    if (tab === 'commission') loadCommissionPostings();
    if (tab === 'vouchers') loadAllVouchers();
  }, [tab]);

  const openStoreModal = () => {
    setNewStore('');
    setStoreError('');
    setStoreModal(true);
  };

  const handleAddStore = async (e) => {
    e.preventDefault();
    setStoreError('');
    if (!newStore.trim()) {
      setStoreError('اسم المحل مطلوب');
      return;
    }
    try {
      await api.createFinanceStore(newStore.trim());
      setStoreModal(false);
      setNewStore('');
      await loadStores();
      setMsg('تم إضافة المحل');
    } catch (err) {
      setStoreError(err.message);
    }
  };

  const handleDeleteStore = async (id) => {
    if (!confirm('حذف هذا المحل؟')) return;
    await api.deleteFinanceStore(id);
    loadStores();
    setMsg('تم حذف المحل');
  };

  const handleSaveConfig = async () => {
    setMsg('');
    try {
      const saved = await api.saveFinanceConfig(config);
      setConfig(saved);
      setMsg('تم حفظ نسبة عمولة الشركة');
    } catch (err) {
      setMsg(err.message);
    }
  };

  const buildInvoicesPayload = (invoicesMap) => stores
    .map(s => ({
      store_id: s.id,
      amount: Number(invoicesMap[s.id]) || 0,
    }))
    .filter(i => i.amount > 0);

  const handleSaveInvoices = async (e) => {
    e?.preventDefault();
    if (!modalInvoiceCaptainId) {
      setMsg('اختر الكابتن');
      return;
    }
    setModalInvoiceLoading(true);
    setMsg('');
    try {
      const wasEdit = Boolean(editingInvoicePostingId);
      if (
        editingInvoicePostingId
        && (
          editingInvoiceOriginalCaptainId !== modalInvoiceCaptainId
          || editingInvoiceOriginalSalesDate !== modalInvoiceSalesDate
        )
      ) {
        await api.deleteInvoicePosting(editingInvoicePostingId);
      }
      await api.saveCaptainFinance(modalInvoiceCaptainId, {
        transfers_debts: Number(modalInvoiceForm.transfers_debts) || 0,
        orders_count: Number(modalInvoiceForm.orders_count) || 0,
        invoices: buildInvoicesPayload(modalInvoiceForm.invoices),
        sales_date: modalInvoiceSalesDate,
      });
      closeInvoiceModal();
      setMsg(wasEdit ? 'تم تعديل الفواتير' : 'تم ترحيل الفواتير');
      loadPostings();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setModalInvoiceLoading(false);
    }
  };

  const fillModalCommissionForm = (data) => {
    setModalCommissionForm({
      rent: data?.rent ?? 0,
      total_commission: data?.total_commission ?? 0,
    });
  };

  const loadModalCommissionData = async (id, salesDate) => {
    if (!id || !salesDate) return;
    setModalCommissionLoading(true);
    try {
      const data = await api.getCaptainFinance(id, { salesDate });
      fillModalCommissionForm(data);
    } catch {
      setModalCommissionForm({ rent: 0, total_commission: 0 });
    } finally {
      setModalCommissionLoading(false);
    }
  };

  const openCommissionModal = async (posting = null) => {
    setMsg('');
    if (posting) {
      const salesDate = posting.sales_date || todayKey();
      setEditingCommissionPostingId(posting.id);
      setEditingCommissionOriginalCaptainId(posting.captain_id);
      setEditingCommissionOriginalSalesDate(salesDate);
      setModalCommissionCaptainId(posting.captain_id);
      setModalCommissionSalesDate(salesDate);
      setCommissionModal(true);
      await loadModalCommissionData(posting.captain_id, salesDate);
      return;
    }

    const captainIdDefault = filterCaptainId || captains[0]?.id || '';
    const salesDateDefault = todayKey();
    setEditingCommissionPostingId(null);
    setEditingCommissionOriginalCaptainId('');
    setEditingCommissionOriginalSalesDate('');
    setModalCommissionCaptainId(captainIdDefault);
    setModalCommissionSalesDate(salesDateDefault);
    setModalCommissionForm({ rent: 0, total_commission: 0 });
    setCommissionModal(true);
    if (captainIdDefault) {
      await loadModalCommissionData(captainIdDefault, salesDateDefault);
    }
  };

  const closeCommissionModal = () => {
    setCommissionModal(false);
    setEditingCommissionPostingId(null);
    setEditingCommissionOriginalCaptainId('');
    setEditingCommissionOriginalSalesDate('');
    setModalCommissionLoading(false);
  };

  const handleSaveCommission = async (e) => {
    e?.preventDefault();
    if (!modalCommissionCaptainId) {
      setMsg('اختر الكابتن');
      return;
    }
    setModalCommissionLoading(true);
    setMsg('');
    try {
      const wasEdit = Boolean(editingCommissionPostingId);
      if (
        editingCommissionPostingId
        && (
          editingCommissionOriginalCaptainId !== modalCommissionCaptainId
          || editingCommissionOriginalSalesDate !== modalCommissionSalesDate
        )
      ) {
        await api.deleteCommissionPosting(editingCommissionPostingId);
      }
      await api.saveCaptainCommission(modalCommissionCaptainId, {
        rent: Number(modalCommissionForm.rent) || 0,
        total_commission: Number(modalCommissionForm.total_commission) || 0,
        sales_date: modalCommissionSalesDate,
      });
      closeCommissionModal();
      setMsg(wasEdit ? 'تم تعديل العمولة' : 'تم حفظ العمولة');
      loadCommissionPostings();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setModalCommissionLoading(false);
    }
  };

  const handleModalCommissionCaptainChange = (id) => {
    setModalCommissionCaptainId(id);
    if (!editingCommissionPostingId) {
      loadModalCommissionData(id, modalCommissionSalesDate);
    }
  };

  const handleModalCommissionDateChange = (date) => {
    setModalCommissionSalesDate(date);
    if (!editingCommissionPostingId) {
      loadModalCommissionData(modalCommissionCaptainId, date);
    }
  };

  const updateModalInvoice = (storeId, value) => {
    setModalInvoiceForm(prev => ({
      ...prev,
      invoices: { ...prev.invoices, [storeId]: value },
    }));
  };

  const handleModalCaptainChange = (id) => {
    setModalInvoiceCaptainId(id);
    if (!editingInvoicePostingId) {
      loadModalInvoiceData(id, modalInvoiceSalesDate);
    }
  };

  const handleModalDateChange = (date) => {
    setModalInvoiceSalesDate(date);
    if (!editingInvoicePostingId) {
      loadModalInvoiceData(modalInvoiceCaptainId, date);
    }
  };

  const openVoucherModal = (type, voucher = null) => {
    if (voucher?.voucher_type === 'transfer') {
      openTransferModal(voucher);
      return;
    }
    if (voucher) {
      setEditingVoucherId(voucher.id);
      setModalCaptainId(voucher.captain_id);
      setVoucherForm({
        amount: voucher.amount,
        note: voucher.note || '',
        voucher_date: voucher.voucher_date || todayKey(),
      });
      setVoucherModal(voucher.voucher_type);
    } else {
      setEditingVoucherId(null);
      setModalCaptainId(filterCaptainId || captains[0]?.id || '');
      setVoucherForm({ amount: '', note: '', voucher_date: todayKey() });
      setVoucherModal(type);
    }
  };

  const closeVoucherModal = () => {
    setVoucherModal(null);
    setEditingVoucherId(null);
    setModalCaptainId('');
  };

  const openTransferModal = (transfer = null) => {
    setMsg('');
    if (transfer) {
      setEditingTransferGroupId(transfer.transfer_group_id);
      setTransferForm({
        from_captain_id: transfer.from_captain_id,
        to_captain_id: transfer.to_captain_id,
        amount: transfer.amount,
        note: transfer.note?.replace(/\s*—\s*تحويل من .+$/, '') || '',
        voucher_date: transfer.voucher_date || todayKey(),
      });
    } else {
      setEditingTransferGroupId(null);
      const defaultFrom = filterCaptainId || captains[0]?.id || '';
      const defaultTo = captains.find(c => c.id !== defaultFrom)?.id || '';
      setTransferForm({
        from_captain_id: defaultFrom,
        to_captain_id: defaultTo,
        amount: '',
        note: '',
        voucher_date: todayKey(),
      });
    }
    setTransferModal(true);
  };

  const closeTransferModal = () => {
    setTransferModal(false);
    setEditingTransferGroupId(null);
  };

  const handleSaveTransfer = async (e) => {
    e.preventDefault();
    if (!transferForm.from_captain_id || !transferForm.to_captain_id) {
      setMsg('اختر الكابتنين');
      return;
    }
    if (transferForm.from_captain_id === transferForm.to_captain_id) {
      setMsg('لا يمكن التحويل لنفس الكابتن');
      return;
    }
    try {
      const payload = {
        from_captain_id: transferForm.from_captain_id,
        to_captain_id: transferForm.to_captain_id,
        amount: Number(transferForm.amount),
        note: transferForm.note,
        voucher_date: transferForm.voucher_date,
      };
      if (editingTransferGroupId) {
        await api.updateTransferVoucher(editingTransferGroupId, payload);
        setMsg('تم تعديل سند التحويل');
      } else {
        await api.createTransferVoucher(payload);
        setMsg('تم إضافة سند قيد التحويل');
      }
      closeTransferModal();
      loadAllVouchers();
    } catch (err) {
      setMsg(err.message);
    }
  };

  const handleSaveVoucher = async (e) => {
    e.preventDefault();
    if (!modalCaptainId) {
      setMsg('اختر الكابتن');
      return;
    }
    try {
      const payload = {
        voucher_type: voucherModal,
        amount: Number(voucherForm.amount),
        note: voucherForm.note,
        voucher_date: voucherForm.voucher_date,
        captain_id: modalCaptainId,
      };
      if (editingVoucherId) {
        await api.updateVoucher(editingVoucherId, payload);
        setMsg('تم تعديل السند');
      } else {
        await api.createVoucher(modalCaptainId, payload);
        setMsg(voucherModal === 'disbursement' ? 'تم إضافة سند الصرف' : 'تم إضافة سند القبض');
      }
      closeVoucherModal();
      loadAllVouchers();
    } catch (err) {
      setMsg(err.message);
    }
  };

  const handleDeleteVoucher = async (id) => {
    if (!confirm('حذف هذا السند؟')) return;
    await api.deleteVoucher(id);
    loadAllVouchers();
    setMsg('تم حذف السند');
  };

  const formatVoucherDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' });
  };

  const handleEditPosting = (_id, posting) => {
    openInvoiceModal(posting);
  };

  const handleDeletePosting = async (posting) => {
    if (!confirm(`حذف ترحيل فواتير ${posting.captain_name}؟`)) return;
    try {
      await api.deleteInvoicePosting(posting.id);
      loadPostings();
      setMsg('تم حذف ترحيل الفواتير');
    } catch (err) {
      setMsg(err.message);
    }
  };

  const handleEditCommission = (_id, posting) => {
    openCommissionModal(posting);
  };

  const handleDeleteCommission = async (posting) => {
    if (!confirm(`حذف عمولة ${posting.captain_name}؟`)) return;
    try {
      await api.deleteCommissionPosting(posting.id);
      loadCommissionPostings();
      setMsg('تم حذف العمولة');
    } catch (err) {
      setMsg(err.message);
    }
  };

  const groupedOrderInvoices = useMemo(() => {
    const map = new Map();
    for (const inv of modalInvoiceLines) {
      if (!inv.order_id) continue;
      const entry = map.get(inv.store_id) || { store_name: inv.store_name, lines: [] };
      entry.lines.push(inv);
      map.set(inv.store_id, entry);
    }
    return map;
  }, [modalInvoiceLines]);

  const modalInvoiceTotal = modalInvoiceLines
    .filter((inv) => inv.order_id)
    .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0)
    + stores.reduce((sum, s) => sum + (Number(modalInvoiceForm.invoices[s.id]) || 0), 0);
  const modalCommissionPreview = (() => {
    const totalCommission = Number(modalCommissionForm.total_commission) || 0;
    const rent = Number(modalCommissionForm.rent) || 0;
    const rate = Number(config.company_commission_rate) || 0;
    const companyCommission = totalCommission * rate / 100;
    const captainCommission = totalCommission - companyCommission;
    const netDeliveryFees = totalCommission - companyCommission - rent;
    return { totalCommission, rent, rate, companyCommission, captainCommission, netDeliveryFees };
  })();
  const msgOk = msg.includes('تم');
  const filterRange = getFilterRange(filterPeriod, filterDate);
  const filteredPostings = filterByPeriodAndCaptain(postings, {
    from: filterRange.from,
    to: filterRange.to,
    captainId: filterCaptainId,
    dateField: 'sales_date',
    fallbackField: 'posted_at',
  });
  const filteredCommissionPostings = filterByPeriodAndCaptain(commissionPostings, {
    from: filterRange.from,
    to: filterRange.to,
    captainId: filterCaptainId,
    dateField: 'sales_date',
    fallbackField: 'posted_at',
  });
  const filteredVouchers = allVouchers.filter((row) => {
    if (filterCaptainId) {
      if (row.voucher_type === 'transfer') {
        if (row.from_captain_id !== filterCaptainId && row.to_captain_id !== filterCaptainId) return false;
      } else if (row.captain_id !== filterCaptainId) {
        return false;
      }
    }
    const key = recordDateKey(row, 'voucher_date', 'created_at');
    return key && key >= filterRange.from && key <= filterRange.to;
  });
  const filteredVoucherTotals = filteredVouchers.reduce(
    (acc, v) => {
      const amt = Number(v.amount) || 0;
      if (v.voucher_type === 'transfer') {
        acc.transfer += amt;
      } else if (v.voucher_type === 'receipt') {
        acc.receipt += amt;
      } else {
        acc.disbursement += amt;
      }
      return acc;
    },
    { disbursement: 0, receipt: 0, transfer: 0 }
  );

  return (
    <>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2>إعداد الماليات</h2>
          <p>المحلات، فواتير الكباتن، والعمولة</p>
        </div>
        {msg && (
          <span className={`text-sm font-medium ${msgOk ? 'text-green-600' : 'text-red-500'}`}>
            {msg}
          </span>
        )}
      </div>

      <div className="finance-tabs-bar">
        <div className="finance-page-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              className={`finance-page-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => { setTab(t.id); setMsg(''); }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab !== 'stores' && (
          <div className="finance-page-filter">
            <select
              className="finance-filter-select"
              value={filterCaptainId}
              onChange={e => setFilterCaptainId(e.target.value)}
            >
              <option value="">كل الكباتن</option>
              {captains.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.captain_number})</option>
              ))}
            </select>
            <div className="finance-filter-periods">
              {Object.entries(PERIOD_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`finance-filter-period-btn ${filterPeriod === key ? 'active' : ''}`}
                  onClick={() => setFilterPeriod(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              type="date"
              className="finance-filter-date-input"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
            />
            <span className="finance-filter-hint">{formatFilterHint(filterPeriod, filterRange)}</span>
          </div>
        )}
      </div>

      {tab === 'stores' && (
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-bold">المحلات / المطاعم</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                أضف المحلات أولاً ثم انتقل لإعداد الفواتير
              </p>
            </div>
            <button type="button" className="btn btn-primary" onClick={openStoreModal}>
              + إضافة محل
            </button>
          </div>

          {stores.length === 0 ? (
            <div className="empty-state">
              لا توجد محلات — اضغط «إضافة محل» لإدخال اسم المطعم
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>اسم المحل</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((s, i) => (
                  <tr key={s.id}>
                    <td>{i + 1}</td>
                    <td><strong>{s.name}</strong></td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteStore(s.id)}
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'invoices' && (
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-bold mb-1">إعداد الفواتير</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                أدخل مبيعات كل محل للكابتن — المبلغ المطلوب سحبه كفواتير
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openInvoiceModal()}
              disabled={stores.length === 0}
            >
              + إضافة فواتير
            </button>
          </div>

          {stores.length === 0 ? (
            <div className="empty-state">
              أضف المحلات أولاً من تبويب «إعداد المحلات»
            </div>
          ) : (
            <div className="finance-postings-section">
              <h4 className="font-bold mb-3">سجل ترحيل الفواتير</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                عمليات الفترة المحددة — {formatFilterHint(filterPeriod, filterRange)}
              </p>
              {filteredPostings.length === 0 ? (
                <div className="empty-state">لا توجد عمليات في هذه الفترة</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>الكابتن</th>
                      <th>الرقم</th>
                      <th>إجمالي الفواتير</th>
                      <th>عدد الطلبات</th>
                      <th>حوالات وديون</th>
                      <th>تاريخ</th>
                      <th>تاريخ الترحيل</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPostings.map(p => (
                      <tr key={p.id}>
                        <td><strong>{p.captain_name}</strong></td>
                        <td>{p.captain_number}</td>
                        <td>{formatMoney(p.total_invoices)} ر.ي</td>
                        <td>{Number(p.orders_count || 0)}</td>
                        <td>{formatMoney(p.transfers_debts)} ر.ي</td>
                        <td>{formatDateKey(p.sales_date)}</td>
                        <td>{formatVoucherDate(p.posted_at)}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleEditPosting(p.captain_id, p)}
                          >
                            تعديل
                          </button>{' '}
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeletePosting(p)}
                          >
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'commission' && (
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-bold mb-1">إعداد العمولة</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                نسبة الشركة، الإيجار، وإجمالي عمولة الكابتن
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openCommissionModal()}
            >
              + إضافة عمولة
            </button>
          </div>

          <div className="finance-admin-section mb-5">
            <h4 className="font-bold mb-3">نسبة عمولة الشركة (عامة)</h4>
            <div className="form-row">
              <div className="form-group">
                <label>النسبة المئوية من إجمالي العمولة</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={config.company_commission_rate ?? 20}
                  onChange={e => setConfig({ ...config, company_commission_rate: e.target.value })}
                />
              </div>
              <div className="form-group flex items-end">
                <button type="button" className="btn btn-secondary" onClick={handleSaveConfig}>
                  حفظ النسبة
                </button>
              </div>
            </div>
          </div>

          <div className="finance-postings-section">
            <h4 className="font-bold mb-3">سجل العمولات</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              عمليات الفترة المحددة — {formatFilterHint(filterPeriod, filterRange)}
            </p>
            {filteredCommissionPostings.length === 0 ? (
              <div className="empty-state">لا توجد عمليات في هذه الفترة</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>الكابتن</th>
                    <th>الرقم</th>
                    <th>إجمالي العمولة</th>
                    <th>الإيجار</th>
                    <th>تاريخ</th>
                    <th>تاريخ الحفظ</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCommissionPostings.map(p => (
                    <tr key={p.id}>
                      <td><strong>{p.captain_name}</strong></td>
                      <td>{p.captain_number}</td>
                      <td>{formatMoney(p.total_commission)} ر.ي</td>
                      <td>{formatMoney(p.rent)} ر.ي</td>
                      <td>{formatDateKey(p.sales_date)}</td>
                      <td>{formatVoucherDate(p.posted_at)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleEditCommission(p.captain_id, p)}
                        >
                          تعديل
                        </button>{' '}
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteCommission(p)}
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'vouchers' && (
        <div className="card">
          <h3 className="text-lg font-bold mb-4">السندات</h3>

          <div className="finance-voucher-summary">
            <div className="finance-voucher-stat finance-voucher-stat--out">
              <span>إجمالي سندات الصرف (سلّمت للكابتن)</span>
              <strong>{formatMoney(filteredVoucherTotals.disbursement)} ر.ي</strong>
            </div>
            <div className="finance-voucher-stat finance-voucher-stat--in">
              <span>إجمالي سندات القبض (استلمت من الكابتن)</span>
              <strong>{formatMoney(filteredVoucherTotals.receipt)} ر.ي</strong>
            </div>
            <div className="finance-voucher-stat">
              <span>إجمالي سندات التحويل بين الكباتن</span>
              <strong>{formatMoney(filteredVoucherTotals.transfer)} ر.ي</strong>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 my-4">
            <button type="button" className="btn btn-danger btn-sm" onClick={() => openVoucherModal('disbursement')}>
              + سند صرف
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => openVoucherModal('receipt')}>
              + سند قبض
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => openTransferModal()}>
              + سند قيد تحويل
            </button>
          </div>

          <div className="finance-postings-section">
            <h4 className="font-bold mb-3">سجل السندات</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              عمليات الفترة المحددة — {formatFilterHint(filterPeriod, filterRange)}
            </p>
          </div>

          {filteredVouchers.length === 0 ? (
            <div className="empty-state">لا توجد سندات في هذه الفترة</div>
          ) : (
            <table>
              <thead>
                <tr>
                  {!filterCaptainId && <th>الكابتن</th>}
                  <th>النوع</th>
                  <th>التفاصيل</th>
                  <th>المبلغ</th>
                  <th>ملاحظة</th>
                  <th>تاريخ</th>
                  <th>تاريخ التسجيل</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredVouchers.map(v => (
                  <tr key={v.transfer_group_id || v.id}>
                    {!filterCaptainId && (
                      <td>
                        {v.voucher_type === 'transfer' ? (
                          <>
                            <strong>{v.from_captain_name}</strong>
                            <span className="text-xs text-gray-500 block">{v.from_captain_number}</span>
                          </>
                        ) : (
                          <>
                            <strong>{v.captain_name}</strong>
                            <br />
                            <span className="text-xs text-gray-500">{v.captain_number}</span>
                          </>
                        )}
                      </td>
                    )}
                    <td>
                      <span className={`badge ${
                        v.voucher_type === 'receipt'
                          ? 'badge-green'
                          : v.voucher_type === 'transfer'
                            ? 'badge-blue'
                            : 'badge-red'
                      }`}>
                        {v.voucher_type === 'receipt'
                          ? 'قبض'
                          : v.voucher_type === 'transfer'
                            ? 'قيد تحويل'
                            : 'صرف'}
                      </span>
                    </td>
                    <td>
                      {v.voucher_type === 'transfer' ? (
                        <span className="text-sm">
                          من <strong>{v.from_captain_name}</strong>
                          {' → '}
                          إلى <strong>{v.to_captain_name}</strong>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td><strong>{formatMoney(v.amount)} ر.ي</strong></td>
                    <td>{v.note || '—'}</td>
                    <td>{formatDateKey(v.voucher_date)}</td>
                    <td>{formatVoucherDate(v.created_at)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => (
                          v.voucher_type === 'transfer'
                            ? openTransferModal(v)
                            : openVoucherModal(v.voucher_type, v)
                        )}
                      >
                        تعديل
                      </button>{' '}
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDeleteVoucher(v.id)}>
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {commissionModal && (
        <div className="modal-overlay" onClick={closeCommissionModal}>
          <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
            <h3>{editingCommissionPostingId ? 'تعديل عمولة' : 'إضافة عمولة'}</h3>
            <form onSubmit={handleSaveCommission}>
              <div className="form-row">
                <div className="form-group">
                  <label>تاريخ العمولة</label>
                  <input
                    type="date"
                    value={modalCommissionSalesDate}
                    onChange={e => handleModalCommissionDateChange(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">يوم العمولة (يمكن اختيار يوم سابق)</p>
                </div>
                <div className="form-group">
                  <label>الكابتن</label>
                  <select
                    value={modalCommissionCaptainId}
                    onChange={e => handleModalCommissionCaptainChange(e.target.value)}
                    required
                  >
                    <option value="">اختر الكابتن</option>
                    {captains.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.captain_number})</option>
                    ))}
                  </select>
                </div>
              </div>

              {modalCommissionLoading ? (
                <div className="empty-state my-4">جاري التحميل...</div>
              ) : (
                <>
                  <div className="form-row mt-2">
                    <div className="form-group">
                      <label>إجمالي العمولة (يدوي)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={modalCommissionForm.total_commission}
                        onChange={e => setModalCommissionForm({
                          ...modalCommissionForm,
                          total_commission: e.target.value,
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label>الإيجار</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={modalCommissionForm.rent}
                        onChange={e => setModalCommissionForm({
                          ...modalCommissionForm,
                          rent: e.target.value,
                        })}
                      />
                    </div>
                  </div>

                  <div className="finance-preview-card mt-3">
                    <div className="finance-preview-row">
                      <span>عمولة الشركة ({modalCommissionPreview.rate}%)</span>
                      <strong>{formatMoney(modalCommissionPreview.companyCommission)} ر.ي</strong>
                    </div>
                    <div className="finance-preview-row">
                      <span>عمولة الكابتن</span>
                      <strong>{formatMoney(modalCommissionPreview.captainCommission)} ر.ي</strong>
                    </div>
                    <div className="finance-preview-row">
                      <span>صافي رسوم التوصيل</span>
                      <strong>{formatMoney(modalCommissionPreview.netDeliveryFees)} ر.ي</strong>
                    </div>
                  </div>
                </>
              )}

              <div className="modal-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={modalCommissionLoading}
                >
                  {modalCommissionLoading
                    ? 'جاري الحفظ...'
                    : (editingCommissionPostingId ? 'حفظ التعديل' : 'حفظ العمولة')}
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeCommissionModal}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {invoiceModal && (
        <div className="modal-overlay" onClick={closeInvoiceModal}>
          <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
            <h3>{editingInvoicePostingId ? 'تعديل فواتير' : 'إضافة فواتير'}</h3>
            <form onSubmit={handleSaveInvoices}>
              <div className="form-row">
                <div className="form-group">
                  <label>تاريخ الفواتير</label>
                  <input
                    type="date"
                    value={modalInvoiceSalesDate}
                    onChange={e => handleModalDateChange(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">يوم المبيعات (يمكن اختيار يوم سابق)</p>
                </div>
                <div className="form-group">
                  <label>الكابتن</label>
                  <select
                    value={modalInvoiceCaptainId}
                    onChange={e => handleModalCaptainChange(e.target.value)}
                    required
                  >
                    <option value="">اختر الكابتن</option>
                    {captains.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.captain_number})</option>
                    ))}
                  </select>
                </div>
              </div>

              {modalInvoiceLoading ? (
                <div className="empty-state my-4">جاري التحميل...</div>
              ) : (
                <>
                  <div className="finance-admin-section mt-2">
                    <h4 className="font-bold mb-3">تفاصيل الفواتير حسب المحل</h4>
                    {stores.length === 0 ? (
                      <div className="empty-state">لا توجد محلات</div>
                    ) : (
                      <div className="finance-store-invoice-groups">
                        {stores.map((s) => {
                          const orderGroup = groupedOrderInvoices.get(s.id);
                          const hasOrderLines = (orderGroup?.lines || []).length > 0;
                          return (
                            <div className="finance-store-invoice-group" key={s.id}>
                              <div className="finance-store-invoice-group__title">{s.name}</div>
                              {hasOrderLines ? (
                                <div className="finance-store-invoice-lines">
                                  {orderGroup.lines.map((inv) => (
                                    <div className="finance-store-invoice-line" key={inv.id || `${inv.order_id}-${inv.store_id}`}>
                                      <span>طلب #{inv.order_number || '—'}</span>
                                      <strong>{formatMoney(inv.amount)} ر.ي</strong>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="finance-store-invoice-empty">لا توجد فواتير مرحّلة من الطلبات</div>
                              )}
                              <label className="finance-invoice-row finance-invoice-row--manual">
                                <span>{hasOrderLines ? 'فاتورة يدوية إضافية' : 'فاتورة يدوية'}</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  placeholder="0"
                                  value={modalInvoiceForm.invoices[s.id] ?? ''}
                                  onChange={(e) => updateModalInvoice(s.id, e.target.value)}
                                />
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <p className="finance-total-line">
                      إجمالي الفواتير: <strong>{formatMoney(modalInvoiceTotal)} ر.ي</strong>
                    </p>
                  </div>

                  <div className="form-group mt-4">
                    <label>إجمالي الحوالات + الديون</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={modalInvoiceForm.transfers_debts}
                      onChange={e => setModalInvoiceForm({
                        ...modalInvoiceForm,
                        transfers_debts: e.target.value,
                      })}
                    />
                  </div>
                  <div className="form-group mt-4">
                    <label>عدد الطلبات</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={modalInvoiceForm.orders_count}
                      onChange={e => setModalInvoiceForm({
                        ...modalInvoiceForm,
                        orders_count: e.target.value,
                      })}
                    />
                  </div>
                </>
              )}

              <div className="modal-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={modalInvoiceLoading}
                >
                  {modalInvoiceLoading
                    ? 'جاري الحفظ...'
                    : (editingInvoicePostingId ? 'حفظ التعديل' : 'ترحيل الفواتير')}
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeInvoiceModal}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {storeModal && (
        <div className="modal-overlay" onClick={() => setStoreModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>إضافة محل جديد</h3>
            {storeError && <p className="text-red-500 text-sm mb-3">{storeError}</p>}
            <form onSubmit={handleAddStore}>
              <div className="form-group">
                <label>اسم المحل أو المطعم</label>
                <input
                  autoFocus
                  value={newStore}
                  onChange={e => setNewStore(e.target.value)}
                  placeholder="مثال: مطعم البيت"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">حفظ</button>
                <button type="button" className="btn btn-secondary" onClick={() => setStoreModal(false)}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {transferModal && (
        <div className="modal-overlay" onClick={closeTransferModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>
              {editingTransferGroupId ? 'تعديل ' : ''}
              سند قيد تحويل — من حساب كابتن إلى آخر
            </h3>
            <form onSubmit={handleSaveTransfer}>
              <div className="form-row">
                <div className="form-group">
                  <label>من الكابتن (عليه)</label>
                  <select
                    value={transferForm.from_captain_id}
                    onChange={e => setTransferForm({ ...transferForm, from_captain_id: e.target.value })}
                    required
                  >
                    <option value="">اختر الكابتن</option>
                    {captains.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.captain_number})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>إلى الكابتن (له)</label>
                  <select
                    value={transferForm.to_captain_id}
                    onChange={e => setTransferForm({ ...transferForm, to_captain_id: e.target.value })}
                    required
                  >
                    <option value="">اختر الكابتن</option>
                    {captains.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.captain_number})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>تاريخ السند</label>
                <input
                  type="date"
                  value={transferForm.voucher_date}
                  onChange={e => setTransferForm({ ...transferForm, voucher_date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>المبلغ</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={transferForm.amount}
                  onChange={e => setTransferForm({ ...transferForm, amount: e.target.value })}
                  required
                  autoFocus={!editingTransferGroupId}
                />
              </div>
              <div className="form-group">
                <label>ملاحظة (اختياري)</label>
                <input
                  value={transferForm.note}
                  onChange={e => setTransferForm({ ...transferForm, note: e.target.value })}
                  placeholder="مثال: تسوية رصيد"
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  {editingTransferGroupId ? 'حفظ التعديل' : 'حفظ سند التحويل'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeTransferModal}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {voucherModal && (
        <div className="modal-overlay" onClick={closeVoucherModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>
              {editingVoucherId ? 'تعديل ' : ''}
              {voucherModal === 'disbursement' ? 'سند صرف — سلّمت للكابتن' : 'سند قبض — استلمت من الكابتن'}
            </h3>
            <form onSubmit={handleSaveVoucher}>
              <div className="form-group">
                <label>الكابتن</label>
                <select
                  value={modalCaptainId}
                  onChange={e => setModalCaptainId(e.target.value)}
                  required
                >
                  <option value="">اختر الكابتن</option>
                  {captains.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.captain_number})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>تاريخ السند</label>
                <input
                  type="date"
                  value={voucherForm.voucher_date}
                  onChange={e => setVoucherForm({ ...voucherForm, voucher_date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>المبلغ</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={voucherForm.amount}
                  onChange={e => setVoucherForm({ ...voucherForm, amount: e.target.value })}
                  required
                  autoFocus={!editingVoucherId}
                />
              </div>
              <div className="form-group">
                <label>ملاحظة (اختياري)</label>
                <input
                  value={voucherForm.note}
                  onChange={e => setVoucherForm({ ...voucherForm, note: e.target.value })}
                  placeholder="مثال: تحويل بنكي"
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  {editingVoucherId ? 'حفظ التعديل' : 'حفظ السند'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeVoucherModal}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
