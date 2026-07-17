# CRM 2.0 — CR-002 UX Followups — Mini Plan (Combined FU-01 + FU-02)

**Date:** 2026-05-27
**Sprint:** CRM 2.0
**CR ID:** `CR_002_UX_FOLLOWUPS` (combined)
**Format:** Mini-CR (streamlined process; per owner direction 2026-05-27)
**Predecessor authoritative docs:**
- `handoff/CRM2_0_CR_002_CROSS_SELL_HANDOFF_TO_POS_2026_05_27.md` §9 (L-1, L-2)
- `open_gaps/CRM2_0_CONSOLIDATED_OPEN_GAPS_2026_05_27.md` (CG-04, CG-07)
- `reconciliation/CRM2_0_CR_002_CUSTOMER_NOTES_NOT_SHOWN_INVESTIGATION_2026_05_27.md`

**Closes:** CG-04 (FU-01) + CG-07 (FU-02)

---

## 1. Scope (one paragraph)

Two scoped UX polishes on top of CR-002 v1 to remove the two carry-over limitations:

- **FU-01:** Notes / Customer Intel must work when a customer is attached **outside** the Customer popup — i.e. via cart-panel phone typing (Path B) or via order restore (Path C). The current code already fires `lookupCustomer(phone)` in both paths and forwards `customer.id` back into state, but this fact was never reconciled against the open investigation doc. FU-01 is therefore primarily a **verification + closure** task; no code change is expected unless the audit finds a missed path.
- **FU-02:** The "New Customer" badge must appear on the **first** open of the Customer popup after a brand-new customer is saved (and ideally the moment a search result is picked). Today the intel hook only lives in `OrderEntry.jsx` keyed on `customer.id`, which means the modal sees stale/empty state on first reopen because the parent's call is still in flight. FU-02 lifts a **modal-local** `useCustomerIntel` invocation inside `CustomerModal` keyed on the modal's own `selectedCRMCustomer.id || initialData.id`, with cart/orderType lifted as new props so the same suggestions are produced.

Both are POS-frontend-only. No CRM contract change. No POS Backend change. No `/app/memory/final/` change.

---

## 2. Module + regression-risk classification (per CHANGE_REQUEST_PLAYBOOK)

| Item | Affected module | Regression-risk hotspot? | Justification |
|---|---|---|---|
| FU-01 | Order Entry / Cart / Payment Workflow + Customer / CRM Integration | `OrderEntry.jsx` is on the high-risk list (per playbook §165) | But FU-01 is a **read-only verification** — no edits planned to OrderEntry or CartPanel. |
| FU-02 | Customer / CRM Integration | `CustomerModal.jsx` is NOT on the high-risk list. `OrderEntry.jsx` IS — but the only OrderEntry change is **3 new props passed down** to the modal call site (cartItems, orderType, already in scope props). Trivial. | Low regression risk. |

---

## 3. Audit results — FU-01 (read-only)

| Path | File / line | Mechanism | Status |
|---|---|---|---|
| **Path A** — Customer popup pick | `CustomerModal.jsx` `handleSave` → `onSave(customerData)` → `OrderEntry.setCustomer` → useCustomerIntel fires | Already works | ✅ — verified in 2026-05-27 live QA (T-01 / T-02 / T-03 PASS) |
| **Path B** — CartPanel phone typing | `CartPanel.jsx` L811–848 `handleFieldBlur` → `lookupCustomer(phone10)` → `onCustomerChange({ ...merged, id: enriched.id, ...loyalty })` → parent `setCustomer` → useCustomerIntel fires | Already fixed in code (commit dated 2026-05-27) | ✅ — exact mechanism the investigation doc recommended as "not implemented" — **doc-vs-code conflict; code wins per playbook §180** |
| **Path C** — Order restore | `OrderEntry.jsx` L186–205 `enrichCustomerLoyaltyFromCRM(phone)` invoked from L352 (savedCart branch) and L395 (orderData branch) → `lookupCustomer` → `setCustomer((prev) => ({...prev, id: enriched.id, ...loyalty}))` → useCustomerIntel fires | Already covered by the same enrichment routine | ✅ — same lookup-and-forward mechanism as Path B |

