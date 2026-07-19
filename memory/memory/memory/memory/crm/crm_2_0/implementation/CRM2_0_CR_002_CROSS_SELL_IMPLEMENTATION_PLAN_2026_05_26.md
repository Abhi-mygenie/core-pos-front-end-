# CRM 2.0 — CR-002 Cross-Sell + Customer Intelligence — Implementation Plan

**Date:** 2026-05-26
**Sprint:** CRM 2.0
**CR ID:** `CR_002`
**Topic:** `CROSS_SELL_UPSELL`
**Type:** `IMPL_PLAN`
**Stage:** 5 of 8
**API contract version:** v1.1
**Predecessor docs:**
- `implementation/CRM2_0_CR_002_CROSS_SELL_REQUIREMENTS_FREEZE_2026_05_26.md` (Stage 4 — primary source)
- `contract/CRM2_0_CR_002_CROSS_SELL_CONTRACT_FREEZE_2026_05_26.md` (Stage 3)
- `discovery/CRM2_0_CR_002_POS_FEEDBACK_TO_CRM_HANDOFF_2026_05_26.md` (Stage 1)
- `handoff/CRM2_0_CR_002_CROSS_SELL_API_HANDOFF_FROM_CRM_2026_05_26.md` (CRM upstream)
- `reconciliation/CRM2_0_CONTINUATION_RECONCILIATION_2026_05_26.md` (Sprint state)

> **Audience:** the implementation agent (Stage 6). After reading, the implementation agent executes Phase 1, builds the preview artifact, pauses for owner approval, then executes Phase 2.

---

## 1. Current Status

```
CR:        CR-002 Cross-Sell + Customer Intelligence
Stage:     5 PLANNING (this doc)
Code:      Zero CR-002 implementation exists in codebase
Blocker:   None — all prerequisites met
```

---

## 2. Docs Read

| # | Doc | Status |
|---|---|---|
| 1 | CRM 2.0 README | Read |
| 2 | Continuation Reconciliation Report | Read |
| 3 | Open Status Register | Read |
| 4 | CRM Upstream Handoff | Read |
| 5 | POS Discovery Feedback | Read |
| 6 | Contract Freeze v1.1 | Read |
| 7 | Requirements Freeze (Stage 4) | Read (primary source) |

---

## 3. Code Inspected

| # | File | Lines | Key findings |
|---|---|---|---|
| 1 | `CustomerModal.jsx` | 599 | Props: `{ onClose, onSave, initialData, restaurantId }`. State: `selectedCRMCustomer` holds full CRM record after typeahead pick. No profile banner / favourites / suggestions sections exist. New sections go between Header and Content `<div className="p-5 space-y-4">`. |
| 2 | `ItemNotesModal.jsx` | 223 | Props: `{ item, onClose, onSave, initialNotes, customerId }`. L11: `getCustomerPreferences(customerId, "item")` returns sync mock data. L166-203: "Customer Preferences" section renders `customerData.preferences[]` with `addFromPreference()`. Replacement point is L11 + L166-203. |
| 3 | `OrderNotesModal.jsx` | 223 | Props: `{ tableId, onClose, onSave, initialNotes, customerId }`. L11: `getCustomerPreferences(customerId, "order")` returns sync mock data. L167-203: "Customer History" section. Same replacement pattern as ItemNotesModal. |
| 4 | `OrderEntry.jsx` | 2474 | L155: `showCustomerModal` state. L156: `customer` state. L526: `addToCart(item)`. L114: `setCustomizationItem`. L1437: `item.customizable ? setCustomizationItem(item) : addToCart(item)`. L2348-2355: `<CustomerModal>` render with `onSave={(customerData) => setCustomer(customerData)}`. L2290: `customerId={customer?.id \|\| null}` passed to OrderNotesModal. L2313: same to ItemNotesModal. L154: `itemNotesModal` state. Products via `useMenu()` → `adaptProduct()` where `id = product.productId` (string). |
| 5 | `notePresets.js` | 69 | Exports: `itemLevelPresets`, `orderLevelPresets`, `mockCustomerPreferences`, `getCustomerPreferences()`. Mock keyed by `"MEM-2024-0001"` etc — never matches real CRM UUIDs. |
| 6 | `data/index.js` | 7 | Barrel re-exports `notePresets` via `export * from './notePresets'`. |
| 7 | `crmAxios.js` | 91 | `crmApi` axios instance. BaseURL: `process.env.REACT_APP_CRM_BASE_URL`. Request interceptor attaches `X-API-Key` from `currentCrmToken` (set at login). Default timeout: 15000ms. |
| 8 | `constants.js` | 301 | `API_ENDPOINTS` object. No `CUSTOMER_ORDER_SUGGESTIONS` constant. CRM endpoints at L39-56. |
| 9 | `colors.js` | ~30 | `COLORS` object with `primaryOrange`, `primaryGreen`, `amber`, `darkText`, `grayText`, `borderGray`, `sectionBg`, `lightBg`. |
| 10 | `productTransform.js` | — | `product.productId` → POS `food.id` (= CRM `item_id` string). `hasVariations` and `addOns` drive `customizable` flag. |

---

## 4. Planning Decisions (delegated to this agent)

