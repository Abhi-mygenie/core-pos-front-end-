# BUG-364 — Printer Type Routing Gate Stale Until Full Wizard Completion

**ID:** BUG-364
**Date Registered:** 2026-08-30
**Registered by:** INTAKE agent (owner-reported during CR-352 smoke test)
**Type:** BUG
**Sprint:** pos_5_x

---

## Summary

After changing the Printer Type toggle (Direct Printer / Printer Agent) in Restaurant Settings Step 1, the **Settings → All Settings → Printers tile** still routes to the old screen. The tile only routes correctly after completing the **entire 8-step wizard** and saving the last step.

**Root cause:** `BUG-337`'s profile re-fetch (`getProfile()` + `setRestaurant()`) is wired only to the **final step save** (`currentStep === lastStepId`, line 292). Intermediate step saves do not re-fetch the profile. So `restaurant.settings.printerType` stays stale in context until wizard completion.

---

## Classification

- **Type:** BUG
- **Severity:** P3 — Low
  - Zero customer/cashier impact
  - Only affects owner during one-time printer setup
  - Workaround exists: complete all 8 wizard steps → profile refreshes → tile routes correctly
- **Risk:** LOW — 1-file fix, no financial/order logic
- **Area:** Settings → Restaurant Settings wizard (Step 1 save path)
- **Fast Lane eligible:** YES (1 file, ≤5 lines, no API/financial/hotspot changes — pending owner approval)

---

## Code Reality Check (Step 0a)

```
Code Reality: NONE — fix does not exist yet for intermediate saves
```

The BUG-337 fix (`getProfile()` call) exists at line 294 but is gated to final step only:
```javascript
if (currentStep === lastStepId) {
  const ok = await saveStep();
  if (ok) {
    const fresh = await getProfile(); // BUG-337 — ONLY fires on last step
    setRestaurant(fresh.restaurant);
  }
}
```

For all other steps, `saveStep()` is called without a profile re-fetch (lines 300–305).

---

## Duplicate Detection (Step 0b)

- **RELATED to BUG-337** (`Profile Not Refreshed After Restaurant Settings Save` — GATE_5B_QA_PASS_AWAITING_OWNER_SMOKE)
- BUG-337 covers the broad case (all settings stale until re-login). This is the narrower sub-case: `printerType` is a routing-critical field introduced by CR-352 that needs the profile refresh on every step save, not just the final one.
- **Classification: DISTINCT** (narrow scope, different trigger condition, new field `printerType`)

---

## Evidence

- **Source:** OWNER-REPORTED (during CR-352 smoke test, 2026-08-30)
- **Steps to reproduce:**
  1. Login → `/restaurant-settings`
  2. Step 1 → change Printer Type pill from "Direct Printer" to "Printer Agent"
  3. Click Next (saves Step 1)
  4. Navigate to Settings → All Settings → Printers tile
  5. **Expected:** Opens PrinterAgentConfigView (Printer Agent — 6 tabs)
  6. **Actual:** Still opens LocalPrinterSetupView (Direct Printer — 3 tabs)
- **Workaround:** Complete all 8 wizard steps → final save → profile re-fetches → tile routes correctly
- **Confidence:** CONFIRMED

---

## Blast Radius

- **File:** `src/pages/RestaurantSettingsPage.jsx` — 1 file, ~3 lines
- **Hotspot:** YES — R5 file (settings wizard)
- **Blast radius:** SMALL (1 file, additive only — duplicate the existing `getProfile()` call to the intermediate save path)
- **Risk:** LOW — adding an async best-effort profile re-fetch after every step save, same pattern as BUG-337

---

## Proposed Fix (for Implementation agent)

In `handleNext()`, after every successful `saveStep()` (not just the last step), add a non-blocking profile re-fetch:

**Current intermediate save path (lines 300–305):**
```javascript
const ok = await saveStep();
if (ok) {
  setCompletedSteps((prev) => new Set([...prev, currentStep]));
  setCurrentStep((prev) => prev + 1);
}
```

**Fixed:**
```javascript
const ok = await saveStep();
if (ok) {
  setCompletedSteps((prev) => new Set([...prev, currentStep]));
  setCurrentStep((prev) => prev + 1);
  // BUG-364: re-sync context so routing-critical flags (e.g. printerType) update immediately
  getProfile().then(fresh => setRestaurant(fresh.restaurant)).catch(() => {});
}
```

**Note:** Non-blocking (`.then().catch()`) — same best-effort pattern as BUG-337. Does not affect step navigation or save flow.

---

## Customer / Business Impact

- **Cashier / waiter:** ❌ Not affected — never uses this screen
- **Diner / customer:** ❌ Not affected
- **Restaurant owner:** ⚠️ Minor — wrong Printers tile screen shown mid-wizard; resolved on full wizard completion
- **Daily POS operations:** ❌ Not affected

---

## Next

Fast Lane eligible — awaiting owner approval. If approved: 1-file fix, ~3 lines, LOW risk.
