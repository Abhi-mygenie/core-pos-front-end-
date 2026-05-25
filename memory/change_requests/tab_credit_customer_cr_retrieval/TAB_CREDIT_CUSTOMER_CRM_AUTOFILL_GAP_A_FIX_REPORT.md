# TAB / Credit Customer CRM Autofill — GAP-A Fix Report

> **Bug:** BUG-038 GAP-A — `tabIsCustomerSelected` seed gates search useEffects for re-engaged orders
> **Date:** 2026-05-15
> **Status:** ✅ **IMPLEMENTED** (pending owner runtime smoke)
> **Author note:** No commits. No backend change. No payload change. One-line fix per owner approval.
> **Predecessor:** `TAB_CREDIT_CUSTOMER_CRM_AUTOFILL_LIVE_SMOKE_GAP_ANALYSIS.md` (same folder, §2.4 patch)

---

## 1. Summary

Applied the one-line patch approved by owner. Changed the initial value of `tabIsCustomerSelected` from `!!customer?.id` (which evaluated to `true` for re-engaged orders carrying a stored CRM linkage, permanently blocking the search useEffects) to `false`. The search now fires on cashier typing regardless of upstream `customer.id` state.

Selection-state semantics after a CRM pick are preserved: `selectTabCustomer` still flips `tabIsCustomerSelected` to `true`, and `handleTab*Change` still resets on blank-out. Typed-value-respected and blank-out-reset behaviours are unchanged.

**Single file, single line of business logic changed.** No payload change, no `customer_id`, no other surface touched.

---

## 2. Files Changed

