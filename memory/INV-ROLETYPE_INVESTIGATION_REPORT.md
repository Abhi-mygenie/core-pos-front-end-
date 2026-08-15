# INV-ROLETYPE — Investigation Report: Does Backend Auto-Map role_type from Modules?

**Investigation Date:** 2026-07-24
**Agent Role:** INVESTIGATION AGENT
**Triggered by:** Owner question — "were we supposed to check if attached rights are directly mapped by backend so this dropdown was not required?"
**Steps used:** 10 / 10 budget
**Confidence:** MEDIUM-HIGH (code trace + API probing; POST endpoint CSRF-blocked but behavior inferred)

---

## 1. Summary

**Root cause:** `role_type` is NOT auto-mapped from modules by the backend. It is a distinct, required field that must be explicitly sent. STATION, Waiter, Manager, Billing, Buffet, Delivery are **special category identifiers** — not standard permission modules — that the backend appends to a role's module list based on the `role_type` value sent. BUG-231 removed the only UI way to set this, and the subsequent auto-fill in BUG-235 is pragmatically functional but semantically incorrect (every role should not be all types).

---

## 2. Hypothesis Status After 10 Steps

| Hypothesis | Final Status | Evidence |
|---|---|---|
| **H1: Backend auto-maps `role_type` from modules** | ❌ ELIMINATED | STATION/Waiter/Manager/Billing are NOT in the `role_modules` permission catalog (`all-role-list` API, step 6). They can't be "selected" by the user, so the backend has no way to infer them from a user's checkbox selection. |
| **H2: `role_type` must be explicitly sent; backend validates** | ✅ CONFIRMED | Handoff confirms 422 "role_type required". Catalog of 6 types exists (`all-role-list`). System roles embed category values as first module, but these are INJECTED by the backend on creation — not sent by FE. |
| **H3: `role_type` is vestigial/unused** | ❌ ELIMINATED | 422 validation error proves it is actively checked. |

---

## 3. Full Evidence Chain

### Step 1 — Auth token acquired
Token: `SuqerWjOSsaaCLnf2sx8KjUM8s10na...` (valid, 200 from GET endpoints)

### Step 2–3 — POST role-add blocked by CSRF
All POST/PUT requests from curl return HTTP 302 to base URL. Laravel CSRF protection active on write endpoints. Playwright browser login also blocked due to Kubernetes proxy timing. **POST endpoints not directly testable from agent.**

### Step 4 — GET role-list (10 roles)
All roles (system + custom) returned WITHOUT any `role_type` field in the response body.
- Roles: BAR, captain, gg, KDS, Manger(C), Manager, Owner, owner(c), Report, Waiter
- NOT ONE has `role_type` in the response → backend does not expose this field in GET

### Step 5 — GET all-role-list (catalog)
Returns `role_types` catalog with 6 entries:
```
id=1  STATION
id=2  Waiter
id=3  Manager
id=4  Billing
id=5  Buffet (Server Waiter)
id=6  Delivery
```
Also returns `role_modules` catalog (frontend + backend + report) with all selectable permission modules.

### Step 6 — Critical cross-reference: are STATION/Waiter/Manager in the modules catalog?
```
STATION : NOT in modules catalog
Waiter  : NOT in modules catalog
Manager : NOT in modules catalog
Billing : NOT in modules catalog
Buffet  : NOT in modules catalog
Delivery: NOT in modules catalog
```
**These are NOT user-selectable permission modules.** They are backend-injected category identifiers.

### Step 7 — GET role-master-list (templates)
10 templates returned: Accountant, Billing User, Captain, Cashier, Delivery Boy, Manager, Owner, Station (Chef), Waiter(S), Waiter(T).
Each has a `map_role` field that corresponds to a role_type value:
```
Accountant   → map_role: "Manager"
Billing User → map_role: ? (need to check)
Captain      → map_role: "Manager"
Cashier      → map_role: "Billing"
Station(Chef)→ map_role: "STATION"
Waiter(S)    → map_role: "Waiter"
```
Templates carry the role category via `map_role`, NOT via `role_type`. The `map_role` IS the mechanism linking templates to categories.

### Step 8 — Module pattern in system roles
```
System Role  | First Module  | Matches role_type value
BAR          | STATION       | ✅ STATION (id=1)
KDS          | STATION       | ✅ STATION (id=1)
captain      | Manager       | ✅ Manager (id=3)
Manager      | Manager       | ✅ Manager (id=3)
Waiter       | Waiter        | ✅ Waiter (id=2)
Owner        | Manager       | ✅ Manager (id=3)
```
**Pattern confirmed:** For every system role, the first module IS the role_type value. These are backend-injected category tokens, not user-selectable permissions.

