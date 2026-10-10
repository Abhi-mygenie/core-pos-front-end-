# INVESTIGATION REPORT — Dashboard Room Discount Display + Dashboard CPP Split Gray Button
## Role 6 — INVESTIGATION (ALPHA v0.7)

```
Date:            2026-10-09
Trigger:         Owner report — (1) dashboard room tile shows no room discount; (2) dashboard
                 CPP split payment button gray with "Remaining ₹0.00" (same symptom as BUG-526)
Context:         BUG-526 (folio path fix) at GATE_3_PLAN_COMPLETE
Steps used:      6 / 10
Code changed:    NONE
```

---

## 1. Summary

| Issue | Root Cause | Classification | Confidence |
|---|---|---|---|
| **Issue 1** — Room discount not shown in dashboard tile / dashboard CPP | Room discount is a local state in FolioCheckoutPanel, never persisted until folio checkout. Dashboard reads raw API `charge.balance_due`. DESIGN DECISION: room discount input stays folio-only. | DESIGN_CLARIFICATION | HIGH |
| **Issue 2** — Dashboard CPP split button gray | `OrderEntry.jsx:1872` passes `roomInfo={orderData?.roomInfo}` raw (no override) → CPP `roomBalance=1600` → `effectiveTotal=1848` → split sum (food ₹248) < effectiveTotal → DISABLED. Identical root cause to BUG-526 but different code path and fix complexity. | INTERACTION_BUG | HIGH |

---

## 2. Hypotheses Tested

