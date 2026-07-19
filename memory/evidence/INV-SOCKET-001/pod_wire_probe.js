// INV-SOCKET-001: wire probe from pod — connects with NO auth, NO join, counts everything received
const { io } = require('/app/frontend/node_modules/socket.io-client');
const URL = 'https://presocket.mygenie.online';
const DURATION_MS = 150000;
const stats = { events: 0, bytes: 0, channels: {}, rids: new Set() };
const socket = io(URL, { transports: ['websocket', 'polling'], reconnection: false, timeout: 10000 });
const started = Date.now();
socket.on('connect', () => console.log(`[probe] connected sid=${socket.id} transport=${socket.io.engine.transport.name} — listening ${DURATION_MS/1000}s, NO join emitted`));
socket.on('connect_error', (e) => { console.log('[probe] connect_error:', e.message); process.exit(1); });
socket.onAny((event, ...args) => {
  stats.events++;
  stats.bytes += JSON.stringify(args).length;
  stats.channels[event] = (stats.channels[event] || 0) + 1;
  const m = event.match(/_(\d+)$/);
  if (m) stats.rids.add(m[1]);
  if (stats.events <= 15) console.log(`[EVT ${stats.events}] ${event} :: ${JSON.stringify(args).slice(0, 180)}`);
});
setTimeout(() => {
  const mins = ((Date.now() - started) / 60000).toFixed(1);
  console.log('\n========== WIRE PROBE RESULT ==========');
  console.log(`duration: ${mins} min | total events: ${stats.events} | bytes: ${stats.bytes}`);
  console.log(`distinct restaurant IDs seen: ${stats.rids.size} → [${[...stats.rids].join(', ')}]`);
  console.log('channels:', JSON.stringify(stats.channels, null, 1));
  console.log(stats.events > 0
    ? '>>> VERDICT: GLOBAL BROADCAST CONFIRMED — an unauthenticated socket with NO join received tenant events.'
    : '>>> No events received in window (quiet hour or rooms exist). Re-run during peak.');
  process.exit(0);
}, DURATION_MS);
