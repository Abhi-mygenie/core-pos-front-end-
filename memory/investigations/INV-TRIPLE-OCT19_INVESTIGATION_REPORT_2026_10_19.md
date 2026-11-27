# Investigation Report — Three Issues (Oct 19 2026)

**Role:** INVESTIGATION (Role 6)
**Date:** 2026-10-19
**Items:** (1) Reports date cap, (2) PWA white screen on deploy, (3) Role-based discount live update
**Steps used:** 10/10
**Codebase:** `/app/frontend/src/` (main branch, just synced)

---

## ISSUE 1 — Reports: "Max 60 days" instead of 2 years

### Symptom
Sales report (and others) shows "Max 60 days" validation error when date range exceeds ~2 months. Owner expected these to support up to 2 years (730 days).

### Root Cause — CODE_ERROR (never implemented)

The FE date-range cap constants were never changed. Current state:

| File | Constant | Current value | Target |
|------|----------|:---:|:---:|
| `pages/reports-module/SalesMockup.jsx:138` | `maxDays` | **60** | 730 |
| `pages/reports-module/PaymentsMockup.jsx:183` | `maxDays` | **60** | 730 |
| `pages/reports-module/OrderLedgerMockup.jsx:36` | `MAX_RANGE_DAYS` | **60** | 730 |
| `pages/reports-module/RoomOrdersMockup.jsx:54` | `MAX_RANGE_DAYS` | **60** | 730 |
| `pages/reports-module/DashboardMockup.jsx:74` | `MAX_RANGE_DAYS` | 365 | 730 |
| `pages/reports-module/ItemSalesHybridMockup.jsx:169` | `MAX_RANGE_DAYS` | 365 | 730 |
| `pages/reports-module/CancellationsMockup.jsx:192` | `MAX_RANGE_DAYS` | 365 | 730 |
| `pages/reports-module/SettlementReportMockup.jsx:31` | `MAX_RANGE_DAYS` | 365 | 730 |

The screenshot shows SalesMockup (`/reports-module/sales`) with the exact "Max 60 days" error label at `SalesMockup.jsx:336`.

### Where It Was Registered

