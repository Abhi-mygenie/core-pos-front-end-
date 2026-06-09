# Tip Visibility Profile Investigation

> **Scope:** Read-only static code analysis. No code changed. No backend touched.
> **Source of truth:** current code in `/app/frontend` (HEAD).
> **Focus:** Tip UI visibility on Collect Payment screen vs. `restaurant.features.tip` profile flag.

---

## 1. Summary

**The frontend IS correctly checking the restaurant profile Tip flag before rendering the Tip UI.** The gate is wired at every relevant surface (Tip input section, bill-summary rows, payment computation, payload field). When `restaurant.features.tip === false`, the Tip input is hidden and the tip payload field is forced to 0.

Therefore, "Tip showing for all restaurants" is **not a frontend rendering bug**. It is one of:

| Hypothesis | Likelihood | Evidence |
|---|---|---|
| **A. Backend always returns `tip: "Yes"` (or truthy) in the profile API regardless of the per-restaurant config** | **HIGH** | Frontend transforms `api.tip` faithfully; only path to "always-showing" is the source always being truthy. |
| **B. All restaurants the user has tested simply have `tip: Yes` configured in the database** | MEDIUM | Possible if no one has yet seeded a "tip: No" restaurant; the easiest way to test is to flip one in the database. |
| **C. Backend uses a different field name (e.g., `tip_enabled`, `tipping`) and `api.tip` is `undefined`** | LOW | `toBoolean(undefined) = false` → Tip would be HIDDEN for all, which does NOT match the observed symptom. |
| **D. Frontend Settings UI flip-without-save makes operators think the flag is editable, but it doesn't persist** | INDIRECT | The Settings screen's "Save" button is a no-op (`onSave={() => setIsEditing(false)}`) — no PUT/POST. So even if operators tried to disable Tip from inside the POS, the change wouldn't reach the backend. The backend-side Tip flag could not be flipped from the POS — only from an admin/backend portal. |

**Recommended next step: network inspection** of `/api/v1/vendoremployee/profile` for a restaurant where Tip is intended to be disabled, to determine which of A / B / C is in play. This investigation cannot conclude root cause without that single data point.

The frontend code itself **does not need any change** unless the backend field name turns out to be different (hypothesis C — disproved by the symptom itself, but worth confirming).

---

## 2. Profile API Tip Field

### Endpoint
`/api/v1/vendoremployee/profile` (constant `API_ENDPOINTS.PROFILE` in `frontend/src/api/constants.js` L11).

### Frontend's expected response shape
```js
{
  restaurants: [
    {
      id, name, ..., 
      dine_in, delivery, take_away, room, inventory,
      tip,              // ← This is the Tip enable/disable flag
      service_charge,
      service_charge_percentage,
      auto_service_charge,
      ...
    }
  ],
  print_agent: ...
  role: [...]
}
```

The Tip flag is expected at `restaurants[0].tip`. Accepted values (per the `toBoolean` helper at `profileTransform.js` L20–L31 + `YES_NO_MAP` at `constants.js` L225–L238):

| Backend value | Mapped frontend value |
|---|---|
| `"Yes"` / `"yes"` / `"Y"` / `"y"` / `true` / `1` / `"1"` / `"true"` / `"on"` | `true` |
| `"No"` / `"no"` / `"N"` / `"n"` / `false` / `0` / `"0"` / `"false"` / `"off"` | `false` |
| `null` / `undefined` / `""` / any other string | `false` |

Conclusion: the only way `restaurant.features.tip` becomes `true` is if the backend explicitly sends a truthy value at `restaurants[0].tip`.

---

## 3. Profile Transform Mapping

### File / location
`frontend/src/api/transforms/profileTransform.js` — `fromAPI.restaurant` (L105–L161).

### Exact mapping (L119–L127)
```js
features: {
  dineIn: toBoolean(api.dine_in),
  delivery: toBoolean(api.delivery),
  takeaway: toBoolean(api.take_away),
  room: toBoolean(api.room),
  inventory: toBoolean(api.inventory),
  tip: toBoolean(api.tip),
  serviceCharge: toBoolean(api.service_charge),
},
```

