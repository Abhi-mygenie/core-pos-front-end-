# SESSION HANDOVER — 2026-10-05 — FULL SESSION (FINAL)

**Date:** 2026-10-05
**Roles used:** DEPLOYMENT → IMPLEMENTATION (BUG-485) → BUG FIX (BUG-488) → IMPLEMENTATION (BUG-487) → IMPLEMENTATION (CR-407) → INTAKE + PLANNING + IMPLEMENTATION (BUG-489) → INTAKE (BUG-490) → INVESTIGATION (4-issue batch) → INTAKE (BUG-491)
**App URL:** https://core-pos-deploy-32.preview.emergentagent.com
**Branch deployed:** `5oct-1` from `https://github.com/Abhi-mygenie/core-pos-front-end-.git`
**Registry:** 774 items (was 771 at session start)

---

## 1. MANDATORY READING FOR NEXT AGENT

Read these before anything else:

1. `memory/control/AGENT_PROMPT_ALPHA.md` — role selection, gate rules
2. This handover (current file) — full session state
3. `memory/control/CONTROL_DASHBOARD.md` — live sprint state

---

## 2. DEPLOYMENT STATE

- `5oct-1` branch deployed, running on port 3000 ✅
- All env vars in `/app/frontend/.env` (Firebase, API base, Socket, CRM, Maps, WDS_SOCKET_PORT)
- `REACT_APP_CRM_API_KEYS` entry `"509"` still placeholder — owner to supply if needed
- `yarn install --ignore-engines` succeeded; webpack compiles with 1 warning (pre-existing lint only)
- Supervisor: frontend RUNNING, backend RUNNING, mongodb RUNNING

---

## 3. ITEMS COMPLETED THIS SESSION (GATE_5A_IMPLEMENTED)

| ID | Type | Title | Risk | Files | QA Handover |
|----|------|-------|------|-------|-------------|
| **BUG-485** | BUG | Dashboard PDF/Excel buttons had no onClick | MEDIUM | `DashboardMockup.jsx` | `handover/QA_HANDOVER_BUG485_2026_10_05.md` |
| **BUG-488** | BUG | "To Room" always sent `source_order_id:""` | HIGH | `tableTransform.js` | *(fast lane — no formal QA doc)* |
| **BUG-487** | BUG | orderTransform + roomOrdersService read wrong key `discount_amount` | HIGH | `orderTransform.js` · `roomOrdersService.js` | `handover/QA_HANDOVER_BUG487_2026_10_05.md` |
| **CR-407** | CR | Room discount — check-in + checkout apply_to + Percent + partial_payments_room | CRITICAL | `CheckInPage.jsx` · `pmsService.js` · `FolioCheckoutPanel.jsx` | *(owner smoke required)* |
| **BUG-489** | BUG | CR-407 check-in discount missing on front-desk-v2 (mirror rule) | MEDIUM | `CheckInForm.jsx` · `frontDeskService.js` | `handover/QA_HANDOVER_BUG489_2026_10_05.md` |

---

## 4. ITEMS REGISTERED THIS SESSION — AWAITING ACTION

| ID | Type | Title | Severity | Risk | Gate | Status | Open ODs |
|----|------|-------|----------|------|------|--------|---------|
| **BUG-490** | BUG | Discount cap missing — can exceed balance due | P1 | MEDIUM | 1 | GATE_1_INTAKE | none |
| **BUG-491** | BUG | In-House balance + discount display batch (4 sub-issues) | P1 | HIGH | 1 | GATE_1_INTAKE | **none — all locked** |

---

## 5. BUG-490 — READY FOR GATE 2 → GATE 3 → IMPLEMENTATION

**Intake doc:** `change_requests/BUG-490_DISCOUNT_CAP_EXCEEDS_BALANCE_DUE_INTAKE.md`

**Root cause:** Discount input has no cap against `balance_due` in all 3 components.
- `CheckInForm.jsx`: `max={undefined}` — Amount mode has zero cap
- `CheckInPage.jsx`: `max={form?.orderAmount}` — capped at booking_charge, still exceeds balance_due when advance > 0
- `FolioCheckoutPanel.jsx`: `max={undefined}` — no cap
- All three: `roomDiscountRs` not capped at `balance_due` in Percent mode

**Fix sketch (per file):**
- Amount input: `max={ciRoomDiscountType === 'Percent' ? 100 : balanceDue}`
- useMemo: `Math.min(result, balanceDue)`
- FolioCheckoutPanel onChange: `Math.min(value, c.balance_due)`

