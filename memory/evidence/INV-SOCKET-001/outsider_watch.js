const { io } = require('/app/frontend/node_modules/socket.io-client');
const s = io('https://presocket.mygenie.online', { transports:['websocket'], reconnection:false });
let n = 0;
s.onAny((ev) => { n++; console.log('OUTSIDER GOT', ev); });
s.on('connect', () => console.log('outsider connected (no join), watching 120s'));
setTimeout(() => { console.log('OUTSIDER TOTAL:', n, n === 0 ? '-> PASS (isolation holds)' : '-> FAIL (leak!)'); process.exit(0); }, 120000);
