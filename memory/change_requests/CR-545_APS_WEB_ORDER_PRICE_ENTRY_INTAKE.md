# CR-545: APS (₹1) Web Order — APS Tag + Item Cancel in Popup + Price Edit in OrderEntry

**ID:** CR-545
**Type:** CR (Feature Gap)
**Area:** Menu / Order Entry
**Priority:** P1
**Risk:** HIGH (order flow, pricing, R5 hotspot files)
**Client:** ALL (any restaurant with APS / market-price / ₹1 items on web ordering)
**Assignee:** Abhishek (FE, Phase 2 backend-blocked)
**Routing reason:** FE feature gap, partially backend-blocked for Phase 2
**Sprint:** —
**Created:** 2026-11-16

---

## Description
When a customer orders an APS (As Per Size) item via QR/web, the item arrives at ₹1 placeholder price. The POS has no mechanism to:
1. Visually identify ₹1 items as APS in the ScanOrderPopOut (confirmation banner)
2. Cancel individual items directly from the banner before accepting
3. Edit the price of a placed ₹1 item after accepting the order

The existing BUG-035 dynamic-price mechanism (Enter Price modal) works ONLY when a cashier taps a menu item in OrderEntry — it never activates for items that arrive pre-placed via web orders.

**CORRECTED (owner directive 2026-11-16):** Accept is NOT gated/disabled when ₹1 items are present. Staff can accept the order at ₹1, then edit the price in OrderEntry afterward. The ₹1 price is temporary — staff corrects it post-accept.

## Expected Behavior
1. ScanOrderPopOut shows "APS" tag on ₹1 items (visual indicator)
2. ScanOrderPopOut has per-item cancel button (X) — staff can remove an APS item before accepting
3. Accept button works normally (NOT blocked by ₹1 items)
4. After accepting → staff opens OrderEntry → can edit price of placed ₹1 items
5. Price edit updates order totals (subtotal, tax, order_amount)

## Two Phases

### Phase 1 (FE-only, ~40 lines):
| Feature | Approach | Files |
|---------|----------|-------|
| APS tag | Badge on ₹1 items in ScanOrderPopOut (mirrors PAID badge) | ScanOrderPopOut.jsx |
| Item-level cancel | New `onCancelItem` prop → DashboardPage opens CancelFoodModal | ScanOrderPopOut.jsx + DashboardPage.jsx |
| Accept works normally | No change needed — accept is NOT gated | — |

**Anti-rule note:** ScanOrderPopOut has 5 strict anti-rules (L22-36) forbidding direct API calls. Item-level cancel stays within the spirit (delegates via props) but requires owner approval to add a new action path.

**Backend dependency (B1):** Need to verify `cancel-food-item` works on YTC (fOS=7) orders.

### Phase 2 (needs backend, ~135 lines):
| Feature | Approach | Files |
|---------|----------|-------|
| Price edit in CartPanel | PlacedItemRow gets price edit mode for ₹1 items (mirrors qty edit pencil) | CartPanel.jsx + OrderEntry.jsx |
| Price edit in ScanOrderPopOut | Inline price input per APS item → update-food-price API → then confirm | ScanOrderPopOut.jsx + DashboardPage.jsx |
| Backend endpoint | New `update-food-price` or extend confirm with `price_overrides` | orderService.js + constants.js |

**Backend brief filed:** `/app/memory/backend_briefs/BACKEND_BRIEF_APS_PRICE_EDIT_2026-11-16.md` (B1-B4)

## Evidence
- Screenshots: owner-provided (ScanOrderPopOut + OrderEntry with ₹1 "melo fish")
- Code evidence: `/app/memory/evidence/INV-APS-WEB-ORDER-2026-11-16/code_evidence.md`
- Phase 1+2 investigation: `/app/memory/investigations/INV-APS-PHASE1-PHASE2-2026-11-16.md`

## Existing Workaround
Edit → Cancel ₹1 item → Re-add from menu (triggers BUG-035 price entry) → Update Order. 4 extra steps per APS item.

## Blast Radius
- Phase 1: 2 files (~40 lines), MEDIUM scope
- Phase 2: 7 files (~135 lines), LARGE scope
- Hotspot files: ScanOrderPopOut.jsx, DashboardPage.jsx (R5), CartPanel.jsx, OrderEntry.jsx (R5)

## Open Questions
1. **B1 (Phase 1 blocker):** Does `cancel-food-item` work on YTC (fOS=7) orders?
2. **B3/B4 (Phase 2 blocker):** New endpoint — `update-food-price` or extend confirm with `price_overrides`?
3. Owner: Approve ScanOrderPopOut anti-rule lift for item-level cancel?

## Duplicate Check
- **BUG-035:** RELATED — BUG-035 is the existing dynamic-price mechanism for menu-added items. CR-545 extends this to web-order items (pre-placed).
- **Verdict:** DISTINCT — BUG-035 is closed/working for its scope. CR-545 is a new feature gap.

---

## Owner Decisions (locked 2026-11-16)

See `change_requests/BATCH_2_OWNER_DECISIONS_2026_11_16.md`

- **OD-545-01:** Phase 1 full IA + Phase 2 outline.
- **OD-545-02:** Cancel via props OK for now. UX improvement deferred.
- **OD-545-03:** Assume cancel-food-item works on scanner orders. Probe before QA.
- **OD-545-04:** Accept NOT gated by ₹1 items (confirmed).
- Next: Impact Analysis (Gate 2).

