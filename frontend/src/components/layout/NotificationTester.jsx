// FCM & Sound Diagnostics — Settings → "Test Notifications"
// Lets staff debug the "sound didn't ring / popup didn't open" reports WITHOUT
// placing a live order every time:
//   1. Health   — can this device RECEIVE FCM? (permission / token / VAPID / support)
//   2. Sound    — can this device PLAY each sound? (autoplay unlock + per-sound test)
//   3. Log      — persistent record of every notification received / suppressed / played,
//                 so you can tell after the fact whether an order's FCM payload arrived
//                 and whether its sound actually played or was blocked.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell, Play, Volume2, VolumeX, RefreshCw, Trash2, Copy, Check,
  CheckCircle2, XCircle, ShieldCheck, Unlock,
} from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import soundManager, { SOUND_FILES } from '../../utils/soundManager';
import fcmDiagLog from '../../utils/fcmDiagLog';
import { getFCMDiagnostics } from '../../config/firebase';

const TEST_NOTIFICATIONS = [
  { label: 'New Order (Dine-in)', payload: { notification: { title: 'There is a new order', body: 'Order ID: 002275 Order Type: dinein' }, data: { sound: 'new_order', type: 'new_order', orderid: '002275', order_type: 'dinein' } } },
  { label: 'New Order (Swiggy)', payload: { notification: { title: 'Swiggy New Order', body: 'Order ID: 002276 Order Type: delivery' }, data: { sound: 'swiggy_new_order', type: 'new_order', orderid: '002276', order_type: 'delivery' } } },
  { label: 'Web Order Edit', payload: { notification: { title: 'Order updated', body: 'Order ID: 002277 items added from web' }, data: { sound: 'item_added', type: 'item_added', orderid: '002277' } } },
  { label: 'Order Confirmed', payload: { notification: { title: 'Order Confirmed', body: 'Order ID: 002275 has been confirmed' }, data: { sound: 'order_confirmed', type: 'order_confirmed', orderid: '002275' } } },
  { label: 'Order Ready', payload: { notification: { title: 'Order Ready', body: 'Order ID: 002275 is ready for serving' }, data: { sound: 'order_ready', type: 'order_ready', orderid: '002275' } } },
  { label: 'Silent (Stop Sound)', payload: { data: { sound: 'silent' } } },
];

const EVENT_STYLE = {
  received: 'bg-blue-50 text-blue-700 border-blue-200',
  played: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sound_ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sound_blocked: 'bg-red-50 text-red-700 border-red-200',
  suppressed_dedup: 'bg-amber-50 text-amber-700 border-amber-200',
  suppressed_muted: 'bg-amber-50 text-amber-700 border-amber-200',
  unlock: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  token: 'bg-gray-100 text-gray-600 border-gray-200',
  test: 'bg-purple-50 text-purple-700 border-purple-200',
};

const fmtTime = (iso) => {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  catch { return iso; }
};

