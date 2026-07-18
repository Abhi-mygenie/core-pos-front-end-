# CR-018 — Code Gate / Scope Lock (Gate 4)

**Date:** 2026-06-09
**Sprint:** POS 4.0
**Status:** LOCKED
**Prerequisites:** Gate 2 (Impact Analysis) ✅, Gate 3 (Implementation Plan) ✅

---

## 1. Scope Lock — What Is IN

### New Files (0)
No new files. All changes are modifications to existing files.

### Modified Files (5)

| File | Change | Lines (est.) |
|---|---|---|
| `src/api/transforms/orderTransform.js` | +2 fields in `fromAPI.order` (`scheduled`, `scheduleAt`). +`scheduled`/`scheduleAt` to options destructuring in `placeOrder` (L859) and `placeOrderWithPayment` (L1087). Replace hardcoded `0`/`null` with options passthrough at L901-902 and L1158-1159. | ~10 |
| `src/components/order-entry/OrderEntry.jsx` | +2 state vars (`isScheduled`, `scheduleAt`). +1 effect (reset on delivery). Thread schedule options into 3 call sites (L968, L1204, L1850). +4 props to CartPanel JSX (L2252). +1 effect (re-engage pre-populate). | ~25 |
| `src/components/order-entry/CartPanel.jsx` | +4 props in signature. +`generateTimeSlots()` utility. +Schedule checkbox + date/time picker section (after KOT/Bill). +Place Order disabled guard for incomplete schedule. | ~65 |
| `src/components/cards/OrderCard.jsx` | +Scheduled badge (`SCH <date>`, blue) after HOLD badge (L451). | ~10 |
| `src/components/dashboard/ScanOrderPopOut.jsx` | +`&& !order.scheduled` guard on `isUnconfirmedScanOrder` predicate (L56). | ~1 |

### Conditionally Modified (1)

| File | Change | Condition |
|---|---|---|
| `src/pages/DashboardPage.jsx` | Fix filter predicate at L1109: `item.status === 'scheduled'` → `item.scheduled === true \|\| item.order?.scheduled === true` | Ships with CR (dormant until backend returns data) |

**Total: 6 files, ~112 lines, 0 new files.**

---

## 2. Scope Lock — What Is OUT

| Item | Reason |
|---|---|
| `constants.js` — new STATUS_COLUMNS entry for "Scheduled" | Deferred: architecture risk R10 — dedicated column requires secondary filter in dashboard grouping. Badge is sufficient for Phase 1. |
| `Header.jsx` — "Scheduled" tab button | Deferred: dormant until backend fix (B1). No orders to count/show. Phase 2. |
| `orderTransform.js` `updateOrder` (Flow 2) — carry `scheduled` flag | Deferred: depends on backend behavior investigation (B3). Decision #6 says "cannot edit scheduled time." If backend clears flag on item-add, will revisit. Phase 2. |
| `orderTransform.js` `collectBillExisting` (Flow 4) | Not needed — scheduling happens at place time only, not at bill time. |
| `TableCard.jsx` | No change — table status uses existing `reserved` status for scheduled dine-in (already handled). |
| `RePrintButton.jsx` / `KotBillCheckboxes` | No change — schedule checkbox is a new sibling section, not integrated into KotBillCheckboxes. |
| QSR mode scheduling | Out of scope per Intake Decision. Checkbox hidden in QSR mode. |
| Auto-notification on scheduled time arrival | Out of scope per Intake Decision #8. Future CR. |
| Delivery order scheduling | Out of scope per Intake Decision #2. Checkbox hidden for delivery. |
| Room order scheduling | Out of scope per Intake Decision #2. Checkbox hidden for rooms. |
| Permission gating | Out of scope per Intake Decision #1 — all users can schedule. |

---

## 3. Baseline Rules Affected

| Rule | Impact | Action |
|---|---|---|
| **Payload schema** | `scheduled` and `schedule_at` keys change from hardcoded `0`/`null` to option-driven values. | Backward compatible — default values are `false`/`null` → emits `0`/`null` exactly like today when not scheduled. |
| **`fromAPI.order` canonical schema** | +2 new fields (`scheduled: boolean`, `scheduleAt: string\|null`). | Additive — no existing field modified. All existing consumers unaffected. |
| **ScanOrderPopOut predicate** | Tightened from `fOrderStatus === 7` to `fOrderStatus === 7 && !order.scheduled`. | More restrictive — prevents false positives (scheduled POS orders leaking into web popup). No false negatives (web YTC orders have `scheduled === false`). |
| **Dashboard filter predicate** | Fixed from `item.status === 'scheduled'` (always false) to `item.scheduled === true`. | Bug fix — existing code was dormant/broken. No behavioral change until backend returns data. |

**No financial baseline rules affected.** Schedule adds no new calculations — `order_amount`, `tax_amount`, `round_up`, `service_charge`, `delivery_charge` are all unchanged. The `scheduled`/`schedule_at` fields are metadata-only (not financial).

---

## 4. Frozen Sprint Files — Cross-Check

| Frozen Sprint | Files We Touch | Conflict? |
|---|---|---|
| POS 2.0 (frozen 2026-05-31) | `orderTransform.js` (POS2-003, POS2-003-REOPEN-A), `OrderCard.jsx` (POS2-005), `ScanOrderPopOut.jsx` (POS2-002 Phase 4), `DashboardPage.jsx` (POS2-005) | **NO** — our changes are additive (new fields, new badge, tightened predicate). We do not modify any POS 2.0 code paths. |
| POS 3.0 (frozen 2026-05-31) | `OrderCard.jsx` (BUG-087, BUG-097, BUG-102), `CartPanel.jsx` (BUG-099, BUG-111) | **NO** — badge is a new block after existing badges. CartPanel schedule section is a new block after KOT/Bill. No existing lines modified. |
| POS 3.1 (frozen 2026-05-31) | `OrderEntry.jsx` (BUG-111, BUG-112) | **NO** — state vars are new. Call-site changes add properties to options objects (no existing properties modified). |
| CRM 2.0 (frozen 2026-05-31) | `orderTransform.js` (CR-002) | **NO** — `fromAPI.order` additions are in a different section (delivery block) than CR-002 changes (notes/food_level_notes). |

