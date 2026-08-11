# CR-029: QSR Payload Parity + `round_up` Persistence on Collect Bill

> **Number-collision note (2026-06-12):** This CR was registered as `CR-029` on the
> `gh/menu-bug` source branch. Our `/app/memory/control/CR_REGISTRY.md` has a
> different `CR-029` (= "Room food included in ALL reports", IMPLEMENTED + QA
> PASSED 2026-06-11). This file (QSR Payload Parity + round_up) keeps its
> original "CR-029" filename for git/test continuity (`cr029.roundUp.test.js`,
> all in-code comments reference "CR-029"); the registry tracks both scopes
> under separately-labeled rows. **Treat both as legitimate distinct CRs that
> happen to share the bare number.**

**Registered:** 2026-06-12
**Sprint:** pos_4_0 (next backlog)
**Priority:** P1 — money-impacting (grand total mismatch on every Collect Bill) + reporting integrity (category discount audit)
**Status:** **GATES 1 + 2 + 3 COMPLETE 2026-06-12.** Awaiting owner Gate-4 smoke on preprod.
**Origin:** Investigation session 2026-06-12 — owner directive: *"there is another value called round_up… not passing in any of payload QSR, place order, collect bill. Also gaps in QSR payload and collect bill payload."*
**Scope-narrowing rule (owner 2026-06-12):** *"in QSR mode we will not use coupon and loyalty"* → extended: *"exclude wallet also"*
**Related:**
- CR-013 (component-wise GST persistence on collect-bill — same payload, adjacent keys)
- CR-021 (split-payment payload — collect-bill builder)
- CR-025 (order-level discount payload — adjacent fields)
- CR-028 (item-level discount distribution — uses same payload builders)
- BUG-051 / BUG-052 (round-off rule — `Math.ceil` gated by `restaurant.totalRound`)
- BUG-114 (`discount_member_category_id/name` threading — same field surface)
- BUG-252 (BILL_PAYMENT contract aligned to OLD POS — defines current Flow 4 shape)

---

## 1. PROBLEM STATEMENT

Two distinct issues found during payload audit:

### Issue A — `round_up` lost on Collect Bill (Flow 4)
The frontend computes round-off correctly in TWO places (transform + UI) but Flow 4 (`collectBillExisting` → `BILL_PAYMENT`) **hardcodes `round_up: 0`** at `orderTransform.js:1569`. The UI value computed at `CollectPaymentPanel.jsx:643` and `CartPanel.jsx:423` is never threaded into `paymentData`, so even if the builder consumed it, the value isn't available.

**Affected paths (all read the same buggy builder):**
- Non-QSR Collect Bill (`OrderEntry.jsx:1981`)
- QSR Pay edge case for already-placed orders (`OrderEntry.jsx:1359`)
- Reports re-collect drawer (`CollectBillPanelDrawer.jsx:171`)

Flows 1 (`placeOrder`), 2 (`updateOrder`), 3 (`placeOrderWithPayment`) carry `round_up` correctly via `...totals` spread (computed in `calcOrderTotals`, `orderTransform.js:834`). Flow 5 (`transferToRoom`) does not emit the key at all.

### Issue B — QSR `paymentData` drops category discount metadata
After the exclusion rule (no coupon / loyalty / wallet in QSR), the only remaining QSR vs full-mode payload divergence is:
- `discount_member_category_id` → emitted as `0` (always)
- `discount_member_category_name` → emitted as `''` (always)

QSR DOES expose the preset/category discount picker (`selectedDiscountType` is live in `CartPanel.jsx:390`), but `CartPanel.jsx:457-472` builds `discounts:{…}` without these two keys. Downstream builders read `discounts.discountMemberCategoryId || 0` and `discounts.discountMemberCategoryName || ''`, so the wire payload silently carries fallback zeros for every QSR order on which a preset/category discount was applied.

---

## 2. CONFIRMED NOT-IN-SCOPE (owner exclusions)

| Concept | QSR support? | Reason |
|---|---|---|
| Coupons | ❌ Excluded | Owner rule 2026-06-12 |
| Loyalty (points + ratio) | ❌ Excluded | Owner rule 2026-06-12 |
| Wallet redemption | ❌ Excluded | Owner rule 2026-06-12 |
| Tip | ❌ No QSR UI | Pre-existing — hardcoded `tip:0` in `CartPanel.jsx:401` |
| Split payment | ❌ No QSR UI | Pre-existing — `splitPayments: null` |
| TAB / credit | ❌ No QSR UI | Pre-existing — `tabContact: null` |
| Transfer-to-Room | ❌ No QSR UI | Pre-existing |
| Manual `print_kot` / `auto_bill` toggle per order | ❌ Profile-driven | By QSR design — `restaurant.settings.autoKot/autoBill` |

