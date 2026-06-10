# CR-020: Restaurant Settings Wizard — Bug Sweep
## 10 Bugs Found During Code Review
**Registered:** 2026-06-10
**Sprint:** pos_4_0
**Priority:** P1
**Status:** OPEN — GATE 1 (Registered)
**Owner:** Abhi
**Parent CR:** CR-019 (Restaurant Settings Self-Onboarding Wizard)

---

## 1. BUG INDEX

| ID | Title | Severity | File(s) |
|----|-------|----------|---------|
| CR-020-B1 | `online_payment` field dropped on save — data loss every save | **HIGH** | `restaurantSettingsTransform.js` |
| CR-020-B2 | Inconsistent type serialization for channel toggles (Yes/No vs bool) | MEDIUM | `restaurantSettingsTransform.js` |
| CR-020-B3 | Logo & PDF re-uploaded on every step save (wasted bandwidth) | MEDIUM | `RestaurantSettingsPage.jsx` |
| CR-020-B4 | Unused imports: `Building2`, `SkipForward` | LOW | `RestaurantSettingsPage.jsx` |
| CR-020-B5 | `handleSkip` has no step upper-bound guard | LOW | `RestaurantSettingsPage.jsx` |
| CR-020-B6 | `goToStep` allows skipping required steps via rail click | MEDIUM | `RestaurantSettingsPage.jsx` |
| CR-020-B7 | Error state shared across steps — cross-step bleed | MEDIUM | `RestaurantSettingsPage.jsx` |
| CR-020-B8 | NumberInput snaps to 0 on clear — can't empty field to retype | LOW | `RestaurantSettingsPage.jsx` |
| CR-020-B9 | Manual `Content-Type: multipart/form-data` omits boundary | LOW | `restaurantSettingsService.js` |
| CR-020-B10 | Global axios JSON header conflicts with FormData uploads | LOW | `axios.js` |
| CR-020-B11 | Order type dropdown shows disabled channels (Delivery/TakeAway visible when OFF) | **HIGH** | `OrderEntry.jsx` |
| CR-020-B12 | "Default GST %" field should be hidden from UI entirely — not needed for restaurant owner | MEDIUM | `RestaurantSettingsPage.jsx:436` |
| CR-020-B13 | GST Mode hint always shows "Category" text even when "Flat GST" is selected | MEDIUM | `RestaurantSettingsPage.jsx:435` |
| CR-020-B14 | GST Mode labels should be "Item Level" / "Restaurant Level" per owner | MEDIUM | `RestaurantSettingsPage.jsx:435` |
| CR-020-B15 | Short Code is a TextInput but backend expects Yes/No — should be a Toggle | MEDIUM | `RestaurantSettingsPage.jsx:423`, `restaurantSettingsTransform.js:44,153` |

---

### CR-020-B12 — "Default GST %" field should be hidden from UI (MEDIUM)

**What happens:**
The "Default GST %" field is a backend-only config value (fallback rate for new menu items). It does NOT feed into the POS billing math — the frontend always uses per-item tax from product data. Showing it to the restaurant owner is confusing and unnecessary.

**Where:** `RestaurantSettingsPage.jsx` line 436
```js
<NumberInput label="Default GST %" value={s1.gstTax} onChange={(v) => updateStep('step1', 'gstTax', v)} suffix="%" min={0} max={100} step={0.1} />
```

**Fix:** Remove the entire `<NumberInput label="Default GST %" .../>` line from the UI. Keep the `gstTax` field in form state and transforms so the existing value is preserved on save — just don't show it.

**Impact Analysis:**
- **Scope:** Remove 1 line from UI in `RestaurantSettingsPage.jsx` (line 436). Form state, transform read/write, and INITIAL_FORM stay untouched — value round-trips silently.
- **Cross-refs:** `gstTax` maps to `gst_tax` in the API. Read by `profileTransform.js:168`, consumed in `ViewEditViews.jsx` as read-only display. The billing flow (`orderTransform.js`) uses per-item `item.tax.percentage`, NOT this value. Hiding the UI has zero billing impact.
- **Risk:** LOW — the value still persists to backend on save (unchanged from whatever it was). Only the UI field is removed.
- **Backend:** No change.

---

### CR-020-B13 — GST Mode hint text is static/misleading (MEDIUM)

