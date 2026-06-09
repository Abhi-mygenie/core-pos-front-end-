# TAB / Credit Customer CRM Autofill Implementation Plan

> **Mode:** Scrutiny + implementation planning only. No code change, no commit, no refactor.
> **Date:** 2026-05-15
> **Bug:** BUG-038 — Credit/TAB Customer CRM Autofill
> **Predecessor docs:**
> - `/app/memory/bugs/BUG_038_CREDIT_CUSTOMER_CRM_AUTOFILL_IMPACT_ANALYSIS.md`
> - `/app/memory/change_requests/tab_credit_customer_cr_retrieval/TAB_CREDIT_CUSTOMER_CRM_CR_RETRIEVAL.md`

---

## 1. Summary

Owner has unparked BUG-038 with a **tightly scoped UX-only direction**: wire CRM typeahead and autofill into the Credit/TAB customer block inside `CollectPaymentPanel.jsx`, mirroring the existing `CartPanel.jsx` pattern. **Mobile remains the backend's unique key**; **no payload change**; **no `customer_id` propagation**; **no transform change**. The fix lives entirely inside the `isTabPayment && !showSplit` conditional block at `CollectPaymentPanel.jsx:2129–2171`, with two additional state hooks, two CRM-search `useEffect`s, one outside-click handler, and a minimal suggestion overlay JSX. No other payment mode is touched.

Estimated envelope: **~50 net LoC, one file edited (`CollectPaymentPanel.jsx`), zero new files**.

---

## 2. Baseline Docs Read

### `/app/memory/final/` (baseline rules)
- `ARCHITECTURE_DECISIONS_FINAL.md` — Module 3 (Customer/CRM) names `customerService.searchCustomers` + `lookupCustomer` as canonical CRM access. Module 5 (Payments) does NOT prescribe a separate customer-capture flow.
- `MODULE_DECISIONS_FINAL.md` — §3 Customer: CRM owns `customer_id`, `name`, `phone`. §5 Payments: payload carries customer-identifying fields only (today: `name` + `mobile`).
- `IMPLEMENTATION_AGENT_RULES.md` — `orderTransform.collectBillExisting` is flagged high-risk for shape changes; field-value additions are permitted. **This plan does not change shape.**
- `CHANGE_REQUEST_PLAYBOOK.md` — small UX additions in `CollectPaymentPanel.jsx` permitted when isolated to a single conditional block.
- `FINAL_DOCS_APPROVAL_STATUS.md`, `FINAL_DOCS_SUMMARY.md`, `OPEN_QUESTIONS_FINAL_RESOLUTION.md` — no AD/OD bound to Credit/TAB CRM linkage; no conflict.

### Current sprint accepted state
- `BASELINE_RECONCILIATION_REPORT_2026_05_04.md` — no Credit/TAB CRM item.
- `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` — no overlap.
- `PENDING_TASK_REGISTER_2026_05_04.md` — no overlap.
- `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md` — no overlap.
- `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` — not in this batch.

### Bug-specific
- `BUG_038_CREDIT_CUSTOMER_CRM_AUTOFILL_IMPACT_ANALYSIS.md` — Option A (UX wiring, no payload change) is now the locked path. Option B (payload `customer_id`) is explicitly **rejected** by owner.
- `TAB_CREDIT_CUSTOMER_CRM_CR_RETRIEVAL.md` (2026-05-15) — retrieval report; same conclusion.
- `BUG_PENDING_TASK_REGISTER_2026_05_12.md` rows 100, 174–177 — "Impact analysis present; plan-agent next."
- `BUG_CODE_VALIDATED_CONSOLIDATION_REPORT_2026_05_12.md` rows 40, 91, 172 — "Plan agent next; per impact-analysis doc."

### Code inspected
- `/app/frontend/src/api/services/customerService.js` — full file. `searchCustomers(query, limit=10)` at L20–32; `lookupCustomer(phone)` at L40–50.
- `/app/frontend/src/components/order-entry/CartPanel.jsx` L330–449 — CRM-wired customer pattern (state, two useEffects, outside-click handler, `selectCustomer`, `handleNameChange`, `handlePhoneChange`, `handleFieldBlur`).
- `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` L320–340, L545–580, L2100–2171 — current Credit/TAB block + `tabContact` payload field.
- `/app/frontend/src/api/transforms/orderTransform.js` L1270–1271 — `collectBillExisting` carries only `name` + `mobile`. **Not touched by this plan.**

---

## 3. Owner Decisions Applied

