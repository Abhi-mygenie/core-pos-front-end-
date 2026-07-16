# CR-008 — Delivery flow, Audit action-time, Dispatch integration, Post-action navigation

**Status:** Requirements gathering & impact analysis (no code changes yet).
**Author:** Requirement Gathering Agent · 2026-05-01
**Source:** User-reported issues (delivery charges, audit timings, dispatch/assign, post-action screen routing).

This CR bundles four related-but-independent asks. Each can be split into its own PR.

---

## Sub-CR #1 — Delivery charges at order placement (not just at bill)

### 1.1 Reported
> "currently user is not able to put delivery charges while placing order. he can only put while collecting bill. user should be able to put delivery charges while selecting address, delivery charges should show from google api and user [can] over write it, as we [are] doing in collect bill screen"

### 1.2 Current behaviour — traced
- **CollectPaymentPanel** has delivery-charge input (L142-146, L334, L860). Value flows through as an override on bill print (`CollectPaymentPanel.jsx:860`) and into `buildBillPrintPayload` (`orderTransform.js:1406`).
- **OrderEntry / placeOrder path** hardcodes `delivery_charge: 0` when creating or updating orders:
  - `orderTransform.js:680` — `placeOrder`
  - `orderTransform.js:753` — `updateOrder`
  - Only the bill-print + payment paths (`orderTransform.js:848`, `:1006`, `:1219`, `:1406`) carry the real value.
- **AddressFormModal** uses Google Maps Places Autocomplete only (`AddressFormModal.jsx:12-32, :111`). It captures lat/lng but does **not** call Distance Matrix or Directions API to compute delivery fee.
- **AddressPickerModal** does not emit a delivery charge at all.

### 1.3 Gap
- No UI input for delivery charge on the Order Entry screen (left/right panel or address modal).
- No Google API call that computes distance-based fee from restaurant location → customer address.
- `placeOrder` and `updateOrder` payloads lose whatever value exists (hardcoded 0).

### 1.4 Required behaviour
1. In AddressPickerModal / AddressFormModal (delivery order only), after user selects an address:
   - Call Google Distance Matrix API (key already in env: `REACT_APP_GOOGLE_MAPS_KEY`) with origin = restaurant geo, destination = selected address.
   - Convert distance → delivery charge using a rule owned by **restaurant settings** (per-km rate / slab / flat) — source of truth TBD (Q-D1).
   - Display the computed charge in an editable input so the user can overwrite.
2. Propagate the live charge into `placeOrder` / `updateOrder` payloads:
   - Update `orderTransform.js:680` & `:753` — replace `delivery_charge: 0` with the propagated value.
3. When the order hits the Collect Bill screen later, the seeded `initialDeliveryCharge` must reflect what was punched at order entry (today `CollectPaymentPanel.jsx:142-146` already supports seeding from backend — will round-trip automatically once the value is persisted).

### 1.5 File-by-file impact (Sub-CR #1)
| File | Lines | Change |
|---|---|---|
| `components/order-entry/AddressPickerModal.jsx` | (whole file) | Add delivery-charge input field (read-only from Maps call + editable override) |
| `components/order-entry/AddressFormModal.jsx` | 12-32, 111+ | Add Distance Matrix API call after address confirm; populate charge |
| `api/transforms/orderTransform.js` | 680, 753 | Accept delivery charge from caller, stop hardcoding 0 |
| `components/order-entry/OrderEntry.jsx` | ~160 (state), ~700-800 (place/update handlers) | Thread `deliveryCharge` state from address → cart → transform |
| `components/order-entry/CartPanel.jsx` | delivery section | Display the punched delivery charge above cart totals |
| (optional) `contexts/RestaurantContext.jsx` | settings block | Expose delivery-fee rule (per-km / flat) if backend already ships it |

### 1.6 Open questions (Sub-CR #1)
| ID | Question | Suggested default |
|---|---|---|
| Q-D1 | Delivery-fee formula: flat rate, per-km, or slab? Source — restaurant settings or hardcoded in frontend? | Per-km × distance, rate from restaurant settings key (TBD with backend) |
| Q-D2 | Google API: Distance Matrix (driving) or straight-line haversine from coords? | Distance Matrix (actual driving km) — more accurate |
| Q-D3 | What happens if Google API fails / no coords? | Show editable empty field with manual entry |
| Q-D4 | Restaurant origin coordinates — which key in restaurant context? | Confirm with backend (possibly `latitude`/`longitude` on restaurant profile) |
| Q-D5 | Should free-delivery threshold (subtotal ≥ X) override the computed fee? | Yes if backend settings says so — defer to backend flag |

