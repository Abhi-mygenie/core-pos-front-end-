# Implementation Plan — BATCH-01: GST Gating
**Items:** BUG-337 (P1), BUG-336 (P0), BUG-338 (P1)
**Date:** 2026-08-18
**Role:** PLANNING (Gate 3)
**Status:** AWAITING GATE 4 GO — do not implement until owner approves

---

## Execution Order (MANDATORY — do not reorder)

```
1. BUG-337 first  → profile re-fetches on save → gstStatus + roomGstApplicable are fresh
2. BUG-336 + BUG-338 together → same useMemo block, same file, one edit pass
```

---

## EDIT 1 — BUG-337: Add profile re-fetch after settings save
**File:** `src/pages/RestaurantSettingsPage.jsx`
**Risk:** HIGH

### Edit 1a — New import: `useRestaurant`
```
Line 3 (current):
  import { useState, useEffect, useCallback } from "react";

Line 4 (current):
  import { useNavigate } from "react-router-dom";

INSERT after line 4 (new line 5):
  import { useRestaurant } from "../contexts";
```

### Edit 1b — New import: `getProfile`
```
Line 11 (current):
  import { getSettings, updateSettings } from "../api/services/restaurantSettingsService";

CHANGE TO:
  import { getSettings, updateSettings } from "../api/services/restaurantSettingsService";
  import { getProfile } from "../api/services/profileService"; // BUG-337
```

### Edit 1c — Destructure `setRestaurant` from context
```
Line 211 (current):
  const navigate  = useNavigate();
  const { toast } = useToast();

CHANGE TO:
  const navigate  = useNavigate();
  const { toast } = useToast();
  const { setRestaurant } = useRestaurant(); // BUG-337
```

### Edit 1d — Re-fetch profile on last-step save success
```
Lines 280–283 (current):
  if (currentStep === lastStepId) {
    const ok = await saveStep();
    if (ok) { toast({ title: "Restaurant setup complete!" }); navigate('/dashboard'); }
    return;
  }

CHANGE TO:
  if (currentStep === lastStepId) {
    const ok = await saveStep();
    if (ok) {
      try {
        const fresh = await getProfile(); // BUG-337: re-sync context so all flags are live immediately
        setRestaurant(fresh.restaurant);
      } catch (_) { /* non-blocking — context refresh is best-effort */ }
      toast({ title: "Restaurant setup complete!" });
      navigate('/dashboard');
    }
    return;
  }
```

**Verification:** Save any setting in Restaurant Settings → open Collect Bill → changed flag is active immediately (no reload needed).

---

## EDIT 2 — BUG-336 + BUG-338: Gate taxTotals on gstStatus and roomGstApplicable
**File:** `src/components/order-entry/CollectPaymentPanel.jsx`
**Risk:** CRITICAL (BUG-336) + HIGH (BUG-338)

### Edit 2a — Add per-item GST guards inside taxTotals forEach
```
Lines 251–253 (current):
  billableItems.forEach(item => {
    const tax = item.tax;
    if (!tax || tax.percentage === 0) return;

CHANGE TO:
  billableItems.forEach(item => {
    const tax = item.tax;
    if (!tax || tax.percentage === 0) return;
    const taxType = (tax.type || 'GST').toUpperCase();
    // BUG-336: skip GST items when owner has disabled GST in Restaurant Settings
    if (taxType === 'GST' && restaurant?.tax?.gstStatus === false) return;
    // BUG-338: skip GST items on room orders when roomGstApplicable is OFF
    if (taxType === 'GST' && isRoom && restaurant?.settings?.roomGstApplicable === false) return;
```

**Why per-item guard (not early return):**
- VAT items (`tax.type === 'VAT'`) must still accumulate — no `vatStatus` disable flag exists
- `=== false` guard: undefined (profile not yet loaded) defaults to enabled — safe
- Does not alter existing logic when gstStatus is true or roomGstApplicable is true

### Edit 2b — Update useMemo dependency array
```
Line 281 (current):
  }, [billableItems]);

CHANGE TO:
  }, [billableItems, restaurant, isRoom]); // BUG-336, BUG-338: react to profile flag changes
```

**Why:** `restaurant?.tax?.gstStatus` and `restaurant?.settings?.roomGstApplicable` are now used inside the memo. `isRoom` is already in closure scope (prop) but must be in deps for correctness.

---

## Complete Diff Preview

### RestaurantSettingsPage.jsx

```diff
  import { useState, useEffect, useCallback } from "react";
  import { useNavigate } from "react-router-dom";
+ import { useRestaurant } from "../contexts";
  import {
    ...
  } from "lucide-react";
  import { COLORS } from "../constants";
  import { getSettings, updateSettings } from "../api/services/restaurantSettingsService";
+ import { getProfile } from "../api/services/profileService"; // BUG-337
  import { useToast } from "../hooks/use-toast";
  ...
  const RestaurantSettingsPage = () => {
    const navigate  = useNavigate();
    const { toast } = useToast();
+   const { setRestaurant } = useRestaurant(); // BUG-337
  ...
    if (currentStep === lastStepId) {
      const ok = await saveStep();
-     if (ok) { toast({ title: "Restaurant setup complete!" }); navigate('/dashboard'); }
+     if (ok) {
+       try {
+         const fresh = await getProfile(); // BUG-337: re-sync context
+         setRestaurant(fresh.restaurant);
+       } catch (_) { /* non-blocking */ }
+       toast({ title: "Restaurant setup complete!" });
+       navigate('/dashboard');
+     }
      return;
    }
```

### CollectPaymentPanel.jsx