| # | Decision | Choice | Rationale |
|---|---|---|---|
| PD-1 | Where the cache lives | **New `useCustomerIntel.js` hook** in `src/hooks/` | Keeps OrderEntry.jsx diff small (~10 lines to call the hook); co-locates cache + debounce + error state; avoids bloating OrderContext which is already large |
| PD-2 | `notePresets.js` migration path | **Keep `mockCustomerPreferences` and `getCustomerPreferences()` in place but NEVER call them from production modals.** Both modals will read from the hook's cached data instead. Mock remains for unit tests / future reference. No deletion. | Lowest risk; no barrel export changes; zero regression path |
| PD-3 | `usual_channel` / `usual_time_of_day` chips in Profile banner | **Show both** as small gray chips: "Usual: Dine-in" / "Usual: Afternoon" when non-null | Low cost, high info value for cashier; hidden when null (first-time customer) |
| PD-4 | "View Profile" expand/collapse | **Not in v1** | Adds complexity; entire profile banner is small enough already |
| PD-5 | Loading-state UX | **Skeleton shimmer** using Tailwind `animate-pulse` on gray div placeholders (no external lib) | Consistent with POS design language; no spinners per req freeze IN-9 |
| PD-6 | UI preview artifact format | **Option C — Screenshot + annotated mockup.** Implementation agent renders with mock data piped through the hook, takes screenshots, annotates. | No extra files to create/delete; fastest for the implementation agent; owner reviews images inline in chat |
| PD-7 | CR-001 merger | **Fully merged into CR-002.** CR-001's legacy GET endpoints are NOT consumed. All customer notes flow through the CR-002 POST endpoint (`customer_notes`, `item_notes_by_id`). CR-001's discovery + contract docs remain as historical record. | Eliminates 2 extra network calls; `item_notes_by_id` has `item_id` keying (resolves G-01); single fetch covers everything |

---

## 5. File Map

### 5.1 NEW Files (Phase 1)

| # | Path | Phase | Lines (est.) | Purpose |
|---|---|---|---|---|
| N-1 | `src/api/services/customerIntelService.js` | 1 | ~50 | POST wrapper for `/pos/customers/order-suggestions` |
| N-2 | `src/api/transforms/customerIntelTransform.js` | 1 | ~140 | Normalize v1.1 response → camelCase POS shape; dual date parser; sort; cap |
| N-3 | `src/hooks/useCustomerIntel.js` | 1 | ~100 | React hook: fetch, cache (5 min TTL), debounce (500ms), error state, loading state |
| N-4 | `src/utils/relativeTime.js` | 1 | ~25 | `formatRelativeTime(isoString)` → `"just now"` / `"3 days ago"` / etc. |

### 5.2 MODIFIED Files (Phase 1)

| # | Path | Phase | Change | Lines changed (est.) |
|---|---|---|---|---|
| M-1 | `src/api/constants.js` | 1 | Add 1 endpoint constant | +1 |
| M-2 | `src/components/order-entry/OrderEntry.jsx` | 1 | Import + call `useCustomerIntel` hook; pass `customerIntel` down to modals | +12 |

### 5.3 MODIFIED Files (Phase 2 — after owner approval)

| # | Path | Phase | Change | Lines changed (est.) |
|---|---|---|---|---|
| M-3 | `src/components/order-entry/CustomerModal.jsx` | 2 | Add Profile banner, Past Favourites, Smart Suggestions sections inside modal; new prop `customerIntel` | +180 |
| M-4 | `src/components/order-entry/ItemNotesModal.jsx` | 2 | Replace L11 mock call with prop-based CRM data; add count+relative-time rendering | +20, -5 |
| M-5 | `src/components/order-entry/OrderNotesModal.jsx` | 2 | Same as M-4 for order-level notes | +20, -5 |
| M-6 | `src/components/order-entry/OrderEntry.jsx` | 2 | Pass `customerIntel` prop to CustomerModal, ItemNotesModal, OrderNotesModal; pass `addToCart`/`setCustomizationItem` to CustomerModal | +8 |

### 5.4 Files NOT Touched

- POS Backend / CRM
- `BUG108_FLAGS.js`
- `/app/memory/final/`
- `*.bak.*` archives
- `notePresets.js` (mock kept for tests; not called from production modals after Phase 2)
- Coupon / Loyalty / Wallet code paths
- `data/index.js` barrel

---

## 6. Phase 1 — API / Service / Transform / Cache

**Goal:** API data round-trips successfully, logged to console. Zero visual changes.

### Step 1a — Endpoint Constant

**File:** `src/api/constants.js`
**Action:** ADD after L56 (COUPONS_VALIDATE line)

```js
  // CR-002 Cross-Sell + Customer Intelligence (CRM 2.0, 2026-05-26)
  CUSTOMER_ORDER_SUGGESTIONS: '/pos/customers/order-suggestions',
```

### Step 1b — Service: `customerIntelService.js`

**File:** `src/api/services/customerIntelService.js` (NEW)