---

## Sub-CR #2 — Action time + time-diff column on Audit Report

### 2.1 Reported
> "when order is cancelled / merged / transferred / any kind of action happens we need a column action time where time of action will come, and also we need time difference in minutes between order punched and that action"

### 2.2 Current behaviour — traced
- `OrderTable.jsx` columns today include `time` (created_at) but **no** "action time" or "duration" columns.
- `reportTransform.js` exposes `cancelledAt`, `mergedAt` (L558-559) and `collectedAt` (L917 in reportService) per row.
- `actionedBy` / `actionedByLabel` exist (`reportService.js:820-880`) but have no associated timestamp column.
- No delta/duration computation between `created_at` and action timestamp anywhere.

### 2.3 Required behaviour
Add two new columns to the audit table:

| Column | Source per row status |
|---|---|
| **ACTION TIME** | `cancelled → cancelledAt` / `merged → mergedAt` / `paid → collectedAt` / `transferred → updatedAt` / else `—` |
| **TIME DIFF (min)** | `(actionTime − createdAt) / 60000` rounded to nearest int; `—` if actionTime absent |

Minimum effort path: pure frontend — all source timestamps already exist in the transform output.

### 2.4 File-by-file impact (Sub-CR #2)
| File | Lines | Change |
|---|---|---|
| `components/reports/OrderTable.jsx` | ~119-132 (col defs); ~440-520 (renderers) | Add `actionTime` and `timeDiffMin` columns with a small renderer |
| `api/services/reportService.js` | ~882-935 (transform output) | Add derived `actionTime` and `timeDiffMin` fields on each row — reuses existing `cancelledAt`/`mergedAt`/`collectedAt`/`updatedAt` |
| `components/reports/ExportButtons.jsx` | CSV/PDF column list | Include new columns in exports |
| Tests | `__tests__/` | Cases: cancelled row, merged row, transferred row, running row (no action) |

### 2.5 Open questions (Sub-CR #2)
| ID | Question | Suggested default |
|---|---|---|
| Q-T1 | Time-diff format: `m` (minutes), `h:mm`, or `1h 23m`? | Minutes integer — matches user wording "in minutes" |
| Q-T2 | For running / hold / audit rows — show `—` or "In progress"? | `—` (consistent with other empty cells) |
| Q-T3 | Column ordering — insert before/after AMOUNT? | After ACTIONED BY, before PAYMENT |

---

## Sub-CR #3 — Delivery: dispatch + assign rider endpoints missing

### 3.1 Reported
> "not able to dispatch order and assign order in delivery seems complete end point integration is missing"

### 3.2 Current behaviour — traced
- Code search for `assignRider` / `dispatchOrder` / `dispatch-order` / `assign-rider` / `ASSIGN_RIDER` / `DISPATCH` → **zero results** across `/app/frontend/src/api/`, `/components/`, `/pages/`.
- Only inbound socket event exists: `DELIVERY_ASSIGN_ORDER` (`api/socket/socketEvents.js:62`) with handler at `api/socket/socketHandlers.js:451-463`. This **receives** a rider-assigned push from elsewhere (backend/web/admin) — there is **no outbound API** from POS to assign a rider or mark dispatched.
- `DeliveryCard.jsx` displays rider info (`rider`, `riderPhone`, `riderStatus`) but has no button to assign/dispatch.
- `orderTransform.js` sends `auto_dispatch: 'No'` (L672, L747, L840) on placement but has no handler to flip it post-placement.

### 3.3 Gap
The entire POS→backend path for:
- "Mark order dispatched"
- "Assign rider X to order Y"

…is absent. The backend likely has endpoints (list-riders, assign-rider, dispatch-order) but the frontend has no `api/services/deliveryService.js` or equivalent.

### 3.4 Required behaviour
Build the POS→backend integration for two operations:
1. **List available riders** (for the picker UI) — `GET /api/v1/...riders?status=available` (endpoint name TBD).
2. **Assign rider to order** — `POST /api/v1/...assign-rider` with `{ order_id, rider_id }`.
3. **Mark order dispatched** — either part of assign, or separate `POST /api/v1/...dispatch-order` with `{ order_id }`.

