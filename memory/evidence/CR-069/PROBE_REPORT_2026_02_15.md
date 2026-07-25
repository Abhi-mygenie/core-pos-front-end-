# CR-069 — Endpoint Probe Report (attempt 1)

**Date:** 2026-02-15
**Purpose:** Curl-probe the 9 Employee/Role management endpoints owner shared. Per Rule R11.
**Bearer token used:** owner-provided (masked as `***` per Rule R20 secret hygiene)

---

## Probe Results

| # | Method | Endpoint | Result | Body |
|---|---|---|---|---|
| 1 | GET | `/api/v2/vendoremployee/employee/employees-list` | **HTTP 401** | `{"errors":[{"code":"auth-001","message":"Unauthorized."}]}` |
| 2 | GET | `/api/v1/vendoremployee/employee/role-list` | **HTTP 401** | same |
| 3 | GET | `/api/v2/vendoremployee/employee/all-role-list` | **HTTP 401** | same |
| 4 | GET | `/api/v1/vendoremployee/employee/role-master-list` | **HTTP 401** | same |

**Conclusion:** All 4 GET probes returned `HTTP 401 auth-001 Unauthorized`. Header pattern was verified against the app's own axios interceptor (`api/axios.js:25` — `Authorization: Bearer ${token}`) and other services already consuming `vendoremployee/*` endpoints (menuManagement, station, delivery, orders — all v1/v2). **The header pattern is correct. The token has expired or is scoped to a different tenant.**

Write endpoints (add/update/status/role-add/role-update) not probed to avoid mutating production data.

---

## What we DO have (from owner-provided curl payloads)

Owner's `role-update` payload example carries **50 module strings** — enough to construct a working Permission Catalog and design the Permission Matrix UI even without the live `all-role-list` response. Full extracted data at:

- `/app/memory/evidence/CR-069/module_catalog_from_owner_payloads.json`

Payload shapes captured:

| Payload | Fields captured | Design impact |
|---|---|---|
| `employees-add` request | `f_name`, `l_name`, `role_id`, `email`, `phone`, `bill_user_view` (Yes/No), `password` | ✅ Full form fields |
| `employees-update` request | Same as add, minus `password` | ✅ Full edit form |
| `employee-status` request | `status` (0 or 1) | ✅ Active/Inactive toggle |
| `role-add` request | `name`, `modules[]`, `role_type[]`, `role_master_id`, `printmodules` (nullable) | ✅ Full role create form |
| `role-update` request | Same + `status` | ✅ Full role edit form |

**Design agent has enough to work with.** GET response shapes are needed for engineering (Gate 3) but not for mockup design.

---

## Rule R9 Alert — Backend Spelling Verbatim

The 50-module catalog contains 4 confirmed typos in permission keys. Per R9, FE MUST use these verbatim:

| Backend key (verbatim) | Correct English |
|---|---|
| `expence` | expense |
| `report_summery` | report_summary |
| `sattle_report` | settle_report |
| `complementary_food` | complimentary_food |

Do not "fix" these in FE code. They are backend-canonical.

---

## Blockers

- **OQ-1a** (new sub-question) — **Fresh bearer token** needed. Options for owner:
  - A) Send a fresh non-expired token
  - B) Send **test credentials** (email + password) — I login via existing `authService.login` and mint a fresh token programmatically (safer; token rotation stays with backend)
  - C) Proceed to design agent with the 50-module catalog we already have from your payloads. Response shapes get validated in Gate 3 pre-implementation.

**Recommended:** **Option C for mockups + Option B before Gate 3.** This unblocks design immediately without waiting on a token round-trip; and login credentials give us reproducible curl-probes for the plan phase.

---

## Next Steps

1. Owner picks A / B / C above.
2. If C (or after fresh token) → I invoke `design_agent_full_stack` with 4 screens + the 50-module catalog grouped as suggested in `module_catalog_from_owner_payloads.json`.
3. Owner reviews mockups → approves → **Gate 3 unlocked**.
4. Before Gate 3 output ships, I re-probe the 4 GET endpoints (with fresh token) and validate response shapes against `employeeTransform.js` design.