**Race window analysis (informational):** Paths B and C both have a ~500 ms–2 s window between "phone entered / order restored" and "id resolved by CRM lookup". If the cashier opens ItemNotesModal/OrderNotesModal *inside* that window, the notes section will momentarily show the empty state ("No customer linked"). After ~2 s it auto-populates. This is **acceptable for v1** — the investigation doc itself recommends Option A (lookup on blur), which is exactly what is shipped. The race window is bounded by CRM latency and self-heals.

**Conclusion:** No code edit needed for FU-01. The investigation doc and OG/CG entries are doc-vs-code stale.

---

## 4. Implementation plan — FU-02 (Option A — modal-local intel hook)

### 4.1 Files touched

| File | Change kind | Lines (approx) |
|---|---|---|
| `frontend/src/components/order-entry/CustomerModal.jsx` | MODIFY | +~25 / −0 |
| `frontend/src/components/order-entry/OrderEntry.jsx` | MODIFY (call-site only — pass 2 new props) | +2 / −0 |

No new files. No deletions. No other touch.

### 4.2 CustomerModal changes (target structure)

```jsx
// NEW imports
import { useCustomerIntel } from "../../hooks/useCustomerIntel";

// NEW props
const CustomerModal = ({
  onClose, onSave, initialData = null, restaurantId = '',
  customerIntel = null, customerIntelLoading = false,
  onAddToCart = null, onCustomizeItem = null, menuItems = [],
  cartItems = [],          // NEW (FU-02)
  orderType = null,        // NEW (FU-02)
}) => {
  // ... existing state ...

  // NEW: modal-local intel hook keyed on the modal's own selected customer.
  // This fires the moment the cashier picks a search result OR opens the
  // modal for an existing customer — without waiting for OrderEntry's
  // useCustomerIntel to catch up after onSave closes the modal.
  const modalCustomerId =
    selectedCRMCustomer?.id || initialData?.id || null;
  const {
    intel: localIntel,
    loading: localIntelLoading,
  } = useCustomerIntel(modalCustomerId, cartItems, orderType);

  // Effective intel: prefer modal-local data if present, else parent's prop.
  const effectiveIntel = localIntel || customerIntel;
  const effectiveLoading = localIntelLoading || customerIntelLoading;
  
  // EVERY reference to `customerIntel` inside the modal body becomes `effectiveIntel`.
  // EVERY reference to `customerIntelLoading` becomes `effectiveLoading`.
  // ... rest unchanged ...
};
```

### 4.3 OrderEntry call-site change

Find the CustomerModal render (≈ line 2358 today):

```jsx
<CustomerModal
  onClose={...}
  onSave={(customerData) => setCustomer(customerData)}
  initialData={...}
  restaurantId={...}
  customerIntel={customerIntel}
  customerIntelLoading={customerIntelLoading}
  onAddToCart={...}
  onCustomizeItem={...}
  menuItems={menuItems}
  cartItems={cartItems}          // NEW (FU-02)
  orderType={orderType}          // NEW (FU-02)
/>
```

`cartItems` and `orderType` already exist as local state in OrderEntry — just pass them down.

### 4.4 Cache duplication note

Each `useCustomerIntel` call has its own `useRef`-backed cache. Adding a second invocation inside CustomerModal means up to **one extra network call per modal-open for the first-time-customer case** (or for cache-miss scenarios). Trade-offs:

- This is acceptable. The endpoint is read-only, idempotent, and bounded by the existing 3 s timeout + 5 min TTL.
- For the *common* case (modal opens for a customer already loaded in parent), the parent prop is already populated and `localIntel` will hit its own cache miss → fires its own call → fine; data comes back in <500 ms typical (server-side cached for the same customer).
- For the *target* case (brand-new customer just saved), parent hook is in flight; modal local hook fires for the same id → same call may be racing, but the stale-response guard in the hook discards the loser. Net effect: badge renders as soon as either call returns.