| # | Hypothesis | Test | Steps | Result | Evidence |
|---|---|---|---|---|---|
| H1a | Room discount not in dashboard = local FolioCheckoutPanel state not persisted | Code trace: FolioCheckoutPanel `roomDiscount` state, InHousePanel balance source | 1 | **CONFIRMED** — `roomDiscount` is React state (L213); `charge.balance_due` in dashboard comes from InHouse list API; no discount saved to backend until folio checkout | FolioCheckoutPanel.jsx:213, InHousePanel.jsx:16 |
| H1b | Owner wants room discount controls added to dashboard | Read owner directive | 1 | **ELIMINATED** — owner: "we are not gonna add anything — just show the discount the room leg + check out discount only limited to folio panel" | Owner message |
| H2a | Dashboard split gray = same effectiveTotal > splitTotal as BUG-526 | Code trace: OrderEntry.jsx CPP mount, CPP effectiveTotal calculation | 2 | **CONFIRMED** — OrderEntry:1872 passes raw roomInfo; CPP roomBalance=1600; effectiveTotal=1848; split (248)<1848 → disabled | OrderEntry.jsx:1872, CPP:L734 |
| H2b | PmsCheckoutDrawer path has same issue | Code trace: PmsCheckoutDrawer.jsx CPP mount | 3 | **CONFIRMED** — BUG-425 formula: `remainingRoomBalance = roomPrice(3000)+gstTax(100)-advance(1500)-receive(0) = 1600`; same effectiveTotal=1848 | PmsCheckoutDrawer.jsx:274-284 |
| H2c | Fix: zero `remainingRoomBalance` in OrderEntry/Drawer (no CPP change) causes Room section display regression | Code trace: CPP Room section L1807-1856 | 4 | **CONFIRMED** — Room section is VISIBLE in dashboard (no `.frontdesk-bill` wrapper = frontdesk.css hide rules DON'T apply). Setting `remainingRoomBalance=0` → Room section shows Balance=₹0 while breakdown (roomPrice+gstTax-advance) = ₹1,600 → contradiction | CPP:1822, frontdesk.css:27 |
| H2d | BUG-526 folio fix doesn't have display regression because Room section is CSS-hidden | Code trace: frontdesk.css `.frontdesk-bill` rule | 5 | **CONFIRMED** — `frontdesk.css:27`: `.frontdesk-bill [data-testid="checkout-room-booking-toggle"] { display:none }` — hides Room section inside FolioCheckoutPanel. Dashboard CPP has NO `.frontdesk-bill` wrapper → Room section IS visible → zeroing approach breaks display | frontdesk.css:24-26 |
| H2e | backend `payment_amount` safe when `roomBalance=0` in dashboard context | Code trace: orderTransform `fbOnlyTotal = finalTotal - roomBalance` | 6 | **CONFIRMED** — `fbOnlyTotal = Math.max(0, effectiveTotal(1848) - roomBalance(1600)) = 248` (current) vs `= Math.max(0, effectiveTotal(248) - 0) = 248` (roomBalance=0). Same `payment_amount=248`. `paid_room='yes'` unaffected (set from `table.isRoom=true`). | orderTransform.js:1507, 1635, 1717 |

---

## 3. Data Flow Trace

### Issue 1 — Why room discount is invisible in dashboard

```
FolioCheckoutPanel:
  const [roomDiscount, setRoomDiscount] = useState(0);  // L213 — LOCAL STATE ONLY
  roomDiscountInfoRs = useMemo(...)  // L262 — computed from local state
  // NOT sent to backend until handlePaid (checkout)
  → backend stores discount only after folio checkout is executed

InHouse list API → charge.balance_due = ₹1,827
  (= raw room balance ₹600 + food ₹227 — pre-discount)
  → displayed in dashboard tile ✓ (correct for dashboard, pre-discount)

OrderEntry → orderData?.roomInfo.roomPaymentSummary.remainingRoomBalance = ₹1,600
  (from API: remaining_room_balance, pre-discount)
  → CPP Room section Balance = ₹1,600 ✓

BREAK POINT: discount is a folio UI concept; dashboard sees only API state
OWNER DECISION: Room discount UI stays in FolioCheckoutPanel only (no dashboard controls)
```

### Issue 2 — Dashboard CPP split disabled

```
USER PATH (from screenshots): OrderEntry → click Checkout → CPP opens
                              OR: Dashboard Room tile → "C/Out" → PmsCheckoutDrawer → CPP

OrderEntry.jsx:1872:
  roomInfo={orderData?.roomInfo || null}   ← raw, no remainingRoomBalance override
      ↓
CPP:200:
  roomBalance = roomInfo.roomPaymentSummary.remainingRoomBalance = 1600
      ↓
CPP:731-734:
  effectiveTotal = finalTotal(248) + roomBalance(1600) = 1848
      ↓
CPP:2937 "Remaining" display:
  finalTotal(248) - splitTotal(200+48) = 0  → "Remaining: ₹0.00" ← MISLEADING
      ↓
CPP:3311 disabled check:
  splitTotal(248) < effectiveTotal(1848) → TRUE → button GRAY ← BREAK POINT

ALSO: PmsCheckoutDrawer:274-284:
  remainingRoomBalance = 3000+100-1500-0 = 1600  (BUG-425 override formula)
  → same effectiveTotal=1848 → same issue
```

### Why BUG-526 fix cannot be directly reused here

```
BUG-526 fix (FolioCheckoutPanel):
  balance_due = 0  ← when room split legs cover room exactly
  → CPP roomBalance = 0
  → effectiveTotal = food only
  → Room section HIDDEN by frontdesk.css ('.frontdesk-bill' class wrapper)
  → No display regression ✓

Dashboard fix attempt (same approach):
  remainingRoomBalance = 0 (in OrderEntry or PmsCheckoutDrawer)
  → CPP roomBalance = 0
  → effectiveTotal = food only ✓ (split enabled)
  → Room section NOT hidden (no '.frontdesk-bill' wrapper in OrderEntry/PmsCheckoutDrawer)
  → Room section shows Balance = ₹0 while breakdown = 3000+100-1500 = ₹1,600 ← CONTRADICTION ✗
```

---

## 4. Evidence Artifacts

- `OrderEntry.jsx:1872` — raw roomInfo passed to CPP (no override)
- `PmsCheckoutDrawer.jsx:274-284` — BUG-425 formula override, `remainingRoomBalance` computed from roomPrice/gstTax/advance
- `CPP:200` — `roomBalance = remainingRoomBalance`
- `CPP:1807-1856` — Room section uses `roomBalance` for both toggle and Balance line; NO `{roomBalance>0 &&}` guard
- `frontdesk.css:24-26` — Room section hidden ONLY inside `.frontdesk-bill`; NOT applied in dashboard context
- `orderTransform.js:1507+1717` — `fbOnlyTotal = finalTotal-roomBalance` (same 248 either way); `paid_room='yes'` from `table.isRoom`

---

## 5. Fix Paths for Issue 2

### Fix Path A — CPP gets new `displayRoomBalance` field (minimal R5 change)
Add a separate field to `roomInfo.roomPaymentSummary` (e.g., `displayRoomBalance`):
- CPP's `roomBalance` memo reads `displayRoomBalance ?? remainingRoomBalance ?? balancePayment`  ← for display
- New `validationRoomBalance = 0` separate field ← for effectiveTotal only

Then from OrderEntry/PmsCheckoutDrawer: pass `displayRoomBalance = actual balance`, `remainingRoomBalance = 0`.

- Files: CPP (R5, ~3 lines) + OrderEntry (~3 lines) + PmsCheckoutDrawer (~2 lines)
- Risk: HIGH (R5 + financial)
- Display: Room section shows correct balance ₹1,600 ✓; button enabled ✓
- Backend: payment_amount unchanged ✓

### Fix Path B — Zero `remainingRoomBalance` from caller + accept Room section ₹0
In OrderEntry and PmsCheckoutDrawer: set `remainingRoomBalance: 0`.

- Files: OrderEntry (~2 lines) + PmsCheckoutDrawer (~1 line)
- Risk: MEDIUM (no R5; financial adjacency)
- Display: Room section shows Balance ₹0 (breakdown still shows ₹1,600) ← owner must accept
- Backend: payment_amount unchanged ✓
- Owner decision: OD-NEW-01 — acceptable UX or not?

### Fix Path C — Add `{roomBalance > 0 &&}` guard to CPP Room section + zero callers
- CPP Room section (L1807): `{isRoom && roomInfo && roomBalance > 0 && (` → hides entire Room section when roomBalance=0
- Then callers (OrderEntry + PmsCheckoutDrawer) can safely zero `remainingRoomBalance`
- Files: CPP (R5, 1 line) + OrderEntry (~2 lines) + PmsCheckoutDrawer (~1 line)
- Risk: HIGH (R5 minimal)
- Display: Room section hidden when roomBalance=0 (similar to frontdesk.css hiding it in folio) ✓
- Backend: unchanged ✓
- **Recommended: Cleanest approach without new props**

---

## 6. Recommendations

### Issue 1 — Design Clarification
**Action: Document as DESIGN DECISION, no code change.**
- Room discount input controls stay in FolioCheckoutPanel only (per owner)
- Dashboard tile and OrderEntry CPP will always show pre-discount room balance from API
- Register OD-INV-DASH-01: "Room discount display is folio-only by design" in registry notes

### Issue 2 — Dashboard CPP Split Gray (NEW BUG — register as BUG-527)
**Classification:** INTERACTION_BUG
**Recommended fix:** Fix Path C (minimal CPP change + callers)
- CPP (R5): Add `roomBalance > 0` guard to Room section render (1 line)
- OrderEntry.jsx: Override `remainingRoomBalance: 0` for room orders (2 lines)
- PmsCheckoutDrawer.jsx: Override `remainingRoomBalance: 0` (1 line)
- Total: 3 files, ~4 lines, R5 involved → full gate cycle required

**Planning skip:** NOT eligible (R5 + financial checkout)

**Owner decisions needed:**
- OD-BUG527-01: Accept Fix Path C (minimal CPP + callers) vs Fix Path A (new CPP field) vs Fix Path B (no CPP, display regression)?
- OD-BUG527-02: When `remainingRoomBalance=0` from dashboard, should the Room section (`checkout-room-booking-toggle`) be fully hidden OR show with Balance=₹0?
  - Recommended: HIDE (same treatment as frontdesk.css hiding it in folio) → Fix Path C

---

## 7. Retroactive Candidates

NONE

---

## Handover

```
Issue 1: DESIGN_CLARIFICATION — room discount stays folio-only, no fix needed.
  Dashboard shows raw API balance (pre-discount) by design.

Issue 2: INTERACTION_BUG — root cause = OrderEntry.jsx:1872 passes raw roomInfo →
  CPP roomBalance=1600 → effectiveTotal=1848 → split (food-only=248) disabled.
  Cannot reuse BUG-526 fix (no frontdesk.css hiding → Room section ₹0 conflict).
  Recommended fix: Fix Path C — CPP Room section guard + zero remainingRoomBalance from callers.
  3 files, ~4 lines, R5 minimal touch → full gate cycle.
  Owner decisions needed: OD-BUG527-01/02.

New bug to register: BUG-527 (dashboard CPP split gray).
Report: /app/memory/BUG-527_INVESTIGATION_REPORT_2026-10-09.md
Steps: 6/10. Confidence: HIGH.
```
