# SESSION HANDOVER — 2026-10-05 — INTAKE + INVESTIGATION SESSION

**Date:** 2026-10-05
**Role sequence this session:** DEPLOYMENT → INVESTIGATION → INTAKE
**Session result:** 4 items registered (CR-407, BUG-485, BUG-486, BUG-487)

---

## 1. What was done this session

### Deployment (Phase 1)
- Cloned `5oct` branch from `https://github.com/Abhi-mygenie/core-pos-front-end-.git`
- Synced `/app/memory/` from remote repo
- Installed deps with `yarn install --ignore-engines`; cleared webpack cache; app running on port 3000
- All env vars from problem statement written to `/app/frontend/.env`

### Investigation — Room Discount (handover_5.md)
Full investigation completed. Report: `investigations/INV_ROOM_DISCOUNT_CHECKIN_CHECKOUT_PARTIAL_2026_10_05.md` (v2 — corrected)

**Confirmed existing (no FE work needed):**
- `ORDER_SHIFTED_ROOM` already V1 in constants.js ✅
- `transferToRoom` builder already V1 contract ✅
- `paid_room: 'yes'` already sent ✅
- F&B-only amounts (BUG-484) already done ✅
- Checkout `room_discount + apply_to='room' + Amount` already done (CR-405-A in FolioCheckoutPanel) ✅
- Backend validation live (422s for invalid apply_to combos) ✅
- All new keys additive (HTTP 200 confirmed with full payload + new keys) ✅
- `get-single-order-new` now returns all `room_discount_*` fields ✅ (backend updated)

**Gaps remaining → CR-407 + BUG-487**

### Investigation — Dashboard download + Sales payment labels
Report: `investigations/INV_DASHBOARD_DOWNLOAD_PAYMENT_LABELS_2026_10_05.md`
- BUG-485: DashboardMockup PDF/Excel buttons have no onClick (never wired)
- BUG-486: insights-sales API returns `method: "Other"` for TAB/channel payments; backend-blocked
- Backend brief filed: `backend_briefs/BACKEND_BRIEF_BUG486_PAYMENT_OTHER_LABELS_2026_10_05.md`

---

## 2. Items registered this session

| ID | Type | Title | Severity | Risk | Status |
|----|------|-------|----------|------|--------|
| CR-407 | CR | Room Discount — check-in + checkout apply_to + Percent + partial_payments_room | P1 | CRITICAL | GATE_1_INTAKE |
| BUG-485 | BUG | Dashboard download buttons do nothing (no onClick) | P2 | MEDIUM | GATE_1_INTAKE |
| BUG-486 | BUG | Sales Excel payment method "Other" instead of Dine-In/District | P2 | MEDIUM | GATE_1_INTAKE_BACKEND_BLOCKED |
| BUG-487 | BUG | orderTransform reads `discount_amount` (wrong key) → roomInfo.discountAmount always ₹0 | P2 | HIGH | GATE_1_INTAKE |

**Registry:** 770 items total (was 766)

---

## 3. Current open questions

| ID | OD | Question |
|----|----|----|
| CR-407 | OD-407-01 | Check-in discount: ₹ Amount only or also % toggle? |
| CR-407 | OD-407-02 | `apply_to='both'`: single total FE splits, or separate food ₹ + room ₹ inputs? |
| CR-407 | OD-407-03 | `partial_payments_room`: additional to F&B partial_payments or replaces single room leg? |
| BUG-486 | OD-486-01 | Dine-In TAB / District as separate rows or sub-rows under TAB parent? |
| BUG-486 | OD-486-02 | Backend expand payments[] OR FE uses tab_settlements[]? |

---

## 4. Priority order for next agent

1. **BUG-487** (1 file, R5, HIGH risk, unblocked) — fast win; fixes room discount display across RoomRowCard/RoomOrdersReport
2. **BUG-485** (1 file, MEDIUM risk, unblocked) — dashboard download buttons
3. **CR-407** (CRITICAL, 3 files, owner ODs needed) — await owner answers to OD-407-01/02/03 before Gate 2
4. **BUG-486** (MEDIUM, backend-blocked) — await backend brief response

---

## 5. Files of note

- Investigation docs: `investigations/INV_ROOM_DISCOUNT_CHECKIN_CHECKOUT_PARTIAL_2026_10_05.md`, `investigations/INV_DASHBOARD_DOWNLOAD_PAYMENT_LABELS_2026_10_05.md`
- Intake docs: `change_requests/CR-407_*`, `change_requests/BUG-485_*`, `change_requests/BUG-486_*`, `change_requests/BUG-487_*`
- Backend briefs: `backend_briefs/BACKEND_BRIEF_BUG486_PAYMENT_OTHER_LABELS_2026_10_05.md`
- Deployment record: `memory/PRD_DEPLOYMENT_RECORD_2026-10-05.md`

---

## 6. Credentials
- Test login: `owner@thegoankitchen.com` / `Qplazm@10` (preprod.mygenie.online, RID 69)
- App URL: `https://pos-frontend-5oct.preview.emergentagent.com`
- All env vars in `/app/frontend/.env`
