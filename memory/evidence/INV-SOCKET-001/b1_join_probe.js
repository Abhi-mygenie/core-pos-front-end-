// CR-077 B1 validation: server-side join_restaurant handler deployed by backend team
// A = no join (isolation control) | B = joins rest_777001 via join_restaurant
const { io } = require('/app/frontend/node_modules/socket.io-client');
const URL = 'https://presocket.mygenie.online';
const RID = 777001;
const CH = 'new_order_' + RID;
const A = io(URL, { transports: ['websocket'], reconnection: false, timeout: 10000 });
const B = io(URL, { transports: ['websocket'], reconnection: false, timeout: 10000 });
let gotA = 0, gotB = [], ackB = null, gotB2 = [];
A.onAny((ev) => { if (ev === CH) gotA++; });
B.onAny((ev, ...args) => {
  if (ev === CH) gotB.push(args);
  if (ev === 'joined_restaurant') { ackB = args[0]; console.log('[B] ACK joined_restaurant:', JSON.stringify(args[0])); }
});

async function fire(tag, rid) {
  const r = await fetch(URL + '/order-update', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_type: 'new-order', order_id: 424242, restaurant_id: rid, food_status: 0, order_details: { orders: [], probe: tag } }),
  });
  console.log(`[POST ${tag} rid=${rid}] HTTP ${r.status} →`, (await r.text()).slice(0, 120));
}

let ready = 0;
const go = async () => {
  if (++ready < 2) return;
  console.log('[connected] A=' + A.id, 'B=' + B.id);
  B.emit('join_restaurant', { restaurant_id: RID });
  await new Promise(r => setTimeout(r, 1500));
  await fire('after-join', RID);
  await new Promise(r => setTimeout(r, 3000));

  // tenant-switch test: B joins another room, old room must be left
  B.onAny((ev, ...args) => { if (ev === 'new_order_777002') gotB2.push(args); });
  B.emit('join_restaurant', { restaurant_id: 777002 });
  await new Promise(r => setTimeout(r, 1200));
  const before = gotB.length;
  await fire('old-room-after-switch', RID);      // B should NOT get this anymore
  await fire('new-room-after-switch', 777002);   // B SHOULD get this
  await new Promise(r => setTimeout(r, 3000));

  console.log('\n===== B1 VALIDATION RESULT =====');
  console.log('ACK received:', ackB ? JSON.stringify(ackB) : 'NO');
  console.log('B events on new_order_777001 after join:', before, before ? '| first payload: ' + JSON.stringify(gotB[0]).slice(0, 160) : '');
  console.log('B events on OLD room after switching to 777002:', gotB.length - before, '(expect 0 — stale-room cleanup)');
  console.log('B events on NEW room 777002:', gotB2.length, '(expect 1)');
  console.log('A (never joined) events:', gotA, '(expect 0 — isolation)');
  const pass = ackB && before >= 1 && (gotB.length - before) === 0 && gotB2.length >= 1 && gotA === 0;
  console.log(pass ? '>>> B1 HANDLER: PASS — join, delivery, room-switch cleanup, isolation all correct.' : '>>> B1 HANDLER: FAIL — see counts above.');
  process.exit(0);
};
A.on('connect', go); B.on('connect', go);
A.on('connect_error', e => { console.log('[A] connect_error', e.message); process.exit(1); });
B.on('connect_error', e => { console.log('[B] connect_error', e.message); process.exit(1); });
setTimeout(() => { console.log('timeout'); process.exit(1); }, 60000);