**What happens:**
The hint below the GST Mode dropdown always says `"Category" = different GST per menu item` — even when the user selects "Flat GST". The hint should change based on the selected mode, or at minimum explain both options.

**Where:** `RestaurantSettingsPage.jsx` line 435
```js
<SelectInput ... options={[{ value: 'category', label: 'Category-wise GST' }, { value: 'flat', label: 'Flat GST' }]} hint='"Category" = different GST per menu item' />
```

**Fix:** Make hint dynamic based on `s1.gstMode`:
- `category` → "Each menu item/category can have its own GST rate"
- `flat` → "One GST rate applies to all items across the restaurant"

**Impact Analysis:**
- **Scope:** UI-only, 1 line in `RestaurantSettingsPage.jsx` (line 435). Replace static `hint` string with a ternary on `s1.gstMode`.
- **Cross-refs:** `gstMode` maps to API field `restaurent_gst` (advanced). Read only at `restaurantSettingsTransform.js:49` (read) and `:208` (write). No other file consumes this value.
- **Risk:** ZERO — hint text change, no data impact.
- **Backend:** No change.

---

### CR-020-B14 — GST Mode labels should be "Item Level" / "Restaurant Level" (MEDIUM)

**What happens:**
Owner wants the dropdown labels changed from "Category-wise GST" / "Flat GST" to "Item Level" / "Restaurant Level" for clarity.

**Where:** `RestaurantSettingsPage.jsx` line 435
```js
options={[{ value: 'category', label: 'Category-wise GST' }, { value: 'flat', label: 'Flat GST' }]}
```

**Fix:**
```js
options={[{ value: 'category', label: 'Item Level' }, { value: 'flat', label: 'Restaurant Level' }]}
```

**Note:** The `value` sent to the API stays `'category'` / `'flat'` — only the display label changes. Zero backend impact.

**Impact Analysis:**
- **Scope:** UI-only, 1 line in `RestaurantSettingsPage.jsx` (line 435). Change `label` strings in the `options` array.
- **Cross-refs:** The `value` field (`'category'`/`'flat'`) is what gets saved to API as `restaurent_gst`. Values are untouched — only the human-readable labels change.
- **Risk:** ZERO — display-only change.
- **Backend:** No change. API still receives `'category'` or `'flat'`.

---

### CR-020-B15 — Short Code is a TextInput but backend expects Yes/No toggle (MEDIUM)

**What happens:**
The "Short Code" field is rendered as a free-text input (placeholder "e.g. C103"), but the backend API returns and expects `short_code: "Yes"` or `"No"`. The API response confirms: `short_code: "No"`. This means the field is a boolean flag (enable/disable short codes), not a text value.

Currently the frontend:
- Reads `basic.short_code || ''` as a string → shows "No" as text in the input
- Sends `s1.shortCode` as raw string back → sends whatever the user types

**Where:**
- UI: `RestaurantSettingsPage.jsx` line 423 — `<TextInput label="Short Code" ...>`
- Transform read: `restaurantSettingsTransform.js` line 44 — `shortCode: basic.short_code || ''`
- Transform write: `restaurantSettingsTransform.js` line 153 — `short_code: s1.shortCode`

**Fix:**
1. Change `TextInput` → `Toggle` in the UI (line 423)
2. Change transform read to use `toBool()` (line 44): `shortCode: toBool(basic.short_code)`
3. Change transform write to use `toYesNo()` (line 153): `short_code: toYesNo(s1.shortCode)`
4. Change `INITIAL_FORM.step1.shortCode` from `''` to `false` (line 25)

**Impact Analysis:**
- **Scope:** 4 locations across 2 files:
  - `RestaurantSettingsPage.jsx` line 25 (initial state), line 423 (UI component)
  - `restaurantSettingsTransform.js` line 44 (fromAPI), line 153 (toAPI)
- **Cross-refs:** `shortCode` / `short_code` is used ONLY in the restaurant settings wizard and its transform. No other file reads or writes this field. Confirmed via grep — 4 hits total, all in these 2 files.
- **Risk:** LOW — type changes from string to boolean in form state, but fully contained. The API value stays `"Yes"`/`"No"` string, matching what the backend already sends.
- **Backend:** No change. `toYesNo()` produces the same `"Yes"`/`"No"` strings the backend expects.




## 2. BUG DETAILS

### CR-020-B1 — `online_payment` field dropped on save (HIGH)

