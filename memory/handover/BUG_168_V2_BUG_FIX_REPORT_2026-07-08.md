# BUG FIX Report — BUG-168 v2 (Bill Print Missing Addons)

**Date:** 2026-07-08
**Agent role:** BUG FIX (Alpha v0.7 Role 5)
**Triggered by:** Owner instruction after INVESTIGATION session
**Owner approval:** Treated user's *"call bug fixing agent to fix BUG-168"* as owner GO for planning-skip path (§Owner Approval Matrix line 107)
**Risk:** CRITICAL — hotspot file (`orderTransform.js`) + print/financial semantics

---

## 1. Failures fixed

| Test # | Severity | RCA Classification | Root Cause | Fix | Files Changed | Verified |
|---|---|---|---|---|---|---|
| Owner-repro order #002384 print | BLOCKER | **DATA_EDGE** (primary) + **INTERACTION** (secondary) | `orderTransform.js:1808` fallback loop used `item.total_add_on_price` — field NOT present on `orderDetails[]` from GET single-order-new. April-2026 socket refactor (`socketHandlers.js:151`) dropped GET-refetch, so `order.subtotalAmount` is 0 for dashboard-hydrated orders, forcing this broken fallback to fire on B1/B2/B6/B7 print paths. | Rewrote L1808-1826 to compute `addonPerUnit = Σ(item.add_ons[].price × add_ons[].quantity)` and `lineTotal = (price × qty) + (addonPerUnit × qty)`. Copied verbatim from `CollectPaymentPanel.getItemLinePrice:212-224`. | `api/transforms/orderTransform.js` L1808-1826 | ✅ curl-verified live: 69 → 219 |

## 2. Summary

- **Fixed: 1/1** blocker.
- **Root cause pattern:** DATA_EDGE amplified by a prior optimization (INTERACTION).
- **Scope expansion:** NONE (single-file, single-block edit).
- **Escalated:** NONE.

## 3. Adjacent test cases (regression suite)

7/7 PASS via `/app/memory/evidence/BUG-168/simulate_all_print_paths.py`:

| # | Case | Expected | Actual |
|---|------|---------|--------|
| A | Live order #002384 (real curl data) | 219 | 219 ✅ |
| B | Item with NO addons | 240 | 240 ✅ (no regression) |
| C | Multiple addons + high qty | 620 | 620 ✅ |
| D | Complimentary line (upstream-zeroed) | 0 | 0 ✅ |
| E | Addon with missing `quantity` (defaults to 1) | 120 | 120 ✅ |
| F | Item with only `unit_price` (no `price`) | 105 | 105 ✅ |
| G | Backward-compat: item that also has `total_add_on_price` | 96 | 96 ✅ |

## 4. Full financial cascade verification (order #002384)

| Field | Pre-fix (broken) | Post-fix ✅ | Backend truth |
|---|---|---|---|
| `computedSubtotal` | 69.00 | 219.00 | 219.00 |
| `order_item_total` | 69.00 | 219.00 | 219.00 |
| `serviceChargeAmount` (10%) | 6.90 | 21.90 | 21.90 |
| `vat_tax` (4%) | 2.76 | 8.76 | (derived) |
| `order_subtotal` | 75.90 | 240.90 | 240.90 |

## 5. EXIT GATE (5/5 PASS)

- [x] **1. REGISTRY SYNC** — `registry.json` BUG-168 rewritten (title, root_cause, fix_plan, fix_verified, files_impacted, history_note); prior "reverted L698" drift documented in `history_note` field.
- [x] **2. BUG_TRACKER.MD** — row 49 rewritten with new title + fix summary + curl-verified evidence.
- [x] **3. FILE_OWNERSHIP.MD** — L1808-1826 entry appended below L698 entry (which is now stale-marked implicitly by the new entry).
- [x] **4. CODE MARKERS** — `// BUG-168 v2 (2026-07-08)` block comment + inline `// BUG-168` at the new `lineTotal` line.
- [x] **5. COMPILE CHECK** — webpack compiled successfully. 0 new warnings. 5 pre-existing lint warnings unrelated to this fix (see `mcp_lint_javascript` output — none inside my edit range).

## 6. Handover to Next → QA / Owner Smoke

Recommended next: **owner-driven smoke on preprod** (already logged in with `owner@18march.com`). Simple test:
1. Open Dashboard.
2. Find order #002384 (dinein, table WC, ₹250 payment_amount, has "extra cheese slice" addon).
3. Click printer icon on the OrderCard (Path B6) → check the emitted `order-temp-store` payload OR the printed receipt subtotal.
4. **Expected:** `order_item_total=219`, `serviceChargeAmount=21.90`, `order_subtotal=240.90`.
5. Repeat with any other addon-carrying order to confirm no regressions.

Optional deeper QA:
- Cover Paths B1 (Reports audit reprint), B2 (order-entry header PrintBillButton), B7 (TableCard printer).
- Cover Paths B3/B4/B5 (Collect Bill auto-print) — behavior unchanged, but confirm no regression.
- One order with **no addons** (should still emit unchanged item_total).
- One order with **complimentary items** (BUG-018 semantics — should still emit ₹0 for complimentary line).

## 7. Follow-up items (deferred, non-blocking)

1. **Secondary hardening — restore socket subtotal hydration:** consider a follow-up CR to have `handleOrderDataEvent` refetch via GET when `order.subtotalAmount === 0`. Not needed now (this fix defends the fallback branch anyway), but would eliminate a class of similar bugs across any other consumer of `order.subtotalAmount`.
2. **Backend request:** ask backend to include `order_sub_total_amount` on all socket-emitted order payloads (v2 events). Removes the need for defensive computation in FE.
3. **BUG-166 review:** L704 + L1493 addon_amount changes are still in place. Now that this fix mirrors `getItemLinePrice`, worth confirming BUG-166 revert plan (if any) is aligned or already superseded.
4. **CLOSURE Phase B:** the "BUG_166_168_ADDON_REVERT_PLAN.md" doc at `/app/memory/change_requests/` is stale — should be archived or rewritten.

---

## Evidence artifacts

```
/app/memory/evidence/BUG-168/
  ├── order_940279.json                  ← live GET response (curl-verified)
  ├── simulate_all_print_paths.py        ← 7-caller simulator, re-runnable
  ├── INVESTIGATION_REPORT.md            ← full RCA (from prior session)
  └── (this) BUG_FIX_REPORT_2026-07-08.md → linked via /app/memory/handover/
```

---

**Fix Report — Alpha v0.7 Compact Final:**

Fixed 1/1 issue. Root cause: 1 DATA_EDGE + 1 INTERACTION (April-2026 socket refactor amplified a latent fallback-branch defect). Fix report at `/app/memory/handover/BUG_168_V2_BUG_FIX_REPORT_2026-07-08.md`. Registry synced: YES. EXIT GATE: 5/5. Scope expansion: NONE. Escalated: NONE. Recommended: owner smoke on preprod against order #002384.