**Verdict: Zero frozen-sprint conflicts.**

---

## 5. Dependencies

| Dependency | Status | Blocker? |
|---|---|---|
| `scheduled` + `schedule_at` accepted by place-order API | ✅ Tested (order 939593) | No |
| Backend running-orders API returns scheduled orders | ❌ Not working — escalation filed | **Yes for dashboard display. No for placement.** |
| `scheduled` field on running-orders response | ❓ Unknown — depends on B1 fix | Yes for badge/filter. No for placement. |
| `updateOrder` preserves `scheduled` flag on item-add | ❓ Untested (B3) | No — deferred to Phase 2 |
| No new npm dependencies | ✅ Native HTML inputs used | No |
| No new backend endpoints | ✅ Existing place-order API | No |

---

## 6. Risk Mitigations (from Impact Analysis)

| Risk ID | Risk | Severity | Mitigation in Code Gate |
|---|---|---|---|
| R0 | Backend running-orders API blocker | P0 | **Acknowledged.** FE ships placement + UI. Badge/filter activate automatically on backend fix. No code blocker. |
| R1 | 3 call sites must all get schedule options | MEDIUM | Implementation checklist B3/B4/B5 — grep-verify post-implementation. |
| R4 | CartPanel layout disruption | MEDIUM | New section is a separate `<div>` with `borderTop` — visually isolated. Hidden by default (checkbox unchecked). |
| R9 | Scheduled orders in ScanOrderPopOut | HIGH | **Mandatory fix D2** — `!order.scheduled` guard. Ships with CR. Non-negotiable. |
| R10 | Status View column architecture | HIGH | **Deferred.** Not in scope. Badge-only for Phase 1. |
| R11 | Filter predicate naming mismatch | MEDIUM | **Fixed in E1.** `item.status` → `item.scheduled`. |
| R12 | `updateOrder` clears scheduled flag | MEDIUM | **Deferred.** Phase 2 after B3 investigation. |

---

## 7. Execution Sequence

| Step | Phase | File | Action |
|---|---|---|---|
| 1 | A | `orderTransform.js` | Add `scheduled`/`scheduleAt` to `fromAPI.order` |
| 2 | A | `orderTransform.js` | Modify `placeOrder` destructuring + payload |
| 3 | A | `orderTransform.js` | Modify `placeOrderWithPayment` destructuring + payload |
| 4 | B | `OrderEntry.jsx` | Add state + effects |
| 5 | B | `OrderEntry.jsx` | Thread schedule into 3 call sites |
| 6 | B | `OrderEntry.jsx` | Thread props to CartPanel |
| 7 | C | `CartPanel.jsx` | Add props + utility + checkbox/picker UI + disable guard |
| 8 | D | `OrderCard.jsx` | Add scheduled badge |
| 9 | D | `ScanOrderPopOut.jsx` | Add `!order.scheduled` to predicate |
| 10 | E | `DashboardPage.jsx` | Fix filter predicate |

Steps 1-3 are atomic (same file). Steps 4-6 are atomic (same file). Step 7 standalone. Steps 8-9 independent. Step 10 standalone.

**Parallelizable:** Steps 8, 9, 10 can run in parallel after Steps 1-3 complete.

---

## 8. GO / NO-GO Checklist

| # | Item | Status |
|---|---|---|
| 1 | Impact Analysis complete (Gate 2) | ✅ |
| 2 | Implementation Plan complete (Gate 3) | ✅ |
| 3 | Scope locked — IN/OUT defined | ✅ |
| 4 | Frozen sprint cross-check — zero conflicts | ✅ |
| 5 | No baseline financial rules affected | ✅ |
| 6 | Backward compatibility guaranteed (default = today's behavior) | ✅ |
| 7 | Backend place-order API verified (order 939593) | ✅ |
| 8 | All 13 owner decisions locked (Intake §4) | ✅ |
| 9 | ScanOrderPopOut guard mandatory (R9) | ✅ — in scope |
| 10 | No new dependencies required | ✅ |
| 11 | Backend blocker B1 acknowledged (non-blocking for FE) | ✅ |
| 12 | **Owner GO** | ⏳ AWAITING |

---

## 9. Post-Implementation Verification

After Gate 5 implementation, the following MUST be verified before declaring complete:

| # | Verification | Method |
|---|---|---|
| 1 | Non-scheduled order payload unchanged (`scheduled:0`, `schedule_at:null`) | Console log comparison |
| 2 | Scheduled order payload correct (`scheduled:1`, `schedule_at:"YYYY-MM-DD HH:mm:ss"`) | Console log + curl |
| 3 | Checkbox hidden for delivery / room / QSR | Visual |
| 4 | Place Order disabled when schedule checked but no time | Visual |
| 5 | ScanOrderPopOut excludes `order.scheduled === true` | Code review |
| 6 | No ESLint errors introduced | `yarn lint` or build |
| 7 | Frontend compiles without errors | `yarn start` / hot reload |

---

*CR-018 Code Gate — 2026-06-09. Gate 4 LOCKED. 6 files, ~112 lines, 0 new files, 0 frozen-sprint conflicts, 0 financial baseline changes. Awaiting owner GO for Gate 5 implementation.*
