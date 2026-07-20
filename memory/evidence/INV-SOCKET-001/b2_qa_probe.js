// CR-077/B2 QA probe: are ALL channels now room-scoped?
// A = outsider (no join)  |  B = joined rest_644  |  C = joined rest_777001 (cross-tenant)
const { io } = require('/app/frontend/node_modules/socket.io-client');
const URL = 'https://presocket.mygenie.online';
const mk = () => io(URL, { transports: ['websocket'], reconnection: false, timeout: 10000 });
const A = mk(), B = mk(), C = mk();
const evts = { A: [], B: [], C: [] };
A.onAny((ev) => evts.A.push(ev));
B.onAny((ev) => { if (ev !== 'joined_restaurant') evts.B.push(ev); });
C.onAny((ev) => { if (ev !== 'joined_restaurant') evts.C.push(ev); });

async function post(path, body) {
  const r = await fetch(URL + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  console.log(`[POST ${path}]`, r.status, (await r.text()).slice(0, 100));
}
async function loginApi() {
  // generates login_disabled_644 (single-session enforcement) — observed live on 2026-07-20
  const r = await fetch('https://preprod.mygenie.online/api/v1/auth/vendoremployee/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@cafe103.com', password: 'Qplazm@10' }),
  });
  console.log('[login api]', r.status);
}

let ready = 0;
const go = async () => {
  if (++ready < 3) return;
  B.emit('join_restaurant', { restaurant_id: 644 });
  C.emit('join_restaurant', { restaurant_id: 777001 });
  await new Promise(r => setTimeout(r, 1500));
  await post('/order-update', { order_type: 'new-order', order_id: 555001, restaurant_id: 644, food_status: 0, order_details: { orders: [] } });
  await loginApi();  // should fire login_disabled_644 → only room rest_644 gets it now
  await new Promise(r => setTimeout(r, 8000));
  console.log('\n===== B2 QA PROBE =====');
  console.log('A outsider (expect 0):', evts.A.length, evts.A.slice(0, 5));
  console.log('B rest_644 (expect new_order_644 + login_disabled_644):', evts.B.length, evts.B.slice(0, 6));
  console.log('C rest_777001 (expect 0):', evts.C.length, evts.C.slice(0, 5));
  process.exit(0);
};
A.on('connect', go); B.on('connect', go); C.on('connect', go);
setTimeout(() => { console.log('timeout'); process.exit(1); }, 60000);