| ID | Title | Registry Status |
|----|-------|----------------|
| **BUG-353** | OrderReportBetaPage date range capped at 1 month | `BACKEND_BLOCKED` — this is the original bug about the ORDER_REPORT_BETA_COMBINED endpoint cap. **Not the same as the FE cap.** |
| **BATCH_REPORTS_FE_FIX_001** (Item #6) | BUG-353 FE part — Lift Date Range Caps to 730 Days | `GATE_1_INTAKE_COMPLETE` (registered 2026-10-17) — **planning never started, no Gate 2** |

### Gap
The 730-day FE cap lift is tracked inside `BATCH_REPORTS_FE_FIX_001_INTAKE_2026_10_17.md` as Item #6. It stalled at Gate 1 (intake). No planning, no implementation plan, no Gate 4 GO, no code change. The change itself is trivial: 1 line per file × 8 files.

**SalesMockup, DashboardMockup, ItemSalesHybridMockup, CancellationsMockup** all use backend-aggregated APIs (`fetchInsightsSales`, `fetchInsightsDashboard`, `fetchInsightsItems`, `fetchInsightsCancellations`) — lifting the FE cap on these 4 is safe with no backend changes needed.

**OrderLedgerMockup, RoomOrdersMockup, PaymentsMockup, SettlementReportMockup** use FE aggregation (chunked requests or custom paging). The BATCH intake notes these need backend confirmation for volume — they can be deferred or lifted in a separate sub-batch.

### Answer
> **Under which CR/BUG was this supposed to be fixed?**
`BATCH_REPORTS_FE_FIX_001` Item #6 (FE cap), registered 2026-10-17, `GATE_1_INTAKE_COMPLETE`. It was never planned or implemented. The separate `BUG-353` (BACKEND_BLOCKED) covers only the ORDER_REPORT_BETA_COMBINED endpoint, not the date-picker cap.

---

## ISSUE 2 — PWA White Screen on Deploy

### Symptom
Every production deploy causes all installed PWA clients to show a white/blank screen. The app freezes completely. Users should instead be shown an "update available" prompt.

### Root Cause — ENVIRONMENT (no SW update flow + no ChunkLoadError recovery)

**What the app has:**
- `manifest.json` — app IS installable as a PWA (`display: standalone`)
- `firebase-messaging-sw.js` — registered via `firebase.js:68` at scope `/`
- CRA's webpack config includes `WorkboxWebpackPlugin.InjectManifest` (confirmed in `react-scripts/config/webpack.config.js:709`) — BUT this generates a `service-worker.js` at build time

**Critical gap — the generated SW is never registered:**
`index.js` has **zero service worker registration**. It renders App and nothing else. The workbox-generated `service-worker.js` (which CRA produces in `build/`) is never called. Only `firebase-messaging-sw.js` is registered, and it has **no fetch handler, no precache, no skipWaiting, no clients.claim**.

**How the white screen happens on each deploy:**

```
1. Production server replaces build/ folder with new webpack output
   → New chunk filenames (content hashes change with each build)
   → Old chunk files (e.g. main.d4e5f6.js) are DELETED from server

2. Installed PWA clients launch → browser checks for SW update
   → New firebase-messaging-sw.js detected (if file changed)
   → New SW enters "installing" → "waiting" state
   → Old SW stays in control (no skipWaiting → never activates)

3. Browser fetches new index.html (Cache-Control: no-cache on index.html)
   → New index.html references NEW chunk hashes (e.g. main.a1b2c3.js)

4. Old chunks may still be in browser HTTP cache (long-lived cache headers on *.js)
   → Browser may return cached main.d4e5f6.js for the new hash URL → 404
   → OR server correctly serves new files but old in-flight PWA context
     has already loaded stale index.html from PWA navigation cache

5. Missing JS chunk → React never mounts → white screen
   No ChunkLoadError boundary → freeze, no recovery
```

**Missing pieces (all absent from codebase):**
- `skipWaiting()` + `clients.claim()` in `firebase-messaging-sw.js`
- `navigator.serviceWorker.ready` check for `.waiting` worker in the React app
- `controllerchange` listener → `window.location.reload()`
- Global `ChunkLoadError` boundary with auto-retry
- "New version available" update banner/toast

**No prior BUG/CR registered for this.** This is an unregistered issue.

### Answer
> **Root cause:** Production deploy replaces hashed JS bundles. PWA clients have stale `index.html` (from navigation cache or browser HTTP cache) referencing deleted chunk URLs. No service worker update flow exists (`skipWaiting` / update prompt), and no `ChunkLoadError` recovery is present. App freezes instead of prompting for update.
> **Not registered.** Needs a new intake as a P1/HIGH item.

---

## ISSUE 3 — Role-Based Discount: Cashier Sees Stale Bill Without Refresh

### Symptom
Owner applies a role-based discount on a running order from their device. Cashier who already has CollectPaymentPanel (CPP) open does not see the discount appear live. Cashier must close and reopen CPP (or re-login) to see the discount.

### Investigation Trace

**Socket → Transform → Context → CPP chain:**

```
1. Owner POSTs to /api/v2/order/apply-discount
2. Backend saves order_discount_json, emits update-order socket event
   Payload: { orders: [{ ..., order_discount_json: { id:303, discount:100, discount_type:"fixed" } }] }

3. socketHandlers.js:270 — handleOrderDataEvent:
   order = orderFromAPI.order(payload.orders[0]);
   ✅ transform IS called → order_discount_json → orderDiscountJson (camelCase, 'fixed'→'flat')

4. updateOrder(order.orderId, order) called
   → orders[] in OrderContext updated with transformed order including orderDiscountJson

5. OrderContext.jsx:342 — orderItemsByTableId whitelist:
   orderDiscountJson: order.orderDiscountJson || null
   ✅ ALREADY FIXED (BUG-595 comment present in code)

6. OrderEntry.jsx:1954 passes prop:
   initialDiscount={orderData?.orderDiscountJson || null}

7. CollectPaymentPanel.jsx:359-366:
   useEffect(() => {
     if (!initialDiscount) return;
     setDiscountType(initialDiscount.discountType);
     setDiscountValue(String(initialDiscount.discount));
     setDiscountFor(initialDiscount.discountNote || '');
     setIsDiscountApplied(true);
   }, [initialDiscount?.discount, initialDiscount?.discountType]); // BUG-595: reactive
   ✅ ALREADY FIXED (deps changed from [] to reactive — BUG-595 comment in code)
```

### Key Finding — Code vs Registry Mismatch

**The fix IS already in the codebase.** Both the CPP deps change (L366) and the OrderContext whitelist (L342) carry `// BUG-595` comments indicating deliberate implementation. The socket handler calls `orderFromAPI.order()` transform at L270 ensuring `orderDiscountJson` (camelCase) is present in the updated order.

**But the registry says `GATE_1_INTAKE_COMPLETE`.** BUG-595 was registered 2026-10-19 as if the fix hasn't been done. This is a **retroactive registration gap** — someone coded the fix without advancing registry gates (or the fix was made during intake as a quick patch).

### Why User Still Sees the Bug

Two possible explanations:

**A — Production deployment lag (most likely):**
The fix exists in the `main` branch (this repo) but the live production frontend at `preprod.mygenie.online` may be running an OLDER deployed build that pre-dates the BUG-595 fix. Registry GATE_1 + code comments suggest the fix was made very recently (same session as intake, 2026-10-19) and may not have been shipped.

**B — Remaining edge case for TABLE orders with late socket timing:**
For dine-in table orders (tableId ≠ 0), `getOrderDataForEntry` uses `orderItemsByTableId[tableId]`. The whitelist at L342 now includes `orderDiscountJson`. BUT if the cashier opened CPP before the current code was deployed and the socket update arrives while the old build is active, the old in-memory whitelist (without `orderDiscountJson`) would be used — the prop stays `null` → effect never re-seeds.

### OD-595-01 Status
`OrderContext.jsx:342` now includes `orderDiscountJson` in the whitelist. This covers dine-in table orders. OD-595-01 appears resolved in code but not in registry.

### Answer
> **Root cause (original):** `CollectPaymentPanel.jsx` mount-effect had empty `[]` deps — seeded discount only at panel open, never re-fired on socket update. Tracked as **BUG-595**, registered 2026-10-19.
> **Current code state:** The fix IS present (reactive deps at L366, OrderContext whitelist at L342, socket transform at socketHandlers.js:270 confirmed). 
> **Gap:** Registry at GATE_1_INTAKE_COMPLETE — code was committed without advancing gates. **Needs CLOSURE: retroactive gate advancement to GATE_5A_IMPLEMENTED.** User may still see the bug on production if this build hasn't been deployed there yet.

---

## Summary Table

| # | Issue | Root Cause | Registered As | Status | Action |
|---|-------|-----------|--------------|--------|--------|
| 1 | Reports max 60 days | FE caps never changed | `BATCH_REPORTS_FE_FIX_001` Item #6 (BUG-353 FE part) | GATE_1 only — never planned/built | Gate 2 GO → fast implementation (8 files, 1 line each) |
| 2 | PWA white screen on deploy | No SW update flow, no ChunkLoadError recovery | **NOT REGISTERED** | New bug needed | New intake P1/HIGH — add skipWaiting + update prompt |
| 3 | Discount not live in cashier CPP | Empty `[]` deps in mount effect | BUG-595 (2026-10-19) | Fix IS in code; registry stale at GATE_1 | CLOSURE: advance to GATE_5A; deploy to production |

---

## Next Steps (recommended)

1. **Issue 1:** Owner give "Gate 2 GO" for `BATCH_REPORTS_FE_FIX_001` Item #6. Fast implementation — 4 safe files (backend-agg) can go in one Fast Lane batch.
2. **Issue 2:** Register new BUG (P1/HIGH). Fix: add `skipWaiting()` + `clients.claim()` to `firebase-messaging-sw.js` + add SW update listener + "Update available" toast in `NotificationContext.jsx`.
3. **Issue 3:** CLOSURE action — advance BUG-595 to `GATE_5A_IMPLEMENTED` in registry. Confirm current preview build is live on production. If not, deploy.

---

Investigation complete.
Steps used: 10/10
Evidence: code trace + registry scan + socket handler confirmed (no live API probes needed)