No shared cache refactor is required for v1. If duplicate calls become a measured problem (it's hard to imagine they will), a follow-up CR can hoist the cache to a module-level singleton — out of scope for this mini-CR.

---

## 5. Acceptance Criteria (8 total)

| AC | Description | Verification |
|---|---|---|
| **FU01-AC1** | Path B verified: typing a 10-digit phone in CartPanel + tab-out triggers a lookup and populates `customer.id` such that opening ItemNotesModal **after** the lookup returns shows Customer Preferences from CRM. | Live smoke on R689 |
| **FU01-AC2** | Path C verified: opening a previously-placed order with a customer attached triggers `enrichCustomerLoyaltyFromCRM` and populates `customer.id` such that the customer intel sections render correctly. | Live smoke on R689 |
| **FU01-AC3** | Doc reconciliation: `CRM2_0_CR_002_CUSTOMER_NOTES_NOT_SHOWN_INVESTIGATION_2026_05_27.md` is annotated as superseded by code at CartPanel L811–848 and OrderEntry L186–205. **(Doc note only — not editing the original doc, just recording supersedence in QA/handoff doc.)** | Visual inspection |
| **FU02-AC1** | Opening CustomerModal for an existing customer (via search-result pick from typeahead) renders the Profile banner / Past Favourites / Smart Suggestions **without** requiring a prior Save action. | Live smoke |
| **FU02-AC2** | After saving a **brand-new** customer (createCustomer) and reopening the modal immediately, the "New Customer" badge appears within ≤ 1× endpoint latency (typically <3 s) — visibly before what was observed in 2026-05-27 QA. | Live smoke |
| **FU02-AC3** | Existing flow regression-free: walk-in flow shows no customer sections; new-customer entry form unchanged. | Manual test |
| **FU02-AC4** | Build clean (`yarn build` exit 0); no new ESLint errors beyond pre-existing `OrderEntry.jsx` warning. | Build run |
| **FU02-AC5** | All existing CR-002 `data-testid` hooks remain in place; no testid renames. | DOM inspection |

---

## 6. Rollback

- **FU-01:** Nothing to roll back (no code change).
- **FU-02:** Revert the two files touched in §4.1. The modal falls back to parent-only intel (today's behavior). No data migration. No persisted state.

---

## 7. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Duplicate API call per modal-open in worst case | M | L | Bounded by 5 min TTL + 3 s timeout; server-side caching softens this. Acceptable for v1. |
| `cartItems` / `orderType` prop drift causes different cross-sell suggestions in modal vs parent | L | L | Both hooks receive identical props from OrderEntry — same cache key construction; results identical. |
| Modal-local hook receives stale `selectedCRMCustomer.id` after Save→reopen race | L | L | Hook re-runs on `customerId` change; `activeCustomerRef` stale-response guard already handles this case. |
| Existing tests using prop `customerIntel` directly break | L | L | We **add** local hook; the existing prop is still honored as fallback. No breaking change to the API. |

---

## 8. Tests to run

1. Build: `cd /app/frontend && CI=false yarn build` → exit 0
2. Lint (frontend only, FU-02 files): `eslint frontend/src/components/order-entry/CustomerModal.jsx frontend/src/components/order-entry/OrderEntry.jsx`
3. Smoke (live, after impl): Path B / Path C / FU02-AC1 / FU02-AC2 — on the same R689 session the live regression QA will use

---

## 9. Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | No CRM contract change | CONFIRMED |
| 2 | No POS Backend change | CONFIRMED |
| 3 | `/app/memory/final/` UNTOUCHED | CONFIRMED |
| 4 | `/app/memory/crm/crm_1_0/` UNTOUCHED | CONFIRMED |
| 5 | Streamlined mini-CR process per owner direction | CONFIRMED |
| 6 | Combined single doc (FU-01 + FU-02) per owner direction | CONFIRMED |
| 7 | Implementation follows Option A for FU-02 per owner direction | CONFIRMED |
| 8 | FU-01 is verification-only per audit findings | CONFIRMED |

---

**End of CR-002 UX Followups Mini Plan. Implementation next.**
