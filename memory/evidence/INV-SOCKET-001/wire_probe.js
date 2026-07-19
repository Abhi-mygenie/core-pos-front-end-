// INV-SOCKET-001 wire probe — paste into DevTools console of a LOGGED-IN POS tab.
// Proves whether the server broadcasts globally (foreign-restaurant events arrive)
// and measures total event rate + bytes for 5 minutes.
(() => {
  const svc = window.__SOCKET_SERVICE__; // exposed in development builds (socketService.js:361)
  const sock = svc ? svc.getSocket() : null;
  if (!sock) { console.error('Socket not found. In prod builds run: localStorage.SOCKET_DEBUG="true" and reload, or attach via io() manually.'); return; }
  const myRid = String((JSON.parse(localStorage.getItem('restaurant') || '{}').id) || 'UNKNOWN');
  const stats = { own: 0, foreign: 0, unknown: 0, bytes: 0, foreignChannels: new Set() };
  const started = Date.now();
  sock.onAny((event, ...args) => {
    const m = event.match(/_(\d+)$/);
    stats.bytes += JSON.stringify(args).length;
    if (!m) stats.unknown++;
    else if (m[1] === myRid) stats.own++;
    else { stats.foreign++; stats.foreignChannels.add(event); }
  });
  window.__WIRE_PROBE_REPORT__ = () => {
    const mins = ((Date.now() - started) / 60000).toFixed(1);
    console.log(`[WIRE PROBE] ${mins} min | own-restaurant events: ${stats.own} | FOREIGN-restaurant events: ${stats.foreign} | unknown: ${stats.unknown} | ~${(stats.bytes/1024).toFixed(1)} KB received`);
    console.log('[WIRE PROBE] foreign channels seen:', [...stats.foreignChannels].slice(0, 30));
    console.log(stats.foreign > 0
      ? '>>> VERDICT: GLOBAL BROADCAST CONFIRMED — server emits all restaurants\' events to every client.'
      : '>>> No foreign events seen yet — either rooms exist server-side, or run longer during business hours.');
  };
  console.log(`[WIRE PROBE] running for restaurant ${myRid}. After ~5 min call: __WIRE_PROBE_REPORT__()`);
})();