- `api.tip` is the single source.
- No defaulting to `true` anywhere in the transform.
- No re-write or override path — once the profile is loaded into the restaurant context (`useRestaurant()`), `features.tip` stays as transformed unless the profile API is re-fetched.

### `toBoolean` correctness (verified)
```js
const toBoolean = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true'  || v === '1' || v === 'on')  return true;
    if (v === 'false' || v === '0' || v === 'off') return false;
    return YES_NO_MAP[value] ?? YES_NO_MAP[v] ?? false;
  }
  return false;
};
```
For all common payload shapes, this returns the correct boolean. **Mapping layer is not the bug.**

---

## 4. Collect Payment Tip UI Rendering

### File / location
`frontend/src/components/order-entry/CollectPaymentPanel.jsx`.

The panel receives `restaurant` from `useRestaurant()` context (verified via `OrderEntry.jsx` L60 and `CollectPaymentPanel.jsx` indirectly — the panel is invoked through `OrderEntry.jsx` and consumes the same restaurant object).

### Tip gate (single source of truth)
```js
// L264–L265
// BUG-281: Tip input — flat ₹, gated by restaurant.features.tip profile flag
const tipEnabled = !!restaurant?.features?.tip;
const [tipInput, setTipInput] = useState('');
```

### Tip value computation (gated)
```js
// L390
const tip = tipEnabled ? (parseFloat(tipInput) || 0) : 0;
```
→ Even if `tipInput` had a stale value, `tipEnabled=false` forces `tip` to 0.

### UI gates (all three rendering surfaces)

| Line | What it renders | Gate condition |
|---|---|---|
| **L912** | Tip input section (label `💸 Tip`, `data-testid="tip-section"`, numeric input `data-testid="tip-input"`) | `{tipEnabled && (...)}` |
| **L1345** | "Tip ₹X" row inside the inline / mini bill summary | `{tipEnabled && tip > 0 && (...)}` |
| **L1564** | "Tip ₹X" row inside the full Bill Summary card | `{tipEnabled && tip > 0 && (...)}` |
| L1634 / L1638 | CGST on Tip / SGST on Tip rows | Implicitly gated — gated by parent `{tipGst > 0 && ...}`. `tipGst = tip × scTaxRate`, and `tip = 0` when `tipEnabled = false`. So when disabled, `tipGst = 0` → rows hidden. ✅ |

### Payload safety
- `paymentData.tip = tip` (L572, L641) — propagates the gated value (0 when disabled).
- `paymentData.tipTaxAmount = Math.round(tipGst * 100) / 100` (L606) — derived from `tip`, so also 0 when disabled.
- `collectBillExisting` in `orderTransform.js` (L1134, L1248, L1312) destructures `tip` and threads it as `tip_amount: tip || 0` on BILL_PAYMENT. When the gate is off, payload field is 0. **Safe.**

### Cross-screen check
`grep -rn "tip-input\|tip-section\|💸" frontend/src/ --include="*.jsx"` returns matches **only inside `CollectPaymentPanel.jsx`**. No other POS or payment screen renders a tip input that could leak the UI without the gate.

`CollectBillPanelDrawer.jsx` (Hold-tab Collect Bill) reuses `CollectPaymentPanel` → inherits the gate automatically.

`OrderEntry.jsx` references `paymentData?.tip || 0` (L1407, L1612) — payload propagation only, no UI rendering.

`TableCard.jsx` / `OrderCard.jsx` use `order?.tipAmount` to call `completePrepaidOrder` — backend echo path, no UI rendering.

**Conclusion: the gate is wired correctly at every UI surface.**

---

## 5. Current Behavior (verified by code trace)

Given a restaurant where `restaurants[0].tip` from the profile API is:

| Backend value | `restaurant.features.tip` (frontend) | `tipEnabled` | Tip input visible? | Tip in payload |
|---|---|---|---|---|
| `"Yes"` / `true` / `1` / `"on"` | `true` | `true` | **VISIBLE** | `tip_amount: <user input>` |
| `"No"` / `false` / `0` / `"off"` | `false` | `false` | hidden | `tip_amount: 0` |
| missing / `null` / unknown string | `false` | `false` | hidden | `tip_amount: 0` |