| # | Decision | How the plan honours it |
|---|---|---|
| 1 | Credit/TAB customer block uses CRM lookup/autofill | Mirror `CartPanel` typeahead pattern inside the `isTabPayment && !showSplit` block |
| 2 | Mobile number is the unique key | Typing in phone field drives search; mobile stays the primary identifier; lookup by phone is the dominant flow |
| 3 | No `customer_id` dependency | New local state `tabIsCustomerSelected` flag only — no `tabCustomerId` state, no `c.id` capture |
| 4 | Do NOT change bill-payment payload | `paymentData.tabContact = { name: tabName, phone: tabPhone }` stays identical (CollectPaymentPanel.jsx:574) |
| 5 | Do NOT add `customer_id` to collect-payment payload | Confirmed — no payload key added anywhere |
| 6 | Implement only autofill/typeahead behaviour | Two `useEffect`s + suggestion overlay + outside-click + `selectCustomer`; identical thresholds to CartPanel |
| 7 | Keep the fix inside Credit/TAB customer UI path only | All changes live within `{isTabPayment && !showSplit && (…)}` at L2130–2171 plus 4 hook calls in the state block |
| 8 | No impact to PayLater / Cash / UPI / Card / Split / Transfer-to-Room / Hold | New state is only referenced inside the Credit/TAB conditional render; non-TAB branches structurally cannot reach the new code |

---

## 4. Existing CRM Lookup Pattern (`CartPanel.jsx`)

### 4.1 Service helpers (`customerService.js`)

```js
// /app/frontend/src/api/services/customerService.js

export const searchCustomers = async (query, limit = 10) => {
  if (!query || query.trim().length < 2) return [];
  try {
    const response = await crmApi.get(API_ENDPOINTS.CUSTOMER_SEARCH, {
      params: { search: query.trim(), limit },
    });
    if (!response.data?.success) return [];
    return fromAPI.searchResults(response.data?.data?.customers || []);
  } catch (err) {
    console.warn('[CRM] Customer search failed:', err.readableMessage || err.message);
    return [];
  }
};

export const lookupCustomer = async (phone) => { /* exact-phone lookup, returns null on failure */ };
```

Both helpers are **graceful-failure-by-design** — they catch errors, log a `[CRM]` warning, and return empty results. **No exception is propagated.** This is critical for owner decision 8 (CRM failure must not block manual Credit/TAB entry) — see §11 risk row 2.

### 4.2 State (`CartPanel.jsx` L323–333, L341–347)

```js
const [customerName,        setCustomerName]        = useState(customer?.name  || "");
const [customerPhone,       setCustomerPhone]       = useState(customer?.phone || "");
const [filteredCustomers,   setFilteredCustomers]   = useState([]);   // phone-search results
const [filteredByName,      setFilteredByName]      = useState([]);   // name-search results
const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);
const [showNameSuggestions,  setShowNameSuggestions]  = useState(false);
const [isCustomerSelected,   setIsCustomerSelected]   = useState(!!customer?.id);
const phoneInputRef = useRef(null);
const nameInputRef  = useRef(null);

useEffect(() => {
  if (customer) {
    setCustomerName(customer.name || "");
    setCustomerPhone(customer.phone || "");
    setIsCustomerSelected(!!customer.id);
  }
}, [customer]);
```

### 4.3 Search effects (L349–384)

```js
// Phone search — ≥3 chars, gated by isCustomerSelected
useEffect(() => {
  if (isCustomerSelected) { setFilteredCustomers([]); setShowPhoneSuggestions(false); return; }
  if (customerPhone.trim() && customerPhone.length >= 3) {
    searchCustomers(customerPhone).then(filtered => {
      setFilteredCustomers(filtered);
      setShowPhoneSuggestions(filtered.length > 0);
    });
  } else { setFilteredCustomers([]); setShowPhoneSuggestions(false); }
}, [customerPhone, isCustomerSelected]);

// Name search — ≥2 chars, gated by isCustomerSelected
useEffect(() => {
  if (isCustomerSelected) { setFilteredByName([]); setShowNameSuggestions(false); return; }
  if (customerName.trim() && customerName.length >= 2) {
    searchCustomers(customerName).then(filtered => {
      setFilteredByName(filtered);
      setShowNameSuggestions(filtered.length > 0);
    });
  } else { setFilteredByName([]); setShowNameSuggestions(false); }
}, [customerName, isCustomerSelected]);
```

**Debounce model:** none explicit; relies on the suggestion list being a passive overlay. React re-renders on each keystroke; each typing pause naturally batches the search. Acceptable in production today.

### 4.4 Outside-click handler (L386–402)

```js
useEffect(() => {
  const handleClickOutside = (e) => {
    if (e.target.closest('[data-suggestion="true"]')) return;       // ignore suggestion clicks
    if (phoneInputRef.current && !phoneInputRef.current.contains(e.target)) setShowPhoneSuggestions(false);
    if (nameInputRef.current  && !nameInputRef.current.contains(e.target))  setShowNameSuggestions(false);
  };
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);
```

### 4.5 Pick handler (L405–412)

```js
const selectCustomer = (c) => {
  setCustomerName(c.name);
  setCustomerPhone(c.phone);
  setShowPhoneSuggestions(false);
  setShowNameSuggestions(false);
  setIsCustomerSelected(true);
  onCustomerChange?.({ id: c.id, name: c.name, phone: c.phone });  // bubbles to OrderEntry
};
```

