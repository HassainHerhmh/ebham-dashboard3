import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

export default function Chat({ user }) {
  const [captains, setCaptains] = useState([]);
  const [captainId, setCaptainId] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const selectedCaptain = useMemo(
    () => captains.find((c) => c.id === captainId),
    [captains, captainId]
  );

  const loadMessages = async (id) => {
    if (!id) return setMessages([]);
    const rows = await api.getChatMessages(id);
    setMessages(rows || []);
  };

  useEffect(() => {
    api.getCaptains().then((rows) => {
      setCaptains(rows || []);
      if (rows?.[0]?.id) setCaptainId(rows[0].id);
    });
  }, []);

  useEffect(() => {
    loadMessages(captainId).catch(() => {});
    if (!captainId) return undefined;
    const timer = setInterval(() => loadMessages(captainId).catch(() => {}), 5000);
    return () => clearInterval(timer);
  }, [captainId]);

  const send = async () => {
    const body = text.trim();
    if (!captainId || !body) return;
    setSending(true);
    try {
      await api.sendChatMessage(captainId, {
        message: body,
        sender_id: user?.id,
        sender_name: user?.name || 'المنصة',
      });
      setText('');
      await loadMessages(captainId);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2>الدردشة</h2>
          <p>محادثة مباشرة بين المنصة والكابتن</p>
        </div>
        <select
          className="finance-filter-select"
          value={captainId}
          onChange={(e) => setCaptainId(e.target.value)}
        >
          <option value="">اختر الكابتن</option>
          {captains.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.captain_number})
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        {!captainId ? (
          <div className="empty-state">اختر الكابتن لعرض المحادثة</div>
        ) : (
          <>
            <div className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              المحادثة مع: <strong>{selectedCaptain?.name || '—'}</strong>
            </div>
            <div className="max-h-[420px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-900/20 space-y-2">
              {messages.length === 0 ? (
                <div className="text-sm text-gray-500">لا توجد رسائل بعد</div>
              ) : (
                messages.map((m) => {
                  const mine = m.sender_type === 'platform';
                  return (
                    <div
                      key={m.id}
                      className={`rounded-lg px-3 py-2 text-sm ${mine ? 'bg-blue-100 dark:bg-blue-900/30 mr-auto' : 'bg-white dark:bg-gray-800 ml-auto'}`}
                      style={{ maxWidth: '80%' }}
                    >
                      <div className="font-semibold mb-1">{m.sender_name || (mine ? 'المنصة' : 'الكابتن')}</div>
                      <div>{m.message}</div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-gray-800"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="اكتب الرسالة..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') send();
                }}
              />
              <button type="button" className="btn btn-primary" onClick={send} disabled={sending}>
                {sending ? 'إرسال...' : 'إرسال'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