**What happens:**
The `fromAPI` transform reads `advanced.online_payment` into `s2.onlinePayment` correctly. But the `toAPI` transform never writes `online_payment` back into the payload. Every save silently erases the Online Payment master toggle on the server.

**Where:**
- Read: `restaurantSettingsTransform.js` line 64 — `onlinePayment: toBool(advanced.online_payment)`
- Write: `restaurantSettingsTransform.js` lines 155–173 — **field missing entirely**

**Fix:**
Add `online_payment: toYesNo(s2.onlinePayment),` to the `advanced` object in `toAPI.settingsPayload()`, alongside the other payment fields (after line 165).

---

### CR-020-B2 — Inconsistent type serialization for channels (MEDIUM)

**What happens:**
When saving channel toggles:
- `dine_in` → `toYesNo()` → sends `"Yes"` or `"No"` (string)
- `room` → `toYesNo()` → sends `"Yes"` or `"No"` (string)
- `take_away` → raw boolean → sends `true` or `false`
- `delivery` → raw boolean → sends `true` or `false`

If the backend expects a uniform type, two channels may be silently ignored or misinterpreted.

**Where:**
`restaurantSettingsTransform.js` lines 157–160

**Fix:**
Confirm with backend what type each field expects. If uniform, wrap all four in `toYesNo()`. The comment says "preserve original types" — verify whether the API actually requires mixed types or if this was a mistake.

---

### CR-020-B3 — Logo & PDF re-uploaded on every step (MEDIUM)

**What happens:**
`saveStep()` calls `updateSettings(formState, logoFile, pdfFile)` on every "Save & Continue" click — steps 1 through 6. If a user uploads a logo on Step 1, that same file object is re-sent on steps 2, 3, 4, 5, and 6. Five unnecessary uploads per wizard completion.

**Where:**
`RestaurantSettingsPage.jsx` line 271

**Fix:**
Either:
- Clear `logoFile`/`pdfFile` state after the first successful save, or
- Only pass files when `currentStep === 1`, send `null` for other steps

---

### CR-020-B4 — Unused imports (LOW)

**What happens:**
`Building2` and `SkipForward` are imported from lucide-react but never used anywhere in the component. Dead code.

**Where:**
`RestaurantSettingsPage.jsx` line 6

**Fix:**
Remove `Building2` and `SkipForward` from the import statement.

---

### CR-020-B5 — `handleSkip` has no upper-bound guard (LOW)

**What happens:**
`handleSkip` does `setCurrentStep(prev => prev + 1)` without checking if the next step exists. Currently safe because the Skip button only renders on optional steps (3, 4, 5), and step 6 always exists. But if step 6 ever becomes optional, skipping it would set `currentStep` to 7 — `STEPS[6]` is `undefined`, crashing the page.

**Where:**
`RestaurantSettingsPage.jsx` lines 300–302

**Fix:**
Add guard: `setCurrentStep(prev => Math.min(prev + 1, STEPS.length))`

---

### CR-020-B6 — `goToStep` allows bypassing required steps (MEDIUM)

**What happens:**
The left rail step-click logic is:
```
step <= currentStep || completedSteps.has(step) || completedSteps.has(step - 1) || step === 1
```
The `completedSteps.has(step - 1)` condition means: if Step 3 is completed, Step 4 becomes clickable — regardless of whether Step 2 (required) was ever completed. A user could complete Step 1, skip to Step 3, complete it, then access Step 4 without ever doing the required Step 2.

**Where:**
`RestaurantSettingsPage.jsx` lines 311–315

**Fix:**
Replace with stricter logic that checks all prior required steps are completed before allowing forward navigation.

---

### CR-020-B7 — Error state bleeds across steps (MEDIUM)

**What happens:**
Two problems:
1. Steps 1 and 6 both have a `phone` field. Typing in Step 6's phone clears Step 1's `phone` error because they share the same error key.
2. `validateStep()` does `setErrors(errs)` which replaces the entire error object. Going to any step wipes all errors from previous steps — so navigating back shows a previously-invalid step as clean.

**Where:**
`RestaurantSettingsPage.jsx` lines 240 (updateStep error clear) and 263 (validateStep replaces errors)

**Fix:**
Scope errors by step: `errors.step1.phone`, `errors.step6.phone` instead of flat `errors.phone`. Or prefix error keys with step name.

---

### CR-020-B8 — NumberInput snaps to 0 on delete (LOW)

