# Intake — CR-376-FU-A
## CustomerModal: Hide / Disable Inert Off-Menu Suggestion Rows

**Date:** 2026-09-25
**Registered by:** PLANNING agent (ALPHA v0.7) acting in INTAKE capacity — follow-up registered per owner P5 decision during CR-376 Gate 3 precondition session.
**Source:** OWNER-REQUESTED (P5 decision: "register now")
**Parent CR:** CR-376 (Menu Switch — must be IMPLEMENTED before this CR starts Gate 2)
**Sprint:** TBD — post CR-376 ship

---

## Header (INTAKE mandatory fields)

| Field | Value |
|---|---|
| **Code Reality** | NONE — no `activeMenuProducts` filter or inert-row guard exists in `CustomerModal.jsx`. The site `OrderEntry.jsx:2844` will be changed by CR-376 E4e (scoped to `activeMenuProducts`), but the CustomerModal rendering of those rows is unchanged. Grep: `grep -n "inert\|off.menu\|menuItems.*filter" src/components/order-entry/CustomerModal.jsx` → 0 hits. |
| **Duplicate check** | DISTINCT — BUG-294 (`CustomerModal.jsx` CRM 401 blocking) is a different issue (network error handling, not menu filtering). No other CR/BUG covers this behaviour. |
| **Blast radius** | SMALL — 1 file (`CustomerModal.jsx`), additive filter/style only, no financial logic. |
| **Risk** | LOW — single file, not a hotspot (R5), non-financial, no API change, no localStorage change. |
| **Fast Lane eligible** | POTENTIALLY YES (1 file, likely ≤10 lines) — assess at Gate 3 after OQ-A1 is answered. Owner must confirm. |

---

## Classification

| Field | Value |
|---|---|
| **Type** | CR — UX follow-up |
| **Severity** | P2 — MEDIUM. Staff on a Premium station see Normal-menu suggestions as tappable rows in the customer modal. Tapping them is silently skipped (E4e guard). This is confusing UX but has no workaround worse than ignoring it. Not revenue-impacting. |
| **Area** | Order Entry > `CustomerModal.jsx` — Favourites / Smart Suggestions rows |
| **Blocked by** | CR-376 NOT IMPLEMENTED — `activeMenuProducts` doesn't exist in context until CR-376 ships. Cannot start Gate 2 before CR-376 Gate 5b. |

---

## Step 0b — Duplicate Detection

| Check | Result |
|---|---|
| Registry keyword search: `CustomerModal`, `menuItems`, `inert`, `off-menu` | BUG-294 (CustomerModal CRM 401) — DISTINCT different issue. No other match. |
| Codebase grep for existing fix | `grep -rn "inert\|off.menu.*filter\|activeMenu.*CustomerModal" src/` → 0 hits. NONE. |
| Recent handover symptom match | No matching symptom in any handover for menu-filtered suggestions. DISTINCT. |

**Duplicate check result: DISTINCT**

---

## Step 1b — Risk Classification

- **Risk:** LOW
- **Trigger:** UI display only. No financial logic, no API call, no localStorage, no order payload, not a hotspot file.
- **Fast Lane:** POTENTIALLY eligible (1 file, ≤10 lines, LOW risk, non-hotspot) — owner must approve at Gate 3.

---

## Owner Requirement

After CR-376 ships: on a Premium/Party station, `CustomerModal` (CR-002 Favourites/Smart Suggestions) shows rows sourced from `menuItems` (now scoped to `activeMenuProducts` by E4e). However, the CRM payload may still return items from other menus (e.g. historical Normal-menu orders). If a suggested item's `id` doesn't resolve in `activeMenuProducts`, the existing `handleIntelItemClick` guard (CustomerModal L228-237) silently skips add-to-cart.

The UX gap: the row still renders as if tappable, but nothing happens — confusing for staff.

**Decision LOCKED (Owner 2026-09-25): Option A — HIDE.**
Off-menu suggestion rows are filtered out entirely. Only rows that resolve in `activeMenuProducts` are rendered.
Cleaner UX: staff see only items they can actually add. No greyed-out confusion.

Options (for reference):
- **Option A (hide) ✅ LOCKED:** Filter CRM suggestion rows to only those that resolve in `menuItems`. Off-menu rows disappear.
- ~~Option B (grey-out): Render off-menu rows with a disabled style + "Not on active menu" label.~~ Not chosen.

---

## Step 2 — Evidence

| Field | Value |
|---|---|
| **Source** | OWNER-REQUESTED (P5 precondition decision during CR-376 Gate 3 session, 2026-09-25) |
| **Confidence** | SUSPECTED — agent code trace (code change not live yet; CR-376 not implemented). Will be CONFIRMED once CR-376 ships. |
| **Screenshot** | Not yet reproducible — CR-376 must ship first. |
| **Steps to reproduce** (post CR-376) | 1. Set station to Premium in Local Settings. 2. Open Order Entry with an existing customer who has Normal-menu order history. 3. Open CustomerModal. 4. Tap a Smart Suggestion row for a Normal-menu item. 5. Observe: nothing added to cart (silent skip). |
| **Curl output** | N/A — frontend-only change. |

---

## Step 3 — Blast Radius

```bash
grep -rn "CustomerModal" /app/frontend/src/ --include="*.js" --include="*.jsx" | wc -l
# Result: 20 references (mostly imports + OrderEntry prop passing)
```

| Metric | Value |
|---|---|
| Files to change | **1** — `CustomerModal.jsx` only |
| Hotspot files | NO — CustomerModal.jsx is NOT on the R5 hotspot list |
| Scope | SMALL (1 file, ≤10 lines) |
| Open owner questions | **OQ-A1: LOCKED = Option A (hide).** OQ-A2: CRM payload `food_for` field — to be confirmed at Gate 2 (R11 probe). Workaround if absent: match by product id against activeMenuProducts. |

---

## Gate 4 Precondition

- **HARD BLOCK:** CR-376 must reach Gate 5b QA pass or higher before this CR can start Gate 2 (Impact Analysis).

---

```
Intake complete: CR-376-FU-A
Classification: CR, Severity: P2, Risk: LOW
Duplicate check: DISTINCT
Evidence: SUSPECTED — reproducible only after CR-376 ships
Blast radius: SMALL (1 file, ≤10 lines)
Docs updated: change_requests/CR-376-FU-A_CUSTOMER_MODAL_INERT_SUGGESTIONS_INTAKE.md · registry.json · CR_REGISTRY.md
OQ-A1: LOCKED = Option A (HIDE off-menu rows). Owner 2026-09-25.
OQ-A2: Confirm at Gate 2 R11 probe (CRM payload food_for field).
INTAKE CLOSED 2026-09-25. Gate 1 complete.
Next: Planning Gate 2 — BLOCKED until CR-376 Gate 5b QA pass.
```
