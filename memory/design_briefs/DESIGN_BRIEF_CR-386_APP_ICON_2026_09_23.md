# DESIGN BRIEF — CR-386 · MyGenie POS App Icon (PWA / desktop / push)

**Date:** 2026-09-23 · **Item:** CR-386 PWA install support · **Requested by:** owner · **Status:** OPTIONAL — Option A (auto-generated wordmark icon) is approved and unblocks CR-386; this brief is for a better, purpose-built square mark to replace it later (drop-in, no code change).

---

## 1. What we need
A **square app icon** for the MyGenie POS when it is installed as a desktop/PWA app (Windows taskbar, macOS dock, Android home screen, Chrome install prompt) and as the **push-notification icon**.

Today's logo is a **landscape wordmark (156 × 82)** — mascot fused with the letters "yg". On a square tile it letterboxes and the text gets small at 192 px. We want a **mascot-first mark** that reads at 32 px.

## 2. Deliverables (all PNG, sRGB, no text baseline clipping)

| File | Size | Background | Safe zone | Use |
|---|---|---|---|---|
| `logo512.png` | 512 × 512 | white `#FFFFFF` (or brand green `#329937` — see §4) | artwork inside central **80 %** (≈ 410 px) | install prompt, splash |
| `logo192.png` | 192 × 192 | same | artwork inside central 80 % | taskbar / dock / notification icon |
| `logo512-maskable.png` | 512 × 512 | **full-bleed** background, no transparency | artwork inside central **60 %** (≈ 307 px circle) | Android adaptive icon (system crops to circle / squircle) |
| `favicon.ico` (optional) | 32 × 32 (+16) | transparent | — | browser tab |
| `logo-mark.svg` (optional) | vector | — | — | future use |

Filenames must match exactly — `firebase-messaging-sw.js` already references `/logo192.png`.

## 3. Content
- **Primary:** the **genie mascot** (green cap `#329937`-ish + face) as a standalone mark — extracted/redrawn from the wordmark so no letter fragments remain.
- Optional small yellow star (from the wordmark) as accent.
- **No wordmark text** in the 192/maskable sizes (unreadable). If text is wanted, only on 512 and only if it survives at 25 % scale.
- Must be recognisably the same character as the current logo (`evidence/CR-386/logo111.svg`).

## 4. Colour
- Brand green `#329937` (theme colour used in the manifest), brand orange (from wordmark), white.
- Choose **one** background treatment and apply to all sizes: white tile with mascot, **or** green tile with white/orange mascot. Contrast of mascot vs tile ≥ 3:1.
- No gradients, no drop shadows (OS adds its own), no rounded corners baked in (OS masks).

## 5. Acceptance checks
1. At **32 px** the mascot is still identifiable (cap + face silhouette).
2. Nothing important within 10 % of any edge (192/512) or outside the 60 % circle (maskable).
3. Looks right on **light and dark taskbars** (test on white and `#202124`).
4. PNG-24, no colour profile surprises, file size < 60 KB each.
5. Filenames exactly as in §2.

## 6. Reference
- Current wordmark: `https://customer-assets.emergentagent.com/job_react-pos-phase1/artifacts/dwikbb41_logo111.svg` (copy at `/app/memory/evidence/CR-386/logo111.svg`)
- Approved interim icon (Option A, auto-generated wordmark on white): `/app/memory/evidence/CR-386/approved_A_logo512.png`
- Rejected auto-crop attempt (shows the fusion problem): `/app/memory/evidence/CR-386/preview_mark_white_logo512.png`

## 7. Hand-back
Send PNGs to the owner → agent drops them into `frontend/public/` replacing the Option A files (no manifest/code change; same filenames) → owner re-installs the app to see the new icon (installed shortcuts do not auto-refresh icons).