**What happens:**
`onChange={(e) => onChange(parseFloat(e.target.value) || 0)}` — when a user deletes the field content to type a new number, `parseFloat("") || 0` immediately sets the value to `0`. The field never shows empty, making it annoying to retype.

**Where:**
`RestaurantSettingsPage.jsx` line 77

**Fix:**
Allow empty string as a valid transitional state:
```js
onChange={(e) => onChange(e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
```

---

### CR-020-B9 — Manual multipart header omits boundary (LOW)

**What happens:**
`updateSettings` manually sets `'Content-Type': 'multipart/form-data'`. When you do this, the browser/axios doesn't append the `boundary` parameter that tells the server where each form part begins and ends. Most servers will reject or misparse the request. Axios normally auto-detects FormData and sets the correct header with boundary — the manual override prevents this.

**Where:**
`restaurantSettingsService.js` line 32

**Fix:**
Remove the explicit `headers` override entirely. Let axios handle it:
```js
const response = await api.post(API_ENDPOINTS.RESTAURANT_SETTINGS_UPDATE, formData);
```

---

### CR-020-B10 — Global JSON Content-Type clashes with FormData (LOW)

**What happens:**
The global axios instance (`axios.js` line 15) sets `'Content-Type': 'application/json'` as the default for all requests. The `updateSettings` function tries to override this for file uploads (Bug 9). If that override is ever removed or fails, the FormData payload gets sent with a JSON content-type header — the server receives binary file data labeled as JSON and can't parse it.

**Where:**
`axios.js` line 15

**Fix:**
No immediate code change needed — this is a latent risk tied to Bug 9. Fixing Bug 9 (removing manual header) also mitigates this, because axios will auto-detect FormData and override the default correctly.

---

## 3. IMPLEMENTATION PLAN — LINE-BY-LINE CODE DIFFS

### Execution Order
| Order | Bug(s) | File | Risk |
|-------|--------|------|------|
| 1 | B1 | `restaurantSettingsTransform.js` | LOW — additive, one line |
| 2 | B2 | `restaurantSettingsTransform.js` | LOW — two lines, same file as B1 |
| 3 | B9 | `restaurantSettingsService.js` | LOW — remove one config line |
| 4 | B3 | `RestaurantSettingsPage.jsx` | LOW — conditional in saveStep |
| 5 | B7 | `RestaurantSettingsPage.jsx` | MEDIUM — refactor error keys |
| 6 | B6 | `RestaurantSettingsPage.jsx` | MEDIUM — rewrite goToStep logic |
| 7 | B8 | `RestaurantSettingsPage.jsx` | LOW — one-line onChange fix |
| 8 | B5 | `RestaurantSettingsPage.jsx` | LOW — one-line guard |
| 9 | B4 | `RestaurantSettingsPage.jsx` | LOW — remove two words |
| 10 | B10 | `axios.js` | NONE — no code change, mitigated by B9 fix |

---

### B1 — Add missing `online_payment` to toAPI

**File:** `src/api/transforms/restaurantSettingsTransform.js`
**Line:** 165 (after `pay_tab` line)

**Before (lines 161–166):**
```js
        // Step 2 — Payments
        pay_cash: toYesNo(s2.payCash),
        pay_upi: toYesNo(s2.payUpi),
        pay_cc: toYesNo(s2.payCc),
        pay_tab: toYesNo(s2.payTab),
        upi_id: s2.upiId,
```

**After:**
```js
        // Step 2 — Payments
        pay_cash: toYesNo(s2.payCash),
        pay_upi: toYesNo(s2.payUpi),
        pay_cc: toYesNo(s2.payCc),
        pay_tab: toYesNo(s2.payTab),
        online_payment: toYesNo(s2.onlinePayment),
        upi_id: s2.upiId,
```

**Change:** +1 line. Add `online_payment: toYesNo(s2.onlinePayment),` after `pay_tab`.

---

### B2 — Normalize channel types to toYesNo()

**File:** `src/api/transforms/restaurantSettingsTransform.js`
**Lines:** 158–159

**Before:**
```js
        take_away: s2.takeAway,
        delivery: s2.delivery,
```

**After:**
```js
        take_away: toYesNo(s2.takeAway),
        delivery: toYesNo(s2.delivery),
```

**Change:** 2 lines modified. Wraps both in `toYesNo()` to match `dine_in` and `room`.

