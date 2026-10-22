// CR-385 M0 — display helpers only. No arithmetic on money beyond formatting (D50 / D44-i).
const inr0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtINR = (n) => {
  const v = Number(n);
  if (n === null || n === undefined || n === '' || Number.isNaN(v)) return '—';
  const abs = Math.abs(v);
  const body = Number.isInteger(abs) ? inr0.format(abs) : inr2.format(abs);
  return `${v < 0 ? '−' : ''}₹${body}`;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const parts = (iso) => {
  if (!iso || typeof iso !== 'string') return null;
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
};

export const fmtDate = (iso) => { const p = parts(iso); return p ? `${p.d} ${MONTHS[p.m - 1]}` : '—'; }; // 21 Sep

export const fmtDateLong = (iso) => {
  const p = parts(iso);
  if (!p) return '—';
  const dow = DAYS[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()];
  return `${dow}, ${p.d} ${MONTHS_LONG[p.m - 1]} ${p.y}`;
};

export const fmtTime = (ts) => { // '2026-09-04 04:32:09' → '04:32'
  if (!ts || typeof ts !== 'string') return '';
  const t = ts.replace('T', ' ').split(' ')[1];
  return t ? t.slice(0, 5) : '';
};

export const plural = (n, word, pluralWord) => `${n} ${Number(n) === 1 ? word : (pluralWord ?? `${word}s`)}`;

export const AVG_RATE_LABEL = 'avg. rate / night';

export const maskPhone = (p) => {
  const s = String(p ?? '').replace(/\D/g, '');
  return s.length >= 4 ? `••••${s.slice(-4)}` : (s || '—');
};

export const channelLabel = (c) => (c === 'WalkIn' ? 'Walk-in' : (c ?? '—'));
