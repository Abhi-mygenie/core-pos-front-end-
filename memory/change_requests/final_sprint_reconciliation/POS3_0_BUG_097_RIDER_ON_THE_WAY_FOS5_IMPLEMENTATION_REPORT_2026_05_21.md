# POS3.0 BUG-097 — "Rider is on the way" fOS=5 + 'riderReached'→'dispatched' Rename Implementation Report — 2026-05-21

> **Patch type:** Frontend-only. Transform semantic rename + UI carve-out at fOS=5. No API, no socket, no backend dependency.
> **Source plan:** `POS3_0_BUG_097_RIDER_ON_THE_WAY_FOS5_APPROVAL_PLAN_2026_05_21.md` (owner-approved on 2026-05-21).
> **Owner decisions applied:** Q1=(b) `"On the way.."`, Q2=(a) leave CartPanel, Q3=(a) keep `canBill` guard, Q4=(a) apply rename now.
> **Status:** IMPLEMENTED — pending owner smoke QA.
> **Build:** PASS (`craco build` Done in 19.90s, 0 errors, 1 pre-existing unrelated eslint warning).
> **Bundle:** `main.f749afc8.js` 452.25 kB (gzipped) — was 452.31 kB → -57 B (rename retires a few characters; new branch adds JSX; net negligible).
> **`/app/memory/final/` updated:** NO. Baseline docs updated: NO.

---

## 1. Scope Applied

| # | Item | File | Change |
|---|---|---|---|
| 1 | Transform rename | `src/api/transforms/orderTransform.js` | Rule 1 maps `delivery_man_id + delivery_man_status === 'Yes'` → **`'dispatched'`** (was `'riderReached'`). Rule 3 unchanged. Doc-comment block updated. |
| 2a | OrderCard rider pill consumer | `src/components/cards/OrderCard.jsx` | Check `order.riderStatus === 'dispatched'` (was `'riderReached'`). `data-testid` renamed to `rider-status-dispatched-${orderId}`. Pill text **stays `Order Accepted`** (per owner directive). |
| 2b | OrderCard fOS=2 comment | `src/components/cards/OrderCard.jsx` L924 | Comment example updated `'riderReached'` → `'dispatched'`. Logic unchanged (else-arm already catches the new value). |
| 2c | OrderCard fOS=5 carve-out (new) | `src/components/cards/OrderCard.jsx` L958–973 | New outer ternary: `isDelivery && order.riderStatus === 'dispatched'` → disabled `<button data-testid="rider-on-the-way-btn-${orderId}">Rider is on the way</button>`. Existing Settle / Bill branches preserved verbatim as the `else` path. |
| 3a | TableCard fOS=2 comment | `src/components/cards/TableCard.jsx` L473 | Same example-comment update. Logic unchanged. |
| 3b | TableCard fOS=5 carve-out (new) | `src/components/cards/TableCard.jsx` L537–552 | New outer ternary: `isDelivery && table.order?.riderStatus === 'dispatched'` → disabled `<TextButton testId="rider-on-the-way-btn-${table.id}">On the way..</TextButton>`. Existing Settle / Bill branches preserved verbatim. |

Total 3 files touched. No deletions. No renames. No new files.

---

## 2. Final Mapping (post-patch, owner-approved)

```
delivery_man_id set AND delivery_man_status === "No"    → riderStatus = 'riderAssigned'
delivery_man_id set AND delivery_man_status === "Yes"   → riderStatus = 'dispatched'  ← was 'riderReached', now retired
no delivery_man_id  AND order_dispatch_status === "Yes" → riderStatus = 'dispatched'
otherwise                                                → riderStatus = null
```

Both the rider-pickup case and the manual-dispatch case now share a single semantic value: `'dispatched'` (= "order has left the restaurant, en route to customer").

---

## 3. UI Behavior Truth Table (post-patch)

