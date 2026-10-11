# QA HANDOVER — BUG-530
## Date: 2026-10-10

---

## §1 — Registry Sync Confirmation

| Item | Status | Sprint | EXIT GATE |
|---|---|---|---|
| BUG-530 | GATE_5A_IMPLEMENTED | oct_bug_batch | 5/5 PASS |

Registry synced: YES. Code marker: YES (`// BUG-530` at splitCap line). Compile: PASS (0 new warnings, R5).

---

## §2 — File Changed

| File | Change | Lines |
|---|---|---|
| `src/components/order-entry/CollectPaymentPanel.jsx` (R5) | BUG-530: added `splitCap = isRoom ? effectiveTotal - roomBalance : effectiveTotal` + replaced 2 uses of `effectiveTotal` in `onBlur` auto-fill handler | ~L2885 (+1 line + 2 subs) |

---

## §3 — Test Cases

| # | Test | Steps | Expected | Severity if FAIL |
|---|------|-------|----------|---|
| TC-530-1 | Room order: Cash=190 blur → UPI auto-fills ₹1 | Dashboard → bonk r4 → Checkout → CPP → Split → Cash=190 → blur | UPI fills to **₹1** (was ₹601) | BLOCKER |
| TC-530-2 | Room order: Cash=200 → clamps to ₹191, UPI=₹0 | Same path → Cash=200 → blur | Cash clamps to **₹191**, UPI stays **₹0** | BLOCKER |
| TC-530-3 | Room order: sum matches food-only ₹191 | TC-530-1 result | Cash(₹190) + UPI(₹1) = ₹191 = food-only total | MAJOR |
| TC-530-4 | Non-room order: auto-fill unchanged | Any dine-in order → CPP → Split → Cash=100 → blur | UPI fills to `effectiveTotal − 100` (full total, unchanged) | MAJOR |
| TC-530-5 | Checkout button enabled after fill | TC-530-1 → after auto-fill | Checkout / Pay button enabled (split sum = splitCap) | MAJOR |

---

## §4 — Regression Tests

| # | What to verify | Why |
|---|---|---|
| R1 | BUG-527 E3: split enable/disable threshold still `isRoom ? effectiveTotal-roomBalance : effectiveTotal` at L3318 | Same formula — verify not accidentally overwritten |
| R2 | Non-room CPP split: full effectiveTotal still used as cap | `isRoom=false` → `splitCap = effectiveTotal` — same behaviour as before |
| R3 | BUG-529+531: folio CPP ₹848 + InHouse balance ₹600 still correct | Separate files; no interaction with this change |

---

## §5 — Credentials + Environment

| Account | Email | Password | Context |
|---|---|---|---|
| Owner | `owner@thegoankitchen.com` | `Qplazm@10` | RID 69, The Goan Kitchen |
| bonk booking | `MG-69-2C201998-53D8-4980-A6A8-B042088BFC9D` | — | Room r4, order #000361 |
| Key values | food+SC ₹191 effective (effectiveTotal=791, roomBalance=600, splitCap=191) · Cash=190 → UPI should fill ₹1 | — | TC-530-1/2/3 |
| Dashboard path | `/dashboard` → Room tab → bonk r4 tile → Checkout | — | All TC-530 tests |
