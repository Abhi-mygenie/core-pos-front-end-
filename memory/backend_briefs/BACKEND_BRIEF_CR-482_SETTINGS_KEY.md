# BACKEND_BRIEF_CR-482_SETTINGS_KEY

## Summary
- Issue: CR-482 (Keyboard shortcuts for POS order flow) needs a per-restaurant on/off toggle. Feature must be off by default so no outlet is impacted until explicitly enabled.
- Classification: CONFIG_ISSUE (new settings key)
- Frontend impact: Without this key, keyboard shortcuts cannot be enabled for any restaurant. Frontend reads `restaurants[0].settings.keyboard_shortcuts` and defaults to `false` when absent.
- Priority/Risk: P0 / LOW (no data migration, no breaking change, additive only)

## Endpoint
- Method: GET (read) / POST (write)
- URL: `/api/v2/vendoremployee/profile` (read via restaurant profile) + `/api/v2/vendoremployee/restaurant-settings/update-settings` (write via settings page)
- Auth/context: vendor employee token

## Requested Change
Add a new boolean settings key `keyboard_shortcuts` under `restaurants[0].settings`:
- Default value: `"No"` (off)
- Accepted values: `"Yes"` / `"No"` (matches existing pattern: `is_coupon`, `is_loyality`, `use_token`, etc.)
- No migration needed — absent key = `"No"` on frontend

## Frontend Consumer
```js
// profileTransform.js settings() function
keyboardShortcuts: toBoolean(apiSettings.settings?.keyboard_shortcuts),
```
When `true`: POS keyboard shortcut layer activates (search auto-focus, F-keys, arrow nav, table jump).
When `false` or absent: zero keyboard behaviour, identical to today.

## Settings Page UI — Toggle Location
- **Section:** General Settings (inside SettingsPanel, accessed via sidebar -> Settings)
- **Component:** `GeneralSettingsView` (`src/components/panels/settings/ViewEditViews.jsx`)
- **UI:** Toggle row — "Keyboard Shortcuts" with on/off switch, same pattern as existing toggles (autoKot, autoBill)
- **Description text:** "Enable keyboard shortcuts for faster order entry on desktop POS"
- **Save:** same `update-settings` API call used by other General Settings toggles
- **Gated by:** only shown on devices with `(hover: hover) and (pointer: fine)` — hidden on tablets

## Dev Override (temporary, pre-backend)
Until backend implements the key, frontend uses a localStorage fallback for testing:
```js
localStorage.setItem('__cr482_kbd_dev', 'true')  // enable in browser console
localStorage.removeItem('__cr482_kbd_dev')        // disable
```
This override is stripped from the codebase before production ship. Production relies solely on the backend API key.

## Evidence
- No existing `keyboard_shortcuts` key in the profile API response (verified against preprod, restaurant 478/541)
- Frontend profileTransform pattern: `toBoolean(apiSettings.settings?.some_key)` used for 10+ existing keys
- General Settings section already has toggles for autoKot, autoBill — same pattern applies

## Frontend Workaround
- Available: YES
- Details: Until backend adds the key, frontend defaults to `false`. No restaurant sees any keyboard change. Testing proceeds with localStorage override.
