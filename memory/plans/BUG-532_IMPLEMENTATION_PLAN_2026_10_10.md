# BUG-532 — Implementation Plan (Gate 3)

## Dashboard Room Tile SC Gap: order.amount Excludes Service Charge → Tile ₹827 vs CPP ₹848

**Date:** 2026-10-10
**Stage:** Gate 3 — Implementation Plan
**Based on:** `impact/BUG-532_IMPACT_ANALYSIS_2026_10_10.md`
**Risk:** MEDIUM / R5
**OD-532-01 (REVISED):** Awaiting Gate 4 GO — FE fix approved? (1 line, `order.serviceTax` already on shape)
**OD-532-02:** DEFERRED — transfers fix out of scope (no transfer in test case)
**NOT backend-blocked:** `order.serviceTax = api.total_service_tax_amount` confirmed present on order shape

---

## Scope Lock

**Files WILL change:**
- `src/pages/DashboardPage.jsx` (**R5**) — 1 line (L49)

**Files WILL NOT touch:**
- `orderTransform.js` (R5) — `serviceTax` already produced correctly
- `CollectPaymentPanel.jsx` (R5)
- `CartPanel.jsx`
- Any test file

---

## Entry Verification (Implementation agent must run before coding)

```
Plan says: L49 currently reads:
  const food = Number(order?.amount) || 0;

→ View DashboardPage.jsx lines 47-52. Confirm L49 matches exactly.
→ Confirm L53-56 is the BUG-527 roomBal formula (unchanged by this edit).
→ If mismatch → STOP. Return to Planning. Do not proceed.
```

---

## Edit

### E1 — `DashboardPage.jsx:L49` — add `order.serviceTax` to food total

**Current (L49):**
```js
  const food = Number(order?.amount) || 0;
```

**New (L49):**
```js
  const food = (Number(order?.amount) || 0) + (Number(order?.serviceTax) || 0); // BUG-532: include SC (serviceTax = api.total_service_tax_amount) to match CPP finalTotal
```

**Rationale:**
- `order.serviceTax` = `parseFloat(api.total_service_tax_amount)` — already present on every order object from `orderTransform.fromOrder` (L224)
- For SC=0 restaurants: `order.serviceTax = 0` → no change in output
- For non-room order tiles: they use `order.amount` directly at separate call sites (L590, L632, L664, L782, L806, L946, L1128) — **completely unaffected**
- After fix: `computeRoomCardAmount` returns `248 + 0 + 600 = 848` (matches CPP) ✓

---

## Verification Matrix

| # | Edit | Verification | How | Auto? |
|---|------|-------------|-----|:---:|
| V1 | E1 | Dashboard room tile shows ₹848 (was ₹827) | Browser: bonk → Dashboard Room tab | NO |
| V2 | E1 | Dashboard room tile matches CPP effectiveTotal | Browser: open CPP, compare | NO |
| V3 | regression | Non-room order tiles unchanged | Browser: regular dine-in orders | NO |
| V4 | regression | Restaurant with SC=0: room tile unchanged | Browser or code review | YES (code) |
| V5 | regression | webpack compiles 0 new warnings | terminal | YES |

---

## Risk Register

| Risk | Mitigation |
|---|---|
| R5 file | 1 line, additive — `Number(order?.serviceTax) \|\| 0` is zero-safe |
| Restaurants without SC (`serviceTax=0`) | `+ 0` → no change |
| Non-room tile regression | Separate call sites at L590/632/664/782/806/946/1128 — not inside `computeRoomCardAmount` |
| Associated orders (`transfers`) still use `o.amount` only | OD-532-02 deferred — bonk has no transfers; file OD-532-02 as follow-up |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-532 → status: IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: row — remove "backend-blocked", update to GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: DashboardPage.jsx entry — BUG-532 + 2026-10-10
- [ ] Code marker: // BUG-532 on the modified line ✓ (in new code above)
- [ ] webpack compile: 0 new warnings — MANDATORY for R5 file
```
