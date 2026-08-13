# TAB / Credit Customer CRM Autofill Fix Report

> **Bug:** BUG-038 — Credit/TAB Customer CRM Autofill
> **Date:** 2026-05-15
> **Status:** ✅ **IMPLEMENTED** (pending owner smoke / QA sign-off)
> **Author note:** No commits. No backend change. No payload change.

---

## 1. Summary

Wired the existing `customerService.searchCustomers` CRM typeahead pattern into the Credit/TAB customer block inside `CollectPaymentPanel.jsx`, mirroring `CartPanel.jsx` 1:1. Mobile remains the unique key on the wire. The bill-payment payload (`tabContact: { name, phone }`) is **byte-identical** to before. No `customer_id`, no other payment mode affected, no new file created.

**Single file changed: `frontend/src/components/order-entry/CollectPaymentPanel.jsx`** (+186 / −26 LoC per `git diff --stat`).

---

## 2. Files Changed

| Path | Op | LoC | Surface |
|---|---|---|---|
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` | EDIT | +186 / −26 | Credit/TAB customer block only (inside `isTabPayment && !showSplit`) + 1 import + 5 state hooks + 2 refs + 2 search useEffects + 1 outside-click useEffect + 3 small helpers |

No new files created. No other files touched.

### 2.1 Explicitly verified untouched

| Path | Verification |
|---|---|
| `frontend/src/api/transforms/orderTransform.js` | `git diff` empty |
| `frontend/src/api/services/customerService.js` | not in `git status` |
| `frontend/src/api/services/orderService.js` | not in `git status` |
| `frontend/src/api/crmAxios.js` | not in `git status` |
| `frontend/src/api/constants.js` | not in `git status` |
| `frontend/src/components/order-entry/CartPanel.jsx` | not in `git status` |
| `frontend/src/components/order-entry/CustomerModal.jsx` | not in `git status` |
| `frontend/src/components/order-entry/OrderEntry.jsx` | not in `git status` |
| Backend / `POST /api/v2/vendoremployee/order/order-bill-payment` | no backend change |

`git status --short src/` shows exactly one entry: ` M src/components/order-entry/CollectPaymentPanel.jsx`.

---

## 3. Diff Inventory (5 hunks in 1 file)

### Hunk A — Import (top of file, after `tableService` import)

```js
import * as tableService from "../../api/services/tableService";
// BUG-038 (May-2026): CRM typeahead helper for the Credit/TAB customer
// block. Mirrors CartPanel.jsx usage. Mobile remains the unique key —
// no `customer_id` propagation, no payload-shape change.
import { searchCustomers } from "../../api/services/customerService";
import PaymentMethodButton, { PaymentMethodButtonInline } from "./PaymentMethodButton";
```

### Hunk B — New state hooks + refs (after existing `tabName`/`tabPhone` lines)

```js
// BUG-038 (May-2026): CRM typeahead state for the Credit/TAB customer
// block, mirroring CartPanel.jsx:323–333. Mobile is the unique key.
// We deliberately do NOT capture c.id — owner decision: no customer_id
// in the bill-payment payload, mobile-only dedupe on backend.
const [tabFilteredByPhone, setTabFilteredByPhone] = useState([]);
const [tabFilteredByName, setTabFilteredByName] = useState([]);
const [tabShowPhoneSuggestions, setTabShowPhoneSuggestions] = useState(false);
const [tabShowNameSuggestions, setTabShowNameSuggestions] = useState(false);
const [tabIsCustomerSelected, setTabIsCustomerSelected] = useState(!!customer?.id);
const tabPhoneInputRef = useRef(null);
const tabNameInputRef = useRef(null);
```

### Hunk C — Two CRM-search useEffects + outside-click useEffect + helpers (after `isTabPayment` line)

- **Phone search useEffect** — `tabPhone.length >= 3`, gated by `tabIsCustomerSelected` and `isTabPayment` (no-op for non-TAB methods).
- **Name search useEffect** — `tabName.length >= 2`, same gating.
- **Outside-click useEffect** — closes overlays on click outside; respects `data-suggestion-tab="true"` marker so suggestion-button clicks are not pre-empted.
- **`selectTabCustomer(c)`** — writes `c.name` + `c.phone` into state; closes overlays; sets `tabIsCustomerSelected = true`. **`c.id` is explicitly discarded**.
- **`handleTabNameChange(e)`** — writes typed name; if blanked while `tabIsCustomerSelected`, clears `tabPhone` and resets selection (parity with `CartPanel.handleNameChange`).
- **`handleTabPhoneChange(e)`** — digit-only sanitiser; same blank-out-resets-selection symmetry.

### Hunk D — Input wrap with refs + suggestion overlays (inside `{isTabPayment && !showSplit && (…)}` block)

Two `<div className="relative" ref={…}>` wrappers around the existing inputs, plus a positioned suggestion `<div>` per input rendered only when `tabShow*Suggestions && tabFiltered*.length > 0`. Each suggestion is a `<button data-suggestion-tab="true" onMouseDown={() => selectTabCustomer(c)}>` showing `c.name` + `c.phone`.

- **Existing input styles preserved** — placeholders, validation borders, error backgrounds, `data-testid` attributes all unchanged on the inputs themselves.
- **Existing validation block at the bottom of the section preserved** verbatim (the "Name is required for credit/TAB orders" / "Enter 10-digit phone number" error message renders below the inputs unchanged).
- **`onFocus`** restores a previously-built suggestion list if the cashier tabs back into the field — matches CartPanel UX.

### Hunk E — Outbound payload (line 683 of edited file) — **NO CHANGE**

```js
tabContact: isTabPayment ? { name: tabName, phone: tabPhone } : null,
```

Confirmed via direct grep — line is byte-identical to pre-fix state.

---

## 4. CRM Autofill Behavior Implemented

| Cashier action | Behaviour |
|---|---|
| Types ≥ 3 digits into the phone field while not selected | `searchCustomers(tabPhone)` fires (≤ 10 results); overlay shows under phone input |
| Types ≥ 2 chars into the name field while not selected | `searchCustomers(tabName)` fires; overlay shows under name input |
| Picks a suggestion from either overlay | `tabName ← c.name`, `tabPhone ← c.phone`, both overlays close, `tabIsCustomerSelected = true`, future keystrokes do NOT re-trigger search |
| Edits name after a pick (e.g. appends "— corporate") | Typed value retained; no re-search; phone retained |
| Edits phone after a pick (e.g. corrects last digit) | Typed value retained; no re-search; name retained |
| **Blanks** the name field after a pick | `tabPhone` cleared; `tabIsCustomerSelected = false`; search re-enables |
| **Blanks** the phone field after a pick | `tabName` cleared; symmetric reset |
| Types 10 digits with no CRM match | Empty overlay → cashier proceeds manually; existing validation passes once both fields are filled |
| CRM API fails (5xx, network drop, X-API-Key reject) | `searchCustomers` catches and returns `[]` → no overlay, no toast, no banner, no error UI → manual entry still works |
| Clicks outside the inputs | Both overlays close |
| Clicks a suggestion button | Pick fires before outside-click logic closes the overlay (handled by `onMouseDown` + `data-suggestion-tab="true"` marker check) |

---

## 5. Payload Safety — Confirmed

### 5.1 `paymentData.tabContact` (CollectPaymentPanel.jsx:683)

```js
tabContact: isTabPayment ? { name: tabName, phone: tabPhone } : null,
```

**Identical to pre-fix.** `git diff` shows zero modification to this line.

### 5.2 `orderTransform.collectBillExisting` payload

`git diff src/api/transforms/orderTransform.js` → **empty diff**. Backend's `POST /api/v2/vendoremployee/order/order-bill-payment` payload contract preserved bit-for-bit. Fields shipped continue to be:

```js
name:   tabContact?.name  || '',
mobile: tabContact?.phone || '',
```

### 5.3 No `customer_id` anywhere

`grep -n "customer_id\|tabCustomerId\|c\.id" src/components/order-entry/CollectPaymentPanel.jsx` returns only:

| Line | Match | Context |
|---|---|---|
| 9 | `customer_id` | Comment in import header |
| 337 | `c.id` | Comment in state block |
| 413, 414 | `c.id` / `customer_id` | Comments in `selectTabCustomer` |
| 2241 | `c.id` | Comment above suggestion render |
| **2269, 2307** | `key={c.id}` | **React `key` prop on suggestion `<button>`** — UI-only, not in any payload |
| **2273, 2311** | `data-testid={`…-${c.id}`}` | **Test ID** — UI-only, not in any payload |

No `customer_id` is added to any object that flows into `tabContact`, `paymentData`, or `collectBillExisting`. **The CRM `c.id` is never written into React state** — `selectTabCustomer(c)` only writes `c.name` and `c.phone`.

### 5.4 Mobile remains unique key

The only customer identifier reaching the wire is `tabPhone` → `mobile`. Backend dedupe / ledger logic continues to key off `mobile`. No FE-side concept of customer identity beyond what was shipped pre-fix.

---

## 6. Non-Credit/TAB Payment Modes — Confirmed Untouched

All new code is gated by either:
- `isTabPayment && !showSplit` (render branch — JSX only renders for Credit/TAB), or
- `if (!isTabPayment) return;` (search useEffects no-op for non-TAB methods), or
- The render condition for the suggestion overlay (`tabShow*Suggestions && tabFiltered*.length > 0`).

Structurally unreachable from:

| Payment mode | Why unreachable |
|---|---|
| **Cash** | `paymentMethod === 'cash'` → `isTabPayment === false` → render skipped, effects no-op |
| **UPI** | Same |
| **Card** | Same; renders its own `cardTxnId` section instead |
| **Split** | `!showSplit` gate excludes the block |
| **Transfer-to-Room** | Renders its own room-picker section instead |
| **PayLater (status-9)** | Separate payment-method value; `isTabPayment === false` |
| **Hold/On-Hold (status-8)** | Order-status path; does not reach CollectPaymentPanel as `credit`/`tab` |
| **Order placement (CartPanel flow)** | Different file; not touched |
| **Delivery customer selection** | Different surface; not touched |

Every input wired in this hunk is reachable **only** when `isTabPayment === true && showSplit === false`.

---

## 7. QA / Static Check Results

### 7.1 Static checks performed in this session

| Check | Result |
|---|---|
| `mcp_lint_javascript` on `CollectPaymentPanel.jsx` | ✅ No issues found |
| `git status --short src/` | Only `M src/components/order-entry/CollectPaymentPanel.jsx` |
| `git diff --stat src/` | `1 file changed, 186 insertions(+), 26 deletions(-)` |
| `git diff src/api/transforms/orderTransform.js` | Empty (untouched) |
| `git diff src/api/services/customerService.js` | Empty (untouched) |
| Grep for `customer_id`, `tabCustomerId`, `c.id` writes into state/payload | Only `key={c.id}` (React key) and `data-testid` strings (UI) — never written to state, never written to payload. |
| Grep for `tabContact` in `CollectPaymentPanel.jsx` | Single match at line 683, unchanged |
| Supervisor status | `frontend RUNNING` — hot reload picks up the source edit automatically |

### 7.2 Manual QA pending (owner smoke pass)

The 20-item QA matrix from §12 of the implementation plan is ready for owner-side smoke. Highest-priority items:

| # | Scenario | Expected |
|---|---|---|
| 1 | Credit/TAB: type a known CRM phone | Suggestion appears; pick autofills name + phone |
| 2 | Credit/TAB: type an unknown phone | No suggestion; manual entry proceeds |
| 3 | Credit/TAB: pick, then append " — corporate" to name | Typed value retained; no re-search |
| 4 | Credit/TAB: pick, then blank the phone | Name clears; selection resets |
| 5 | Force CRM 500 via DevTools "Block request URL" on `/pos/customers` | No overlay; no error UI; manual Credit/TAB payment still completes |
| 6 | Submit bill | DevTools payload: only `name` + `mobile`; no `customer_id` |
| 7 | Cash / UPI / Card / Split / Transfer-to-Room | TAB block not rendered; no `[CRM] Customer search` log; no regression |
| 8 | Order Entry CartPanel CRM lookup | Unchanged — independent code path |

### 7.3 No automated test added

Per owner decision 7 and the implementation plan §10 Step 9, no unit/integration test file was added in this CR. If owner wants `fingerprint`-style unit coverage on `selectTabCustomer` later, a small RTL test on the suggestion-pick flow is trivial to add (state is fully isolated).

---

## 8. Strict-Rules Compliance Certification

| Rule | Status |
|---|---|
| Did NOT change `orderTransform.js` | ✅ `git diff` empty |
| Did NOT change `collectBillExisting` | ✅ Same file, same diff (untouched) |
| Did NOT change bill-payment payload | ✅ Line 683 byte-identical |
| Did NOT add `customer_id` | ✅ `c.id` only in React key + data-testid; never reaches state/payload |
| Did NOT modify backend / API services | ✅ `customerService.js` not in `git status` |
| Did NOT change PayLater | ✅ Different path; gated out |
| Did NOT change Cash / UPI / Card / Split / Transfer-to-Room | ✅ Gated out by `isTabPayment && !showSplit` |
| Did NOT change Hold/on-hold | ✅ Different status path |
| Did NOT change order placement | ✅ `CartPanel.jsx` / `OrderEntry.jsx` untouched |
| Did NOT change delivery customer selection | ✅ Separate surface; untouched |
| Did NOT change VAT / service charge / tip / delivery charge logic | ✅ None of those fields touched |
| Single allowed file modified | ✅ Only `CollectPaymentPanel.jsx` |
| No commits | ✅ Working tree only |
| No backend changes | ✅ |
| Owner decisions 1–8 honoured 1:1 | ✅ |

---

## 9. Rollback Plan

Revert the single file:

```bash
git checkout HEAD -- /app/frontend/src/components/order-entry/CollectPaymentPanel.jsx
```

That alone fully reverts the fix to pre-change state. No cleanup needed elsewhere.

---

## 10. Next Steps

1. **Owner smoke pass** using §7.2 above (especially scenarios 1, 5, 6 — they're the locked-decision verifiers).
2. After smoke passes, update `BUG_PENDING_TASK_REGISTER` to mark BUG-038 as `implemented_pending_smoke` → `closed_after_smoke`.
3. Optional follow-ups (deferred per implementation plan §13):
   - Phone-blur exact `lookupCustomer(phone)` (Option C in BUG-038) — only if owner sees real-world cases where cashiers skip the typeahead and type the full 10 digits.
   - Loyalty / wallet info in the suggestion overlay — product call, not in scope today.

---

— End of TAB / Credit Customer CRM Autofill Fix Report —