**Risk note:** If backend genuinely expects booleans for these two fields, this change would break them. Needs backend confirmation. If backend does require booleans, then the fix is the opposite — change `dine_in` and `room` to raw booleans. Either way the current mix is wrong.

---

### B9 — Remove manual Content-Type header from FormData upload

**File:** `src/api/services/restaurantSettingsService.js`
**Lines:** 31–33

**Before:**
```js
  const response = await api.post(API_ENDPOINTS.RESTAURANT_SETTINGS_UPDATE, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
```

**After:**
```js
  const response = await api.post(API_ENDPOINTS.RESTAURANT_SETTINGS_UPDATE, formData);
```

**Change:** Remove the `{ headers: ... }` third argument entirely. Axios auto-detects `FormData` and sets `Content-Type: multipart/form-data; boundary=----...` with the correct boundary. This also mitigates B10 (global JSON header gets properly overridden by axios internals).

---

### B3 — Only send files on Step 1 save

**File:** `src/pages/RestaurantSettingsPage.jsx`
**Lines:** 267–279 (saveStep function)

**Before:**
```js
  // Save current step
  const saveStep = async () => {
    setIsSaving(true);
    try {
      await updateSettings(formState, logoFile, pdfFile);
      return true;
    } catch (err) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
      return false;
    } finally {
      setIsSaving(false);
    }
  };
```

**After:**
```js
  // Save current step
  const saveStep = async () => {
    setIsSaving(true);
    try {
      // Only send file uploads when saving Step 1 (where they are selected)
      const sendLogo = currentStep === 1 ? logoFile : null;
      const sendPdf = currentStep === 1 ? pdfFile : null;
      await updateSettings(formState, sendLogo, sendPdf);
      return true;
    } catch (err) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
      return false;
    } finally {
      setIsSaving(false);
    }
  };
```

**Change:** 3 lines added (2 const + replace call args). Files are only attached to the request when the user is on Step 1.

---

### B7 — Scope error keys by step to prevent cross-step bleed

**File:** `src/pages/RestaurantSettingsPage.jsx`

**Part A — updateStep error clear (line 238–241)**

**Before:**
```js
  const updateStep = useCallback((stepKey, field, value) => {
    setFormState((prev) => ({ ...prev, [stepKey]: { ...prev[stepKey], [field]: value } }));
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }, []);
```

**After:**
```js
  const updateStep = useCallback((stepKey, field, value) => {
    setFormState((prev) => ({ ...prev, [stepKey]: { ...prev[stepKey], [field]: value } }));
    setErrors((prev) => { const n = { ...prev }; delete n[`${stepKey}.${field}`]; return n; });
  }, []);
```

**Change:** Error key becomes `step1.phone` instead of `phone`.

**Part B — validateStep error keys (lines 244–264)**

**Before:**
```js
  const validateStep = (step) => {
    const errs = {};
    if (step === 1) {
      const s = formState.step1;
      if (!s.name.trim()) errs.name = 'Restaurant name is required';
      if (!s.phone.trim()) errs.phone = 'Phone is required';
      if (!s.address.trim()) errs.address = 'Address is required';
      if (s.gstEnabled && !s.gstCode.trim()) errs.gstCode = 'GST number is required when GST is enabled';
      if (s.vatEnabled && !s.vatCode.trim()) errs.vatCode = 'VAT code is required when VAT is enabled';
    } else if (step === 2) {
      const s = formState.step2;
      if (![s.dineIn, s.takeAway, s.delivery, s.room].some(Boolean)) errs.channels = 'Select at least one service channel';
      if (![s.payCash, s.payUpi, s.payCc, s.payTab, s.onlinePayment].some(Boolean)) errs.payments = 'Select at least one payment method';
    } else if (step === 6) {
      const s = formState.step6;
      if (!s.firstName.trim()) errs.firstName = 'First name is required';
      if (!s.lastName.trim()) errs.lastName = 'Last name is required';
      if (!s.phone.trim()) errs.phone = 'Phone is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };
```