The user's observation ("Tip is showing for all restaurants") collapses to:

> For every restaurant the user has loaded, `restaurants[0].tip` in the profile API response is one of `Yes / true / 1 / on / yes / Y / y / "1" / "true"`.

This is consistent only with hypothesis A or B from §1.

---

## 6. Root Cause

### Frontend layer
**Not a frontend bug.** Every layer correctly honours `restaurant.features.tip`:
- Profile transform maps `api.tip` → `features.tip` via `toBoolean` (correct semantics).
- CollectPaymentPanel gates tip computation, tip UI section, tip bill-summary rows, and tip GST rows.
- Payload propagates the gated value (0 when disabled).
- No other POS / payment screen renders tip without the gate.

### Backend / data layer (likely)
- **Most likely root cause: backend always emits a truthy `tip` value** on `restaurants[0].tip`, regardless of the per-restaurant config. This could be because:
  - The profile API does not yet read the tip flag from the restaurant record (defaults to `"Yes"` in code).
  - The tip flag has the wrong column name in the database / backend join.
  - All restaurants in the live system happen to have `tip: Yes` set in their record (no one has yet flipped one to `No` to test the negative case).

### Indirect confound
- The frontend Settings view (`ViewEditViews.jsx` L140–L175) has an "Edit / Save" UI on the Tip toggle, but **`onSave` only toggles the local editing state** — there is no PUT/POST to the profile endpoint. So operators trying to flip Tip from inside the POS see "Save" succeed visually, but the backend record is never updated. Next profile refresh restores the original (truthy) value. This compounds the perception that the toggle is broken.

---

## 7. Recommended Fix Plan (NOT implemented)

> Investigation only. Listing options for owner review. No code is being changed in this task.

### 7.1 Diagnostic step (mandatory before any fix)
1. Open Chrome DevTools → Network → Filter `profile`.
2. Log in as a restaurant where Tip is intended to be disabled (per admin config).
3. Inspect the response of `GET /api/v1/vendoremployee/profile`.
4. Locate `restaurants[0].tip` in the JSON body. Record its value.

Three possible outcomes:

| Observed value | Diagnosis | Fix owner |
|---|---|---|
| `"No"` / `false` / `0` / `"off"` / missing | The frontend would correctly hide Tip in this case. If Tip is still visible, there is a render bug not yet found — re-investigate with browser elements panel to see if `tip-section` is rendered but mis-styled. **Highly unlikely given the code trace above.** | Frontend (re-investigate) |
| `"Yes"` / `true` / `1` / `"yes"` / `"on"` | Backend is sending the wrong value. Fix is to make backend respect the actual per-restaurant Tip config when assembling the response. | **Backend** |
| Field is missing AND there is a different key (e.g., `tip_enabled`, `tipping`, `enable_tip`) | Field-name mismatch. Frontend reads the wrong key (resulting in `undefined` → `false` → Tip HIDDEN). But this contradicts the observed symptom (Tip showing). Worth checking anyway. | Either side — coordinate field name (1-line frontend change OR backend rename) |

### 7.2 Frontend-side actions (only if §7.1 confirms a frontend field-name mismatch)
Single-line change in `frontend/src/api/transforms/profileTransform.js` L125:
```diff
- tip: toBoolean(api.tip),
+ tip: toBoolean(api.tip ?? api.tip_enabled ?? api.tipping ?? api.enable_tip),
```
This is **only** needed if the backend confirms a different field name. **DO NOT apply blindly** — every coalesced key must be verified against backend documentation.

### 7.3 Optional hygiene improvement (deferred, not part of this CR)
The Settings view (`ViewEditViews.jsx` L156–L161) currently has a no-op `onSave`. Two options:
1. Implement a real `PUT /profile` call to persist the toggle.
2. Or convert the Tip toggle to read-only (remove the Edit/ToggleSwitch) and document that the flag is owner-portal-only.

This is unrelated to the Tip visibility bug but worth flagging to avoid operator confusion.