```diff
  billableItems.forEach(item => {
    const tax = item.tax;
    if (!tax || tax.percentage === 0) return;
+   const taxType = (tax.type || 'GST').toUpperCase();
+   // BUG-336: skip GST items when GST is disabled in Restaurant Settings
+   if (taxType === 'GST' && restaurant?.tax?.gstStatus === false) return;
+   // BUG-338: skip GST on room orders when roomGstApplicable is OFF
+   if (taxType === 'GST' && isRoom && restaurant?.settings?.roomGstApplicable === false) return;
    const linePrice = getItemLinePrice(item);
    ...

- }, [billableItems]);
+ }, [billableItems, restaurant, isRoom]); // BUG-336, BUG-338
```

---

## Verification Matrix

| # | Edit | File | How to Verify | Automated? |
|---|---|---|---|---|
| 1 | BUG-337: Profile re-fetch | `RestaurantSettingsPage.jsx` | Disable GST → Save → open Collect Bill immediately → SGST/CGST = 0 (no reload) | Manual |
| 2 | BUG-337: Non-blocking catch | `RestaurantSettingsPage.jsx` | Navigate still proceeds even if profile fetch fails (mock fetch error in DevTools) | Manual |
| 3 | BUG-336: GST gate | `CollectPaymentPanel.jsx` | gstStatus = false → bill shows ₹0 SGST/CGST. gstStatus = true → existing GST amounts unchanged | Manual |
| 4 | BUG-336: VAT unaffected | `CollectPaymentPanel.jsx` | On a VAT restaurant with gstStatus = false → VAT still accumulates; GST = 0 | Manual |
| 5 | BUG-338: Room GST gate | `CollectPaymentPanel.jsx` | isRoom = true + roomGstApplicable = false → room bill shows ₹0 GST | Manual |
| 6 | BUG-338: Non-room unaffected | `CollectPaymentPanel.jsx` | Dine-in / walk-in order with roomGstApplicable = false → GST still applies normally | Manual |
| 7 | Regression: SC gate unaffected | `CollectPaymentPanel.jsx` | Service charge still calculates correctly on dine-in orders | Manual |
| 8 | Regression: Discount+GST (BUG-304) | `CollectPaymentPanel.jsx` | Discountable GST split (dSgst/dCgst) still correct when GST is enabled | Manual |

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Profile re-fetch fails on slow network | LOW | try/catch ensures navigate still proceeds — no UX break |
| `gstStatus === undefined` (profile not loaded) | LOW | `=== false` guard only fires on explicit `false`; undefined = enabled (safe) |
| VAT-only restaurant sees GST gate trigger | IMPOSSIBLE | Gate is `taxType === 'GST'` only — VAT branch never enters this guard |
| useMemo stale if `restaurant` changes | MITIGATED | `restaurant` added to dependency array |
| BUG-304 discountable buckets broken | LOW | Gate returns early BEFORE the accumulate lines — BUG-304 logic untouched |
| CollectPaymentPanel re-renders unexpectedly | LOW | `restaurant` object is stable reference from context; only changes on setRestaurant call |

---

## Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-336 → status: IMPLEMENTED
- [ ] registry.json: BUG-337 → status: IMPLEMENTED
- [ ] registry.json: BUG-338 → status: IMPLEMENTED
- [ ] BUG_TRACKER.md: rows for BUG-336, BUG-337, BUG-338 updated
- [ ] FILE_OWNERSHIP.md: RestaurantSettingsPage.jsx + CollectPaymentPanel.jsx entries added
- [ ] Code markers: // BUG-337, // BUG-336, // BUG-338 comments in every modified file
- [ ] webpack compiles with 0 new warnings
```

---

## Scope Lock

**Files WILL change:**
1. `src/pages/RestaurantSettingsPage.jsx` — 2 imports + 1 hook + ~8 lines in handleNext
2. `src/components/order-entry/CollectPaymentPanel.jsx` — ~5 lines in taxTotals + deps

**Files will NOT touch:**
- `orderTransform.js`, `profileTransform.js`, `restaurantSettingsTransform.js`
- `LoadingPage.jsx`, `RestaurantContext.jsx`, `CartPanel.jsx`
- All report files, all other components

**Total change size: ~15 lines across 2 files.**

---

## GATE 4 — Owner GO Required Before Implementation

Per AGENT_PROMPT_ALPHA.md Owner Approval Matrix:
- BUG-336 is CRITICAL financial logic → **Gate 4 GO mandatory**
- BUG-337 + BUG-338 are HIGH financial → same Gate 4 GO covers all three

```
OWNER APPROVAL REQUIRED
Reason: CRITICAL (BUG-336 tax overcharge) + HIGH (BUG-337 stale profile,
        BUG-338 room GST). Financial logic — R6 applies.
Risk: CRITICAL / HIGH
Proposed: Implement all 3 in one session. ~15 lines. 2 files.
Awaiting Gate 4 GO.
```

---

Planning complete: BATCH-01 (BUG-336, BUG-337, BUG-338)
Stage: Impact Analysis + Implementation Plan
Code reality: FULL (bugs confirmed in live code)
Risk: CRITICAL (BUG-336) + HIGH (BUG-337, BUG-338)
Files WILL change: RestaurantSettingsPage.jsx, CollectPaymentPanel.jsx
Files WILL NOT touch: orderTransform.js, profileTransform.js, LoadingPage.jsx, CartPanel.jsx, RestaurantContext.jsx
Owner decisions: none
Docs: /app/memory/impact/BATCH-01_IMPACT_ANALYSIS.md, /app/memory/plans/BATCH-01_IMPLEMENTATION_PLAN.md
Next: Gate 4 GO → Implementation
