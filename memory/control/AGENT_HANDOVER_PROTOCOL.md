# Layer 2 — Agent Handover Protocol

**Status:** POPULATED
**Last Updated:** 2026-05-29

---

## Mandatory First Read (in order)

1. This file (`AGENT_HANDOVER_PROTOCOL.md`)
2. `CONTROL_DASHBOARD.md` — current project state
3. `BASELINE_INDEX.md` — frozen foundation
4. `FILE_OWNERSHIP.md` — what's safe to touch
5. `SPRINT_STATUS.md` — active work
6. `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md` — how to analyze any change
7. `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md` — rules before coding

---

## DO NOT TOUCH

- `/app/memory/final/*` — frozen baseline (owner approval required to modify)
- `/app/memory/crm/crm_1_0/*` — closed CRM 1.0 baseline
- `orderTransform.js` outbound payload contracts — unless explicitly scoped
- `DeliveryCard.jsx` — legacy/unused, owner directive: do not delete or modify
- Supervisor config files — read-only
- `.git` and `.emergent` folders
- **`/app/frontend/public/__dev/` and `/app/scripts/gen_dev_dashboard_config.js`** — internal Dev Dashboard (CLOSED CR DEV-DASHBOARD-001). Safe to update JSON snapshots under `/__dev/data/`; do not edit `dashboard.js` / `styles.css` / `index.html` without opening a v1.2 plan first. Do not delete the folder — it ships to prod but is env-gated.

---

## Current Working State

| Field | Value |
|---|---|
| Branch | `2-jiune-v2` (previous baseline: `30-may`) |
| HEAD commit | `278b256` (was `2853b70` on `30-may`) |
| Preview URL | https://insights-phase.preview.emergentagent.com (was https://insights-phase.preview.emergentagent.com) |
| Package manager | Yarn ONLY (npm breaks things) |
| Start command | `yarn start` → `craco start` |
| Frontend port | 3000 (do not change) |
| Backend port | 8001 (do not change) |

---

## Active Credentials

See [ACCESS_REGISTRY.md](./ACCESS_REGISTRY.md)

---

## Known Landmines

### OrderEntry.jsx (~2493 lines)
- Permission loading: permissions can be `[]` if profile API fails
- `canCustomerManage` was REMOVED (unconditional now) — do not re-add permission gates on customer icon
- `printOrder` callback ESLint warning (L1311) is pre-existing — not your bug
- Walk-in cart key `'walkIn'` does NOT auto-clear on component remount

### CollectPaymentPanel.jsx (~3050 lines)
- `payment_status` is UNRELIABLE from list endpoint (can be `null` even when paid)
- For rooms: trust `fOrderStatus`, not `paymentStatus`
- `'sucess'` (misspelled) is INTENTIONAL for PayLater — see PAY-007

### orderTransform.js (~1916 lines)
- Line ~190: `payment_status || 'unpaid'` default is running-order legacy
- `buildBillPrintPayload` has SEPARATE paths for prepaid vs postpaid auto-print
- Complimentary items: different behavior for catalog-comp vs runtime-marked-comp

### DashboardPage.jsx (~1975 lines)
- `cartsByTable` persistence: walk-in key `'walkIn'` doesn't change on reset
- `handleCollectBillStayOnOrder` must clear cart before remounting

### Backend Quirks
- Laravel returns `Supported methods: ...` on 405 — always curl-probe endpoints first
- `scan-new-order` socket has 2 payload formats (old 4-element, new 6-element) — must be backward compatible
- `delivery_assign` feature flag lives in restaurant profile — never branch on `order_in` or `source`
- `payment_status` is `null` from list endpoint even after settlement — use `fOrderStatus` for rooms

---

## Naming Conventions for New Docs

```
<SPRINT>_<CR_OR_BUG_ID>_<TOPIC>_<TYPE>_<YYYY_MM_DD>.md
```

Example: `POS3_1_BUG_112_PAYMENT_LOCK_IMPLEMENTATION_REPORT_2026_06_01.md`

---

## Approval Gate Checklist (before any code change)

- [ ] **Item registered in registry.json** (Registration Gate — MANDATORY)
- [ ] Request mapped to affected module(s)
- [ ] Checked OPEN_QUESTIONS_FINAL_RESOLUTION.md for unresolved decisions
- [ ] Code inspected (not just docs)
- [ ] Impact analysis documented
- [ ] Regression risk assessed
- [ ] Owner approval obtained (if high-risk or policy change)
- [ ] API endpoints curl-probed before wiring
