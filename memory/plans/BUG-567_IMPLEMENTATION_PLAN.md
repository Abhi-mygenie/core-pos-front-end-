# BUG-567 — Implementation Plan (Gate 3)

**ID:** BUG-567 · **Date:** 2026-10-15 · **Role:** PLANNING (Gate 3)
**Input:** `impact/BUG-567_IMPACT_ANALYSIS.md` (Gate 2 CLOSED) · OD-567-01 = **(a) max-width: 767px** LOCKED
**Code Reality:** NONE — `1279` still at L56 at HEAD (verified 2026-10-15)
**Conflict pre-check:** CLEAN — BUG-538 (GATE_1_INTAKE) touches different OrderEntry.jsx sections; parallel-safe
**Risk:** HIGH (R5 hotspot — OrderEntry.jsx)

---

## 0. Scope Lock (R14)

| WILL change | WILL NOT touch |
|---|---|
| `src/components/order-entry/OrderEntry.jsx` (L55–L56 only) | `CategoryPanel.jsx`, `Sidebar.jsx`, all 40 report pages, all test files, all API/service/transform files, `index.css`, any `.env`, any other file |

Hotspots (R5): 1 (`OrderEntry.jsx`). Financial (R6): NONE. Gate 4 owner GO required (R5).

---

## 1. Entry Verification (MANDATORY — run before writing any code)

```bash
sed -n '55,56p' /app/frontend/src/components/order-entry/OrderEntry.jsx
```

**Expected output:**
```
// BUG-555 WP-A (OD-555-13=c): (portrait AND <1280) OR <800 → rotate overlay
const ROTATE_MQ = '(orientation: portrait) and (max-width: 1279px), (max-width: 799px)';
```

If output differs → **STOP. Return to Planning agent.**

---

## 2. Edits

### E1 — `OrderEntry.jsx:55-56` — Update ROTATE_MQ + comment

| Field | Value |
|---|---|
| File | `src/components/order-entry/OrderEntry.jsx` |
| Lines | 55–56 |
| Edit type | String change — one number (`1279` → `767`) + comment update |

**Current (L55–56):**
```js
// BUG-555 WP-A (OD-555-13=c): (portrait AND <1280) OR <800 → rotate overlay
const ROTATE_MQ = '(orientation: portrait) and (max-width: 1279px), (max-width: 799px)';
```

**New (L55–56):**
```js
// BUG-555 WP-A (OD-555-13=c) · BUG-567 (OD-567-01=a): (portrait AND <768) OR <800 → rotate overlay
const ROTATE_MQ = '(orientation: portrait) and (max-width: 767px), (max-width: 799px)';
```

**Changes:**
1. Comment L55: `<1280` → `<768`, append `· BUG-567 (OD-567-01=a)`
2. Constant L56: `max-width: 1279px` → `max-width: 767px`

That is the **complete implementation** — no other edits required anywhere.

---

## 3. Effect After E1

| Portrait CSS | Device | Before fix | After fix |
|---|---|---|---|
| 390-430px | iPhone 14/15 | Overlay ✅ | **Overlay** ✅ |
| 533px | V3 test viewport | Overlay ✅ | **Overlay** ✅ |
| 744px | iPad Mini | Overlay ✅ | **Overlay** ✅ |
| 768px | Boundary (new lower edge of unblocked) | Overlay | **No overlay** ✅ middle=184px |
| 820-834px | **iPad Air/Pro 11"** | Overlay ❌ | **No overlay** ✅ middle=236-250px |
| 1024px | **iPad Pro 13"** | Overlay ❌ | **No overlay** ✅ middle=440px |

Condition B (`max-width: 799px`) unchanged — narrow landscape devices still blocked.

---

## 4. Verification Matrix (seeds QA)