**After:**
```js
  const validateStep = (step) => {
    const stepKey = `step${step}`;
    const errs = {};
    if (step === 1) {
      const s = formState.step1;
      if (!s.name.trim()) errs[`${stepKey}.name`] = 'Restaurant name is required';
      if (!s.phone.trim()) errs[`${stepKey}.phone`] = 'Phone is required';
      if (!s.address.trim()) errs[`${stepKey}.address`] = 'Address is required';
      if (s.gstEnabled && !s.gstCode.trim()) errs[`${stepKey}.gstCode`] = 'GST number is required when GST is enabled';
      if (s.vatEnabled && !s.vatCode.trim()) errs[`${stepKey}.vatCode`] = 'VAT code is required when VAT is enabled';
    } else if (step === 2) {
      const s = formState.step2;
      if (![s.dineIn, s.takeAway, s.delivery, s.room].some(Boolean)) errs[`${stepKey}.channels`] = 'Select at least one service channel';
      if (![s.payCash, s.payUpi, s.payCc, s.payTab, s.onlinePayment].some(Boolean)) errs[`${stepKey}.payments`] = 'Select at least one payment method';
    } else if (step === 6) {
      const s = formState.step6;
      if (!s.firstName.trim()) errs[`${stepKey}.firstName`] = 'First name is required';
      if (!s.lastName.trim()) errs[`${stepKey}.lastName`] = 'Last name is required';
      if (!s.phone.trim()) errs[`${stepKey}.phone`] = 'Phone is required';
    }
    // Merge into existing errors (only replace this step's errors)
    setErrors((prev) => {
      const cleaned = Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(`${stepKey}.`)));
      return { ...cleaned, ...errs };
    });
    return Object.keys(errs).length === 0;
  };
```

**Change:** Error keys namespaced as `step1.phone`, `step6.phone`. `setErrors` now merges instead of replacing — clears only the current step's errors while preserving other steps.

**Part C — Error display (lines 430–433 and 595–599)**

Both error display blocks use `Object.values(errors)` — these continue to work unchanged because we only changed the keys, not the values.

---

### B6 — Fix goToStep to enforce all prior required steps are complete

**File:** `src/pages/RestaurantSettingsPage.jsx`
**Lines:** 310–315

**Before:**
```js
  // Click step in rail
  const goToStep = (step) => {
    if (step <= currentStep || completedSteps.has(step) || completedSteps.has(step - 1) || step === 1) {
      setCurrentStep(step);
    }
  };
```

**After:**
```js
  // Click step in rail — only allow if all prior required steps are done
  const goToStep = (step) => {
    if (step === 1) { setCurrentStep(1); return; }
    if (step <= currentStep) { setCurrentStep(step); return; }
    // For forward jumps: check that every required step before `step` is completed
    const allPriorRequiredDone = STEPS
      .filter(s => s.id < step && s.required)
      .every(s => completedSteps.has(s.id));
    if (allPriorRequiredDone && (completedSteps.has(step - 1) || completedSteps.has(step))) {
      setCurrentStep(step);
    }
  };
```

**Change:** Forward navigation now requires all prior required steps to be completed — not just the immediately preceding one.

---

### B8 — Allow empty transitional state in NumberInput

**File:** `src/pages/RestaurantSettingsPage.jsx`
**Line:** 77

**Before:**
```js
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
```

**After:**
```js
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? '' : (parseFloat(v) || 0));
        }}
```

**Change:** When the field is empty, pass empty string instead of snapping to 0. Parent components already handle numeric coercion on save via `parseFloat(...) || 0` in the transform layer.

---

### B5 — Add upper-bound guard to handleSkip

**File:** `src/pages/RestaurantSettingsPage.jsx`
**Lines:** 299–303

**Before:**
```js
  // Skip optional step
  const handleSkip = () => {
    setCompletedSteps((prev) => new Set([...prev, currentStep]));
    setCurrentStep((prev) => prev + 1);
  };
```

**After:**
```js
  // Skip optional step
  const handleSkip = () => {
    if (currentStep >= STEPS.length) return;
    setCompletedSteps((prev) => new Set([...prev, currentStep]));
    setCurrentStep((prev) => prev + 1);
  };
```

**Change:** +1 line. Guard prevents incrementing past the last step.

---

### B4 — Remove unused imports

**File:** `src/pages/RestaurantSettingsPage.jsx`
**Lines:** 3–7

**Before:**
```js
import {
  ArrowLeft, ArrowRight, Check, Home, CreditCard, Percent,
  Settings, Package, User, Loader2, Upload, FileText, X,
  Building2, ChevronRight, AlertCircle, SkipForward,
} from "lucide-react";
```

**After:**
```js
import {
  ArrowLeft, ArrowRight, Check, Home, CreditCard, Percent,
  Settings, Package, User, Loader2, Upload, FileText, X,
  ChevronRight, AlertCircle,
} from "lucide-react";
```