```js
import crmApi from '../crmAxios';
import { API_ENDPOINTS } from '../constants';

/**
 * POST /pos/customers/order-suggestions
 * @param {Object} params
 * @param {string} params.customerId - CRM customer UUID
 * @param {Array}  params.cart       - [{item_id: string, qty: number, unit_price: number}]
 * @param {string} [params.orderType] - 'dine_in' | 'takeaway' | 'delivery'
 * @returns {Promise<Object>} Raw API response data
 */
export const getOrderSuggestions = async ({ customerId, cart = [], orderType = null }) => {
  const body = {
    crm_customer_id: customerId,
    current_cart: cart.map(item => ({
      item_id: String(item.id),
      qty: item.qty || 1,
      unit_price: Number(item.price) || 0,
    })),
  };
  if (orderType) body.order_type = orderType;

  const response = await crmApi.post(
    API_ENDPOINTS.CUSTOMER_ORDER_SUGGESTIONS,
    body,
    { timeout: 3000 } // CR-002 hard timeout per contract §7.1
  );
  return response.data;
};
```

**Exact URL construction (CH-3):** `${process.env.REACT_APP_CRM_BASE_URL}${API_ENDPOINTS.CUSTOMER_ORDER_SUGGESTIONS}` → `https://insights-phase.preview.emergentagent.com/api/pos/customers/order-suggestions`

**Auth wiring (CH-4):** Uses existing `crmApi` (from `crmAxios.js`) which attaches `X-API-Key: <crmToken>` via request interceptor. No new auth work.

### Step 1c — Transform: `customerIntelTransform.js`

**File:** `src/api/transforms/customerIntelTransform.js` (NEW)

**Exported function:** `transformOrderSuggestions(apiResponse)` → returns normalized camelCase object or `null`.

**Schema of returned object:**

```js
{
  // From customer_summary
  customerSummary: {
    name: string,          // trimmed
    phone: string,
    tier: string,          // "Bronze" | "Silver" | "Gold" | "Platinum"
    visits: number,
    grossSpend: number,
    lastVisitAt: string|null, // unified ISO string
    loyaltyPoints: number,
    walletBalance: number,
    currency: string,      // "INR"
  },
  // From customer_value (null if omitted = first-time customer)
  customerValue: {
    band: string,          // "low" | "medium" | "high" | "vip"
    avgOrderValue: number,
    frequencyPerMonth: number,
    recencyDays: number,
    churnRisk: string,     // "low" | "medium" | "high"
    winBackRecommendation: boolean,
  } | null,
  // From order_patterns
  orderPatterns: {
    topItems: Array<{ itemId: string, name: string, orderCount: number, lastOrderedAt: string }>,  // cap 5, sorted orderCount DESC
    avgItemsPerOrder: number,
    usualChannel: string|null,
    usualTimeOfDay: string|null,
  },
  // From customer_notes — top 5 sorted by usedCount DESC
  customerNotes: Array<{
    text: string,
    usedCount: number,
    lastUsedAt: string,
    relativeTime: string,      // pre-computed via relativeTime.js
    source: string,
  }>,
  // From item_notes_by_id — map keyed by item_id string
  itemNotesByItemId: {
    [itemId: string]: Array<{
      text: string,
      usedCount: number,
      lastUsedAt: string,
      relativeTime: string,
      source: string,
    }>
  },
  // From cross_sell_items — up to 3
  crossSellItems: Array<{
    itemId: string,
    name: string,
    reason: string,
    source: string,       // "history" | "restaurant"
    confidence: number,   // 0-1
  }>,
  // Feature flags
  featureFlags: {
    crossSell: boolean,
    upsell: boolean,
    ai: boolean,
  },
  // Meta
  requestId: string,
  generatedAt: string,
  // First-time customer detection
  isFirstTimeCustomer: boolean,  // true when customer_value block was omitted
}
```

**Dual `last_visit_at` parser (CH-2, contract §4.4):**

```js
const parseDualDate = (raw) => {
  if (!raw) return null;
  return raw.includes('T') ? raw : raw.replace(' ', 'T') + 'Z';
};
```

**Sort applied inside transform (contract §4.3):**
- `topItems`: `orderCount` DESC, then `lastOrderedAt` DESC
- `customerNotes`: `usedCount` DESC, then `lastUsedAt` DESC
- `itemNotesByItemId[id]`: `usedCount` DESC, then `lastUsedAt` DESC (per key)
- `crossSellItems`: NOT re-sorted (server-sorted by `confidence` DESC)

**Cap:** `customerNotes` and each `itemNotesByItemId[id]` array capped at 5.

**Error handling:** If `apiResponse.success === false`, return `null`. If any sub-block is missing, use defaults (`[]`, `null`, `{}`).

### Step 1d — Utility: `relativeTime.js`

**File:** `src/utils/relativeTime.js` (NEW)