| Card | `isDelivery` | `riderStatus` | `fOrderStatus` | Result |
|---|---|---|---|---|
| OrderCard | true | `null` | 2 | Assign Rider / Dispatch (per `deliveryAssign` flag) — unchanged |
| OrderCard | true | `riderAssigned` | 2 | **`Waiting for Rider`** (disabled, orange) — unchanged |
| OrderCard | true | `dispatched` | 2 | **`Reassign`** (clickable, orange) — unchanged (else-arm of fOS=2 sub-branch matches `'dispatched'` now) |
| OrderCard | true | `dispatched` | 5 | **`Rider is on the way`** (disabled, orange) ← **NEW** |
| OrderCard | true | `riderAssigned` (edge — pending pickup at fOS=5) | 5 | Bill / Settle — unchanged |
| OrderCard | true | `null` | 5 | Bill / Settle — unchanged |
| OrderCard | false | any | any | Serve / Bill / Settle — unchanged |
| OrderCard rider chip | true | `riderAssigned` | — | Pill `Assigned` (orange) — unchanged |
| OrderCard rider chip | true | `dispatched` | — | Pill `Order Accepted` (green), `data-testid=rider-status-dispatched-${orderId}` — text unchanged, testid renamed |
| TableCard | true | `null` | 2 | Assign / Dispatch — unchanged |
| TableCard | true | `riderAssigned` | 2 | **`Waiting..`** (disabled) — unchanged |
| TableCard | true | `dispatched` | 2 | **`Reassign`** (clickable) — unchanged |
| TableCard | true | `dispatched` | 5 | **`On the way..`** (disabled, orange) ← **NEW** |
| TableCard | true | other | 5 | Bill / C/Out / Settle — unchanged |
| TableCard | false | any | any | Serve / Bill / Settle / C/Out — unchanged |

---

## 4. File-Level Diff Summary

### 4A. `src/api/transforms/orderTransform.js` (L289–311 area)

- L300 comment: `Rule 1: delivery_man_id exists + accepted → riderReached` → `Rule 1: delivery_man_id exists + accepted (rider picked up) → dispatched`.
- Added 3-line NOTE explaining the rename and rationale.
- L305 code: `return 'riderReached'` → `return 'dispatched'`.
- Rules 2/3/4 unchanged in code.

### 4B. `src/components/cards/OrderCard.jsx`

- L788–796 — pill block:
  - Condition: `order.riderStatus === 'riderReached'` → `order.riderStatus === 'dispatched'`.
  - `data-testid`: `rider-status-reached-${orderId}` → `rider-status-dispatched-${orderId}`.
  - Pill text **`Order Accepted` unchanged**.
  - Comment block updated.
- L923–924 — fOS=2 sub-branch comment updated (example value).
- L958–985 — fOS=5 block: outer ternary added; existing Settle / Bill blocks preserved verbatim as the else path.

### 4C. `src/components/cards/TableCard.jsx`

- L473 — fOS=2 sub-branch comment updated (example value).
- L537–562 — fOS=5 block: outer ternary added; existing Settle / Bill blocks preserved verbatim as the else path.

---

## 5. Build Verification

```
$ cd /app/frontend && CI=false yarn build
$ craco build
Creating an optimized production build...
Compiled with warnings.

[eslint]
src/components/order-entry/OrderEntry.jsx
  Line 1259:6:  React Hook useCallback has an unnecessary dependency: 'printOrder'.
                ← pre-existing, unrelated to BUG-097

File sizes after gzip:
  452.25 kB (-57 B)  build/static/js/main.f749afc8.js
  16.68 kB           build/static/css/main.7689dfef.css

Done in 19.90s.
```

- Build status: **PASS** (0 errors).
- Single warning is in `OrderEntry.jsx` and is pre-existing; not touched by this patch.
- Bundle delta: **-57 B** vs. previous patch (`main.3a5d4052.js` 452.31 kB → `main.f749afc8.js` 452.25 kB). The rename retires `'riderReached'` literals; the new JSX branches roughly offset the savings.

---

## 6. What Was NOT Changed (explicit exclusion list — honoured)

| Excluded | Status |
|---|---|
| `socketHandlers.js` | UNTOUCHED |
| `socketEvents.js` | UNTOUCHED |
| `deliveryService.js` | UNTOUCHED |
| `constants.js` | UNTOUCHED |
| `profileTransform.js` | UNTOUCHED |
| `AssignRiderModal.jsx` | UNTOUCHED |
| `DeliveryCard.jsx` | UNTOUCHED |
| `CartPanel.jsx` | UNTOUCHED (per Q2=a) |
| Non-delivery card behavior (Serve / Bill / room Checkout) | UNTOUCHED |
| Bucket 5 sockets (rider accept, rider reject) | NOT IMPLEMENTED — backend-blocked |
| Rejected-rider grey-out in modal | NOT IMPLEMENTED — backend-blocked |
| Customer-received / final handover-complete exit transition | NOT IMPLEMENTED — backend-blocked |
| `/app/memory/final/` | NOT UPDATED |
| Baseline docs | NOT UPDATED |
| PROD-BUG-001 / 002 / 003, BUG-099, BUG-104 | NOT TOUCHED |