**Change:** Removed `Building2` and `SkipForward`.

---

### B10 — No code change (mitigated by B9)

**File:** `src/api/axios.js`
**Line:** 15

The global `'Content-Type': 'application/json'` default stays. Once B9 is applied (removing the manual header override in the service), axios auto-detects `FormData` and correctly sets `multipart/form-data` with boundary — overriding the global default. No action needed.

---

## 4. AFFECTED FILES SUMMARY

| File | Bugs | Lines Changed |
|------|------|---------------|
| `src/api/transforms/restaurantSettingsTransform.js` | B1, B2 | +1 line, ~2 lines modified |
| `src/api/services/restaurantSettingsService.js` | B9 | -2 lines (remove header config) |
| `src/pages/RestaurantSettingsPage.jsx` | B3, B4, B5, B6, B7, B8 | ~30 lines changed across 6 locations |
| `src/api/axios.js` | B10 | 0 lines (no change) |

**Total impact:** ~35 lines across 3 files. No new files. No dependency changes.

---

## 5. RISK ASSESSMENT

| Bug | Risk Level | Reason |
|-----|-----------|--------|
| B1 | LOW | Additive — one new field, no existing behavior changes |
| B2 | MEDIUM | Depends on backend contract — if backend requires raw booleans for `take_away`/`delivery`, this breaks. Needs backend team confirmation before applying |
| B9 | LOW | Removing a bad override — lets axios do what it already knows how to do |
| B3 | LOW | Conditional null — only changes what step sends files, not the save logic |
| B7 | MEDIUM | Changes error key format — if any other code reads `errors.phone` directly (not via `Object.values`), it would break. Grep confirms only `Object.values(errors)` is used in display, so safe |
| B6 | MEDIUM | Changes navigation reachability — may confuse testers who relied on the old loose behavior |
| B8 | LOW | Pass-through value change — transform layer handles coercion |
| B5 | LOW | Early return guard — no behavioral change in current config |
| B4 | LOW | Import removal — zero runtime impact |
| B10 | NONE | No code change |

---

## 6. TESTING PLAN

### Per-Bug Verification
| Bug | Test |
|-----|------|
| B1 | Save settings → check API request payload contains `online_payment: "Yes"` or `"No"` |
| B2 | Save settings → check `take_away` and `delivery` are `"Yes"`/`"No"` strings (not booleans) |
| B9 | Save with logo → check request Content-Type header has `boundary=` parameter |
| B3 | Upload logo on Step 1 → proceed to Step 3 → save → confirm request body has no `logo` file part |
| B7 | Set invalid phone on Step 1 → go to Step 6 → type in Step 6 phone → go back to Step 1 → confirm Step 1 phone error still shows |
| B6 | Complete Step 1 → complete Step 3 (skip Step 2) → try clicking Step 4 → should be blocked |
| B8 | Click into GST % field → select all → delete → field should be empty (not 0) |
| B5 | N/A — preventative, no current UI path triggers it |
| B4 | Compile clean — no warnings about unused imports |
| B10 | Covered by B9 test |

### Regression
- [ ] Full wizard flow: Step 1 → 2 → 3 → 4 → 5 → 6 → Save & Launch → navigates to dashboard
- [ ] Skip flow: Step 1 → 2 → Skip 3 → Skip 4 → Skip 5 → 6 → Save & Launch
- [ ] Back navigation: Step 4 → Back → Back → Step 2 content shows correctly
- [ ] Existing settings load correctly on page mount
- [ ] Validation blocks: empty name on Step 1 → "Save & Continue" shows error

---

## 7. PHASED EXECUTION PLAN

**Rule: Each phase requires Owner Smoke Test + Signoff before the next phase begins. No exceptions.**

### Phase 1 — Critical Data Fixes (B1, B9, B10)
| Step | Action | Status |
|------|--------|--------|
| 4a | Code Implementation | DONE |
| 5a | QA / Automated Test | DONE — 100% passed (iteration_2) |
| **6a** | **Owner Smoke Test + Signoff** | **DONE — Signed off** |

**Scope:** B1 (online_payment dropped), B9 (Content-Type boundary), B10 (mitigated by B9)
**Files:** `restaurantSettingsTransform.js`, `restaurantSettingsService.js`
**Owner Smoke Test Checklist:**
- [ ] Toggle Online Payment ON → Save → Reload → Still ON
- [ ] Upload logo on Step 1 → Save → No server error
- [ ] Check network tab: request Content-Type has `boundary=`