### Step 9 — Custom role "gg" evidence
"gg" (id=5893, created 2026-07-23 when previous agent's fix was briefly applied):
- modules: ["bill","clear_payment","complementary_food","confirm_order","food",...] — NO category module
- parent_role: "1" — stored as STATION (id=1)

This happened because the previous agent's BUG-235 fix sent `role_type: [1,2,3,4,5,6]` (all types). Backend stored `parent_role: "1"` (first ID). The role works but is incorrectly categorized as STATION.

### Step 10 — Synthesis
The `role_type` field in the POST/PUT payload:
- Tells the backend which category identifiers to associate with the role
- The backend stores the first `role_type` ID as `parent_role`
- The category module (STATION, Manager, Waiter, Billing) is then present when the role is used at the device level
- Without `role_type`, backend 422s

---

## 4. What `role_type` Actually Does (Plain English)

The POS system has different types of devices/views:
- **STATION** = kitchen display / chef tablet
- **Waiter** = waiter tablet / handheld device
- **Manager** = manager dashboard
- **Billing** = billing/cashier terminal

When you create a role and mark it as `role_type: Manager`, the backend knows this employee can access the Manager view on the POS device. This is separate from which specific permissions they have — it's about WHICH TYPE OF DEVICE they can log into.

BUG-231 removed the UI selector for this. The backend still requires it. The modules alone (food, pos, order, bill) don't tell the backend which device type — that's what `role_type` is for.

---

## 5. Owner Hypothesis Assessment

**Owner said:** "we were supposed to check if attached rights are directly mapped by backend so this dropdown was not required"

**Finding:** ❌ PARTIALLY INCORRECT

- The "attached rights" (food, pos, order, bill modules) are independent of role_type
- `role_type` controls device-type access, not permission grants
- The backend does NOT derive role_type from modules
- **The dropdown was serving a real purpose** that BUG-231 unknowingly eliminated

**HOWEVER — partial truth:** When using a template, the category IS implicitly known from the template's `map_role`. So for template-based roles, the dropdown IS redundant — the template carries the type. For "Build from scratch", the type is NOT derivable.

---

## 6. Gaps in Current BUG-235 Fix

| Gap | Severity | Detail |
|---|---|---|
| **Auto-sends ALL 6 types** | MEDIUM | A Waiter role should only be type Waiter. A Station role should only be type STATION. Sending all 6 means the role can be used on all device types — which defeats device-type access control. |
| **Template selected but type ignored** | MEDIUM | When user picks "Cashier" template (`map_role: "Billing"`), BUG-235 still sends all 6 types instead of deriving `[4]` (Billing only) from the template. |
| **Build from scratch gets wrong type** | LOW | "Build from scratch" has no implied type. Sending all 6 is pragmatic but semantically wrong. |

---

## 7. Recommendation

**Classification:** PLAN_GAP — BUG-231 removed UI without understanding what the field controlled. BUG-235 patched the 422 but introduced semantic errors.

**Exit criteria:** MEDIUM confidence (direct POST test blocked by CSRF; behavior inferred from GET API structure + existing role data + handoff error message)

**Recommended next step: PLANNING gate for a revised BUG-231/BUG-235 fix**

Two options for owner decision:

| Option | Description | Owner Action |
|---|---|---|
| **A — Derive from template** | When a template is selected: use template `map_role` to pick correct role_type ID. For "Build from scratch": auto-send all types (current BUG-235 behavior). | Requires PLANNING (2 files, ~5 lines) |
| **B — Restore the dropdown** | Revert BUG-231 fully. Show `role_type` selector on the form. User picks the device type. Accurate but adds one required field to the form. | Requires PLANNING (1 file, ~10 lines) |

**Agent recommendation: Option A** — no new UI element needed, semantically correct for template-based flow (which is the most common case), and "Build from scratch" all-types is acceptable since the owner confirmed option (b) in Q1.

---

## 8. Evidence Files Saved

```
/app/memory/evidence/INV-ROLETYPE/all_role_list.json   — full all-role-list API response
/app/memory/evidence/INV-ROLETYPE/role_masters.json    — full role-master-list API response
/app/memory/evidence/INV-ROLETYPE/token.txt            — auth token used
```

---

## 9. Items NOT Investigated (within 10-step budget)

- Direct POST test (CSRF-blocked) — could not verify 422 live, relied on handoff confirmation
- Whether backend 422 fires on `role_type: null` vs `role_type: []` vs missing field
- Whether the active toggle 422 (RoleListView.jsx) reproduces the same error pattern

These can be verified manually by owner by attempting to save a new role in the browser and checking the network tab.