### 4.6 Edit-after-autofill behaviour (L415–438)

- `handleNameChange`: typed name overrides autofilled name. If the cashier blanks the name while a customer was previously selected, the phone is cleared too and `isCustomerSelected` is reset (treats "blank-out" as "start fresh search").
- `handlePhoneChange`: symmetric. Phone keystrokes go through `e.target.value.replace(/\D/g, '').slice(0, 10)` digit-only sanitiser. **Note:** this sanitiser is **identical** to the one already present in `CollectPaymentPanel.jsx:2152`. No new sanitiser logic needed.
- **Important:** while `isCustomerSelected === true`, the search useEffect is **gated off** (early return). So a cashier who picked a suggestion can edit the name to a custom value (e.g., "Mr Sharma — corporate") without re-firing the search and without losing the autofilled phone. Typed name wins.

### 4.7 Fields autofilled on suggestion pick

Two fields only — `name` and `phone`. `c.id` is captured into local state and bubbled up to the parent via `onCustomerChange`, but is **not part of the autofill render** itself.

---

## 5. Current Credit/TAB Customer UI (`CollectPaymentPanel.jsx`)

### 5.1 Render gate (L2130)

```jsx
{isTabPayment && !showSplit && (
  <div className="mt-3 pt-3 border-t" data-testid="tab-customer-section">
    ...
  </div>
)}
```

`isTabPayment` is computed at L335:

```js
const isTabPayment = paymentMethod === 'credit' || paymentMethod.toLowerCase() === 'tab';
```

So the block renders **only when** the active payment method is one of `'credit'`, `'tab'`, or `'TAB'` AND a split-bill is not in progress. **Non-TAB methods structurally cannot reach this render branch.**

### 5.2 Current state (L327–329)

```js
// BUG-239: TAB/Credit customer info
const [tabName,  setTabName]  = useState(customer?.name  || "");
const [tabPhone, setTabPhone] = useState(customer?.phone || "");
```