These remain as zero/empty/absent fields on the QSR wire payload by design. Audit + reporting must continue tolerating them.

---

## 3. FINAL CONFIRMED GAPS (post exclusion rules)

| # | Gap | Where | Affected Payload(s) | Severity |
|---|---|---|---|---|
| **G1** | `round_up: 0` hardcoded on Collect Bill | `orderTransform.js:1569` | `BILL_PAYMENT` (Flow 4) — QSR Pay edge + non-QSR Collect Bill + Reports re-collect | **High** — backend persists 0; grand-total accounting mismatch vs printed bill |
| **G2** | `roundOff` never threaded into `paymentData` | `CollectPaymentPanel.jsx:1024-1099` + `CartPanel.jsx:447-483` | Same as G1 (root cause for G1) | **High** — prerequisite for G1 fix |
| **G3** | `discount_member_category_id` / `discount_member_category_name` absent in QSR `paymentData.discounts` | `CartPanel.jsx:457-472` | `PLACE_ORDER` (Flow 3 — QSR Place & Pay) + `BILL_PAYMENT` (Flow 4 — QSR Pay edge) | **Medium** — joins on category-id in reports/audit silently break for QSR preset-discounted orders |
| ~~G4~~ | ~~`round_up` field omitted entirely in `transferToRoom` (Flow 5)~~ | ~~`orderTransform.js:1656-1672`~~ | ~~`order-shifted-room`~~ | ~~Low~~ **DROPPED — owner 2026-06-12: not part of transfer payload contract** |

---

## 4. IMPACT ANALYSIS

### 4.1 Code surface

| File | Lines | Change | Risk |
|---|---|---|---|
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | ~1024-1099 (paymentData literal) | Add `roundOff: Math.round((finalTotal - rawFinalTotal) * 100) / 100` key | **Low** — additive; no consumer breaks |
| `frontend/src/components/order-entry/CartPanel.jsx` | ~447-483 (QSR paymentData literal) | Add `roundOff` + `discountMemberCategoryId` + `discountMemberCategoryName` keys | **Low** — additive |
| `frontend/src/api/transforms/orderTransform.js` | 1569 (collectBillExisting `round_up:0`) | Read `paymentData.roundOff`; emit `String(Math.max(0, roundOff).toFixed(2))` mirroring `calcOrderTotals:844` contract | **Medium** — wire-level change to BILL_PAYMENT |
| `frontend/src/api/transforms/orderTransform.js` | (optional G4) 1656-1672 (`transferToRoom`) | Add `round_up` key + thread `paymentData.roomBalance/roundOff` | **Low** — gated behind owner decision |
| `frontend/src/components/reports/CollectBillPanelDrawer.jsx` | 160-187 (paymentData passthrough) | **No change** — drawer already forwards CollectPaymentPanel's paymentData verbatim | — |

**Total files touched:** 2 (UI) + 1 (transform) = **3 files**; ~6 logical line additions.

### 4.2 Wire-format contract impact

**Backend acceptance check required.** The current `BILL_PAYMENT` payload sends `round_up: 0` (number). The fix will send `round_up: "0.00" | "0.25" | "0.50" …` (string-formatted toFixed-2 — to mirror the existing `calcOrderTotals:844` contract used by `PLACE_ORDER` Flow 3, which already passes through PHP without issue).

| Sub-question | Answer needed from backend |
|---|---|
| Q-BE-1 | Does backend accept `round_up` as STRING (preferred for parity with PLACE_ORDER), or must Flow 4 send NUMBER? |
| Q-BE-2 | Is `round_up` persisted on order-bill-payment today? If yes, where (column name) — is the bug zero-being-stored, or is field already ignored? |
| Q-BE-3 | For `transferToRoom`, should `round_up` be emitted? Currently absent. |

Until Q-BE-1 / Q-BE-2 resolved, fix cannot be merged. **Gate 2 prerequisite.**

### 4.3 Reporting / audit impact

| Surface | Current behavior | After fix |
|---|---|---|
| Order Ledger (`reportTransform.js:reportTransform`) reads `api.round_up` | Always 0 → "Round-off" column shows ₹0 on all postpaid-then-collected orders | Real round-off value persisted + shown |
| Audit Manifest (`utils/auditManifest.js`) `round_up` reconciliation | Currently passes (0 == 0) by accident — silently masks the bug | Will surface real ₹ diff; audit tests may need new fixtures |
| Item-Sales / Sales / Payments reports | No `round_up` consumption — neutral | No change |
| BUG-114 reporting joins on `discount_member_category_id` | QSR preset-discount orders join to ID 0 (orphaned) | Joins land on the real category — restores accuracy |

