# BUG-337 — Profile Not Refreshed After Restaurant Settings Save (All Settings Stale Until Re-Login)

**Type:** Bug
**ID:** BUG-337
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)
**Source Investigation:** INV-GST-001
**Severity:** HIGH — cross-cutting; affects ALL settings changes

---

## Description

After saving any change in Restaurant Settings, the React app context (`RestaurantContext`) is never updated. The profile data (which drives features, tax flags, payment methods, service charge, etc.) is only fetched **once at app boot** via `LoadingPage`. After `RestaurantSettingsPage` saves successfully and navigates to Dashboard, the app continues running with **stale data** — no setting change takes effect until the user manually refreshes the page or logs out and back in.

This compounds every settings-related bug — including BUG-336 (GST), BUG-338 (Room GST), and potentially others.

## User Experience (What the Owner Actually Sees)

This bug is especially damaging because the UI **actively confirms success** while silently doing nothing:

1. Owner makes a change (e.g., disables GST in Tax & Charges step)
2. Clicks Save — sees ✅ **"Restaurant setup complete!"** toast
3. Gets navigated to Dashboard — everything looks normal
4. Opens an order → Collect Bill → **GST is still there**

The owner has no signal that a reload is required. Typical reactions:
- Goes back to Settings to re-check → toggle still shows OFF (backend saved it correctly)
- Tries saving again → same result
- Assumes the app is broken and files a support ticket

**The only accidental workaround is F5 / hard refresh or logout + login.** Neither is surfaced to the owner anywhere.

### Full Range of Affected Changes

Every setting the owner saves is invisible until reload:

| Setting Changed | Expected Effect | Actual Effect (broken) |
|---|---|---|
| GST Enabled → OFF | No SGST/CGST on bills | GST still charged |
| Service Charge % changed | New SC amount on bills | Old SC % still used |
| Tip toggle → ON | Tip option in Collect Bill | Tip option absent |
| Payment method enabled | New button in Collect Bill | Button not visible |
| Room GST Applicable → OFF | No GST on room bills | Room GST still charged |
| Dine-In / Takeaway toggle | Mode appears / disappears | Mode unchanged |
| Phone/Name required toggle | Validation turns on/off | Validation unchanged |
| SC auto-collect → ON/OFF | SC defaults ON or OFF | Old default persists |

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Area | Restaurant Settings → Profile Context Refresh |
| Priority | P1 |
| Severity | HIGH — all settings changes are invisible at runtime; staff see old config |
| Risk | HIGH (cross-cutting; affects billing, features, payment methods, tax — all financially relevant) |
| Fast Lane | NO — touches profile fetch flow; needs careful implementation |

## Evidence

- Source: OWNER-REPORTED (via INV-GST-001 — discovered as compounding root cause)
- Steps to reproduce:
  1. Change ANY setting in Restaurant Settings (e.g., disable GST, change SC %, toggle tip off)
  2. Save → success toast → navigate to Dashboard
  3. Open an order → setting change has NO effect
  4. Log out, log back in → setting change is now active
- Confidence: CONFIRMED (code trace)

## Code Reality

```bash
# RestaurantSettingsPage.jsx lines 268, 282:
  await updateSettings(formState, ...)          ← saves to backend ✅
  if (ok) {
    toast({ title: "Restaurant setup complete!" });
    navigate('/dashboard');                     ← NO profile re-fetch ❌
  }

# Profile loaded ONCE at boot:
  LoadingPage.jsx line 361:
    data.profile = await profileService.getProfile()
    setRestaurant(data.profile.restaurant)      ← sets context once

# profileService:
  api/services/profileService.js               ← GET /api/v1/vendoremployee/profile
  → used only in LoadingPage

# RestaurantContext — setRestaurant:
  contexts/RestaurantContext.jsx line 24:
    const setRestaurant = useCallback((data) => { setRestaurantData(data); }, [])
  → exported but only called from LoadingPage
```

- **Code reality: FULL** — confirmed; `setRestaurant` is exported and callable, just never called after settings save

## Blast Radius

- Primary fix: `RestaurantSettingsPage.jsx` — call `profileService.getProfile()` + `setRestaurant()` after successful save
- Secondary: verify `setRestaurant` is accessible from `RestaurantSettingsPage` (via `useRestaurant()` hook or direct import)
- Estimated scope: SMALL (1 file, ~5-10 lines)

## Expected Behavior

After successful save in Restaurant Settings:
- Profile is re-fetched (`GET /profile`)
- `setRestaurant(freshData)` is called → context updated immediately
- All feature flags, tax settings, payment methods reflect the new values instantly
- No logout/reload required

## Downstream Bugs Fixed By This

Fixing BUG-337 also partially mitigates:
- BUG-336: `gstStatus` becomes current after GST toggle
- BUG-338: `roomGstApplicable` becomes current after room GST toggle
- Any other settings (SC %, tip toggle, payment methods) that were changed and not reflected

Note: BUG-336 and BUG-338 still need their own fixes (missing gate in CollectPaymentPanel) — BUG-337 alone is not sufficient.

## Owner Decisions Needed

- None — fix is clear

## Duplicate Check

DISTINCT

---

**Next:** Planning Gate 2