Seeded **once on mount** from the prop-supplied `customer` (which itself was set by `CartPanel`'s CRM lookup on the happy path). Never re-syncs.

### 5.3 Current inputs (L2134–2159)

```jsx
<input
  type="text"
  placeholder="Customer Name *"
  value={tabName}
  onChange={(e) => setTabName(e.target.value)}
  ...
  data-testid="tab-customer-name-input"
/>
<input
  type="tel"
  inputMode="numeric"
  maxLength={10}
  placeholder="Phone Number * (10 digits)"
  value={tabPhone}
  onChange={(e) => setTabPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
  ...
  data-testid="tab-customer-phone-input"
/>
```

Bare inputs. **Zero CRM wiring.** Confirmed by `grep -n 'searchCustomers\|lookupCustomer\|customerService' /app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` → zero matches.

### 5.4 Current validation (L2161–2169)

```jsx
{(!tabName.trim() || tabPhone.replace(/\D/g, '').length !== 10) && (
  <div className="text-xs mt-1.5" style={{ color: '#ef4444' }}>
    {/* "Name and 10-digit phone are required for credit/TAB orders" / variants */}
  </div>
)}
```

Inline error message; renders below the inputs. **No change planned** — autofill simply causes the validation to pass naturally once a CRM suggestion is picked.

### 5.5 Outbound payload (L574)

```js
tabContact: isTabPayment ? { name: tabName, phone: tabPhone } : null,
```

Flows to `orderTransform.collectBillExisting` (`orderTransform.js:1270–1271`):

```js
name:   tabContact?.name  || '',
mobile: tabContact?.phone || '',
```

**Identical post-fix.** No payload key added.

### 5.6 Reachable from which payment modes

Per L335 (`isTabPayment`): only `'credit'`, `'tab'`, `'TAB'`. Split-bill rows have their own per-row `method` field that never sets the parent `paymentMethod` to `'credit'`/`'tab'` simultaneously — so a Credit/TAB row inside split-bill does NOT render this block (the outer `!showSplit` gate excludes it). PayLater (`paymentMethod === 'payLater'` / status-9 territory) does not match `isTabPayment`. Hold (status-8) does not match. Cash / UPI / Card / Transfer-to-Room — none match.

---

## 6. Proposed Autofill Behavior

### 6.1 Typing in the phone field

| Cashier action | Plan behaviour |
|---|---|
| Types 1–2 digits | No CRM call; no suggestions |
| Types 3+ digits | `searchCustomers(tabPhone)` fires; suggestion overlay shows up to 10 matches |
| Types 10 digits | Suggestions still shown (no auto-pick); cashier picks or proceeds manually |
| Picks a suggestion | `tabName` ← `c.name`, `tabPhone` ← `c.phone`, `tabIsCustomerSelected` ← `true`, overlay closes |
| Edits phone after pick | If blanked → `tabName` cleared, `tabIsCustomerSelected` reset to `false`, search re-enables (parity with `CartPanel.handlePhoneChange`) |
| Types 10 digits with no match | Empty suggestion list → no overlay → cashier proceeds manually with typed name+phone (existing validation passes when both fields filled) |

**Phone-blur exact lookup (Option C from BUG-038)** is **NOT included in this scope.** Per owner decision 6 ("only autofill/typeahead behavior, same as existing Order Entry") and the fact that `CartPanel` does **not** do phone-blur lookup either — only typeahead. Including blur-lookup would create a UX divergence from Order Entry. Deferred to a follow-up if owner requests it later.

### 6.2 Typing in the name field

| Cashier action | Plan behaviour |
|---|---|
| Types 1 char | No CRM call |
| Types 2+ chars | `searchCustomers(tabName)` fires; suggestion overlay shows up to 10 matches |
| Picks a suggestion | `tabName` ← `c.name`, `tabPhone` ← `c.phone`, `tabIsCustomerSelected` ← `true`, overlay closes |
| Edits name after pick | Typed value respected; search remains gated off while `tabIsCustomerSelected === true`. If name is blanked → phone cleared, `tabIsCustomerSelected` reset, search re-enables |

### 6.3 Edit-after-autofill (typed value respected)

`tabIsCustomerSelected = true` is the gate that **stops the search useEffect from re-firing** after a pick. So once the cashier picks a suggestion, they can:
- Append "— corporate" / "Mr Sharma" to the name field — typed value is kept verbatim.
- Append extra digits or correct a typo in the phone — typed value is kept verbatim.

The only "reset" trigger is **blanking** either field (per `CartPanel.handleNameChange` / `handlePhoneChange`). This matches CartPanel parity 1:1.

### 6.4 CRM-miss path

If `searchCustomers` returns `[]` (no match), no overlay is shown and the cashier proceeds exactly as today: type name + 10-digit phone manually, hit pay. Backend ledger continues to dedupe by `mobile` (owner decision 2).

### 6.5 Selected CRM record storage

- `tabName`, `tabPhone` — already exist; updated by pick handler.
- `tabIsCustomerSelected` — **new local boolean**. Used only as the search-effect gate.
- **`tabCustomerId` — NOT introduced.** Owner decision 3 + 5 prevent it. Even though `c.id` is part of the `searchCustomers` response, the plan **does not store it**. This ensures there is no temptation to silently bleed it into the payload via a future refactor.

---

## 7. Payload Safety

### 7.1 Final `paymentData.tabContact` shape (post-fix)

```js
tabContact: isTabPayment ? { name: tabName, phone: tabPhone } : null,
```

**Identical to today.** No new key. No `customer_id`. No `tab_customer_id`. No `crm_customer_id`. No top-level `customer_id` outside `tabContact`.

### 7.2 Final `collectBillExisting` payload shape (post-fix)

`orderTransform.js:1270–1271` continues to emit:

```js
name:   tabContact?.name  || '',
mobile: tabContact?.phone || '',
```

**Unchanged.** Backend's `POST /api/v2/vendoremployee/order/order-bill-payment` payload contract is preserved bit-for-bit.

### 7.3 Mobile as unique key

Confirmed (owner decision 2). The plan does not introduce any concept of FE-side customer identity beyond mobile. Backend dedupe / ledger logic continues to key off `mobile`.

### 7.4 Why the plan is payload-safe by construction

The CRM record's UUID (`c.id`) is **never captured into state**. The pick handler reads `c.id` only to log/discard via destructuring; the only fields written into state are `c.name` and `c.phone`. Static-analysis confirmation: the resulting code will contain **zero** occurrences of `tabCustomerId`, `customerId`, `customer_id`, or `c.id` writes inside the changed block. (A `grep` check is included in the QA list — §12 row 18.)

---

## 8. Files Proposed To Change

| # | Path | Operation | LoC |
|---|---|---|---|
| 1 | `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` | **EDIT** — add 1 import, 5 state hooks + 2 refs, 2 search useEffects, 1 outside-click useEffect, 1 `selectTabCustomer` helper, 2 input wrappers + 2 suggestion overlays, 1 `handleTabNameChange` + 1 `handleTabPhoneChange` (replacing the inline `onChange` setters) | ~50 net |

**That is the entire change inventory.** No other file is opened, edited, or even imported differently.

### 8.1 Why one file is enough

- `customerService.searchCustomers` — already exported; just imported into `CollectPaymentPanel.jsx`.
- `CartPanel.jsx` — already implements the pattern; **not modified** (would risk regressing Order Entry CRM lookup).
- `customerTransform.js`, `crmAxios.js`, `constants.js` — already correct.
- `orderTransform.js` — payload shape unchanged.
- `OrderEntry.jsx` — no prop-flow change needed.
- All non-Credit/TAB branches in `CollectPaymentPanel.jsx` — structurally outside the conditional block.

---

## 9. Files Explicitly NOT To Touch

| Path | Reason |
|---|---|
| `/app/frontend/src/api/services/customerService.js` | CRM helpers reused as-is. Adding/changing anything here risks Order Entry regression. |
| `/app/frontend/src/api/transforms/customerTransform.js` | Response shape unchanged; no consumer change. |
| `/app/frontend/src/api/transforms/orderTransform.js` | `collectBillExisting` payload **must stay byte-identical**. |
| `/app/frontend/src/api/crmAxios.js` | Auth + base URL already correct. |
| `/app/frontend/src/api/constants.js` | `CUSTOMER_SEARCH` + `CUSTOMER_LOOKUP` endpoints already declared. |
| `/app/frontend/src/components/order-entry/CartPanel.jsx` | Source-of-truth pattern. Must not regress. |
| `/app/frontend/src/components/order-entry/CustomerModal.jsx` | Adjacent CRM-wired surface; unrelated to this fix. |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | Parent prop flow already correct (`customer` prop seeds `tabName`/`tabPhone` on the happy path). |
| All Cash / UPI / Card / Split / Transfer-to-Room branches in `CollectPaymentPanel.jsx` | Out of scope. State must remain identical. |
| `/app/memory/final/*` | Task directive. |
| `BUG_TEMPLATE.md` | Task directive. |
| Backend / `POST /api/v2/.../order-bill-payment` | Owner decisions 4 + 5: no payload change. |
| Validation rule text ("Name is required for credit/TAB orders" / "Enter 10-digit phone number") | Stays unchanged — autofill makes it pass naturally on the happy path. |
| PayLater, Hold (fOrderStatus 9 / 8), room-payment flows | Separate UI paths; not in defect scope. |
| `/app/frontend/src/hooks/useOrderPollingReconciliation.js` | Unrelated (separate CR). Mentioned because both CRs are in flight; they do not interact. |

---

## 10. Implementation Steps

Single file edit. Execute in this order to keep each diff hunk small and reviewable.

### Step 1 — Import `searchCustomers`

`CollectPaymentPanel.jsx`, alongside existing service imports:

```js
import { searchCustomers } from '../../api/services/customerService';
```

### Step 2 — Add new state + refs (next to existing tab state at L327–329)

```js
const [tabName,                  setTabName]                  = useState(customer?.name  || "");
const [tabPhone,                 setTabPhone]                 = useState(customer?.phone || "");

// BUG-038 (May-2026): CRM typeahead state for the Credit/TAB customer
// block, mirroring CartPanel.jsx:323–333. Mobile is the unique key.
// We deliberately do NOT capture c.id — owner decision: no customer_id
// in the bill-payment payload, mobile-only dedupe on backend.
const [tabFilteredByPhone,       setTabFilteredByPhone]       = useState([]);
const [tabFilteredByName,        setTabFilteredByName]        = useState([]);
const [tabShowPhoneSuggestions,  setTabShowPhoneSuggestions]  = useState(false);
const [tabShowNameSuggestions,   setTabShowNameSuggestions]   = useState(false);
const [tabIsCustomerSelected,    setTabIsCustomerSelected]    = useState(!!customer?.id);
const tabPhoneInputRef = useRef(null);
const tabNameInputRef  = useRef(null);
```

### Step 3 — Add two CRM-search useEffects (mirror CartPanel L349–384, prefixed with `tab`)

```js
useEffect(() => {
  if (!isTabPayment) return;
  if (tabIsCustomerSelected) {
    setTabFilteredByPhone([]);
    setTabShowPhoneSuggestions(false);
    return;
  }
  if (tabPhone.trim() && tabPhone.length >= 3) {
    searchCustomers(tabPhone).then((filtered) => {
      setTabFilteredByPhone(filtered);
      setTabShowPhoneSuggestions(filtered.length > 0);
    });
  } else {
    setTabFilteredByPhone([]);
    setTabShowPhoneSuggestions(false);
  }
}, [tabPhone, tabIsCustomerSelected, isTabPayment]);

useEffect(() => {
  if (!isTabPayment) return;
  if (tabIsCustomerSelected) {
    setTabFilteredByName([]);
    setTabShowNameSuggestions(false);
    return;
  }
  if (tabName.trim() && tabName.length >= 2) {
    searchCustomers(tabName).then((filtered) => {
      setTabFilteredByName(filtered);
      setTabShowNameSuggestions(filtered.length > 0);
    });
  } else {
    setTabFilteredByName([]);
    setTabShowNameSuggestions(false);
  }
}, [tabName, tabIsCustomerSelected, isTabPayment]);
```

Note the additional `isTabPayment` gate — when cashier toggles to a non-TAB method, the useEffects no-op and any stale suggestion is cleared on next mount/un-mount.

### Step 4 — Add outside-click handler (mirror CartPanel L386–402)

```js
useEffect(() => {
  const handleClickOutside = (e) => {
    if (e.target.closest('[data-suggestion-tab="true"]')) return;
    if (tabPhoneInputRef.current && !tabPhoneInputRef.current.contains(e.target)) {
      setTabShowPhoneSuggestions(false);
    }
    if (tabNameInputRef.current && !tabNameInputRef.current.contains(e.target)) {
      setTabShowNameSuggestions(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);
```

Marker `data-suggestion-tab="true"` is intentionally distinct from CartPanel's `data-suggestion="true"` to keep the two suggestion overlays independent (otherwise a click on a CartPanel suggestion while the Collect Payment panel is mounted could affect the tab overlay state — defensive separation).

### Step 5 — Add `selectTabCustomer`, `handleTabNameChange`, `handleTabPhoneChange`

```js
const selectTabCustomer = (c) => {
  // Deliberately capturing only name + phone. c.id is discarded.
  setTabName(c.name);
  setTabPhone(c.phone);
  setTabShowPhoneSuggestions(false);
  setTabShowNameSuggestions(false);
  setTabIsCustomerSelected(true);
};

const handleTabNameChange = (e) => {
  const newName = e.target.value;
  setTabName(newName);
  if (!newName.trim() && tabIsCustomerSelected) {
    setTabPhone("");
    setTabIsCustomerSelected(false);
  }
};

const handleTabPhoneChange = (e) => {
  const newPhone = e.target.value.replace(/\D/g, '').slice(0, 10);
  setTabPhone(newPhone);
  if (!newPhone.trim() && tabIsCustomerSelected) {
    setTabName("");
    setTabIsCustomerSelected(false);
  }
};
```

### Step 6 — Wrap inputs and render suggestion overlays (replace L2133–2159 body)

```jsx
<div className="space-y-2">
  <div className="relative" ref={tabNameInputRef}>
    <input
      type="text"
      placeholder="Customer Name *"
      value={tabName}
      onChange={handleTabNameChange}
      onFocus={() => { if (tabFilteredByName.length > 0) setTabShowNameSuggestions(true); }}
      className="w-full px-4 py-3 rounded-lg border text-sm outline-none"
      style={{
        borderColor: !tabName.trim() ? '#ef4444' : COLORS.primaryGreen,
        backgroundColor: !tabName.trim() ? '#fef2f2' : `${COLORS.primaryGreen}08`,
      }}
      data-testid="tab-customer-name-input"
    />
    {tabShowNameSuggestions && tabFilteredByName.length > 0 && (
      <div
        className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto"
        style={{ borderColor: COLORS.borderGray }}
        data-testid="tab-customer-name-suggestions"
      >
        {tabFilteredByName.map((c) => (
          <button
            type="button"
            key={c.id}
            data-suggestion-tab="true"
            onMouseDown={() => selectTabCustomer(c)}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
            data-testid={`tab-customer-name-suggestion-${c.id}`}
          >
            <div className="font-medium">{c.name}</div>
            <div className="text-xs" style={{ color: COLORS.grayText }}>{c.phone}</div>
          </button>
        ))}
      </div>
    )}
  </div>

  <div className="relative" ref={tabPhoneInputRef}>
    <input
      type="tel"
      inputMode="numeric"
      maxLength={10}
      placeholder="Phone Number * (10 digits)"
      value={tabPhone}
      onChange={handleTabPhoneChange}
      onFocus={() => { if (tabFilteredByPhone.length > 0) setTabShowPhoneSuggestions(true); }}
      className="w-full px-4 py-3 rounded-lg border text-sm outline-none"
      style={{
        borderColor: tabPhone.replace(/\D/g, '').length === 10 ? COLORS.primaryGreen : '#ef4444',
        backgroundColor: tabPhone.replace(/\D/g, '').length === 10 ? `${COLORS.primaryGreen}08` : '#fef2f2',
      }}
      data-testid="tab-customer-phone-input"
    />
    {tabShowPhoneSuggestions && tabFilteredByPhone.length > 0 && (
      <div
        className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto"
        style={{ borderColor: COLORS.borderGray }}
        data-testid="tab-customer-phone-suggestions"
      >
        {tabFilteredByPhone.map((c) => (
          <button
            type="button"
            key={c.id}
            data-suggestion-tab="true"
            onMouseDown={() => selectTabCustomer(c)}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
            data-testid={`tab-customer-phone-suggestion-${c.id}`}
          >
            <div className="font-medium">{c.name}</div>
            <div className="text-xs" style={{ color: COLORS.grayText }}>{c.phone}</div>
          </button>
        ))}
      </div>
    )}
  </div>
</div>
```

### Step 7 — DO NOT TOUCH

- L327–329 (`tabName`, `tabPhone` initial state) — preserved exactly.
- L574 (`tabContact` payload field) — preserved exactly.
- L2161–2169 (validation block) — preserved exactly.
- All other surrounding payment-mode conditional blocks (cash, UPI, card, split, transfer-to-room) — preserved exactly.

### Step 8 — Lint + build

- `yarn lint` — zero new ESLint errors / warnings.
- `yarn build` — zero new CRACO build errors.

### Step 9 — Manual QA pass per §12

---

## 11. Regression Risks

| # | Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|---|
| 1 | Bill-payment payload accidentally carries `customer_id` | None | High (if happened) | Plan never captures `c.id` into state. `selectTabCustomer` destructures only `c.name` and `c.phone`. `tabContact` payload key unchanged. **Static grep check in QA (§12 row 18).** |
| 2 | CRM search failure blocks Credit/TAB payment | None | High (if happened) | `customerService.searchCustomers` is graceful-failure-by-design — catches errors, returns `[]`, logs `[CRM]` warning. The `then(...)` chain has no `.catch` because none is needed. No `try`/`throw` inside the search effect. Manual entry path unaffected. |
| 3 | Other payment modes affected (cash/UPI/card/split/transfer) | None | Medium | All new code lives inside `{isTabPayment && !showSplit && (…)}` render branch and inside `isTabPayment`-gated useEffects. Non-TAB methods structurally cannot reach the new code. |
| 4 | Cashier-entered custom name overwritten by autofill | None | Low | `tabIsCustomerSelected = true` gate stops the search useEffect from re-firing after a pick. Typed name is respected. Mirrors `CartPanel` parity. |
| 5 | Excessive CRM API calls (one per keystroke) | Low | Low | Same as `CartPanel` today — no explicit debounce. CRM endpoint already handles this load in production. Future debounce can be added project-wide if the pattern is found to be too chatty. |
| 6 | Inconsistent behaviour vs Order Entry CRM lookup | None | Low | Plan is a 1:1 mirror — same `searchCustomers` helper, same thresholds (≥3 phone / ≥2 name), same gate semantics, same blank-out-resets-selection. Only behavioural difference: no `onCustomerChange` callback to a parent (Credit/TAB doesn't need it — the data stays in `tabName`/`tabPhone` locally). |
| 7 | Order Entry CRM lookup broken by this change | None | Medium | `CartPanel.jsx` and `customerService.js` are **not touched**. Order Entry lookup is independent of this code path. |
| 8 | Suggestion overlay click closed by outside-click handler | None | Low | `data-suggestion-tab="true"` marker + `e.target.closest()` check in outside-click handler mirrors CartPanel's pattern. Clicks on suggestion buttons short-circuit before closing. |
| 9 | Duplicate suggestion overlay with CartPanel | None | Low | `CartPanel` and `CollectPaymentPanel` are not both rendered with focused inputs at the same time (Collect Payment opens as a modal/panel over OrderEntry; CartPanel inputs lose focus). Even if both were focused, the marker names are distinct (`data-suggestion` vs `data-suggestion-tab`). |
| 10 | Suggestion overlay z-index conflict with payment-modal stacking | Low | Low | Using `z-50` matches CartPanel; payment panel itself does not impose a z-stack on inner content. Tested visually as part of QA §12 row 6. |
| 11 | Validation rule fires after autofill | None | Low | Validation reads `tabName.trim()` and `tabPhone.replace(/\D/g, '').length === 10`. After a pick, both are populated → validation passes. |
| 12 | `tabIsCustomerSelected` initial seed from `customer?.id` is incorrect when prop is null | None | Low | `!!customer?.id` is `false` when customer is null/undefined → typeahead is enabled by default for un-pre-selected cashiers. Correct default. |

---

## 12. QA Checklist

### 12.1 Static checks

| # | Check | Expected |
|---|---|---|
| S1 | `yarn lint` | Zero new errors / warnings |
| S2 | `yarn build` | Zero new errors |
| S3 | DevTools Network panel — Credit/TAB phone input ≥3 digits | One `GET /api/pos/customers?search=…&limit=10` per keystroke (or batched per React re-render) |
| S4 | DevTools Network panel — Credit/TAB name input ≥2 chars | Same pattern |
| S5 | `grep -n 'customer_id\|tabCustomerId\|c\.id' /app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` | No new occurrences inside the Credit/TAB block; legacy references (if any) outside the block unchanged |
| S6 | `git diff --stat` | Only `CollectPaymentPanel.jsx` changed |

### 12.2 Manual QA scenarios

| # | Scenario | Pass criterion |
|---|---|---|
| 1 | Credit/TAB: type a phone number that matches a CRM customer | Suggestion overlay appears; pick fills name + phone; `tabIsCustomerSelected = true`; validation passes |
| 2 | Credit/TAB: type a phone number that does NOT match any CRM customer | No suggestion overlay; manual entry of name + phone works as today; payment proceeds |
| 3 | Credit/TAB: pick a suggestion, then edit the name to "Mr Sharma — corporate" | Typed value respected; no re-search; phone retained |
| 4 | Credit/TAB: pick a suggestion, then blank the name field | Phone cleared; `tabIsCustomerSelected = false`; search re-enables on next keystroke |
| 5 | Credit/TAB: pick a suggestion, then blank the phone field | Name cleared; symmetric reset |
| 6 | Credit/TAB: suggestion overlay z-index over payment-panel modal | Overlay visible above all payment-panel content; clickable |
| 7 | Credit/TAB: force CRM API to 500 (DevTools "Block request URL" on `/pos/customers`) | No overlay; no toast; no banner; no error UI; payment proceeds with manually typed name+phone |
| 8 | Network panel inspection during bill submit | `POST /api/v2/vendoremployee/order/order-bill-payment` payload contains `name` + `mobile` only; **no `customer_id` / `tab_customer_id` / `crm_customer_id` / `c.id` keys** |
| 9 | Cash payment | TAB customer details block NOT rendered. No CRM call. No regression. |
| 10 | UPI payment | Same as #9 |
| 11 | Card payment | Card transaction-ID input renders. TAB block NOT rendered. No CRM call. |
| 12 | Split payment with one Credit row | `!showSplit` gate hides the new TAB block (because `showSplit === true` for the parent panel). Split-bill row UI for Credit is untouched. |
| 13 | Transfer-to-Room payment | Room picker renders. TAB block NOT rendered. No CRM call. |
| 14 | PayLater settle (fOrderStatus 9) | Unrelated UI path (BUG-042 territory). Not affected. |
| 15 | Hold/Park (fOrderStatus 8) | Unrelated UI path. Not affected. |
| 16 | Order Entry: type a phone in CartPanel customer field | Original CartPanel CRM typeahead still works identically (regression check). |
| 17 | Order Entry: pick a customer, proceed to Collect Payment as Credit/TAB | TAB block seeds correctly from prop on mount (existing behaviour). `tabIsCustomerSelected = true` if the parent customer has an `id`; typeahead stays gated off (good — cashier explicitly selected). |
| 18 | `grep -nE '"customer_id"\|tab_customer_id\|crm_customer_id\|c\.id' /app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` | No new write to any of these tokens. (Read-only on `c.name` / `c.phone` in `selectTabCustomer` is allowed.) |
| 19 | Outside-click while suggestion overlay open | Overlay closes; clicking on a suggestion button does NOT close before the pick fires (covered by `onMouseDown` + `data-suggestion-tab` marker) |
| 20 | Toggle payment method Credit → Cash → Credit | TAB block re-renders; state preserved; CRM search useEffect re-enables; no stale suggestions |

---

## 13. Open Questions

| # | Question | Blocker? |
|---|---|---|
| OQ-1 | Should phone-blur exact `lookupCustomer(phone)` (BUG-038 Option C) be bundled in v1? | **No.** Per owner decision 6 ("same as existing Order Entry"), and CartPanel does NOT do blur-lookup. Deferred unless owner explicitly requests. |
| OQ-2 | Debounce on typeahead — does Order Entry already feel chatty on slow networks? | **No.** Current production behaviour from CartPanel is the baseline. If owner finds it chatty later, a project-wide debounce can be added without breaking either surface. |
| OQ-3 | Should the suggestion overlay also show tier / loyalty / wallet info (as `searchCustomers` response carries `tier, totalPoints, walletBalance, lastVisit`)? | **No for v1.** Owner decision 6 limits scope to autofill behaviour. Adding loyalty UI is a follow-up product call. |
| OQ-4 | Should `tabIsCustomerSelected` be hoisted to OrderEntry parent so a customer picked here propagates back to CartPanel? | **No.** Would create a two-way binding that doesn't exist today, expanding the blast radius. Local state is sufficient. |
| OQ-5 | What happens when CRM returns a customer whose `phone` length isn't exactly 10 digits (legacy data)? | **Edge case.** `setTabPhone(c.phone)` will write the raw value; subsequent re-render computes `length === 10` for validation. If the legacy record is, say, 11 digits, validation will fail and cashier must edit. Acceptable; not a blocker. Mention to owner if any historical record fails the 10-digit gate. |

None of these block implementation. All have safe FE defaults.

---

## 14. Strict-Rules Compliance Certification

| Rule | Status |
|---|---|
| Planning only — no code change | ✅ |
| No commits | ✅ |
| No backend change | ✅ |
| No payment-payload change | ✅ |
| No `customer_id` added anywhere | ✅ |
| No change to `collectBillExisting` | ✅ |
| No change to `orderTransform.js` | ✅ |
| No effect on non-Credit/TAB payment modes | ✅ |
| `/app/memory/final/*` untouched (read-only consultation) | ✅ |
| `BUG_TEMPLATE.md` untouched | ✅ |
| Single-file footprint preserved | ✅ |

---

— End of TAB / Credit Customer CRM Autofill Implementation Plan —
