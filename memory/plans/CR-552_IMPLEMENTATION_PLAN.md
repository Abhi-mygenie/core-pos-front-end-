# CR-552 — Implementation Plan (Gate 3)

**Item:** CR-552 · Per-item approval for web-order items (item-level Yet-to-Confirm) — **WEB ORDERS ONLY**
**Date:** 2026-11-18 · **Role:** PLANNING (Gate 3) · **Severity:** P1 · **Risk:** HIGH (R5 hotspots)
**Depends on:** CR-552 Impact Analysis (`CR-552_IMPACT_ANALYSIS.md`). Owner decisions OD-552-01..05 RESOLVED (below).
**Backend dependency:** NONE — reuses existing `CONFIRM_ORDER` + `CANCEL_ITEM`. **FE-only.**

---

## Resolved owner decisions
- **OD-552-01 (accept):** Accept = reuse existing `confirmOrder()` → `PUT CONFIRM_ORDER` (`waiter-dinein-order-status-update`). On an already-cooking order the backend sets every `food_status=7` line → `def_ord_status` (usually 1) and does **not** re-stamp `f_order_status`. No new endpoint. No separate KOT hack.
- **OD-552-02 (reject):** Reject = loop `CANCEL_ITEM` (`cancel-food-item`) over the **new (status-7) items only**. Never touches previously-ordered items or the whole order.
- **OD-552-03 (surface):** The **scan banner** (`ScanOrderPopOut`). New items actionable; previously-ordered items **greyed in an expandable "Previously ordered items" dropdown**, not cancellable.
- **OD-552-04 (discovery):** The banner popping up IS the discovery. No separate table badge in this phase.
- **OD-552-05 (confirm tone):** OUT OF SCOPE (dead POS2-007 override tracked separately).
- **OD-552-06 (reject reason — minor, recommended default):** Reject opens the existing reason modal once; the chosen reason is applied to all new items via the CANCEL_ITEM loop (consistent with CR-545).

## Scope lock
**WILL change (4 files, FE-only):**
1. `src/api/transforms/orderTransform.js` — additive item flags
2. `src/components/dashboard/ScanOrderPopOut.jsx` — Mode B trigger + two-section render + scoped actions
3. `src/pages/DashboardPage.jsx` — `handleRejectNewItems` + prop wiring
4. `src/api/transforms/reportTransform.js` — status-7 label

**Will NOT touch:** `CartPanel.jsx` (R5), `OrderCard.jsx`, `constants.js` (`F_ORDER_STATUS` untouched), `socketHandlers.js`, `AggregatorOrderPopOut.jsx`, any service, any endpoint, any payload builder, NotificationContext/soundManager, aggregator/POS paths. (Item-level marker inside CartPanel/OrderCard is deferred to an optional Phase 2 — NOT in CR-552.)

**Conflict:** `ScanOrderPopOut.jsx` is actively owned by CR-545 (IMPL 2026-11-17) and has CR-533/CR-534 at Gate 1. **Execution order: CR-552 AFTER CR-545.** All CR-552 edits are additive (new predicate + new render branch gated by `isEditMode`); Mode A render path and CR-545 per-item cancel remain byte-identical when `isEditMode === false`.

---

## Exact edits

### Edit A — `orderTransform.js` (`orderItem`, before the closing `};` at L161)
Add two additive fields to the returned item object (after `giveDiscount:` L160):
```js
// CR-552: expose raw food status + item-level Not-Confirm flag (web-edit appended lines).
foodStatus: Number(detail.food_status),
isNotConfirmed: Number(detail.food_status) === 7,
```
- Additive only. `status: mapOrderStatus(...)` (L133) left UNCHANGED — no downstream `status` consumer shifts. Verifies: `ScanOrderPopOut.jsx:466` already reads `it.foodStatus` (currently undefined) — now populated correctly, improving its cancelled-detection too.

### Edit B — `ScanOrderPopOut.jsx`
**B1. Mode-B trigger** (near `isUnconfirmedScanOrder` L59):
```js
// CR-552: web EDIT — order stays fOrderStatus=2 but has appended Not-Confirm (food_status=7) lines.
export const hasUnconfirmedWebEditItems = (order) =>
  Boolean(order) && order.isWebOrder && !order.scheduled &&
  order.fOrderStatus !== 7 &&
  Array.isArray(order.items) && order.items.some((it) => it?.isNotConfirmed && it?.status !== 'cancelled');
```
**B2. Queue filter** (L175): `.filter((o) => isUnconfirmedScanOrder(o) || hasUnconfirmedWebEditItems(o))`.
**B3. Per-order mode** (in render, after `activeOrder` resolved): `const isEditMode = activeOrder.fOrderStatus !== 7;`
   and `const newItems = items.filter(it => it.isNotConfirmed && it.status!=='cancelled'); const prevItems = items.filter(it => !it.isNotConfirmed);`