const HealthRow = ({ label, ok, value, testid, warn }) => (
  <div className="flex items-center justify-between py-1.5" data-testid={testid}>
    <span className="text-xs text-gray-500">{label}</span>
    <span className={`flex items-center gap-1.5 text-xs font-semibold ${ok ? 'text-emerald-600' : warn ? 'text-amber-600' : 'text-red-600'}`}>
      {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
      {value}
    </span>
  </div>
);

const NotificationTester = () => {
  const { simulateNotification, soundEnabled, setSoundEnabled } = useNotifications();

  const [health, setHealth] = useState(() => getFCMDiagnostics());
  const [soundState, setSoundState] = useState(() => soundManager.getState());
  const [testResults, setTestResults] = useState({}); // { soundKey: 'ok' | 'blocked' | 'playing' }
  const [log, setLog] = useState(() => fcmDiagLog.getAll());
  const [filter, setFilter] = useState('');
  const [copied, setCopied] = useState(false);

  const refreshHealth = useCallback(() => {
    setHealth(getFCMDiagnostics());
    setSoundState(soundManager.getState());
  }, []);

  // Live-subscribe to the diagnostics log
  useEffect(() => {
    const unsub = fcmDiagLog.subscribe(() => {
      setLog(fcmDiagLog.getAll());
      setSoundState(soundManager.getState());
    });
    return unsub;
  }, []);

  const handleUnlock = useCallback(async () => {
    await soundManager.unlock();
    refreshHealth();
  }, [refreshHealth]);

  const handleTestSound = useCallback(async (key) => {
    setTestResults((p) => ({ ...p, [key]: 'playing' }));
    const res = await soundManager.playTest(key);
    setTestResults((p) => ({ ...p, [key]: res.ok ? 'ok' : 'blocked' }));
    refreshHealth();
  }, [refreshHealth]);

  const handleSimulate = useCallback((payload) => {
    simulateNotification({ ...payload, __source: 'test' });
  }, [simulateNotification]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fcmDiagLog.exportJSON());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  }, []);

  const handleClear = useCallback(() => { fcmDiagLog.clear(); }, []);

  const filteredLog = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return log;
    return log.filter((e) =>
      String(e.order_id || '').toLowerCase().includes(f) ||
      String(e.event || '').toLowerCase().includes(f) ||
      String(e.sound || '').toLowerCase().includes(f) ||
      String(e.source || '').toLowerCase().includes(f),
    );
  }, [log, filter]);

  const soundKeys = useMemo(() => Object.keys(SOUND_FILES).filter((k) => k !== 'silent'), []);
  const permOk = health.permission === 'granted';

  return (
    <div className="space-y-5" data-testid="fcm-sound-diagnostics">
      {/* ── Section 1: Health ──────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <ShieldCheck className="w-4 h-4" /> FCM Health
          </div>
          <button
            onClick={refreshHealth}
            data-testid="fcm-health-refresh"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          <HealthRow label="Notification permission" ok={permOk} warn={health.permission === 'default'} value={health.permission} testid="fcm-health-permission" />
          <HealthRow label="FCM token present" ok={health.hasToken} value={health.hasToken ? (health.tokenPreview || 'yes') : 'missing'} testid="fcm-health-token" />
          <HealthRow label="VAPID key configured" ok={health.hasVapid} value={health.hasVapid ? 'yes' : 'missing'} testid="fcm-health-vapid" />
          <HealthRow label="Messaging supported" ok={health.supported === true} warn={health.supported === null} value={health.supported === null ? 'checking…' : String(health.supported)} testid="fcm-health-supported" />
          <HealthRow label="Audio unlocked" ok={soundState.isUnlocked} warn value={soundState.isUnlocked ? 'yes' : 'not yet'} testid="fcm-health-unlocked" />
        </div>
        {!permOk && (
          <p className="mt-2 text-xs text-amber-600" data-testid="fcm-perm-hint">
            Push notifications need permission. If it says <b>denied</b>, enable it from the browser's site settings (🔒 icon → Notifications → Allow), then log in again.
          </p>
        )}
      </section>

      {/* ── Section 2: Sound test ──────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Volume2 className="w-4 h-4" /> Sound Test
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              data-testid="fcm-sound-toggle"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border ${soundEnabled ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-gray-200 text-gray-500'}`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              {soundEnabled ? 'Sound On' : 'Muted'}
            </button>
            <button
              onClick={handleUnlock}
              data-testid="fcm-unlock-audio"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
            >
              <Unlock className="w-3.5 h-3.5" /> Enable Audio
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Tap a sound to verify it plays on this device. A <span className="text-red-600 font-medium">blocked</span> result means the browser suppressed autoplay — tap <b>Enable Audio</b> first.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {soundKeys.map((key) => {
            const r = testResults[key];
            return (
              <button
                key={key}
                onClick={() => handleTestSound(key)}
                data-testid={`sound-test-${key}`}
                className="flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-left"
              >
                <span className="flex items-center gap-2 truncate">
                  <Play className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  {key}
                </span>
                {r === 'ok' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                {r === 'blocked' && <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                {r === 'playing' && <RefreshCw className="w-3.5 h-3.5 text-gray-400 animate-spin flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Section 3: Simulate notifications ──────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
          <Bell className="w-4 h-4" /> Simulate Notification
        </div>
        <p className="text-xs text-gray-500 mb-3">Runs the full notification pipeline (dedup → mute → sound → banner) and writes to the log below.</p>
        <div className="grid grid-cols-2 gap-2">
          {TEST_NOTIFICATIONS.map((item, i) => (
            <button
              key={i}
              onClick={() => handleSimulate(item.payload)}
              data-testid={`test-notif-${i}`}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-left"
            >
              <Play className="w-3 h-3 text-gray-400 flex-shrink-0" />
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Section 4: Event log ───────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Bell className="w-4 h-4" /> Event Log
            <span className="text-xs font-normal text-gray-400">({filteredLog.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLog(fcmDiagLog.getAll())} data-testid="fcm-log-refresh" className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50" title="Refresh"><RefreshCw className="w-3.5 h-3.5 text-gray-500" /></button>
            <button onClick={handleCopy} data-testid="fcm-log-copy" className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50" title="Copy JSON">{copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}</button>
            <button onClick={handleClear} data-testid="fcm-log-clear" className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50" title="Clear"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
          </div>
        </div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by order id, event, sound, source…"
          data-testid="fcm-log-filter"
          className="w-full mb-3 px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-200"
        />
        <div className="max-h-72 overflow-y-auto space-y-1.5" data-testid="fcm-log-list">
          {filteredLog.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center" data-testid="fcm-log-empty">
              No events yet. Simulate a notification above, or wait for a live order — every arriving FCM message is recorded here (persists across reloads).
            </p>
          ) : (
            filteredLog.map((e) => (
              <div key={e.id} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100" data-testid="fcm-log-entry">
                <span className="text-[10px] text-gray-400 font-mono pt-0.5 w-16 flex-shrink-0">{fmtTime(e.ts)}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border flex-shrink-0 ${EVENT_STYLE[e.event] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>{e.event}</span>
                <div className="text-xs text-gray-600 min-w-0 flex-1">
                  {e.order_id ? <span className="font-medium">#{e.order_id} </span> : null}
                  {e.sound ? <span className="text-gray-500">sound={e.sound} </span> : null}
                  {e.source ? <span className="text-gray-400">· {e.source}</span> : null}
                  {e.title ? <div className="truncate text-gray-500">{e.title}{e.body ? ` — ${e.body}` : ''}</div> : null}
                  {e.error ? <div className="text-red-500 truncate">{e.error}</div> : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default NotificationTester;