---

### Phase 2 — Wizard Logic Fixes (B3, B5, B6)
| Step | Action | Status |
|------|--------|--------|
| 4b | Code Implementation | DONE |
| 5b | QA / Automated Test | DONE — 100% passed (iteration_3) |
| **6b** | **Owner Smoke Test + Signoff** | **DONE — Signed off** |

**Scope:** B3 (files re-uploaded every step), B5 (skip guard), B6 (bypass required steps)
**Files:** `RestaurantSettingsPage.jsx`
**Owner Smoke Test Checklist:**
- [ ] Upload logo Step 1 → go to Step 4 → Save → network tab shows no file in request
- [ ] Complete Step 1 → Skip Step 2 → Try clicking Step 4 in rail → Should be blocked
- [ ] Normal flow Step 1 → 2 → Skip 3 → Skip 4 → Skip 5 → 6 → Save & Launch works

---

### Phase 3 — UX Polish (B7, B8, B4)
| Step | Action | Status |
|------|--------|--------|
| 4c | Code Implementation | DONE |
| 5c | QA / Automated Test | DONE — 100% passed (iteration_4) |
| **6c** | **Owner Smoke Test + Signoff** | **DONE — Signed off** |

**Scope:** B7 (error bleed across steps), B8 (number input snaps to 0), B4 (dead imports)
**Files:** `RestaurantSettingsPage.jsx`
**Owner Smoke Test Checklist:**
- [ ] Leave Step 1 phone empty → try Save → error shows → go to Step 6 → type phone → go back to Step 1 → Step 1 phone error still visible
- [ ] Click GST % field → select all → delete → field shows empty (not 0)
- [ ] Full wizard completes without console warnings about unused imports

---

### Phase 4 — Dashboard Channel Visibility (B2 closed, B11 new)
| Step | Action | Status |
|------|--------|--------|
| 4d | Code Implementation | DONE |
| 5d | QA / Automated Test | DONE — 100% passed (iteration_5) |
| **6d** | **Owner Smoke Test + Signoff** | **READY FOR OWNER** |

**Scope:** B2 (CLOSED — not a bug), B11 (order type dropdown shows disabled channels)
**Files:** `OrderEntry.jsx`
**Owner Smoke Test Checklist:**
- [ ] Turn off Delivery + TakeAway in settings → go to Dashboard → open order type dropdown → only Walk-In should appear
- [ ] Turn Delivery back ON → dropdown shows Delivery + Walk-In
- [ ] Turn TakeAway back ON → dropdown shows all three

---

### B11 — Line-by-line implementation plan

**File:** `src/components/order-entry/OrderEntry.jsx`

**Change 1 — Destructure `features` (line 54)**

Before:
```js
  const { restaurant, cancellation, settings, printerAgents } = useRestaurant();
```

After:
```js
  const { restaurant, features, cancellation, settings, printerAgents } = useRestaurant();
```

**Change 2 — Filter ORDER_TYPES by features (line 2124)**

Before:
```js
                      {ORDER_TYPES.map(type => {
```

After:
```js
                      {ORDER_TYPES.filter(type => {
                        if (type.id === 'delivery') return features.delivery;
                        if (type.id === 'takeAway') return features.takeaway;
                        return true;
                      }).map(type => {
```

**Lines changed:** ~5 lines in 1 file. Zero risk — additive filter, no existing behavior altered for enabled channels.

---

## 8. ARTIFACT TRACKER

| # | Artifact | Status |
|---|----------|--------|
| 1 | Bug Registration | DONE |
| 2 | Impact Analysis | DONE (Section 2) |
| 3 | Implementation Plan (line-by-line) | DONE (Section 3) |
| 4–6 Phase 1 | Code → QA → Owner Smoke | DONE — all signed off |
| 4–6 Phase 2 | Code → QA → Owner Smoke | DONE — all signed off |
| 4–6 Phase 3 | Code → QA → Owner Smoke | DONE — all signed off |
| 4–6 Phase 4 | Code → QA → Owner Smoke | Code DONE, QA DONE — awaiting owner smoke test |
| B12–B15 | Code → QA → Owner Smoke | Code DONE, QA DONE — awaiting owner smoke test |