---

## 7. Risk Assessment (post-implementation)

| Item | Risk | Reasoning |
|---|---|---|
| Transform rename | LOW | Single-line value change. All in-scope consumers updated in lockstep in the same patch. |
| OrderCard pill | LOW | Pill text unchanged, only check value + testid updated. |
| OrderCard fOS=2 else-arm now matches `'dispatched'` | LOW | Previously matched `'riderReached'`. The behavior is identical because the same backend state maps to the new value. |
| OrderCard fOS=5 new branch | LOW | Outer ternary; existing Settle/Bill preserved verbatim. |
| TableCard fOS=5 new branch | LOW | Same structure; tile-friendly short label "On the way..". |
| Tile width for "On the way.." | LOW | 13 chars; same row already supports "Reassign" (8) and "Waiting.." (10). |
| `canBill === false` edge | Honoured | Q3=(a) — guard kept. Non-billing users see no right-side button at fOS=5 regardless of rider state, matching today's behavior. |
| Optimistic update onAssigned | LOW | Sets `riderStatus: 'riderAssigned'` (correct — rider just assigned, not yet picked up). No change needed. |
| Tests | LOW | No automated test exists for this combination. `data-testid=rider-on-the-way-btn-*` and `rider-status-dispatched-*` are unique, non-clashing. |

---

## 8. Out-of-Scope Residual References (FLAGGED for follow-up hygiene CR — NOT updated in this patch)

The `'riderReached'` token still exists in **two non-runtime locations** that are outside the owner-approved scope of this patch. They are harmless (dead/dev paths) but should be cleaned up in a follow-up hygiene CR:

| File | Line | Reference | Live runtime impact? |
|---|---|---|---|
| `src/data/mockOrders.js` | L3 (comment), L35 (data value `riderStatus: "riderReached"`) | Dev/demo seed only. | NONE — not consumed by the production transform path. Dev preview using mock data will not render the green "Order Accepted" pill until updated. |
| `src/utils/statusHelpers.js` | L59 (`RIDER_STATUS_CONFIG.riderReached` entry) | Status-config lookup table. | NONE — `RIDER_STATUS_CONFIG` is exported but verified by grep to have no UI consumer in the active codebase. |

Recommendation: open a separate single-file hygiene CR to retire these two references. Outside this patch by owner directive ("orderTransform.js, OrderCard.jsx, TableCard.jsx" only).

In-code documentation comments under `orderTransform.js` L306 and `OrderCard.jsx` L789 intentionally mention the retired name to explain the historical context — these are **descriptive**, not consumed at runtime.

---

## 9. Files Changed (final)

```
src/api/transforms/orderTransform.js              (1 return value + 1 doc-comment block)
src/components/cards/OrderCard.jsx                (pill check + testid + comment; fOS=5 outer ternary)
src/components/cards/TableCard.jsx                (fOS=2 comment; fOS=5 outer ternary)
```

3 files. No deletions. No renames. No new files.

---

## 10. Pending After This Patch

- Owner smoke QA per `POS3_0_BUG_097_RIDER_ON_THE_WAY_FOS5_OWNER_SMOKE_QA_CHECKLIST_2026_05_21.md` (created alongside this report).
- Bucket 5 — rider accept/reject sockets, rejected-rider grey-out, customer-received exit signal — still backend-blocked.
- Hygiene follow-up — retire `'riderReached'` from `mockOrders.js` + `statusHelpers.js` (out of scope here).

---

## Document Metadata

| Field | Value |
|---|---|
| Version | 1.0 |
| Created | 2026-05-21 |
| Implementation type | Transform rename + UI label/branching, frontend-only |
| Build | PASS (`craco build` Done in 19.90s, hash `main.f749afc8.js`) |
| Tests added | none (label/branching only — covered by owner smoke checklist) |
| Backend dependency | none |
| `/app/memory/final/` updated | NO |
| Baseline docs updated | NO |
