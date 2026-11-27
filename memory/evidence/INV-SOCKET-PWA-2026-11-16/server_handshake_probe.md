# Socket Server Handshake Probe — 2026-11-16

## Endpoint
`GET https://presocket.mygenie.online/socket.io/?EIO=4&transport=polling`

## Raw Response
```
0{"sid":"clTp2vfeEhptjWWNAAps","upgrades":["websocket"],"pingInterval":25000,"pingTimeout":60000,"maxPayload":1000000}
```

## Parsed Config
| Parameter | Value | Meaning |
|-----------|-------|---------|
| sid | clTp2vfeEhptjWWNAAps | Session ID |
| upgrades | ["websocket"] | Can upgrade from polling to websocket |
| pingInterval | 25000ms (25s) | Server pings client every 25s |
| pingTimeout | 60000ms (60s) | Server waits 60s for pong before disconnect |
| maxPayload | 1000000 (1MB) | Max message size |

## Implications for PWA Disconnect
- **Total silence tolerance: 85s** (25s interval + 60s timeout)
- iOS kills WebSocket after ~30s background → server detects after 85s
- Android kills WebSocket after ~5min → server detects after 85s
- During the 85s window, events are lost (socket alive on server, dead on client)
- After 85s, server disconnects → client reconnection starts

## Socket.IO Protocol Version
- EIO=4 (Engine.IO v4)
- Socket.IO client: v4.8.4 (from package.json)
