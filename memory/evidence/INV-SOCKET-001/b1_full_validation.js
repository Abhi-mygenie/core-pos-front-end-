// CR-077 B1 independent validation (T1 testing agent) — covers TESTS 1-4
// TEST 1: join + delivery
// TEST 2: isolation (control socket never joins)
// TEST 3: stale-room cleanup on tenant switch
// TEST 4: invalid payload guard ({} and {restaurant_id:'abc'}) then valid join still works
const { io } = require('/app/frontend/node_modules/socket.io-client');
const URL = 'https://presocket.mygenie.online';
const RID1 = 777001;
const RID2 = 777002;

const A = io(URL, { transports: ['websocket'], reconnection: false, timeout: 10000 }); // control (never joins)
const B = io(URL, { transports: ['websocket'], reconnection: false, timeout: 10000 }); // main test socket
const C = io(URL, { transports: ['websocket'], reconnection: false, timeout: 10000 }); // TEST 4 invalid-payload socket

let evA = [];       // all events A receives
let evB_777001 = [];
let evB_777002 = [];
let ackB_first = null;
let ackB_second = null;
let ackC_before_valid_emit = [];   // any acks observed while only invalid emits were sent
let ackC_after_valid_emit = [];    // acks observed after we sent the recovery valid emit
let C_valid_emit_sent = false;
let evC_777001 = [];

A.onAny((ev, ...args) => { evA.push([ev, args]); });
B.onAny((ev, ...args) => {
  if (ev === 'new_order_' + RID1) evB_777001.push(args);
  if (ev === 'new_order_' + RID2) evB_777002.push(args);
  if (ev === 'joined_restaurant') {
    if (!ackB_first) { ackB_first = args[0]; console.log('[B] ACK #1:', JSON.stringify(args[0])); }
    else { ackB_second = args[0]; console.log('[B] ACK #2:', JSON.stringify(args[0])); }
  }
});
C.onAny((ev, ...args) => {
  if (ev === 'new_order_' + RID1) evC_777001.push(args);
  if (ev === 'joined_restaurant') {
    if (C_valid_emit_sent) ackC_after_valid_emit.push(args[0]);
    else ackC_before_valid_emit.push(args[0]);
    console.log('[C] ACK joined_restaurant:', JSON.stringify(args[0]));
  }
});

async function fire(tag, rid) {
  const r = await fetch(URL + '/order-update', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_type: 'new-order', order_id: 424242, restaurant_id: rid, food_status: 0, order_details: { orders: [], probe: tag } }),
  });
  const body = await r.text();
  console.log(`[POST ${tag} rid=${rid}] HTTP ${r.status} → ${body.slice(0, 120)}`);
  return { status: r.status, body };
}