### 7.4 Strict guard-rails for any eventual fix
- **Do not** add a frontend default that forces `features.tip = false` when missing — that would silently mask backend bugs.
- **Do not** introduce a per-restaurant hardcoded allow-list.
- **Do not** change the gate condition (`!!restaurant?.features?.tip`) — it is correct.
- **Do not** touch Service Charge / VAT / GST logic (out of scope per task brief).
- **Do not** modify any other UI surface — only the profile transform if a field rename is confirmed.

---

## 8. QA Checklist

> Run after any backend / mapping change. Pure visibility regression; no math involved.

### Visibility
1. Restaurant configured with **Tip: Yes** (or backend default truthy):
   - Collect Payment screen → `tip-section` visible.
   - `tip-input` visible and editable.
   - After entering ₹50 → Tip row shows in bill summary, Grand Total adds ₹50 (+ SC GST on tip if applicable).
2. Restaurant configured with **Tip: No** (or backend explicit falsy):
   - Collect Payment screen → `tip-section` NOT in the DOM.
   - Bill summary has no Tip row.
   - Grand Total excludes any tip contribution.
   - `tip_amount` in BILL_PAYMENT payload = `0`.
3. Same restaurant, takeaway and delivery flows → match the restaurant's profile flag (no special exclusion — Tip is a profile feature, not order-type-gated).
4. Hold-tab Collect Bill (via `CollectBillPanelDrawer.jsx`) → inherits the same gate. Test both Yes / No restaurants.

### Payload
5. Tip disabled + any `tipInput` value typed in DevTools console:
   - `tip` variable in component state = 0 (because `tipEnabled=false` forces it).
   - BILL_PAYMENT payload `tip_amount: 0`, `tipTaxAmount: 0` (or `tip_tax_amount: 0` depending on backend field name).
   - Place-order payload (if Tip is sent there) similarly zero.

### Regression
6. SC ON, Tip ON: SC and Tip rows both visible. SC GST and Tip GST rows visible if `serviceChargeTaxPct > 0`. CR-013 parity log not triggered.
7. SC ON, Tip OFF: SC row visible, Tip row hidden. No CGST/SGST-on-Tip row. SC math unaffected.
8. SC OFF, Tip ON: SC row hidden, Tip row visible. Tip GST follows `serviceChargeTaxPct` (existing CR-013 rule — Tip rides SC rate).
9. Both OFF: bill summary shows only item subtotal + item-level GST/VAT.

### Backend confirmation
10. With the same restaurant, network response for `/api/v1/vendoremployee/profile`:
    - `restaurants[0].tip` value matches the operator's configured value.
    - If it does not — backend reconciliation issue (root-cause § A from §1).

---

## 9. References

- Investigation surface code:
  - `frontend/src/api/transforms/profileTransform.js` L20–L31 (`toBoolean`), L119–L127 (`features.tip` mapping).
  - `frontend/src/api/constants.js` L11 (PROFILE endpoint), L225–L238 (`YES_NO_MAP`).
  - `frontend/src/components/order-entry/CollectPaymentPanel.jsx` L264–L265, L390, L912, L1345, L1564, L1634/L1638 (gates), L572 / L641 / L606 (payload).
  - `frontend/src/api/transforms/orderTransform.js` L1134, L1248, L1312 (tip propagation to BILL_PAYMENT).
  - `frontend/src/components/order-entry/OrderEntry.jsx` L60 (restaurant context), L1407 / L1612 (payload propagation).
  - `frontend/src/components/reports/CollectBillPanelDrawer.jsx` L285 (hold-tab reuse of CollectPaymentPanel — inherits gate).
  - `frontend/src/components/panels/settings/ViewEditViews.jsx` L140–L175 (Tip toggle in Settings — `onSave` is a no-op; flag is FE-readonly).

- Related historical context:
  - `BUG-281` (referenced in CollectPaymentPanel L264 comment) — Tip input was added with this gate from day one.
  - `BUG-AUTOKOT/AUTOBILL VISIBILITY` (May-2026, referenced in profileTransform.js L7–L18) — past widening of `toBoolean` to accept more truthy/falsy variants. Tip mapping benefits from the same widening.

— End of report.
