# BUG-723 — Preset chip hard-coded vs shared Audit range — Impact Analysis (Gate 2) — 2026-11-20

**Batch:** B4-PRESETS · **Priority:** P0 (owner override) · **Risk:** LOW (UI state only; no money/API/contract change)
**Files:** `pages/reports-module/SalesMockup.jsx`, `DashboardMockup.jsx`, `CancellationsMockup.jsx` (+ `utils/datePresets.js`)
**Related:** BUG-697, BUG-704 (matchPreset fix that landed only in Audit)

## Code Reality — PARTIAL
The shared-range plumbing exists and works; only the preset-chip reconciliation + preset→shared propagation are missing on the 3 screens.

- Shared range source: `useInsightsCache()` → `{ sharedFrom, sharedTo, setSharedFrom, setSharedTo }`.
- All 3 screens seed `fromDate/toDate/appliedFrom/appliedTo` from `sharedFrom/sharedTo` correctly, so **the dates are right** after navigating from Audit.
- BUG: `activePreset` is **hard-coded** — `SalesMockup.jsx:121` `useState('7D')`, `CancellationsMockup.jsx:206` `useState('7D')`, `DashboardMockup.jsx:67` `useState('Today')`. So after setting FY/LM in Audit the dates are FY/LM but the **chip wrongly highlights 7D/Today**.
- `matchPreset(from,to)` (maps a range back to its preset label, `''` if custom) is defined **only** in `AuditLogMockup.jsx:35-53` and used at its init `useState(() => matchPreset(sharedFrom, sharedTo))` (BUG-697). The 3 B4 screens never got it.
- `handlePreset` on all 3 screens sets `fromDate/toDate/appliedFrom/appliedTo` + `activePreset` but **does NOT call `setSharedFrom/setSharedTo`** (only `handleApply` does). So picking a preset (e.g. FY on Sales — L157) does not propagate the range to the other screens. Registry flags SalesMockup FY branch specifically; it is in fact every preset branch on Sales & Cancellations, and the whole `handlePreset` on Dashboard.

## Data flow
Audit sets range → `setSharedFrom/To` (InsightsCache) → user opens Sales/Dashboard/Cancellations → each seeds dates from shared (OK) but chip from a constant (BUG) → user picks preset → dates update locally but shared not updated (BUG) → next screen shows stale shared range.

## Impact
| File | Change |
|---|---|
| `utils/datePresets.js` | Export a shared `matchPreset(from,to)` (single source; reuses `fmtISO`+`computePresetRange` already here) |
| `SalesMockup.jsx` | import `matchPreset`; L121 chip init → `matchPreset(sharedFrom, sharedTo)`; `handlePreset` propagate `setSharedFrom/To` in every branch |
| `CancellationsMockup.jsx` | same two fixes (L206 + `handlePreset`) |
| `DashboardMockup.jsx` | same two fixes (L67 + `handlePreset`) |

## Conflict Pre-Check — CLEAN
- `CancellationsMockup.jsx`: last touched by Cluster B (714/715/729), **shipped 2026-11-20** → now free. Edits here are disjoint (header init + handlePreset) from Cluster B regions (scope filter / punch TZ / chart axis).
- `SalesMockup.jsx` / `DashboardMockup.jsx`: no open item owns them.
- `utils/datePresets.js`: additive export only; `AuditLogMockup.jsx` keeps its own local `matchPreset` (a B2 file — NOT touched here to preserve batch isolation; dedupe is a tracked B2 follow-up).

## Owner decisions
None — behaviour is a defined bug (chip must reflect the shared/applied range; presets must propagate). No business-rule ambiguity.

## Risk
LOW — display/UI-state only. No API, transform, money, or localStorage key change. `matchPreset` is pure and already battle-tested in Audit.