**No owner decisions needed. Gate 2 GO immediately.**

---

## 6. BUG-491 — READY FOR GATE 2 → GATE 3 → IMPLEMENTATION

**Intake doc:** `change_requests/BUG-491_INHOUSE_BALANCE_DISCOUNT_DISPLAY_BATCH_INTAKE.md`
**Probe evidence:** `evidence/BUG-491/get_single_order_room_info_1232970.json`
**All ODs locked.** Gate 2 GO immediately.

### Sub-A — pmsService.js balance formula (Issues 1 + 3 combined)
**File:** `api/services/pmsService.js` lines 104–108

**Probe confirmed (order 1232970, parth r1 suite, RID 69):**
```json
room_info: {
  "room_price": "6700.00",
  "advance_payment": "1355.00",
  "balance_payment": "2665.00",   ← backend pre-computes: 6700 − 2680 − 1355 (discount applied, no GST)
  "room_discount_amount": "2680.00",
  "gst_tax": ABSENT               ← not in room_info response
}
```

**Current formula (wrong):**
```javascript
const roomBalance = Math.max(0, rp + gt - ap - rb);
// = 6700 + 0(gst absent) - 1355 - 0 = 5,345  ← discount ignored, GST missing
```

**Fix:**
```javascript
const bp = ri.balance_payment != null ? Number(ri.balance_payment) : null;
const chargeGst = Number(row.charge?.sgst ?? 0) + Number(row.charge?.cgst ?? 0);
const roomBalance = bp != null
  ? Math.max(0, bp + chargeGst)       // 2665 + 335 = 3,000 ✅
  : Math.max(0, rp + gt - ap - rb - Number(ri.room_discount_amount ?? 0)); // fallback
```

**Note for implementation agent:** Verify `row.charge` is accessible inside Step 3 of `getInHouseGuests`. If `row.charge` is null/undefined at that point, use `row.charge?.sgst ?? 0` safely (defaults to 0 = safe fallback).

### Sub-B — Static balance_due display (CheckInForm + FolioCheckoutPanel)
- `CheckInForm.jsx:163`: `{fmtINR(c.balance_due)}` → `{fmtINR(Math.max(0, Number(c.balance_due||0) - roomDiscountRs))}`
- `FolioCheckoutPanel.jsx:137`: `<Line label="Room balance" value={fmtINR(c.balance_due)} />` → subtract `roomDiscountRs` (requires Sub-C useMemo first)

### Sub-C — FolioCheckoutPanel Percent badge shows raw number
**File:** `FolioCheckoutPanel.jsx` — no `roomDiscountRs` useMemo exists

**Add useMemo (after existing state declarations):**
```javascript
// BUG-491 Sub-C: compute discount in ₹ for badge + balance display
const roomDiscountRs = useMemo(() => {
  if (!roomDiscount || roomApplyTo === 'food') return 0;
  const balanceDue = Number(c.balance_due || 0);
  if (roomDiscountType === 'Percent') {
    return Math.min(Math.floor(balanceDue * roomDiscount / 100), balanceDue);
  }
  return Math.min(Math.floor(roomDiscount), balanceDue);
}, [roomDiscount, roomDiscountType, roomApplyTo, c.balance_due]);
```

**Badge fix (line 57):**
```jsx
// Current: {fmtINR(roomApplyTo === 'room' || roomApplyTo === 'both' ? roomDiscount : 0)}
// Fixed:   {fmtINR(roomApplyTo === 'room' || roomApplyTo === 'both' ? roomDiscountRs : 0)}
```

**Note:** Sub-C useMemo must be done BEFORE Sub-B (Sub-B uses `roomDiscountRs` from Sub-C).

### Sub-D — CollectPaymentPanel info line (OD-491-D-01 = Option B LOCKED)
**OD-491-D-01 LOCKED:** Add "Room discount applied: −₹X" info line in right panel. Checkout total stays ₹5,680 (balance_due incl. GST) — server applies discount via `room_discount` payload on submit.

**File:** `FolioCheckoutPanel.jsx` — inside `return` near CollectPaymentPanel, add a visible note when `roomDiscountRs > 0`.

**Why ₹5,680:** = Total incl. GST (₹7,035) − Already paid (₹1,355) = ₹5,680 ✅ correct.

---

## 7. IMPLEMENTATION ORDER FOR BUG-491

