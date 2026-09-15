# Session Handover — 2026-09-14 (CR-364 Intake Close)

```
Session date:     2026-09-14
Status at close:  CR-364 INTAKE FULLY CLOSED — all 5 ODs resolved — Gate 2 UNBLOCKED
Next agent role:  PLANNING (Gate 2 — Impact Analysis)
Workspace:        /app
```

---

## 1. What Was Done This Session

**Role:** INTAKE (continuation from 2026-09-16 session)
**Item:** CR-364 — PMS Guest Folio Detail Page
**Scope:** Frozen remaining ODs (03/04/05) — intake now fully closed

### Owner Decisions Frozen Today

| OD | Decision | Impact |
|---|---|---|
| **OD-364-03** | **RE-POINT** — existing "View Bill" / "Folio" / Departures links re-pointed to `/pms/folio/:orderId` | Touches 3 files: `InHouseGuestsPage.jsx`, `DeparturesPage.jsx`, `ReservationsPage.jsx` popover |
| **OD-364-04** | **DRILL-DOWN** — one row per food order with total; tap → `OrderDetailSheet` for item detail | Cleaner folio; no inline item explosion |
| **OD-364-05** | **NO FE-SIDE LIMIT** — show whatever the backend returns; no artificial date filter in FE | Backend controls the access window naturally |

### All 5 ODs now frozen (complete record)

| OD | Decision | Date |
|---|---|---|
| OD-364-01 | v1 totals only — dated payment history (B-364-01) optional post-v1 | 2026-09-16 |
| OD-364-02 | PMS-specific folio layout via `rtype='RM'` template branch; R6 owner sign-off required before template goes live | 2026-09-16 |
| OD-364-03 | Re-point existing links | 2026-09-14 |
| OD-364-04 | Drill-down (order-level row + OrderDetailSheet) | 2026-09-14 |
| OD-364-05 | No FE-side date limit | 2026-09-14 |

---

## 2. Docs Updated

| File | Change |
|---|---|
| `change_requests/CR-364_PMS_GUEST_FOLIO_DETAIL_PAGE_INTAKE.md` | OD-03/04/05 decisions frozen; gate status → FULLY CLOSED; footer updated |
| `control/registry.json` | CR-364 status updated; status_history entry added for 2026-09-14 |
| `control/CR_REGISTRY.md` | CR-364 row updated to Gate 2, INTAKE FULLY CLOSED |

**No application source code changed.**

---

## 3. Next Agent: PLANNING (Gate 2 — Impact Analysis)

Read the intake doc at `change_requests/CR-364_PMS_GUEST_FOLIO_DETAIL_PAGE_INTAKE.md` and produce a Gate 2 Impact Analysis.

**Key scope decisions to carry into planning:**

- **New files:** `pages/pms/GuestFolioPage.jsx` (new page), `api/transforms/folioTransform.js` (new transform)
- **Modified files:** `api/services/pmsService.js` (+`getGuestFolio`), `App.js` (+route), `InHouseGuestsPage.jsx`, `DeparturesPage.jsx`, `ReservationsPage.jsx` (link re-points)
- **Files NOT to touch:** `CollectPaymentPanel.jsx`, `PmsCheckoutDrawer.jsx`, `orderTransform.js`, `roomService.js`, printing templates
- **Money rule (R6):** No FE-side financial computation — display `balance_payment` directly from backend
- **F&B display:** Order-level rows only (drill-down), not inline items
- **Link re-point:** 3 files need their View Bill / Folio links updated (OD-03)
- **Folio access:** No FE date filter (OD-05)
- **Print folio:** PMS-specific layout via `rtype='RM'` — requires R6 owner sign-off before going live (OD-02)
- **Backend still pending:** Q-364P-01..15 in `backend_briefs/BACKEND_BRIEF_CR364_FOLIO_PRINT_2026_09_16.md` — print layout work gated on backend answers, but page + data fetch + actions can proceed independently

**Do-Not-Retry (carry forward):**
1. Do NOT recompute `balance_payment` in FE — use backend figure directly (R6)
2. Do NOT use `doc.created_at` — use `doc.uploaded_at`
3. `get-single-order-new` does NOT return `customer_id` (endpoint gap, not storage gap)
4. Static `.env` CRM keys REVOKED — use `crm_token` from login
5. Do NOT implement folio print template FE-side — template is a backend change (R6, R6 sign-off required)

---

## 4. Governing Constraints

- Alpha v0.7. Read `/app/memory/control/AGENT_PROMPT_ALPHA.md` before role selection.
- No environment check needed for PLANNING role.
- `test_credentials.md` — do not modify unless auth credentials change.

---

*Handover written: 2026-09-14. CR-364 intake fully closed. Next: PLANNING Gate 2 Impact Analysis.*
