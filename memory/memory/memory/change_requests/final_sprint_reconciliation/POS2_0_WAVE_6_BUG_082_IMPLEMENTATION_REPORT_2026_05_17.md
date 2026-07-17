# POS2.0 Wave 6 — BUG-082 Implementation Report — 2026-05-17

## 1. Status
**APPLIED** — BUG-082 code changes applied and validated. BUG-068 deferred per owner directive.

---

## 2. Bug implemented

| Bug | Summary | Files Touched | Status |
|---|---|---|---|
| BUG-082 | scan-new-order index 4 = primitive `'web'`; no API call; minimal order entry; retire channel-based fallback | `socketHandlers.js`, `socketEvents.js`, `handleScanNewOrder.enrichment.test.js` | APPLIED |

---

## 3. Changes applied

### `frontend/src/api/socket/socketHandlers.js`

| Change | Detail |
|---|---|
| `handleScanNewOrder` rewritten | Removed `async`, removed `fetchOrderWithRetry` API call, removed `parseMessage` usage |
| Index 4 read as primitive | `typeof message[MSG_INDEX.PAYLOAD] === 'string'` guard; reads `orderFrom` from index 4 |
| Minimal order entry | `{ orderId, fOrderStatus, orderFrom, isWebOrder, status: 'pending', items: [], amount: 0, tableId: 0 }` |
| Fallback retired | Removed POS2-002-P4-FU-01 channel-arrival enrichment (L508-511) — owner directive Q-082-4 |
| `syncTableStatus` removed | No table data in minimal order |
| `isAsyncHandler` updated | `SCAN_NEW_ORDER` removed from async list |

### `frontend/src/api/socket/socketEvents.js`

| Change | Detail |
|---|---|
| `MSG_INDEX.PAYLOAD` comment | Documented scan-new-order exception: primitive string, not payload object |

### `frontend/src/__tests__/api/socket/handleScanNewOrder.enrichment.test.js`

| Change | Detail |
|---|---|
| Test file rewritten | 8 tests covering: primitive read, no API call, forward-compat, missing index 4, status-8/9 skip, invalid messages |

---

## 4. Test suite

| Metric | Value |
|---|---|
| Test suites | **34 passed / 34 total** |
| Tests | **501 passed / 501 total** |
| Net new tests | +3 (8 total in rewritten file, replacing 5 old tests) |
| ESLint | Compilation clean (webpack) |
| Webpack | Hot-reload green |

---

## 5. Business rules enforced

### SCAN-003 (pending freeze, confirmed by owner Q-082-O1)
> Socket event `scan-new-order` carries the order source at position 4: `['scan-new-order', orderId, restaurantId, status, 'web']`. Frontend reads index 4 as the primary source identifier.

### POS2-005 / BUG-042-C (Hold guard preserved)
> Status-8 and status-9 orders are skipped by `handleScanNewOrder` — they belong on the Audit Hold tab only.

### Channel-based fallback RETIRED (Q-082-4)
> The POS2-002-P4-FU-01 fallback that set `orderFrom='web'` when the backend omitted the field has been removed. The primitive at index 4 is now the authoritative source.

---

## 6. Owner QA checklist (BUG-082)

| # | Check | Expected | How to verify |
|---|---|---|---|
| 1 | Web order placed via Scan & Order | `scan-new-order` fires → popup appears with order # | Place web order → observe popup |
| 2 | Popup shows for web YTC orders | `orderFrom === 'web' && fOrderStatus === 7` | Verify popup renders for web orders |
| 3 | POS orders do not trigger popup | `new-order` event → full payload at index 4 → no popup regression | Place POS order → verify no popup |
| 4 | Order confirm/edit → full data arrives | `update-order-status` replaces minimal entry with full data | Confirm order → verify order card shows full data |
| 5 | No dead fallback code | L508-511 removed | Code inspection |
| 6 | **Runtime revalidation** (owner recommended) | Capture live `scan-new-order` socket → verify index 4 is `'web'` | DevTools console |
| 7 | Status-8/9 orders not on running dashboard | Scan-new-order with status 8/9 → skipped | If reproducible |

---

## 7. Deferred items

| Item | Reason | Status |
|---|---|---|
| **BUG-068** — Socket reconnect rehydration | Owner deferred at Gate 7 code approval | Code diff preview ready; awaiting owner approval |
| `EVENTS_REQUIRING_ORDER_API` list cleanup | `SCAN_NEW_ORDER` still in list (informational, not runtime) | Low priority cosmetic |

---

## 8. Next wave / action

- **BUG-068** code diff preview is ready at `POS2_0_WAVE_6_CODE_DIFF_PREVIEW_2026_05_17.md` — owner can approve when ready
- Owner QA on BUG-082 using the checklist above
- Runtime revalidation of scan-new-order message structure recommended

---

*— End of BUG-082 Implementation Report — 2026-05-17 —*