```js
/**
 * Convert ISO timestamp to human-readable relative time.
 * @param {string} isoString - ISO 8601 timestamp
 * @returns {string} e.g. "just now", "3 hours ago", "2 weeks ago"
 */
export const formatRelativeTime = (isoString) => {
  if (!isoString) return '';
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return 'just now';
  const hours = diffMs / 3_600_000;
  if (hours < 1) return 'just now';
  if (hours < 24) return `${Math.floor(hours)} hours ago`;
  const days = hours / 24;
  if (days < 7) return `${Math.floor(days)} days ago`;
  const weeks = days / 7;
  if (weeks < 4.3) return `${Math.floor(weeks)} weeks ago`;
  const months = days / 30;
  if (months < 12) return `${Math.floor(months)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
};
```

### Step 1e — Hook: `useCustomerIntel.js`

**File:** `src/hooks/useCustomerIntel.js` (NEW)

**Signature:**

```js
const { intel, loading, error } = useCustomerIntel(customerId, cartItems, orderType);
```

**State shape:**
- `intel`: the transformed object from Step 1c, or `null`
- `loading`: boolean
- `error`: string or `null` (only for console.warn; never shown to user)

**Cache key formula (CH-5):**

```js
const cartFingerprint = JSON.stringify(
  cartItems
    .filter(item => !item.placed || item.status !== 'cancelled')
    .map(item => [String(item.id), item.qty || 1])
    .sort()
);
const cacheKey = `${customerId}__${cartFingerprint}`;
```

**Cache TTL (CH-5):** 5 minutes (300,000 ms). RAM-only (React `useRef`). Never persisted to localStorage.

**Debounce (CH-6):** 500ms after cart fingerprint changes. Uses `setTimeout` / `clearTimeout` pattern in `useEffect`.

**Fetch trigger:** `useEffect` watches `[customerId, cartFingerprint]`:
- If `!customerId` → set `intel = null`, `loading = false`. Return.
- If cache hit (same cacheKey, age < 5 min) → set `intel` from cache. No fetch.
- Else → debounce 500ms → fetch → transform → set `intel` → update cache.

**Error handling (CH-11):**
- HTTP 401 → `console.warn('customerIntel: auth fail')`. Set `intel = null`.
- HTTP 5xx → `console.warn('customerIntel: server error', err)`. Set `intel = null`.
- Timeout (3s) → `console.warn('customerIntel: timeout')`. Set `intel = null`.
- `success: false, CUSTOMER_NOT_FOUND` → set `intel = null`. No console output.
- `success: false, INVALID_REQUEST` → `console.error('customerIntel: invalid request')`. Set `intel = null`.

**`meta.request_id` logging:** `console.debug('customerIntel: rid=', data.meta.request_id)` after successful transform.

**Cleanup:** On customer detach (`customerId` becomes falsy), clear `intel`. On unmount, cancel pending timeout.

### Step 1f — Wire Hook in OrderEntry.jsx

**File:** `src/components/order-entry/OrderEntry.jsx`
**Action:** MODIFY (Phase 1 — no visual changes)

Add import at top:
```js
import { useCustomerIntel } from '../../hooks/useCustomerIntel';
```

After `const [customer, setCustomer] = useState(null);` (L156), add:
```js
const { intel: customerIntel, loading: customerIntelLoading } = useCustomerIntel(
  customer?.id,
  cartItems,
  orderType
);
```

**Phase 1 verification:** Add temporary `console.log('customerIntel:', customerIntel)` in a `useEffect` watching `customerIntel`. Remove in Phase 2.

### Step 1g — Build & Verify

```bash
cd /app/frontend && CI=false yarn build
```

**Phase 1 Completion Criteria (from req freeze §13.3):**

| # | Criterion | How to verify |
|---|---|---|
| P1-C1 | `customerIntelService.js` exists and returns valid response for `abhishek jain` (UUID `1779d4fc-7161-4407-ac8c-cce30beb3e53`) | console.log or curl |
| P1-C2 | `customerIntelTransform.js` normalizes response with dual `last_visit_at` handling | Inspect console output for camelCase keys |
| P1-C3 | Cache stores response; second identical call returns cached | Open modal twice, check network panel — only 1 fetch |
| P1-C4 | Debounced cart-change re-fetch fires after 500ms | Add/remove items rapidly; single fetch after settle |
| P1-C5 | Error paths handled gracefully (401, 5xx, timeout, CUSTOMER_NOT_FOUND) | Force each by manipulating token / URL |
| P1-C6 | `yarn build` passes with no new ESLint errors | Build output |
| P1-C7 | Zero visual changes — UI is identical to pre-Phase-1 | Screenshot comparison |

---

## 7. UI Preview Checkpoint (BLOCKING GATE)

After Phase 1 is verified, the implementation agent MUST:

1. **Pipe mock data through the hook** (or use a real CRM-attached customer) to produce live data in the `customerIntel` object.
2. **Temporarily render the new UI sections** in CustomerModal, ItemNotesModal, OrderNotesModal using the cached data — for screenshot purposes ONLY.
3. **Take annotated screenshots** covering all 9 preview elements:

| # | Preview element | What to capture |
|---|---|---|
| P-1 | CustomerModal — Profile banner (populated customer) | Name, phone, tier pill, band pill, churn pill, win-back pill (if applicable), stats row, usual-channel/time chips |
| P-2 | CustomerModal — Past Favourites chip row | Top-5 chips with name + count |
| P-3 | CustomerModal — Smart Suggestions 3-card section | Name, reason, source pill, confidence, price, "+ Add" button |
| P-4 | CustomerModal — new-customer entry mode | Proof form inputs are unchanged |
| P-5 | CustomerModal — first-time customer | "New Customer" badge, other sections hidden |
| P-6 | ItemNotesModal — Customer Preferences populated | Top-5 notes with `<note> (count x relative-time)` |
| P-7 | OrderNotesModal — Customer History populated | Same format |
| P-8 | Loading skeleton states | Shimmer placeholders |
| P-9 | Empty / error states | Sections hidden |

4. **Present screenshots to owner** with checklist: "No production UI committed yet. Awaiting approval."
5. **Wait for owner response:**
   - `APPROVED` → proceed to Phase 2
   - `CHANGES_REQUESTED` → update preview, re-present
   - `REJECTED` → escalate

**After approval, revert any temporary Phase 2 UI code used for screenshots before starting the real Phase 2 implementation.** Or commit Phase 1 cleanly first, then build Phase 2 from scratch.

---

## 8. Phase 2 — UI Implementation (after owner approval only)

### Step 2a — CustomerModal.jsx Redesign

**File:** `src/components/order-entry/CustomerModal.jsx`
**Action:** MODIFY

**New props to add:**

```js
const CustomerModal = ({
  onClose, onSave, initialData = null, restaurantId = '',
  customerIntel = null,            // NEW: from useCustomerIntel hook
  customerIntelLoading = false,    // NEW: loading state
  onAddToCart = null,              // NEW: for favourites/suggestions click → addToCart
  onCustomizeItem = null,          // NEW: for favourites/suggestions click → setCustomizationItem
  menuItems = [],                  // NEW: product list for hydrating cross-sell cards
}) => {
```

**Conditional rendering rule (CH-9, AC-28):**

```
IF selectedCRMCustomer OR (initialData?.id AND !initialData.id.startsWith('CUST-'))
  → show Profile banner + Favourites + Suggestions sections
  → show existing form below in "Edit Customer Info" collapsible
ELSE
  → show existing form only (new-customer entry mode — UNCHANGED)
```

**Section order (inside `<div className="p-5 space-y-4">`):**

```
1. [Conditional] Profile banner          (data-testid="customer-profile-banner")
2. [Conditional] Past Favourites         (data-testid="customer-favourites-section")
3. [Conditional] Smart Suggestions       (data-testid="customer-suggestions-section")
4. Error message (existing)
5. Primary Fields — Name & Phone (existing)
6. Secondary Fields — Birthday, Anniversary, Member ID (existing)
7. Member badge (existing)
```

When in "existing customer" mode, sections 4-7 are wrapped in a collapsible "Edit Customer Info" section (default collapsed) to keep the modal from getting too tall. Close/Save buttons remain at footer.

**Profile Banner layout (CH-9):**

```
┌─ data-testid="customer-profile-banner" ──────────────────────────┐
│ ┌──────┐                                                         │
│ │  AJ  │  Abhishek Jain              +91 7505242126             │
│ └──────┘  [Bronze ●] [High Value ▲] [Watch ⚠]                   │
│           [Usual: Dine-in] [Usual: Afternoon]                    │
│           19 visits · ₹18,870 spent · 237 pts · ₹0 wallet       │
│           Last visit: 2 hours ago                                │
└──────────────────────────────────────────────────────────────────┘
```

- Avatar: circle with initials (first letter of first + last name), background `COLORS.primaryOrange + '15'`
- Name: `text-lg font-bold`, color `COLORS.darkText`
- Phone: `text-sm`, color `COLORS.grayText`
- Tier pill: rounded-full, colors per **§8.1 Pill Mapping** below
- Band pill: rounded-full, colors per §8.1
- Churn pill: only when `churnRisk !== 'low'`, colors per §8.1
- Win-back pill: only when `winBackRecommendation === true`, cyan bg
- Usual channel/time chips: small gray pills, only when non-null
- Stats row: `text-xs`, color `COLORS.grayText`; format: `<visits> visits · ₹<grossSpend formatted> spent · <loyaltyPoints> pts · ₹<walletBalance> wallet`
- Last visit: `text-xs`, `formatRelativeTime(lastVisitAt)`, color `COLORS.grayText`
- First-time customer: replace pills/stats with "New Customer" badge (`text-sm font-medium`, amber bg)

**Past Favourites section (CH-9):**

```
── Past Favourites ──
[Nuts Overload 78×] [Pista Dream 31×] [Falooda 20×] [Berry Cocoa 7×] [Dates 6×]
```

- Section header: `text-xs font-medium uppercase tracking-wide`, color `COLORS.grayText`
- Each chip: `px-3 py-2 rounded-xl text-sm font-medium`, bg `COLORS.sectionBg`, border `COLORS.borderGray`
- Chip text: `<name> <orderCount>×`
- `data-testid="customer-favourites-chip-<itemId>"`
- **Click behaviour (CH-10):** Find food in `menuItems` by `itemId`. If found and `food.customizable` → call `onCustomizeItem(food)`. Else if found → call `onAddToCart(food)`. If not found in menu → silently skip (item may have been removed).
- Hidden when: no `customerIntel`, first-time customer, empty `topItems`.

**Smart Suggestions section (CH-9):**

```
── Smart Suggestions ──
┌──────────────────────────────────────────┐
│ Berry Cocoa Swirl Loua         ₹309      │
│ [history] Ordered in 7 of 20 visits      │
│ conf: 0.21        [+ Add to Cart]        │
└──────────────────────────────────────────┘
[more cards...]
```

- Section header: same style as Favourites
- Each card: `p-3 rounded-xl`, bg `COLORS.sectionBg`, border `COLORS.borderGray`
- `data-testid="customer-suggestion-card-<itemId>"`
- Card content: name (`font-medium`), price from local menu cache (fallback: hide price), reason text, source pill (`rounded-full px-2 py-0.5 text-xs`; "history" = gray, "restaurant" = blue), confidence formatted as `Math.round(confidence * 100) + '%'`, "+ Add" button (`text-sm font-medium`, color `COLORS.primaryGreen`)
- **Click behaviour (CH-10):** Same as Favourites chip. The "+ Add" button triggers the click.
- **Defensive filter (AC-18):** Filter out any `crossSellItem` whose `itemId` matches a current `cartItems[].id`. (Server already filters, this is belt-and-suspenders.)
- **Feature flag gate (AC-19):** Hide entire section when `featureFlags.crossSell === false`.
- Hidden when: no `customerIntel`, first-time customer, empty `crossSellItems` after defensive filter.

**Loading state (P-8):**

When `customerIntelLoading === true` and `selectedCRMCustomer` is truthy:
- Profile banner area: `animate-pulse` gray div, `h-24 rounded-xl`
- Favourites area: row of 3 `animate-pulse` chips, `h-8 w-24 rounded-xl`
- Suggestions area: 2 `animate-pulse` cards, `h-16 rounded-xl`

### Step 2b — ItemNotesModal.jsx

**File:** `src/components/order-entry/ItemNotesModal.jsx`
**Action:** MODIFY

**New prop:** `customerIntel = null`

**Replace L11:**

```js
// OLD: const customerData = customerId ? getCustomerPreferences(customerId, "item") : null;
// NEW:
const customerData = (() => {
  if (!customerIntel || !item?.id) return null;
  const notes = customerIntel.itemNotesByItemId[String(item.id)];
  if (!notes || notes.length === 0) return null;
  return {
    name: customerIntel.customerSummary.name,
    preferences: notes.map(n => ({
      note: `${n.text}  (${n.usedCount}× · ${n.relativeTime})`,
      isAlert: false,
      source: n.source,
    })),
  };
})();
```

**Remove import:** Remove `getCustomerPreferences` from the `../../data` import (keep `itemLevelPresets`).

**Rendering (L166-203):** Already works because the shape matches `{ name, preferences: [{ note, isAlert }] }`. No structural changes needed — just the data source changes from mock to live.

### Step 2c — OrderNotesModal.jsx

**File:** `src/components/order-entry/OrderNotesModal.jsx`
**Action:** MODIFY (identical pattern to ItemNotesModal)

**New prop:** `customerIntel = null`

**Replace L11:**

```js
// OLD: const customerData = customerId ? getCustomerPreferences(customerId, "order") : null;
// NEW:
const customerData = (() => {
  if (!customerIntel?.customerNotes?.length) return null;
  return {
    name: customerIntel.customerSummary.name,
    preferences: customerIntel.customerNotes.map(n => ({
      note: `${n.text}  (${n.usedCount}× · ${n.relativeTime})`,
      source: n.source,
    })),
  };
})();
```

**Remove import:** Remove `getCustomerPreferences` from the `../../data` import (keep `orderLevelPresets`).

### Step 2d — OrderEntry.jsx (Phase 2 wiring)

**File:** `src/components/order-entry/OrderEntry.jsx`
**Action:** MODIFY

**1. Pass `customerIntel` + `addToCart` + `setCustomizationItem` + `menuItems` to CustomerModal (L2348-2355):**

```jsx
{showCustomerModal && (
  <CustomerModal
    onClose={() => setShowCustomerModal(false)}
    onSave={(customerData) => setCustomer(customerData)}
    initialData={customer}
    restaurantId={restaurant?.id}
    customerIntel={customerIntel}
    customerIntelLoading={customerIntelLoading}
    onAddToCart={addToCart}
    onCustomizeItem={setCustomizationItem}
    menuItems={products.filter(p => p.isActive && !p.isDisabled).map(adaptProduct)}
  />
)}
```

**2. Pass `customerIntel` to ItemNotesModal (L2293-2314):**

Add prop: `customerIntel={customerIntel}`

**3. Pass `customerIntel` to OrderNotesModal (L2284-2291):**

Add prop: `customerIntel={customerIntel}`

**4. Remove temporary console.log from Phase 1.**

---

## 9. Pill Colour / Icon Mapping (CH-8)

| State | Background | Text/Icon colour | Icon (lucide-react) | Label |
|---|---|---|---|---|
| Tier `Bronze` | `#CD7F3220` | `#CD7F32` | `Medal` | "Bronze" |
| Tier `Silver` | `#C0C0C020` | `#808080` | `Medal` | "Silver" |
| Tier `Gold` | `#FFD70020` | `#B8860B` | `Medal` | "Gold" |
| Tier `Platinum` | `#E5E4E220` | `#6B6B6B` | `Medal` + `Star` | "Platinum" |
| Band `low` | `COLORS.sectionBg` | `COLORS.grayText` | `TrendingDown` | "Low Value" |
| Band `medium` | `#F59E0B20` | `#D97706` | `Minus` | "Medium Value" |
| Band `high` | `#10B98120` | `#059669` | `TrendingUp` | "High Value" |
| Band `vip` | `#8B5CF620` | `#7C3AED` | `Crown` | "VIP" |
| Churn `low` | (hidden) | — | — | — |
| Churn `medium` | `#F59E0B20` | `#D97706` | `AlertTriangle` | "Watch" |
| Churn `high` | `#EF444420` | `#DC2626` | `AlertOctagon` | "At Risk" |
| Win-back | `#06B6D420` | `#0891B2` | `RotateCw` | "Win-back" |
| New Customer | `#F4A11A20` | `#D97706` | `UserPlus` | "New Customer" |

---

## 10. `data-testid` Values (CH-7)

| Element | `data-testid` value |
|---|---|
| Profile banner container | `customer-profile-banner` |
| Tier pill | `customer-tier-pill` |
| Value band pill | `customer-value-band-pill` |
| Churn pill | `customer-churn-pill` |
| Win-back pill | `customer-winback-pill` |
| Past Favourites section | `customer-favourites-section` |
| Each favourite chip | `customer-favourites-chip-<itemId>` |
| Smart Suggestions section | `customer-suggestions-section` |
| Each suggestion card | `customer-suggestion-card-<itemId>` |
| Suggestion "+ Add" button | `customer-suggestion-add-<itemId>` |
| Loading skeleton (profile) | `customer-intel-skeleton-profile` |
| Loading skeleton (favourites) | `customer-intel-skeleton-favourites` |
| Loading skeleton (suggestions) | `customer-intel-skeleton-suggestions` |

---

## 11. Error / Empty / Loading State Behaviour (CH-11)

| Condition | Profile Banner | Favourites | Suggestions | Notes (Item/Order) |
|---|---|---|---|---|
| `customerIntelLoading === true` | Skeleton shimmer | Skeleton shimmer | Skeleton shimmer | Skeleton shimmer |
| `customerIntel === null` (no customer) | Hidden | Hidden | Hidden | "No customer linked" (existing) |
| `customerIntel === null` (error/timeout) | Hidden | Hidden | Hidden | "No customer linked" (existing) |
| First-time customer (`isFirstTimeCustomer`) | "New Customer" badge + name/phone only | Hidden | Hidden | Empty state |
| Populated customer, empty `crossSellItems` | Shown | Shown | Hidden | Shown |
| `featureFlags.crossSell === false` | Shown | Shown | **Hidden** | Shown |
| Item not in `itemNotesByItemId` | n/a | n/a | n/a | Empty state (existing "No customer linked" copy replaced with "No past notes for this item") |

---

## 12. Rollback Plan (CH-16)

### Phase 1 Rollback
**Impact:** Zero visual change. Safe to revert at any time.
**Steps:** Revert commits that added `customerIntelService.js`, `customerIntelTransform.js`, `useCustomerIntel.js`, `relativeTime.js`, the constants.js line, and the OrderEntry.jsx hook call. Build will return to exact pre-CR-002 state.

### Phase 2 Rollback
**Impact:** UI reverts to mock-based modals. Cashiers lose CRM intelligence features.
**Steps:** Revert commits that modified `CustomerModal.jsx`, `ItemNotesModal.jsx`, `OrderNotesModal.jsx`, and the OrderEntry.jsx prop-passing changes. Phase 1 code can remain (no visual impact) or be reverted separately.

### Server-Side Kill
CRM flips `feature_flags.cross_sell: false` → Smart Suggestions section hides immediately. Profile / Favourites / Notes sections remain (driven by data presence, not flag). No POS deploy needed.

---

## 13. Risk Register

All risks from req freeze §11 (R-01 through R-10) remain. Additional:

| ID | Risk | L | I | Mitigation |
|---|---|---|---|---|
| R-11 | `adaptProduct()` in OrderEntry creates new object refs every render → `menuItems` prop causes CustomerModal re-render | M | L | Memoize `menuItems` with `useMemo` in OrderEntry; or pass `products` + `adaptProduct` separately |
| R-12 | CustomerModal becomes too tall with all 3 new sections + existing form | M | M | Form section collapsible (default collapsed) in existing-customer mode; modal `max-h-[85vh] overflow-y-auto` |
| R-13 | Race condition: customer detached while fetch is in flight | L | M | Hook clears `intel` on `customerId` change; pending fetch result is discarded if `customerId` changed |

---

## 14. QA Handoff Checklist (mapped to 30 ACs)

| AC | Test | Phase |
|---|---|---|
| AC-01 | CustomerModal open → 1 POST if cache cold | P1 verify + P2 QA |
| AC-02 | Cart change → debounced re-fetch on fingerprint change | P1 verify |
| AC-03 | ItemNotesModal → item_notes_by_id[item.id] top 5 | P2 QA |
| AC-04 | OrderNotesModal → customer_notes top 5 | P2 QA |
| AC-05 | Walk-in → no fetch, existing empty states | P1 verify + P2 QA |
| AC-06 | First-time customer → "New Customer" badge | P2 QA |
| AC-07 | Tier pill colours | P2 QA |
| AC-08 | Band pill colours | P2 QA |
| AC-09 | Churn pill colours | P2 QA |
| AC-10 | Win-back pill condition | P2 QA |
| AC-11 | score never shown | P2 QA |
| AC-12 | net_spend never shown | P2 QA |
| AC-13 | available_coupons_count never shown | P2 QA |
| AC-14 | top_categories never shown | P2 QA |
| AC-15 | Favourite chip click → customizable / addToCart | P2 QA |
| AC-16 | Suggestion card click → customizable / addToCart | P2 QA |
| AC-17 | Card: name, reason, source, confidence, price | P2 QA |
| AC-18 | Cart items excluded from suggestions | P2 QA |
| AC-19 | feature_flags.cross_sell: false → section hidden | P2 QA |
| AC-20 | 401/5xx/timeout → silent hide | P1 verify + P2 QA |
| AC-21 | CUSTOMER_NOT_FOUND → empty, no console | P1 verify |
| AC-22 | Cache 5 min RAM | P1 verify |
| AC-23 | Dual last_visit_at format | P1 verify |
| AC-24 | data-testid hooks | P2 QA |
| AC-25 | request_id logged | P1 verify |
| AC-26 | No regression to food_level_notes / order_note | P2 QA |
| AC-27 | Build clean | P1 + P2 |
| AC-28 | Existing form intact in new-customer mode | P2 QA |
| AC-29 | upsell_items[] silently ignored | P1 verify |
| AC-30 | Fetch on customer-attach from CartPanel | P1 verify |

---

## 15. Clean Handover Checklist (CH-1 through CH-16)

| CH | Requirement | Where in this doc |
|---|---|---|
| CH-1 | Exact file paths (NEW + MODIFIED) | §5 File Map |
| CH-2 | Per-file change description with function signatures, state shape, prop types | §6 (Phase 1) + §8 (Phase 2) |
| CH-3 | Exact CRM endpoint URL construction | §6 Step 1b |
| CH-4 | Exact auth header wiring | §6 Step 1b |
| CH-5 | Exact cache key formula and TTL | §6 Step 1e |
| CH-6 | Exact cart fingerprint formula | §6 Step 1e |
| CH-7 | Exact data-testid values | §10 |
| CH-8 | Exact pill colour/icon mapping | §9 |
| CH-9 | Exact CustomerModal layout, section order, visibility rules | §8 Step 2a |
| CH-10 | Exact click behaviour for all clickable elements | §8 Step 2a (Favourites + Suggestions) |
| CH-11 | Exact error/empty/loading state behaviour | §11 |
| CH-12 | Exact notePresets.js migration path | PD-2 in §4 + §8 Steps 2b/2c |
| CH-13 | UI preview artifact format + instructions | §7 (Option C — screenshots) |
| CH-14 | Phase 1 completion criteria checklist | §6 Step 1g |
| CH-15 | Phase 2 completion criteria checklist | §8 (→ req freeze §13.4) |
| CH-16 | Rollback instructions for both phases | §12 |

---

## 16. Document Linkages

| Doc | Path |
|---|---|
| Sprint scaffold | `/app/memory/crm/crm_2_0/README.md` |
| Upstream CRM handoff | `handoff/CRM2_0_CR_002_CROSS_SELL_API_HANDOFF_FROM_CRM_2026_05_26.md` |
| POS feedback (Stage 1) | `discovery/CRM2_0_CR_002_POS_FEEDBACK_TO_CRM_HANDOFF_2026_05_26.md` |
| Contract freeze (Stage 3) | `contract/CRM2_0_CR_002_CROSS_SELL_CONTRACT_FREEZE_2026_05_26.md` |
| Requirements freeze (Stage 4) | `implementation/CRM2_0_CR_002_CROSS_SELL_REQUIREMENTS_FREEZE_2026_05_26.md` |
| **Implementation plan (Stage 5) — THIS DOC** | `implementation/CRM2_0_CR_002_CROSS_SELL_IMPLEMENTATION_PLAN_2026_05_26.md` |
| Impl report (Stage 6) — TO BE WRITTEN | `implementation/CRM2_0_CR_002_CROSS_SELL_IMPL_REPORT_<date>.md` |
| QA (Stage 7) | `qa/CRM2_0_CR_002_CROSS_SELL_QA_REPORT_<date>.md` |

---

## 17. Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | No code written | CONFIRMED |
| 2 | No data mutated | CONFIRMED |
| 3 | No mutating API called | CONFIRMED |
| 4 | `/app/memory/final/` untouched | CONFIRMED |
| 5 | `/app/memory/crm/crm_1_0/` untouched | CONFIRMED |
| 6 | All CH-1..CH-16 items covered | CONFIRMED (see §15) |
| 7 | Two-phase structure with preview checkpoint | CONFIRMED (§6 + §7 + §8) |
| 8 | Clean handover guarantee met | CONFIRMED |

---

**End of CRM 2.0 CR-002 Cross-Sell Implementation Plan. Stage 5 complete. Handoff to implementation agent.**
