# QA Handover — CR-376-FU-A
## CustomerModal: Hide Off-Menu Suggestion Rows

**Date:** 2026-09-25
**Implementation agent:** ALPHA v0.7 Role 3
**Sprint:** `sep_bug_closure`
**Risk:** LOW
**Fast Lane:** YES (1 file, 6 lines, non-hotspot, non-financial)

---

## 1. Inherited from Plan — Verification Matrix Results

| V# | Edit | File | Verification | Self-Test |
|---|---|---|---|---|
| V1 | E1 | `CustomerModal.jsx` L241 | `menuItems.some.*xs.itemId` guard in `filteredCrossSell` | ✅ grep confirms L241 |
| V2 | E2 | `CustomerModal.jsx` L246-249 | `filteredTopItems` const exists | ✅ grep confirms L247 |
| V3 | E3a | `CustomerModal.jsx` L556 | `filteredTopItems.length > 0` in render condition | ✅ grep confirms |
| V4 | E3b | `CustomerModal.jsx` L560 | `filteredTopItems.map` in render | ✅ grep confirms |
| V5 | ALL | webpack | `webpack compiled with 1 warning` (pre-existing `isScheduled`) | ✅ 0 new warnings |

---

## 2. Browser Test Cases

| # | Test | Steps | Expected |
|---|---|---|---|
| T1 | **Off-menu Smart Suggestion hidden** | Set station to non-Normal menu (e.g. FOOD MENU). Open order. Open CustomerModal for a customer with Normal-menu order history. Check Smart Suggestions section. | Off-menu suggestion cards absent. Only items resolving in `activeMenuProducts` show. |
| T2 | **Off-menu Past Favourite hidden** | Same setup as T1. Check Past Favourites section. | Off-menu favourite chips absent. Section hides entirely if ALL favourites are off-menu. |
| T3 | **Normal station: sections intact** | Set active menu = Normal (default). Open CustomerModal for returning customer. | Past Favourites + Smart Suggestions show normally (all Normal items in `menuItems`). |
| T4 | **First-time customer unaffected** | Open CustomerModal for a first-time customer (no intel). | Sections not shown (guarded by `!intel.isFirstTimeCustomer`) — no change from pre-fix. |

---

## 3. Regression Tests

| # | What | Why |
|---|---|---|
| R1 | `handleIntelItemClick` still fires on visible items | E1/E2 filter by ID — items that remain should still add to cart correctly |
| R2 | Smart Suggestions section guard (`featureFlags.crossSell`) still applies | `filteredCrossSell.length > 0` condition unchanged at L576 — section still hidden if flag off |
| R3 | `filteredCrossSell` cart-dedup behaviour unchanged | `return true` path retained — existing cart dedup logic unaffected |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: CR-376-FU-A
Status: GATE_5A_IMPLEMENTED (2026-09-25)
Sprint: sep_bug_closure
EXIT GATE: ALL 5 PASSED
  □1 Registry: UPDATED ✅
  □2 CR_REGISTRY.md: UPDATED ✅
  □3 FILE_OWNERSHIP.md: UPDATED ✅
  □4 Code markers: ✅ (4 × // CR-376-FU-A across CustomerModal.jsx)
  □5 Compile: ✅ (webpack compiled with 1 warning — pre-existing, not CR-376-FU-A)
```

---

## 5. Credentials + Environment

| | Value |
|---|---|
| QA account (non-Normal station) | QA_HYATT — owner@hyatt.com / `***` |
| QA account (Normal station) | QA_OWNER or cafe103 — `test_credentials.md` |
| Preview URL | http://localhost:3000 (local) |
| API | https://preprod.mygenie.online |

**Note:** T1/T2 require a customer with cross-menu order history. T3 regression can be code-verified (Normal station: all CRM items are in `menuItems` → filter passes all through).