### 3.5 File-by-file impact (Sub-CR #3)
| File | Status | Change |
|---|---|---|
| `api/services/deliveryService.js` | **new file** | `listAvailableRiders()`, `assignRiderToOrder()`, `dispatchOrder()` |
| `api/constants.js` | add endpoints | `RIDERS_LIST`, `ASSIGN_RIDER`, `DISPATCH_ORDER` |
| `components/modals/AssignRiderModal.jsx` | **new file** | Rider picker modal reused across DeliveryCard + audit row |
| `components/cards/DeliveryCard.jsx` | ~100-150 | Add "Assign Rider" + "Mark Dispatched" action buttons |
| `components/cards/OrderCard.jsx` | ~610-640 (Rider section) | Add assign button when `!order.rider && orderType === 'delivery'` |
| `api/socket/socketHandlers.js` | 451-463 | Already handles inbound — no change |
| Tests | new | End-to-end: list → pick → assign → socket echo → UI update |

### 3.6 Open questions (Sub-CR #3) — **blocking**
| ID | Question | Owner |
|---|---|---|
| Q-R1 | Backend endpoint for listing riders — URL + auth + query params? | Backend |
| Q-R2 | Backend endpoint for assign-rider — payload + response shape? | Backend |
| Q-R3 | Is "dispatch" a separate action from "assign", or implicit on assign? | Product + Backend |
| Q-R4 | Rider status model — `available / busy / offline`? Used for filtering list? | Backend |
| Q-R5 | Does socket `delivery-assign-order` event suffice for post-assign UI refresh, or do we need to refetch the order? | Backend (verify payload completeness) |

Sub-CR #3 is **blocked on backend endpoint definition**. Cannot proceed without Q-R1..Q-R5.

---

## Sub-CR #4 — Post-action navigation & default landing screen (admin configurable)

### 4.1 Reported
> "currently after action on collect bill and place order screen we some time are redirecting user some times we making him stay on screen. i need all those mapping and basically it should be configurable in admin if dashboard is default screen or order page, thats will be screen which will show on load and on action in place order / collect bill screen"

### 4.2 Current behaviour — traced
Every action in `OrderEntry.jsx` calls `onClose()` (which routes back to dashboard). Sample of redirect points:

| Action | Line | Behaviour |
|---|---|---|
| Place order — new | 797 | `onClose()` → dashboard |
| Place order — update (HTTP + socket engage) | 725-802 | `onClose()` after socket engage → dashboard |
| Transfer food | 838 | `onClose()` → dashboard |
| Merge table | 864 | `onClose()` → dashboard |
| Shift table | 887 | `onClose()` → dashboard |
| Cancel food | 913 | `onClose()` → dashboard |
| Cancel order | 937 | `onClose()` → dashboard |
| Collect payment complete | 1164-onwards | `setShowPaymentPanel(false)` but generally closes order entry |

No configurable setting; behaviour is hardcoded across 8+ callsites. **User's complaint is correct** — the redirect pattern is inconsistent in places where socket engage is awaited vs fire-and-forget.

- Default landing on app load: `pages/DashboardPage.jsx` is the current entry (`App.js` / routes). No setting to make "Order page" the entry.
- Restaurant settings expose `autoKot` / `autoBill` (`RestaurantContext.jsx:55-59`) — a precedent for boolean settings. No `defaultLandingScreen` key exists today.

### 4.3 Required behaviour
1. **Admin setting:** `defaultLandingScreen` ∈ `{ 'dashboard', 'orderPage' }`. Defaults to `dashboard`.
2. On app load (`LoadingPage` / post-login redirect), route to setting value.
3. On action completion in Order Entry or Collect Payment, route to setting value (replaces the 8+ hardcoded `onClose()` calls).
4. Document the action-→-redirect mapping in one single matrix (no per-site decision).

### 4.4 Proposed mapping (subject to confirmation — see Q-N1..Q-N3)

| Action | Current behaviour | Proposed behaviour (if `defaultLandingScreen === 'orderPage'`) |
|---|---|---|
| New order placed | → dashboard | → stay on order page (fresh cart for next order) |
| Update order (add items) | → dashboard | → stay on order page with order still engaged |
| Collect bill / pay | → dashboard | → order page with cart cleared |
| Cancel order | → dashboard | → order page (fresh) |
| Transfer / merge / shift | → dashboard | → order page (fresh) |
| App load (post-login) | → dashboard | → order page (new blank walk-in or table-picker) |

### 4.5 File-by-file impact (Sub-CR #4)
| File | Lines | Change |
|---|---|---|
| `contexts/RestaurantContext.jsx` | 54-59 | Expose `defaultLandingScreen` from settings |
| `components/panels/SettingsPanel.jsx` (admin) | — | Add UI toggle: "Default screen on load & after actions" |
| `pages/LoadingPage.jsx` | (post-load route) | Use setting to pick `/dashboard` vs `/order-entry` |
| `components/order-entry/OrderEntry.jsx` | 797, 802, 838, 864, 887, 913, 937, 1164+ | Replace hardcoded `onClose()` with `navigateAfterAction(action)` helper that honors setting |
| `components/order-entry/CollectPaymentPanel.jsx` | (payment complete) | Same helper |
| `api/services/settingsService.js` (+ transforms) | — | Read/write new setting key |
| Backend | — | Add `default_landing_screen` field on restaurant settings (Q-N4) |

