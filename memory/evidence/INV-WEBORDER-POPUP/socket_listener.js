// INV-WEBORDER-POPUP — faithful pod-side socket listener (uses the app's own socket.io-client@4.8.4)
// Mirrors socketService.connect() + joinRestaurant(69). Logs every frame on new_order_69 + onAny.
const path = '/app/frontend/node_modules/socket.io-client';
const { io } = require(path);
const fs = require('fs');
const LOG = '/app/memory/evidence/INV-WEBORDER-POPUP/socket_capture.log';
const RID = 69;
const URL = 'https://presocket.mygenie.online';
const ORDER_CH = `new_order_${RID}`;

const w = (line) => {
  const s = `[${new Date().toISOString()}] ${line}\n`;
  fs.appendFileSync(LOG, s);
  console.log(s.trim());
};

w(`BOOT listener → ${URL} room=${RID} channel=${ORDER_CH}`);

const socket = io(URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  timeout: 20000,
});

socket.on('connect', () => {
  w(`CONNECTED id=${socket.id}; emitting join_restaurant {restaurant_id:${RID}}`);
  socket.emit('join_restaurant', { restaurant_id: RID });
});
socket.on('joined_restaurant', (d) => w(`JOINED ACK: ${JSON.stringify(d)}`));
socket.on('connect_error', (e) => w(`CONNECT_ERROR: ${e && e.message}`));
socket.on('disconnect', (r) => w(`DISCONNECT: ${r}`));

// Catch-all — the key evidence. Prints event name + full args array verbatim.
socket.onAny((event, ...args) => {
  // Only log order/scan relevant traffic to keep the log focused, but keep channel name.
  try {
    w(`EVENT "${event}" ARGS=${JSON.stringify(args)}`);
  } catch (e) {
    w(`EVENT "${event}" (unserializable) keys=${args && args.length}`);
  }
});

// Explicit listener on the order channel too (belt and suspenders)
socket.on(ORDER_CH, (...args) => {
  w(`ORDER_CHANNEL(${ORDER_CH}) RAW=${JSON.stringify(args)}`);
});

const RUN_MS = 240000; // 4 min window
setTimeout(() => { w('WINDOW END — closing'); socket.close(); process.exit(0); }, RUN_MS);