**Test fixture refresh required** on `__tests__/api/transforms/round001.alwaysCeil.test.js` and any BILL_PAYMENT snapshot tests that hard-code `round_up: 0`.

### 4.4 Edge cases to verify in Gate 3 (testing)

1. **`roundOffEnabled = false`** (restaurant profile `totalRound: false`): `roundOff` evaluates to 0 → payload sends `"0.00"`. No regression.
2. **Negative round-off** (rawTotal > orderAmount shouldn't happen with `Math.ceil`, but `calcOrderTotals:835` already clamps with `roundUp > 0 ? roundUp : 0`). Mirror the clamp in UI thread.
3. **Room order with `roomBalance > 0`**: `effectiveTotal` includes roomBalance; rawFinalTotal does NOT (room balance has no SC/GST/discount, L2 rule). Need to verify `roundOff` is computed on the food-only portion only, not on `effectiveTotal`. **Action:** confirm `CollectPaymentPanel.jsx:643` calculates `roundOff` from `finalTotal - rawFinalTotal` (food-only) — ✅ already correct.
4. **Split payment** on Collect Bill: `payment_amount` (`grant_amount`) equals `finalTotal` (effective). `round_up` must reflect the food round-off, NOT a per-split allocation. ✅ already correct by construction.
5. **QSR with `qsrDiscountEnabled = false`**: `selectedDiscountType = null` → both new category keys are `0` / `''`. Wire payload identical to current. No regression.
6. **QSR with preset discount selected**: category id/name now populates. Verify reporting joins on `bug-114` paths.
7. **Reports drawer re-collect**: passes through CollectPaymentPanel's `paymentData` untouched → inherits `roundOff` automatically. No drawer change needed.

### 4.5 Risk matrix

| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| Backend rejects new key type (string vs number) | Low (parity with PLACE_ORDER) | High | Gate-2 backend confirmation; fallback to number if needed |
| Existing audit fixtures hard-code 0 | Medium | Low | Update fixtures in Gate 3 commit |
| Stage-2 room balance flow regression | Low | Medium | E2E room order test in Gate 3 |
| QSR users without preset-discount UI confused by reporting change | None | None | Pure backend-data correction; no UI change |

---

## 5. PROPOSED FIX (drafted — NOT applied)

```diff
# CollectPaymentPanel.jsx — handlePayment paymentData literal (~L1024)
   const paymentData = {
     method:          paymentMethod,
     finalTotal:      effectiveTotal,
+    roundOff:        roundOff,    // BUG-051/052 — food-only round-off ₹; threads to collectBillExisting
     roomBalance,
     ...
   };

# CartPanel.jsx — QSR handleCollectBill paymentData literal (~L447)
   const paymentData = {
     method: paymentMethod,
     finalTotal: effectiveTotal,
+    roundOff: roundOff,
     ...
     discounts: {
       manual: manualDiscount,
       preset: presetDiscount,
       ...
       discountType: discountType || '',
       orderDiscountType: ...,
+      discountMemberCategoryId:   selectedDiscountType?.id || 0,    // BUG-114 parity
+      discountMemberCategoryName: selectedDiscountType?.name || '',
       loyaltyPoints: 0,
       ...
     },
     ...
   };

# orderTransform.js — collectBillExisting payload (~L1569)
-      round_up:                     0,
+      // CR-029 (2026-06-12): real round-off ₹ from CollectPaymentPanel/CartPanel.
+      // Q-BE-1 confirmed numeric type on BILL_PAYMENT (screenshot, order #939848).
+      // Distinct from PLACE_ORDER which emits string via calcOrderTotals:844 —
+      // both contracts preserved as-is per owner.
+      round_up:                     Math.max(0, Math.round((parseFloat(paymentData.roundOff) || 0) * 100) / 100),
```

Total: **3 additive lines + 1 replacement line** across **3 files**.

Optional G4 (`transferToRoom` parity) deferred pending owner decision.

---

## 6. GATING

| Gate | Description | Status | Exit Criteria |
|---|---|---|---|
| **Gate 1** | Investigation + impact analysis | ✅ COMPLETE | Owner reads + acknowledges |
| **Gate 2** | Backend contract confirmation (Q-BE-1, Q-BE-2, Q-BE-3 from §4.2) | ✅ **COMPLETE** (2026-06-12, owner via screenshot — see §7) | All three BE questions answered + owner sign-off on type |
| **Gate 3** | Implementation + QA (unit + e2e + audit fixtures) | ⏸️ **READY — awaiting owner GO** | All scenarios in §4.4 pass; audit fixtures updated |
| **Gate 4** | Owner smoke test on preprod | ⛔ NOT STARTED | Real preprod order: postpaid → collect bill → audit shows live `round_up` |

**Current instruction (owner 2026-06-12):** *"register this CR and finish gate till impact analysis"* — Gates 1 + 2 now complete via screenshot evidence. **Gate 3 implementation will not start until owner explicitly says GO.**

---

## 7. OPEN QUESTIONS — ✅ RESOLVED (2026-06-12, owner via screenshot)

| # | Question | Answer |
|---|---|---|
| **Q-BE-1** | `round_up` type on BILL_PAYMENT — string or number? | **NUMBER** — screenshot of live `order-bill-payment` payload (order #939848) shows `round_up: 0` as a numeric type. Fix will send numeric (e.g. `0.2`), NOT string `"0.20"`. **Divergence from PLACE_ORDER:** PLACE_ORDER's `calcOrderTotals:844` emits `String(roundUpAbs.toFixed(2))` — that flow continues to send string per its existing contract. Cross-flow type unification is OUT of CR-029 scope. |
| **Q-BE-2** | Is `round_up` persisted today? | **YES** — field already exists in DB schema and is part of the payload contract. Bug is "0-being-stored," not "ignored field." Reporting / audit surfaces (`reportTransform.js`, `auditManifest.js`) consume the persisted value; today they always read 0. After fix, real round-off will populate retroactively for all newly-collected bills. **No backfill** for historical orders (any pre-fix order keeps `round_up: 0` — acceptable per owner). |
| **Q-BE-3** | `transferToRoom` parity? | **NO — STAY ABSENT.** Owner: *"we don't have this payload in transfer"* — `round_up` is not part of `order-shifted-room` contract. **G4 dropped from CR-029.** |

**Live evidence (Q-BE-1 + Q-BE-2):** Order #939848, Bill UI showed `Round Off: +₹0.20`, Grand Total ₹212. Component sum: 185 + 1.25 + 1.25 + 24.30 = 211.80 → `Math.ceil` = 212 → expected `round_up = 0.20`. Actual payload sent `round_up: 0` (numeric). Confirms the bug + the type.

---

## 8. ROLLBACK PLAN

Single-commit, three-file diff. Revert = `git revert <commit>`. No DB migrations, no contract-breaking renames. Backend will accept old or new payload (per Gate-2 confirmation).

---

## 9. GATE 3 EXECUTION LOG (2026-06-12)

**Implementation summary:** Owner gave GO 2026-06-12. All 3 changes per §9 deep plan applied; new unit-test file `cr029.roundUp.test.js` added covering G1 + G3 across Flow 3 + Flow 4.

| File | Δ Lines | Description |
|---|---|---|
| `frontend/src/api/transforms/orderTransform.js` | +12 / −1 | Destructure `roundOff = 0`; replaced hardcoded `round_up: 0` with `Math.max(0, Math.round((parseFloat(roundOff) \|\| 0) * 100) / 100)` at L1574 |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | +4 / 0 | Thread `roundOff` into `paymentData` literal |
| `frontend/src/components/order-entry/CartPanel.jsx` | +15 / −2 | Thread `roundOff`; mirror Full Mode discount block (categoryId, categoryName, discountType, orderDiscountType, couponCode) per owner decision |
| `frontend/src/__tests__/api/transforms/cr029.roundUp.test.js` *(new)* | +163 | 11 test cases covering G1 (7) + G3 (4) across both flows |

### Test results
- **New tests:** `cr029.roundUp.test.js` — **11/11 PASS**
  - G1: round_up persistence (7 cases: numeric type, default 0, profile gate, negative clamp, paise precision, string input, distinct type vs PLACE_ORDER)
  - G3: category fields propagation (4 cases: BILL_PAYMENT populated + default, PLACE_ORDER populated + default)
- **Regression:** `src/__tests__/api/transforms/` — **214/216 PASS** (2 failures = `rawField.test.js` + `placeOrderPayload.test.js`, both verified pre-existing on baseline via `git stash` validation)
- **Lint:** No new errors introduced by CR-029
- **Frontend:** HTTP 200, MyGenie POS login renders

### Gate status update

| Gate | Status |
|---|---|
| Gate 1 — Investigation | ✅ COMPLETE |
| Gate 2 — Backend contract confirmation | ✅ COMPLETE |
| **Gate 3 — Implementation + automated QA** | ✅ **COMPLETE 2026-06-12** |
| Gate 4 — Owner smoke test on preprod | ⏸️ AWAITING OWNER |

---

**END OF CR-029 — GATES 1 + 2 + 3 COMPLETE. AWAITING OWNER GATE-4 SMOKE ON PREPROD.**
