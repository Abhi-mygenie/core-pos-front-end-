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

---

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

## 3. PRIORITY ORDER FOR FIXES

| Order | Bug | Reason |
|-------|-----|--------|
| 1 | B1 | Data loss on every save — highest user impact |
| 2 | B9 + B10 | File upload header issues — may cause upload failures |
| 3 | B2 | Type mismatch — needs backend confirmation |
| 4 | B3 | Redundant uploads — bandwidth + potential side effects |
| 5 | B6 | Step navigation bypass — wizard integrity |
| 6 | B7 | Error bleed — UX confusion |
| 7 | B8 | Number input UX — minor annoyance |
| 8 | B5 | Skip guard — preventative |
| 9 | B4 | Dead imports — hygiene |

---

## 4. AFFECTED FILES SUMMARY

| File | Bugs |
|------|------|
| `src/api/transforms/restaurantSettingsTransform.js` | B1, B2 |
| `src/pages/RestaurantSettingsPage.jsx` | B3, B4, B5, B6, B7, B8 |
| `src/api/services/restaurantSettingsService.js` | B9 |
| `src/api/axios.js` | B10 |

---

## 5. ARTIFACT TRACKER

| # | Artifact | Status |
|---|----------|--------|
| 1 | Bug Registration | DONE (this file) |
| 2 | Impact Analysis | DONE (see Section 2) |
| 3 | Fix Implementation | PENDING |
| 4 | QA / Testing | PENDING |
| 5 | Owner Signoff | PENDING |