| Path | Op | Net LoC (incl. comment) | Surface |
|---|---|---|---|
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` | EDIT | +9 / −1 (1 line of business logic + 8-line explanatory comment) | Credit/TAB CRM typeahead initial state only |

### 2.1 Untouched files — verified

| Path | `git diff` |
|---|---|
| `frontend/src/api/services/customerService.js` | empty |
| `frontend/src/api/transforms/orderTransform.js` | empty |
| `frontend/src/api/services/orderService.js` | empty |
| `frontend/src/api/crmAxios.js` | empty |
| `frontend/src/api/constants.js` | empty |
| `frontend/src/components/order-entry/CartPanel.jsx` | empty |
| `frontend/src/components/order-entry/OrderEntry.jsx` | empty |
| `frontend/src/components/order-entry/CustomerModal.jsx` | empty |
| All non-Credit/TAB payment-mode JSX inside `CollectPaymentPanel.jsx` | empty |
| Backend / `POST /api/v2/.../order-bill-payment` | not touched |

`git status --short frontend/src/` returns exactly one entry:
```
M frontend/src/components/order-entry/CollectPaymentPanel.jsx
```

---

## 3. Exact One-Line Fix

### Before (line 343 in original, pre-fix)

```js
const [tabIsCustomerSelected, setTabIsCustomerSelected] = useState(!!customer?.id);
```

### After (now at line 351 due to comment block)

```js
// BUG-038 GAP-A (May-2026): always seed false. In CartPanel the gate
// protects an in-progress order build; in Collect Payment the cashier
// may legitimately want to bill a different/verified credit customer
// even when the order already has an upstream customer.id (e.g.
// re-engaged orders, corporate invoice flow, record verification).
// Pre-fix value `!!customer?.id` permanently blocked search on
// re-engaged orders. Picking a suggestion still flips this true via
// selectTabCustomer; blank-out still resets via handleTab*Change.
const [tabIsCustomerSelected, setTabIsCustomerSelected] = useState(false);
```

**Net business-logic change:** `useState(!!customer?.id)` → `useState(false)`. One expression. Eight lines of accompanying comment explaining why Credit/TAB diverges from CartPanel on this gate.

---

## 4. Behavioural Matrix (before vs after)

| Scenario | Pre-fix-A | Post-fix-A |
|---|---|---|
| New order, no upstream `customer.id`, cashier types in Credit/TAB | Search fires ✓ | Search fires ✓ (unchanged) |
| **Re-engaged order with stored `customer.id`, cashier types in Credit/TAB** | **Search blocked ✗ (owner-observed defect)** | **Search fires ✓ (fixed)** |
| Cashier picks a CRM suggestion from the typeahead | `tabIsCustomerSelected → true` → no re-search until blank-out ✓ | Same ✓ |
| Cashier edits name after pick (e.g. "abhishek — corporate") | Typed value retained; no re-search ✓ | Same ✓ |
| Cashier blanks the name or phone field after pick | Sibling field cleared; `tabIsCustomerSelected → false`; search re-enables ✓ | Same ✓ |
| CRM API returns 5xx / network drop | `searchCustomers` returns `[]`; no overlay; manual entry works ✓ | Same ✓ |
| CRM API returns 401 (GAP-B, pre-existing) | `searchCustomers` returns `[]`; no overlay; manual entry works ✓ | Same — **call now fires** but result is `[]` until GAP-B is fixed separately |
| Cashier switches to Cash / UPI / Card / Split / Transfer-to-Room | Search useEffects no-op (`if (!isTabPayment) return;`) ✓ | Same ✓ |
| Bill submit | `tabContact: { name, phone }` only ✓ | Same ✓ (no payload change) |

---

## 5. Static Checks Performed

| Check | Tool | Result |
|---|---|---|
| ESLint on `CollectPaymentPanel.jsx` | `mcp_lint_javascript` | ✅ **No issues found** |
| `tabContact` payload byte-identical vs commit `07c60b3` (pre-BUG-038) | `diff` | ✅ **IDENTICAL** — `tabContact: isTabPayment ? { name: tabName, phone: tabPhone } : null,` |
| Grep `"customer_id"\|tabCustomerId` outside comments | `grep -nE` | ✅ Zero non-comment occurrences |
| `git status --short frontend/src/` | git | ✅ Only `M src/components/order-entry/CollectPaymentPanel.jsx` |
| Modified line confirmed at line 351 | `grep -n` | ✅ `const [tabIsCustomerSelected, setTabIsCustomerSelected] = useState(false);` |

---

## 6. Owner Smoke Re-Test Plan

After this patch, owner should re-run the screenshot 1 scenario:

1. Open the same re-engaged order that previously showed no API calls.
2. Tap **Credit** as the payment method.
3. Confirm DevTools → Network → Fetch/XHR shows `GET /api/pos/customers?search=…&limit=10` firing **immediately on mount** (because `tabName` + `tabPhone` are pre-populated and ≥ thresholds).
4. Edit the name or phone field by even one character → next `customers?search=…` call should fire.

**Important caveat:** the calls will currently still return **401** (GAP-B, pre-existing CRM auth issue, out of scope of this CR). That's the **expected** state until GAP-B is fixed separately. The point of this smoke is to confirm that the **wire works**: requests are now being **sent** with the correct query parameters. Once GAP-B is fixed (e.g. `X-API-Key` accepted by `crm.mygenie.online`), suggestion overlays will start rendering on the same wire — **no further frontend change needed**.

---

## 7. Compliance — Confirmations

| Confirmation | Status |
|---|---|
| Files changed | Only `frontend/src/components/order-entry/CollectPaymentPanel.jsx` |
| Exact change | `useState(!!customer?.id)` → `useState(false)` (one expression) |
| CRM search now fires when typing name/phone in Credit/TAB | ✅ Gate `if (tabIsCustomerSelected) return;` no longer short-circuits at mount for re-engaged orders. Both phone-search (≥ 3 digits) and name-search (≥ 2 chars) useEffects will reach the `searchCustomers(…)` call on the next render where `tabName`/`tabPhone` deps trip. |
| No payload change | ✅ `tabContact` line byte-identical to pre-BUG-038 baseline. `orderTransform.collectBillExisting` untouched (zero diff). |
| No `customer_id` | ✅ Zero non-comment occurrences of `customer_id` / `tabCustomerId`. `c.id` continues to be used only for React `key` props and `data-testid` strings. |
| Mobile remains unique key | ✅ Only `tabPhone → mobile` reaches the wire. Backend dedupe logic unchanged. |
| Manual entry still works | ✅ `searchCustomers` returns `[]` on no-match or auth failure → no overlay → existing validation block (preserved verbatim) gates submission → manual entry path identical to pre-fix. |
| Credit/TAB only scope | ✅ `tabIsCustomerSelected` is referenced only inside `isTabPayment`-gated useEffects and the Credit/TAB JSX block. |
| No disruptive toast | ✅ No toast added anywhere. CRM failure remains console-only (`[CRM] Customer search failed:` warning). |
| CRM 401 (GAP-B) NOT touched | ✅ Out of scope per owner directive. `customerService.js`, `crmAxios.js`, `constants.js`, `X-API-Key` config — all untouched. GAP-B affects CartPanel + CustomerModal + this surface identically; recommended to file as separate bug. |
| `/app/memory/final/*` untouched | ✅ |
| No commits | ✅ |
| No backend change | ✅ |
| Non-Credit/TAB payment modes unaffected | ✅ Structurally — `isTabPayment` gates every CRM code path |

---

## 8. Rollback Plan

Single-character revert:

```bash
# Revert the entire BUG-038 CR (both implementation + GAP-A patch)
git checkout HEAD~N -- frontend/src/components/order-entry/CollectPaymentPanel.jsx
```

Or, to revert only GAP-A while keeping the BUG-038 implementation, restore line 351 to `useState(!!customer?.id)`. Either revert path is one-line and surgical.

---

## 9. Next Steps

1. **Owner runtime smoke** per §6 — confirm `customers?search=…` calls now fire on the re-engaged order Credit/TAB section. Calls expected to 401 until GAP-B is addressed.
2. **File GAP-B as a separate bug** (suggested ID: `BUG-038-FU-CRM-AUTH` or new `BUG-050`). Diagnose `X-API-Key` rejection on `crm.mygenie.online`. Pre-existing; affects CartPanel + CustomerModal + Credit/TAB autofill platform-wide.
3. **Close BUG-038** as `implemented_pending_gap_b` (or `closed_after_smoke` if owner accepts the wire-only verification given GAP-B is a known separate bug).

---

— End of TAB / Credit Customer CRM Autofill — GAP-A Fix Report —
