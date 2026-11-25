// FCM & Sound diagnostics log — persistent, per-device ring buffer.
// Purpose: debug the "sound didn't ring / popup didn't open" reports WITHOUT
// placing a live order every time. Every inbound notification is recorded with
// its source (foreground FCM / service-worker / simulate), order id, resolved
// sound and outcome, so we can tell after the fact whether an order's FCM payload
// actually arrived on this device and whether its sound played or was blocked.
//
// Additive diagnostics only — nothing here affects order/payment/sound behaviour.

const STORAGE_KEY = 'mygenie_fcm_diag_log';
const MAX_ENTRIES = 200;

const read = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const write = (arr) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr.slice(0, MAX_ENTRIES)));
  } catch {
    /* storage unavailable or full — diagnostics are best-effort */
  }
};

const subscribers = new Set();
const notify = () => subscribers.forEach((fn) => { try { fn(); } catch { /* ignore */ } });

const fcmDiagLog = {
  // event: 'received' | 'played' | 'suppressed_dedup' | 'suppressed_muted'
  //        | 'sound_ok' | 'sound_blocked' | 'token' | 'test' | 'unlock'
  add(event, detail = {}) {
    const entry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ts: new Date().toISOString(),
      event,
      ...detail,
    };
    const arr = read();
    arr.unshift(entry);
    write(arr);
    notify();
    return entry;
  },
  getAll() { return read(); },
  clear() { write([]); notify(); },
  exportJSON() { return JSON.stringify(read(), null, 2); },
  subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },
};

export default fcmDiagLog;
