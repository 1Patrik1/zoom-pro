import { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck, Loader2, Smartphone, X } from 'lucide-react';
import { api } from '../api/client.js';

function decodeVapidKey(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function relativeDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' });
}

export function NotificationCenter({ token, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const result = await api.request('/api/notifications?limit=30', { token });
      setItems(Array.isArray(result.notifications) ? result.notifications : []);
      setUnreadCount(Number(result.unreadCount || 0));
    } catch {
      // A temporarily unavailable notification endpoint must not break the main app.
    }
  }, [token]);

  useEffect(() => {
    let active = true;
    const refreshSafely = async () => {
      if (!token) return;
      try {
        const result = await api.request('/api/notifications?limit=30', { token });
        if (!active) return;
        setItems(Array.isArray(result.notifications) ? result.notifications : []);
        setUnreadCount(Number(result.unreadCount || 0));
      } catch {
        // Keep the last successful snapshot when the network is unavailable.
      }
    };
    refreshSafely();
    const interval = window.setInterval(refreshSafely, 30000);
    window.addEventListener('focus', refreshSafely);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshSafely);
    };
  }, [token]);

  async function markRead(id) {
    try {
      await api.request(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH', token });
      setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: item.readAt || new Date().toISOString() } : item));
      setUnreadCount((current) => Math.max(0, current - (items.find((item) => item.id === id && !item.readAt) ? 1 : 0)));
    } catch {
      setMessage('Upozornění se nepodařilo označit jako přečtené.');
    }
  }

  async function markAllRead() {
    setLoading(true);
    setMessage('');
    try {
      await api.request('/api/notifications/read-all', { method: 'POST', token, body: {} });
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      setMessage('Nepodařilo se označit upozornění jako přečtená.');
    } finally {
      setLoading(false);
    }
  }

  async function enablePush() {
    setPushLoading(true);
    setMessage('');
    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Tento prohlížeč nepodporuje web push. Na telefonu otevřete Zoom Pro v podporovaném prohlížeči nebo nainstalované PWA.');
      }
      let permission = Notification.permission;
      if (permission !== 'granted') permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Oprávnění k oznámením nebylo uděleno.');

      const { publicKey } = await api.request('/api/devices/public-key', { token });
      if (!publicKey) throw new Error('Backend nevrátil VAPID veřejný klíč.');
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidKey(publicKey)
        });
      }
      await api.request('/api/devices/register', {
        method: 'POST',
        token,
        body: { platform: 'web', pushSubscription: subscription.toJSON() }
      });
      setMessage('Push upozornění jsou pro toto zařízení aktivní.');
    } catch (error) {
      setMessage(error.message || 'Push upozornění se nepodařilo aktivovat.');
    } finally {
      setPushLoading(false);
    }
  }

  function openNotification(item) {
    if (!item.readAt) markRead(item.id);
    const type = item.data?.type || item.type;
    if (type === 'support-chat') onNavigate?.('chat-podpora');
    else if (type === 'project-chat') onNavigate?.('chat-projektu');
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen((value) => !value); if (!open) refresh(); }}
        aria-label={unreadCount ? `Upozornění, nepřečtených: ${unreadCount}` : 'Upozornění'}
        aria-expanded={open}
        className="relative rounded-xl border border-slate-700 p-2 text-slate-300 hover:border-blue-500 hover:text-white"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-rose-600 px-1.5 text-center text-[10px] font-black text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <section className="absolute right-0 top-12 z-50 w-[min(92vw,24rem)] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl" aria-label="Centrum upozornění">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
            <div>
              <h2 className="text-sm font-black text-white">Upozornění</h2>
              <p className="text-[11px] text-slate-400">{unreadCount} nepřečtených</p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={enablePush} disabled={pushLoading} title="Zapnout push na tomto zařízení" className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-blue-500 disabled:opacity-50">
                {pushLoading ? <Loader2 size={15} className="animate-spin" /> : <Smartphone size={15} />}
              </button>
              <button type="button" onClick={markAllRead} disabled={!unreadCount || loading} title="Označit vše jako přečtené" className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-blue-500 disabled:opacity-50">
                {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCheck size={15} />}
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Zavřít upozornění" className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-slate-500">
                <X size={15} />
              </button>
            </div>
          </div>
          {message && <p role="status" className="border-b border-slate-800 px-4 py-2 text-xs text-blue-300">{message}</p>}
          <ul className="max-h-[min(65vh,28rem)] overflow-y-auto">
            {items.length ? items.map((item) => (
              <li key={item.id} className={`border-b border-slate-800/80 ${item.readAt ? '' : 'bg-blue-950/20'}`}>
                <button type="button" onClick={() => openNotification(item)} className="w-full px-4 py-3 text-left hover:bg-slate-800/70">
                  <span className="flex items-start gap-2">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.readAt ? 'bg-slate-600' : 'bg-blue-400'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-slate-100">{item.title}</span>
                      {item.body && <span className="mt-1 block whitespace-pre-wrap break-words text-xs text-slate-300">{item.body}</span>}
                      <span className="mt-1 block text-[10px] text-slate-500">{relativeDate(item.createdAt)}</span>
                    </span>
                  </span>
                </button>
              </li>
            )) : <li className="px-4 py-8 text-center text-xs text-slate-500">Zatím žádná upozornění.</li>}
          </ul>
        </section>
      )}
    </div>
  );
}
