// INV-SOCKET-001 validation: backend moved /order-update to io.to('rest_'+rid).emit(...)
// Q1: is new code deployed? (response body 'Message broadcasted22')
// Q2: does a no-join socket still receive? (leak check)
// Q3: can a client get into the room via any join emit? (functionality check)
const { io } = require('/app/frontend/node_modules/socket.io-client');
// axios removed — using native fetch
const URL = 'https://presocket.mygenie.online';
const RID = 777001; // fake rid, harmless
const CH = 'new_order_' + RID;

const A = io(URL, { transports: ['websocket'], reconnection: false, timeout: 10000 }); // no join
const B = io(URL, { transports: ['websocket'], reconnection: false, timeout: 10000 }); // tries joins
let gotA = [], gotB = [], foreignA = 0;

A.onAny((ev, ...args) => { if (ev === CH) gotA.push(args); else { foreignA++; if (foreignA <= 3) console.log('[A foreign]', ev); } });
B.onAny((ev, ...args) => { if (ev === CH) gotB.push(args); });

function joinAttempts() {
  const candidates = [
    ['join', 'rest_' + RID],
    ['join', { room: 'rest_' + RID }],
    ['join', RID],
    ['join', { restaurant_id: RID }],
    ['join_room', 'rest_' + RID],
    ['join-room', 'rest_' + RID],
    ['subscribe', 'rest_' + RID],
    ['room', 'rest_' + RID],
    ['join_restaurant', RID],
  ];
  candidates.forEach(([ev, arg]) => B.emit(ev, arg));
  console.log('[B] emitted', candidates.length, 'join candidates');
}

async function fireOrder(tag) {
  try {
    const r = await fetch(URL + '/order-update', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_type: 'new-order', order_id: 1, restaurant_id: RID, food_status: 0, order_details: [{ probe: tag }] }),
    });
    console.log(`[POST ${tag}] HTTP ${r.status} →`, (await r.text()).slice(0, 200));
  } catch (e) {
    console.log(`[POST ${tag}] FAILED:`, e.message);
  }
}

let ready = 0;
const onReady = async () => {
  if (++ready < 2) return;
  console.log('[both connected] A=' + A.id, 'B=' + B.id);
  await fireOrder('pre-join');           // neither should receive if rooms enforced
  await new Promise(r => setTimeout(r, 2500));
  joinAttempts();
  await new Promise(r => setTimeout(r, 1500));
  await fireOrder('post-join');          // B receives only if server honors some join event
  await new Promise(r => setTimeout(r, 3000));
  console.log('\n===== RESULT =====');
  console.log('A (no join) received on', CH, ':', gotA.length, '| foreign events:', foreignA);
  console.log('B (join attempts) received:', gotB.length, gotB.length ? JSON.stringify(gotB[0]).slice(0, 200) : '');
  console.log(gotA.length === 0 ? '>>> LEAK FIXED for /order-update: no-join socket got nothing.' : '>>> STILL GLOBAL: no-join socket received the event!');
  console.log(gotB.length === 0 ? '>>> NO JOIN PATH: no tested join event puts a client in the room → frontend can NEVER receive new orders.' : '>>> JOIN WORKS via one of the candidates.');
  process.exit(0);
};
A.on('connect', onReady); B.on('connect', onReady);
A.on('connect_error', e => { console.log('[A] connect_error', e.message); process.exit(1); });
B.on('connect_error', e => { console.log('[B] connect_error', e.message); process.exit(1); });
setTimeout(() => { console.log('timeout'); process.exit(1); }, 60000);