let ready = 0;
const go = async () => {
  if (++ready < 3) return;
  console.log('[connected] A=' + A.id + ' B=' + B.id + ' C=' + C.id);

  // ---------- TEST 1 + TEST 2 ----------
  B.emit('join_restaurant', { restaurant_id: RID1 });
  await new Promise(r => setTimeout(r, 1500));
  await fire('T1-after-join', RID1);
  await new Promise(r => setTimeout(r, 2500));

  const T1_ack = !!(ackB_first && ackB_first.room === 'rest_' + RID1);
  const T1_delivery = evB_777001.length === 1;
  const T1_argshape = T1_delivery && (() => {
    const a = evB_777001[0];
    return a.length === 5 && a[0] === 'new-order' && a[1] === 424242 && a[2] === RID1 && a[3] === 0 && a[4] && Array.isArray(a[4].orders);
  })();
  const T2_isolation = evA.filter(([ev]) => ev.startsWith('new_order_')).length === 0;

  console.log('\n[TEST 1] ack=' + T1_ack + ' delivery(1?)=' + evB_777001.length + ' argshape=' + T1_argshape);
  console.log('[TEST 2] A order events (expect 0): ' + evA.filter(([ev]) => ev.startsWith('new_order_')).length);

  // ---------- TEST 3: tenant switch ----------
  B.emit('join_restaurant', { restaurant_id: RID2 });
  await new Promise(r => setTimeout(r, 1500));
  const beforeOld = evB_777001.length;
  const beforeNew = evB_777002.length;
  await fire('T3-old-room', RID1);   // expect NOT received
  await fire('T3-new-room', RID2);   // expect received
  await new Promise(r => setTimeout(r, 2500));
  const T3_ack2 = !!(ackB_second && ackB_second.room === 'rest_' + RID2);
  const T3_old_leaked = (evB_777001.length - beforeOld);
  const T3_new_delivered = (evB_777002.length - beforeNew);
  console.log('\n[TEST 3] ack2=' + T3_ack2 + ' old-room-leaks(expect 0)=' + T3_old_leaked + ' new-room-delivery(expect 1)=' + T3_new_delivered);

  // ---------- TEST 4: invalid payload guard ----------
  console.log('\n[TEST 4] emit join_restaurant with {} (invalid)');
  C.emit('join_restaurant', {});
  await new Promise(r => setTimeout(r, 1200));
  console.log('[TEST 4] emit join_restaurant with {restaurant_id:"abc"} (invalid)');
  C.emit('join_restaurant', { restaurant_id: 'abc' });
  await new Promise(r => setTimeout(r, 1200));

  // Fire to RID1 — C should get 0 because no valid join happened
  const beforeC = evC_777001.length;
  await fire('T4-after-invalid-joins', RID1);
  await new Promise(r => setTimeout(r, 2000));
  const T4_no_join_leak = (evC_777001.length - beforeC) === 0;
  const T4_no_ack = (ackC_before_valid_emit.length === 0);

  // Server responsiveness: valid join after invalid must still work
  console.log('[TEST 4] now valid join_restaurant {restaurant_id:' + RID1 + '}');
  C_valid_emit_sent = true;
  C.emit('join_restaurant', { restaurant_id: RID1 });
  await new Promise(r => setTimeout(r, 1500));
  const beforeC2 = evC_777001.length;
  await fire('T4-valid-after-recovery', RID1);
  await new Promise(r => setTimeout(r, 2500));
  const T4_recovery_ack = ackC_after_valid_emit.length === 1 && ackC_after_valid_emit[0].room === 'rest_' + RID1;
  const T4_recovery_delivery = (evC_777001.length - beforeC2) === 1;

  console.log('\n===== B1 INDEPENDENT VALIDATION SUMMARY =====');
  const results = {
    T1_ack_correct_room: T1_ack,
    T1_exactly_one_event: T1_delivery,
    T1_arg_envelope_matches: T1_argshape,
    T2_control_socket_isolated: T2_isolation,
    T3_switch_ack: T3_ack2,
    T3_old_room_leaks_zero: T3_old_leaked === 0,
    T3_new_room_delivered_one: T3_new_delivered === 1,
    T4_invalid_no_ack: T4_no_ack,
    T4_invalid_no_join_leak: T4_no_join_leak,
    T4_server_still_responsive_ack: T4_recovery_ack,
    T4_server_still_delivers: T4_recovery_delivery,
  };
  console.log(JSON.stringify(results, null, 2));
  const pass = Object.values(results).every(Boolean);
  console.log(pass ? '\n>>> OVERALL: PASS — B1 handler meets CR-077 contract.' : '\n>>> OVERALL: FAIL — see per-check above.');
  process.exit(pass ? 0 : 2);
};

A.on('connect', go); B.on('connect', go); C.on('connect', go);
for (const [n, s] of [['A', A], ['B', B], ['C', C]]) s.on('connect_error', e => { console.log('[' + n + '] connect_error', e.message); process.exit(1); });
setTimeout(() => { console.log('overall timeout'); process.exit(1); }, 90000);
