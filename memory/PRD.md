# PRD — Mygenie Core POS Frontend

## Latest Session (2026-04-24) — Room Module V2 Implementation

### Status: V2 IMPLEMENTED · regression-safe · awaits runtime/backend QA

### Scope delivered (per `/app/memory/ROOM_MODULE_REQUIREMENTS_V2.md`)

**Files modified (5, all within V2 §13.1 Allowed list):**
| File | Change |
|------|--------|
| `frontend/src/api/transforms/profileTransform.js` | Additive — new `checkInFlags` block on `fromAPI.restaurant` |
| `frontend/src/__tests__/api/transforms/profileTransform.test.js` | Additive — 3 new test cases (existing 4 untouched) |
| `frontend/src/api/services/roomService.js` | Internal rewrite — always-multipart, V2 §8.4 schema, bracket-indexed `room_id[i]`, currency → 2dp strings, `payment_mode`/`gst_tax` removed, `booking_details=""` always sent when flag Yes |
| `frontend/src/components/modals/RoomCheckInModal.jsx` | Internal rewrite — all 12 checklist items from V2 §12 + 17 design patterns from `ROOM_MODULE_V2_DESIGN_ADDENDUM.md` |
| `frontend/package.json` + `yarn.lock` | +`browser-image-compression`, +`libphonenumber-js`, +`react-phone-number-input` via `yarn add` only |

**Feature highlights:**
- Profile-flag wiring: visibility driven by `restaurant.checkInFlags.guestDetails` / `.bookingDetails` / `.showUserGst` via `useRestaurant()` context
- Dynamic per-adult rows (#2…N) with caps `4 × rooms_selected`, comma-forbidden child name rows
- Country-code phone picker (`react-phone-number-input` default IN +91, `libphonenumber-js` validation)
- Client-side image compression (`browser-image-compression`) ≤5MB for jpg/jpeg/png/webp; PDFs up to 5MB accepted as-is; inline errors for size/type rejections
- Dates serialized as `YYYY-MM-DD HH:mm:ss` with "Edit time" popovers; 24h back-dating cap; Nights input auto-computes checkout date with amber pulse
- Radio-pill Booking Type (WalkIn/Online) & Booking For (Personal→Individual / Corporate→Corporate)
- Read-only Balance Payment auto-computed each keystroke; all currency fields serialized as `"N.00"`
- Gated GST/Firm block (expand animation, max-height 200ms ease-out) — GSTIN regex validated; cleared on hide
- Dirty-form confirmation dialog (inline-implemented; triggered on Cancel/X/overlay-click)
- `beforeunload` guard on tab-close/reload when form is dirty
- 409 Conflict → destructive toast + auto-close 500ms; other errors preserve form with 4-level error-message extraction (`errors[0].message` → `message` → `error` → fallback)
- Full `data-testid` coverage per V2 §12.14

**Removed (out of scope per V2):**
- `payment_mode` field and `PAYMENT_MODES` constant
- `gst_tax` payload field
- `X-localization` header
- JSON-body mode in `roomService` (always multipart now)

### Test/build results
| Check | Result |
|-------|--------|
| ESLint (all 5 edited files) | ✅ Clean |
| Webpack compile | ✅ Clean (only pre-existing warning on `LoadingPage.jsx:101`, untouched) |
| `profileTransform.test.js` (4 existing + 3 new) | ✅ 7/7 pass |
| `barrelExports.test.js` — RoomCheckInModal barrel | ✅ Pass |
| Full test suite delta | **0 new failures introduced**. All 64 remaining failures are **pre-existing** (`updateOrderStatus.test.js` BUG-107, `StatusConfigPage` missing from `pages/index.js`, etc.) — none in scope of Room Module work. |
| Render smoke (login page) | ✅ HTTP 200, title "Emergent \| Fullstack App" |

### Known deviations from V2 spec (documented, non-blocking)
1. **React Router `useBlocker` omitted.** V2 §11 R7 recommends it, but the app uses legacy `<BrowserRouter>` (`App.js:15`) which does NOT support `useBlocker` (v7 data-router only). `App.js` is off-limits per §13.1. In-app navigation is effectively covered by the fixed-overlay modal + Cancel/X confirmation (operator must close the modal to navigate). Tab-close/reload covered by `beforeunload`.
2. **Shadcn `Dialog`/`Popover` inlined.** Jest cannot resolve the `@/lib/utils` alias used by `components/ui/*` (only configured in webpack, not in Jest moduleNameMapper — `craco.config.js` is off-limits per §13.1). The dirty-form dialog and Edit-time popover are implemented inline (fixed overlay + conditional render). Visual parity preserved using design addendum tokens.
3. **Voter ID backend string** (V2 §11 R4) used as `"Voter ID"` (with space) — verify at runtime.
4. **Adult slot keys ≥ #5** (V2 §11 R1) use assumed extension pattern `name5`, `id_type5`, `front_image_file5`, `back_image_file5` — verify with backend during multi-room QA.
5. **Always-multipart** (V2 §11 R6) — confirm backend tolerance in integration QA.

### Runtime items still needing verification
- End-to-end API call against `https://preprod.mygenie.online/api/v1/vendoremployee/pos/user-group-check-in` — cannot be exercised in this pod without valid POS operator credentials. User must QA by logging in through the POS and performing an actual check-in.
- Image compression on large camera uploads (≥10MB) — library installed but needs real-device exercise.
- 409 path — requires two operators hitting the same room (backend guard).

---

## Previous Session (2026-04-24) — Deployment

Source: `Abhi-mygenie/core-pos-front-end-` branch `roomv1-` cloned into `/app`. Yarn 1.22.22 + Node v20.20.2 + React 19 + CRACO 7.1. All env vars written to `/app/frontend/.env` verbatim. Both supervisors RUNNING; frontend serves at `https://71564da1-69db-4cb5-9dac-be85ea6811d0.preview.emergentagent.com` (login page verified via screenshot). Full deployment handover at `/app/memory/DEPLOYMENT_HANDOVER.md`.

---

## Next Action Items (for next session)

1. **Authenticated runtime QA of Room Check-In** — operator logs in, triggers modal on an available room, exercises every flag combination (both off / guest only / booking only / both on) + GST visibility conditions.
2. **Backend confirmation for R1 & R6** — multi-room ≥5-adult submit; always-multipart acceptance.
3. **Optional: fix pre-existing test failures** (BUG-107 `updateOrderStatus` + StatusConfigPage barrel) — out of Room Module scope; user to decide if in scope next.
4. **Optional: migrate to React Router v7 data-router** to enable `useBlocker` for full in-SPA navigation guard (currently covered indirectly by modal overlay).