Execute in this sequence inside FolioCheckoutPanel.jsx (dependencies):
1. **Sub-C first** — add `roomDiscountRs` useMemo (other subs depend on it)
2. **Sub-B** — use `roomDiscountRs` in balance_due display
3. **Sub-D** — add info note using `roomDiscountRs`
4. **Sub-A** — separate file (pmsService.js), independent

---

## 8. QA GATE 5b — PENDING FOR ALL IMPLEMENTED ITEMS

Next agent should run QA on these after BUG-490 + BUG-491 are implemented:

| ID | QA Handover / Notes |
|----|---------------------|
| BUG-485 | `handover/QA_HANDOVER_BUG485_2026_10_05.md` — TC-1..TC-6 |
| BUG-487 | `handover/QA_HANDOVER_BUG487_2026_10_05.md` — TC-1..TC-5 |
| BUG-488 | No formal QA doc — verify To Room transfer works end-to-end |
| BUG-489 | `handover/QA_HANDOVER_BUG489_2026_10_05.md` — TC-1..TC-7 |
| CR-407 | Owner smoke: `/pms/check-in` + FolioCheckoutPanel |
| BUG-490 | New QA needed after implementation |
| BUG-491 | New QA needed after implementation |

---

## 9. WHAT THE NEXT AGENT SHOULD DO (PRIORITY ORDER)

1. **BUG-491 + BUG-490** — PLANNING role: Gate 2 → Gate 3 (can be done in one session, both at Gate 1, all ODs locked)
   - Suggest doing BUG-491 Gate 2+3 first (more complex, 3 files), then BUG-490 Gate 2+3
2. **Gate 4 GO** — owner approves both plans
3. **IMPLEMENTATION** — BUG-491 + BUG-490 in same session (related files, overlapping)
4. **QA Gate 5b** — batch QA all sprint items: BUG-485, BUG-487, BUG-488, BUG-489, CR-407, BUG-490, BUG-491
5. **BUG-486** — still BACKEND_BLOCKED, no FE action

**Do not start CR-390** — still at Gate 3 OPEN / OWNER REVIEW, no Gate 4 GO given.

---

## 10. UNCHANGED FROM PREVIOUS SESSION

- **CR-390** — Gate 3 OPEN / OWNER REVIEW. No Gate 4 GO. Entry: `handover/SESSION_HANDOVER_2026_09_28_CR390_OPTION3B_ACCEPTED_PRESENTATION.md`
- **BUG-486** — BACKEND_BLOCKED. Brief: `backend_briefs/BACKEND_BRIEF_BUG486_PAYMENT_OTHER_LABELS_2026_10_05.md`
- All other registry items unchanged

---

## 11. CREDENTIALS + ENVIRONMENT

| Item | Value |
|------|-------|
| App URL (preview) | `https://core-pos-deploy-32.preview.emergentagent.com` |
| Preprod API | `https://preprod.mygenie.online` |
| Login endpoint | `POST /api/v1/auth/vendoremployee/common-login` |
| Test login | `owner@thegoankitchen.com` / `Qplazm@10` |
| Test restaurant | RID 69 (The Goan Kitchen) |
| Probe order (in-house) | `order_id: 1232970` (parth, room r1 suite, checked in 5 Oct) |
| Branch | `5oct-1` |
| Env file | `/app/frontend/.env` — all vars written |

---

## 12. ARTIFACTS CREATED THIS SESSION

| Type | Path |
|------|------|
| QA Handover | `handover/QA_HANDOVER_BUG485_2026_10_05.md` |
| QA Handover | `handover/QA_HANDOVER_BUG487_2026_10_05.md` |
| QA Handover | `handover/QA_HANDOVER_BUG489_2026_10_05.md` |
| Intake | `change_requests/BUG-489_CHECKINFORM_FRONTDESKSERVICE_DISCOUNT_MIRROR_INTAKE.md` |
| Impact Analysis | `impact/BUG-489_IMPACT_ANALYSIS.md` |
| Plan | `plans/BUG-489_IMPLEMENTATION_PLAN.md` |
| Intake | `change_requests/BUG-490_DISCOUNT_CAP_EXCEEDS_BALANCE_DUE_INTAKE.md` |
| Intake | `change_requests/BUG-491_INHOUSE_BALANCE_DISCOUNT_DISPLAY_BATCH_INTAKE.md` |
| Probe evidence | `evidence/BUG-491/get_single_order_room_info_1232970.json` |
| Session Handover | `handover/SESSION_HANDOVER_2026_10_05_FULL.md` (this file) |
