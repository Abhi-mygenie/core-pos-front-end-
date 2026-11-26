# Session Handover — 2026-09-16 (Intake Session Close)

```
Written:         2026-09-16
Session status:  CLOSED — Investigation + Intake complete. 7 bugs registered (BUG-417..423). Batched for Gate 2.
Next agent role: PLANNING (Gate 2 — Impact Analysis) — owner will lock ODs during Gate 2
Workspace:       /app (branch 16sep, frontend-only)
Credentials:     /app/memory/test_credentials.md (goankitchen_owner alias)
Registry:        680 items
```

---

## §0 — Boot Sequence (MANDATORY)
```
1. Read this handover IN FULL
2. Read /app/memory/control/AGENT_PROMPT_ALPHA.md → confirm PLANNING role
3. Read /app/memory/control/CONTROL_DASHBOARD.md
4. Check compile: tail -3 /var/log/supervisor/frontend.out.log → expect "webpack compiled"
```

---

## §1 — What Was Done This Session

### Phase 1 — Deployment
- Cloned branch `16sep`, synced full memory dir, installed deps, app live port 3000

### Phase 2 — Investigation (Role 6)
All 7 issues code-traced. Report: `investigations/INV_ISSUES_A_B_C_D_E_F_G_2026_09_16.md`

### Phase 3 — Intake (Role 1)
7 bugs registered (BUG-417..423). All at Gate 1. Batched for Gate 2.

---

## §2 — Registered Items + Batch Assignments

### BATCH-PMS2-1 — GST Cluster *(CRITICAL — go first)*
Owner locks ODs during Gate 2.

| ID | Title | Risk | Key ODs to lock at Gate 2 |
|---|---|---|---|
| **BUG-422** | Old RoomCheckInModal: `balance_payment` missing GST | CRITICAL | OD-422-01: balance = room+gst−advance? |
| **BUG-423** | Guest Folio: Room Balance excludes GST | CRITICAL | OD-423-01: compute FE-side? OD-423-02: Total = Room+F&B? |
| **BUG-418** | Checkout Drawer: GST not in bill display | CRITICAL | OD-418-01: one line or separate? OD-418-02: button incl. GST? |

**Files:** `RoomCheckInModal.jsx` L363, `GuestFolioPage.jsx` L100, `PmsCheckoutDrawer.jsx`, `CollectPaymentPanel.jsx` (hotspot R5)
**Impl note:** BUG-422 implementation must run AFTER BUG-420 (both touch `RoomCheckInModal.jsx`)

---

### BATCH-PMS2-2 — Check-in UX *(HIGH + LOW)*
Owner locks ODs during Gate 2.

| ID | Title | Risk | Key ODs to lock at Gate 2 |
|---|---|---|---|
| **BUG-420** | Old Modal: Returning guest docs not visible (CR-129 gap) | HIGH | OD-420-01: thumbnail or badge? OD-420-02: upload optional? |
| **BUG-419** | New CheckInPage: Corp/B2B below Name field | LOW | OD-419-01: position confirmed? |

**Files:** `RoomCheckInModal.jsx`, `CheckInPage.jsx`
**Conflict:** BUG-420 shares `RoomCheckInModal.jsx` with BUG-422 → BUG-422 impl first, then BUG-420

---

### BATCH-PMS2-3 — Data Layer *(HIGH, standalone)*
Owner locks ODs during Gate 2.

| ID | Title | Risk | Key ODs to lock at Gate 2 |
|---|---|---|---|
| **BUG-421** | In-House: Balance = booking total, not outstanding | HIGH | OD-421-01: include GST? OD-421-02: extra API call OK? |

**Files:** `pmsService.js` L64

---

### PARKED

| ID | Title | Blocked on |
|---|---|---|
| **BUG-417** | F&B not posting + Advance ₹0 | OD-417-01: food transferred to r4? OD-417-02: advance collected for aoi? |

---

## §3 — Investigation Root Causes (quick ref)

| ID | Root Cause File | Root Cause |
|---|---|---|
| BUG-417 | Backend | `associated_order_list` empty — needs live probe |
| BUG-418 | `PmsCheckoutDrawer.jsx` L158 | `roomGstTax` read but never passed to CollectPaymentPanel display |
| BUG-419 | `CheckInPage.jsx` L731 | Corp/B2B block placed after Occupancy; should be after Name L597 |
| BUG-420 | `RoomCheckInModal.jsx` | CR-129 gap — doc images not rendered for returning guest |
| BUG-421 | `pmsService.js` L64 | `amount_after_tax` = booking total, not remaining balance |
| BUG-422 | `RoomCheckInModal.jsx` L363 | `balancePayment = room − advance` — GST not added (BUG-410 gap) |
| BUG-423 | `GuestFolioPage.jsx` L100 | Trusts stored `balance_payment` (no GST); fix = FE recompute |

---

## §4 — Next Session Agenda

1. **PLANNING Gate 2 — BATCH-PMS2-1** (BUG-422 + BUG-423 + BUG-418) — highest priority
2. **PLANNING Gate 2 — BATCH-PMS2-2** (BUG-420 + BUG-419)
3. **PLANNING Gate 2 — BATCH-PMS2-3** (BUG-421)
4. **Probe + OD answer** — BUG-417 (owner confirms food transfer + advance)
5. **Carry-forward Gate 6 smoke** — BUG-410/411/415/416 from 2026-09-15 session

---

*Handover written 2026-09-16 · Intake session close*
*Next agent: PLANNING (Gate 2) starting with BATCH-PMS2-1*
