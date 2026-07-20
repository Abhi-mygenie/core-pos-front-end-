# CR-077 FE Fix — Live E2E Verification on core-pos-preview-10 — 2026-07-20

Target: https://core-pos-preview-10.preview.emergentagent.com/ (FE branch with F1-F3 implemented)
Account: owner@cafe103.com (rid 644). Method: Playwright login + in-page wiretap + Playwright request POSTs to presocket /order-update + parallel outsider node probe from this pod.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Fix deployed fingerprint | ✅ | `typeof __SOCKET_SERVICE__.joinRestaurant === 'function'`, `svc.restaurantId === 644`, connected sid=zxkWuaEWA2YI9s-WAAJB |
| 2 | Own order delivered | ✅ | trigger rid 644 → exactly 1 `new_order_644 ["new-order",999999,644,0,{"orders":[]}]` |
| 3 | Foreign event isolation (tab) | ✅ | trigger rid 777001 → 0 events on logged-in tab |
| 4 | Outsider isolation (order events) | ✅ | no-join node socket during both triggers → 0 new_order_* events |
| 5 | Re-join on reconnect (F2c critical) | ✅ | forced engine.close() → auto-reconnect (new sid sqZiqD2LBuC7U9cEAAJF) → `joined_restaurant {"room":"rest_644"}` ack ×2 → trigger → 1 `new_order_644` delivered post-reconnect |

## Notes
- Outsider probe caught 1 event total: `login_disabled_644` — NOT an order event; that channel is still globally emitted because backend B2 (scoping remaining emit paths) is pending. Known/expected, not a regression of this fix.
- Reconnect produced 2 joined_restaurant acks → join emitted twice (CONNECT handler + subscription-effect re-run). Harmless (server join is idempotent); optional polish, not a defect.
- Not covered in this pass (needs owner smoke or testing agent on that env): tenant-switch (login 618 after 644), station-view refresh, unit tests/compile on that branch.

## VERDICT: FIX WORKING — leak closed for order events, realtime restored, reconnect-survival confirmed.
Next: owner green-light backend B2 (scope login_disabled_<rid> etc. to rooms) → re-run outsider probe → expect 0 total.