| # | Edit | Check | Viewport | Method | Auto? |
|---|---|---|---|---|---|
| V-1 | E1 | **iPad 11" portrait: no overlay** — `order-entry-rotate-overlay` absent | ~820×1180 or 834×1194 | testid absent | YES |
| V-2 | E1 | **Phone portrait: overlay still shows** — `order-entry-rotate-overlay` present | 390×844 | testid present + backdropFilter blur | YES |
| V-3 | E1 | **iPad Mini portrait: overlay still shows** | 744×1133 | testid present | YES |
| V-4 | E1 | **Portrait 768px: no overlay** (lower boundary — first unblocked width) | 768×1024 | testid absent | YES |
| V-5 | E1 | **Portrait 767px: overlay shows** (upper boundary of blocked) | 767×1024 | testid present | YES |
| V-6 | E1 | **BUG-555 regression: V3 (533×893 portrait) overlay still shows** | 533×893 | testid present, backdropFilter blur, icon static | YES |
| V-7 | E1 | **BUG-555 regression: V1 (893×533 landscape) overlay absent** | 893×533 | testid absent | YES |
| V-8 | E1 | **BUG-555 regression: cart round-trip** — add items at 893×533, rotate to 533×893 (overlay), rotate back, cart intact | 893↔533 | resize + assert cart preserved | YES |
| V-9 | E1 | **OE layout functional at iPad 11" portrait**: no overflow (scrollWidth ≤ clientWidth) after overlay dismissed | ~820×1180 | DOM overflow check | YES |
| V-10 | E1 | Compile: `webpack compiled with 1 warning` (pre-existing only, 0 new) | — | `tail frontend.out.log` | YES |
| V-11 | E1 | Code marker: `grep -c "BUG-567" OrderEntry.jsx` ≥ 1 | — | CLI | YES |

---

## 5. Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Phone portrait regression (overlay gone) | NONE | Phones ≤430px < 768 → Condition A still fires. Condition B (< 800) also fires for phones. Double-covered. |
| iPad Mini regression (overlay gone) | NONE | 744px < 768 → Condition A still fires |
| Layout broken at newly unblocked widths | LOW | Min unblocked portrait = 768px → middle panel = 184px > 140px min-w floor. V-4/V-9 verify. |
| BUG-555 QA tests invalidated | NONE | All test viewports (V3=533px, V1=893px landscape) unaffected by threshold change |
| OE cart/state disrupted | NONE | Change is to a constant string only; no state, logic, or lifecycle changes |

---

## 6. Execution Sequence

```
1. Entry Verification — run sed -n '55,56p' — ABORT if mismatch
2. Apply E1 via search_replace (single edit, L55-56)
3. Wait for "webpack compiled" in frontend.out.log — verify 1 warning (pre-existing)
4. Self-test: run V-1 to V-11 (automated DOM checks + viewport screenshots)
5. EXIT GATE (5 checkboxes)
6. Write QA handover + session handover
```

---

## 7. Post-Code Registry Checklist (Implementation agent MUST execute — EXIT GATE)

```
□ 1. registry.json: BUG-567 → GATE_5A_IMPLEMENTED, sprint_key: oct_cr_batch,
                    files: ['src/components/order-entry/OrderEntry.jsx']
□ 2. BUG_TRACKER.md: BUG-567 row updated → GATE_5A_IMPLEMENTED
□ 3. FILE_OWNERSHIP.md: OrderEntry.jsx — BUG-567 E1 + date
□ 4. Code marker: grep -c "BUG-567" OrderEntry.jsx ≥ 1 (comment at L55 counts)
□ 5. Compile: webpack 1 warning (pre-existing), 0 new warnings
□ QA handover: handover/QA_HANDOVER_BUG567_<DATE>.md inheriting §4 matrix + §5 risk
```

---

## 8. Gate 4

```
OWNER APPROVAL REQUIRED
Reason: R5 hotspot (OrderEntry.jsx) — requires explicit Gate 4 GO before any code is written
Risk: HIGH (R5) — though the change itself is 1 constant string, 2 lines
OD-567-01: LOCKED = (a) 767px
Proposed next step: IMPLEMENTATION — change L55-56 in OrderEntry.jsx as per E1 above
I will not proceed until owner gives Gate 4 GO.
```