**B4. Item list render** (L449-601): 
   - Mode A (`!isEditMode`): unchanged flat list.
   - Mode B: render `newItems` with the existing row markup (actionable, per-item cancel kept); render `prevItems` inside a collapsible `<details data-testid="popout-prev-items">` titled "Previously ordered items (N)", each row greyed (`opacity:0.6`, `color:grayText`) with the **cancel button omitted**.
   - Gate the per-item cancel button (L527) with `&& (!isEditMode || it.isNotConfirmed)`.
**B5. Reject button** (~L684, confirmed at HEAD): `onClick={() => (isEditMode ? onRejectNewItems?.(activeOrder) : handleRejectClick(activeOrder))}`; label stays "Reject". Accept button unchanged (`handleAcceptClick` → `onAccept` → reuse works for Mode B). Add `onRejectNewItems` to the component props list.

### Edit C — `DashboardPage.jsx`
**C1.** New handler (near `handleScanCancelItem` L1684), looping CANCEL_ITEM over new items:
```js
// CR-552: reject = cancel ONLY the appended Not-Confirm (food_status=7) web items.
const handleRejectNewItems = useCallback((order) => {
  const newItems = (order?.items || []).filter(it => it?.isNotConfirmed && it?.status !== 'cancelled');
  if (newItems.length === 0) return;
  setScanRejectItems({ order, items: newItems }); // opens reason modal (OD-552-06)
}, []);
```
   plus `executeScanRejectNewItems({reason, note})` that loops `orderToAPI.cancelItem(...)` + `api.put(API_ENDPOINTS.CANCEL_ITEM, payload)` over `newItems` (mirrors `executeScanItemCancel` L1690-1706, full-qty cancel per line), then clears state.
**C2.** Add state `const [scanRejectItems, setScanRejectItems] = useState(null);`, pass `onRejectNewItems={handleRejectNewItems}` to `<ScanOrderPopOut>` (L1873), and render a reason modal (reuse the CR-545 cancel modal component) wired to `executeScanRejectNewItems`.
- Accept path (`onAccept={handleConfirmOrder}`) is reused verbatim — already correct for Mode B.

### Edit D — `reportTransform.js` (`getFoodStatusLabel` L57-65)
Add `7: 'Yet to Confirm',` to the label map so status-7 lines stop printing "Unknown".

---

## Verification Matrix (seeds QA)
| # | File | Change | How to verify | Automated? |
|---|------|--------|---------------|:--:|
| 1 | orderTransform.js | `isNotConfirmed`/`foodStatus` on item | Unit: item w/ food_status 7 → isNotConfirmed true; 1/2/3 → false | YES |
| 2 | ScanOrderPopOut.jsx B1/B2 | Mode-B order enters queue | Web order fOS=2 + one status-7 line → banner shows; aggregator/POS → does NOT | NO (browser) |
| 3 | ScanOrderPopOut.jsx B3/B4 | Two-section render | New items actionable at top; prev items greyed inside expandable dropdown, no cancel btn | NO |
| 4 | ScanOrderPopOut.jsx B5 | Reject routing | Edit-mode Reject → reason modal → only new lines cancelled; prev lines + order intact | NO |
| 5 | DashboardPage.jsx C1/C2 | reject loop | Network: N× `cancel-food-item` (one per new item), 0 whole-order cancel | NO |
| 6 | Accept (reused) | confirm new lines | Accept → 1× `waiter-dinein-order-status-update`; status-7 lines → 1; f_order_status stays 2; popup auto-dismisses | NO |
| 7 | reportTransform.js | label 7 | Unit: getFoodStatusLabel(7) === 'Yet to Confirm' | YES |
| 8 | Scope guard | web-only | Aggregator edit + POS edit → NO banner, NO new actions | NO |

## Post-Code Registry Checklist (Implementation agent executes)
- [ ] registry.json: CR-552 → status IMPLEMENTED, sprint_key nov_cr_batch
- [ ] CR_REGISTRY.md: row → GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add orderTransform.js, ScanOrderPopOut.jsx, DashboardPage.jsx, reportTransform.js (CR-552 notes)
- [ ] Code markers: `// CR-552` in every modified file

## Execution sequence
A (transform) → D (label) → B (popup) → C (dashboard handlers+modal) → self-test Verification Matrix → QA.

## Risk register
- R1: overloading `status` → mitigated (additive flag only).
- R2: ScanOrderPopOut conflict w/ CR-545/533/534 → mitigated (Mode B behind `isEditMode`; Mode A path untouched).
- R3: Mode-B order also renders as a normal OrderCard beneath → acceptable (presentation overlay; auto-dismisses post action).
- R4: reject partial failure (some CANCEL_ITEM calls fail) → surface toast, leave remaining lines status-7 (banner stays) for retry.

## Handover (→ Owner Gate 4 GO → IMPLEMENTATION)
Plan ready. 4 edits across 4 files, FE-only (no backend, no new endpoint). Code reality PARTIAL. Verification matrix: 8 checks (2 automated, 6 manual). Owner decisions: all resolved (OD-552-06 default recommended). Execution AFTER CR-545. Awaiting Gate 4 GO.
