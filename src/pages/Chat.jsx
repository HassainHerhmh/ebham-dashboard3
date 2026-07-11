import { useEffect, useMemo, useRef, useState } from 'react';
import { Paperclip, Send } from 'lucide-react';
import { api, mediaUrl } from '../api';

const CHAT_SEEN_KEY = 'platform_chat_seen_map_v1';

function formatChatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' });
}

function readChatSeenMap() {
  try {
    const raw = JSON.parse(localStorage.getItem(CHAT_SEEN_KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

function writeChatSeenMap(next) {
  localStorage.setItem(CHAT_SEEN_KEY, JSON.stringify(next));
}

function markCaptainChatSeen(captainId, rows) {
  if (!captainId) return;
  const latestCaptainMessageAt = (rows || [])
    .filter((m) => m.sender_type === 'captain')
    .map((m) => String(m.created_at || ''))
    .sort()
    .at(-1);
  if (!latestCaptainMessageAt) return;
  const seen = readChatSeenMap();
  seen[captainId] = latestCaptainMessageAt;
  writeChatSeenMap(seen);
}

function threadPreview(thread) {
  if (thread?.last_message) return thread.last_message;
  if (thread?.last_attachment_name) return `📎 ${thread.last_attachment_name}`;
  return 'لا توجد رسائل بعد';
}

function isImageMime(mime) {
  return String(mime || '').startsWith('image/');
}

function isMessageRead(message, mine) {
  if (!mine) return false;
  if (message.sender_type === 'platform') return Boolean(message.read_by_captain_at);
  if (message.sender_type === 'captain') return Boolean(message.read_by_platform_at);
  return false;
}

function ChatMessage({ message, mine }) {
  const hasAttachment = Boolean(message.attachment_path);
  const attachmentUrl = hasAttachment ? mediaUrl(message.attachment_path) : '';
  const isRead = isMessageRead(message, mine);

  return (
    <div className={`chat-bubble ${mine ? 'chat-bubble--mine' : 'chat-bubble--theirs'}`}>
      {!mine && (
        <div className="chat-bubble__sender">{message.sender_name || 'الكابتن'}</div>
      )}
      {message.message ? <div className="chat-bubble__text">{message.message}</div> : null}
      {hasAttachment && (
        <div className="chat-bubble__attachment">
          {isImageMime(message.attachment_mime) ? (
            <a href={attachmentUrl} target="_blank" rel="noreferrer">
              <img src={attachmentUrl} alt={message.attachment_name || 'مرفق'} />
            </a>
          ) : (
            <a href={attachmentUrl} target="_blank" rel="noreferrer" className="chat-bubble__file">
              📎 {message.attachment_name || 'مرفق'}
            </a>
          )}
        </div>
      )}
      <div className="chat-bubble__meta">
        <span className="chat-bubble__time">{formatChatTime(message.created_at)}</span>
        {mine && (
          <span className={`chat-bubble__ticks ${isRead ? 'is-read' : ''}`} title={isRead ? 'مقروءة' : 'مرسلة'}>
            ✓✓
          </span>
        )}
      </div>
    </div>
  );
}

export default function Chat({ user }) {
  const [threads, setThreads] = useState([]);
  const [captainId, setCaptainId] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const selectedCaptain = useMemo(
    () => threads.find((c) => c.id === captainId),
    [threads, captainId]
  );

  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((c) =>
      String(c.name || '').toLowerCase().includes(q)
      || String(c.captain_number || '').toLowerCase().includes(q)
    );
  }, [threads, search]);

  const loadThreads = async () => {
    const rows = await api.getChatThreads();
    setThreads(rows || []);
  };

  const loadMessages = async (id) => {
    if (!id) return setMessages([]);
    const rows = await api.getChatMessages(id);
    setMessages(rows || []);
    await api.markChatRead(id).catch(() => {});
    markCaptainChatSeen(id, rows || []);
    const refreshed = await api.getChatMessages(id);
    setMessages(refreshed || []);
    await loadThreads();
  };

  useEffect(() => {
    loadThreads().catch(() => {});
    const timer = setInterval(() => loadThreads().catch(() => {}), 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadMessages(captainId).catch(() => {});
    if (!captainId) return undefined;
    const timer = setInterval(() => loadMessages(captainId).catch(() => {}), 5000);
    return () => clearInterval(timer);
  }, [captainId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, captainId]);

  const send = async () => {
    const body = text.trim();
    if (!captainId || (!body && !pendingFile)) return;
    setSending(true);
    try {
      await api.sendChatMessage(captainId, {
        message: body,
        sender_id: user?.id,
        sender_name: user?.name || 'المنصة',
        file: pendingFile,
      });
      setText('');
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await Promise.all([loadMessages(captainId), loadThreads()]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-page">
      <aside className="chat-sidebar">
        <div className="chat-sidebar__head">
          <h2>الدردشة</h2>
          <p>الكباتن</p>
        </div>
        <div className="chat-sidebar__search">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث عن كابتن..."
          />
        </div>
        <div className="chat-sidebar__list">
          {filteredThreads.length === 0 ? (
            <div className="chat-sidebar__empty">لا يوجد كباتن</div>
          ) : (
            filteredThreads.map((c) => {
              const unreadCount = Number(c.unread_count) || 0;
              const showBadge = unreadCount > 0 && captainId !== c.id;
              return (
              <button
                key={c.id}
                type="button"
                className={`chat-thread ${captainId === c.id ? 'chat-thread--active' : ''} ${showBadge ? 'chat-thread--unread' : ''}`}
                onClick={() => setCaptainId(c.id)}
              >
                <div className="chat-thread__avatar">
                  {c.photo ? (
                    <img src={mediaUrl(c.photo)} alt="" />
                  ) : (
                    <span>{String(c.name || 'ك').slice(0, 1)}</span>
                  )}
                </div>
                <div className="chat-thread__body">
                  <div className="chat-thread__top">
                    <strong>{c.name}</strong>
                    <span className="chat-thread__meta">
                      {showBadge && (
                        <span className="chat-thread__badge">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                      <span className="chat-thread__time">{formatChatTime(c.last_message_at)}</span>
                    </span>
                  </div>
                  <div className="chat-thread__preview">{threadPreview(c)}</div>
                </div>
              </button>
            );
            })
          )}
        </div>
      </aside>

      <section className="chat-main">
        {!captainId ? (
          <div className="chat-main__empty">اختر كابتناً من القائمة لبدء المحادثة</div>
        ) : (
          <>
            <header className="chat-main__header">
              <div className="chat-main__title">
                <strong>{selectedCaptain?.name || '—'}</strong>
                <span>{selectedCaptain?.captain_number || ''}</span>
              </div>
            </header>

            <div className="chat-main__messages">
              {messages.length === 0 ? (
                <div className="chat-main__no-messages">لا توجد رسائل بعد — ابدأ المحادثة</div>
              ) : (
                messages.map((m) => (
                  <ChatMessage key={m.id} message={m} mine={m.sender_type === 'platform'} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <footer className="chat-composer">
              {pendingFile && (
                <div className="chat-composer__pending">
                  <span>📎 {pendingFile.name}</span>
                  <button type="button" onClick={() => {
                    setPendingFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  >
                    إزالة
                  </button>
                </div>
              )}
              <div className="chat-composer__row">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={(e) => setPendingFile(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  className="chat-composer__attach"
                  onClick={() => fileInputRef.current?.click()}
                  title="إرفاق ملف"
                >
                  <Paperclip size={20} />
                </button>
                <input
                  className="chat-composer__input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="اكتب الرسالة..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <button
                  type="button"
                  className="chat-composer__send"
                  onClick={send}
                  disabled={sending || (!text.trim() && !pendingFile)}
                  title="إرسال"
                >
                  <Send size={18} />
                </button>
              </div>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