### 4.6 Open questions (Sub-CR #4)
| ID | Question | Suggested default |
|---|---|---|
| Q-N1 | Is the setting global per restaurant, or per user/role? | Per restaurant (simplest). Per-role follows if needed. |
| Q-N2 | When `orderPage` is default and user cancels/transfers — land on a fresh order entry or previous table's order? | Fresh / table picker |
| Q-N3 | Post-payment with `orderPage` default — same table or new blank? | New blank (cashier workflow) |
| Q-N4 | Backend settings key name — `default_landing_screen` / `home_screen_type`? | `default_landing_screen` |
| Q-N5 | Should "Stay on screen" be a third option alongside dashboard/orderPage? | No — two states simpler; user-action controls the rest |

---

## 3. Dependencies & sequencing

| Sub-CR | Backend dependency | Frontend-only? | Can ship independently? |
|---|---|---|---|
| #1 Delivery charges at placement | Maybe — delivery-fee formula settings | Partially (if formula hardcoded for Phase A) | Yes |
| #2 Action time columns | **None** | ✅ Yes | Yes — ship first |
| #3 Dispatch / assign rider | **Blocking** — 5 endpoints + schemas | ❌ No | Blocked on BE |
| #4 Default landing screen | Settings key definition | Partially (can stub with localStorage first) | Yes |

**Recommended ship order:** #2 → #4 → #1 → #3 (#3 last, due to backend dep).

---

## 4. Consolidated backend asks

| # | Ask | Sub-CR |
|---|---|---|
| BE-A | Delivery-fee formula on restaurant settings (per-km rate / flat / slab) + restaurant origin coordinates | #1 |
| BE-B | List available riders endpoint + response schema | #3 |
| BE-C | Assign rider to order endpoint | #3 |
| BE-D | Dispatch order endpoint (or confirm assign implies dispatch) | #3 |
| BE-E | Rider status model (available / busy / offline) | #3 |
| BE-F | `default_landing_screen` field on restaurant settings + `GET`/`PUT` support | #4 |

---

## 5. Risks

| ID | Risk | Sub-CR | Severity |
|---|---|---|---|
| R-1 | Google Distance Matrix billing — per-call cost can add up if fired on every keystroke | #1 | Medium — debounce; fire only on address confirm |
| R-2 | Duplicate delivery-charge input on Order Entry + Collect Bill may confuse cashier | #1 | Low — clearly label "Seeded from order entry. Editable." on Collect Bill |
| R-3 | Adding 2 columns to audit table makes total 12+ columns → horizontal scroll | #2 | Low — consolidated with CR-005 PG-columns decision (toggle-based) |
| R-4 | Dispatch integration without backend contract leads to rework | #3 | High — DO NOT start frontend until BE-B..BE-E locked |
| R-5 | `defaultLandingScreen='orderPage'` with no engaged table → lands on empty table-picker — possibly jarring | #4 | Low — UX review before shipping |
| R-6 | The 8+ `onClose()` callsites in OrderEntry may have per-case reasons (e.g., socket engage timing) — blanket replacement may regress | #4 | Medium — preserve per-callsite timing; only change the *destination*, not the *when* |

---

## 6. Decision log

| Date | Decision | Source |
|---|---|---|
| 2026-05-01 | 4 sub-CRs logged; no code changes | User |
| 2026-05-01 | Sub-CR #2 is the only fully frontend-only one — ship first | Code inspection |
| 2026-05-01 | Sub-CR #3 is blocked on backend contract | Code inspection (zero dispatch/assign endpoints found) |

---

## 7. Hand-off note

Each sub-CR should eventually be split into its own PR. Question batch to user:
- **Sub-CR #1** → Q-D1..Q-D5 (5 questions)
- **Sub-CR #2** → Q-T1..Q-T3 (3 questions)
- **Sub-CR #3** → **blocked** on Q-R1..Q-R5 (backend contract)
- **Sub-CR #4** → Q-N1..Q-N5 (5 questions)

Total: 18 open questions. Q-R1..Q-R5 require a backend conversation; the other 13 can be answered by product.

User signalled they may add more requirements ("5." was left empty in the message). IA kept open for extension.
