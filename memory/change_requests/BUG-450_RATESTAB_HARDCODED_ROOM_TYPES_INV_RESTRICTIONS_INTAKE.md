# BUG-450 — Channel Manager › Rates & Restrictions › Inventory Restrictions: room types hard-coded to `executive` / `suite` — INTAKE 2026-09-22
Source: **OWNER-FOUND** on preprod `/pms/channel-manager` (Tab 3 Rates & Restrictions › sub-tab Inventory Restrictions), screenshots with owner. Severity **MAJOR**. Origin **LEGACY Channel Manager — CR-358-P5 (S8-C), implemented 2026-09-08** (`FILE_OWNERSHIP.md` L1334 "CR-358-P5: NEW FILE — RatesTab.jsx", file header `// CR-358-P5: S8-C`). **Not a CR-385 regression**: CR-385 never touched `RatesTab.jsx` (not in the CR-385 files list); `git blame` L21/L118/L288/L362 all resolve to the single squashed platform commit `642ccb8` (repo history is squashed, so blame cannot go further back than that — the CR-358-P5 provenance above is the authoritative trail). Status: **INTAKE — awaiting owner routing. Do NOT fix yet.**

## Symptom
Inventory Restrictions lists exactly two cards, **"Executive Room"** and **"Suite"**, for every property. On the same screen **Rate Restrictions** correctly lists the property's real room types (e.g. `non-view-room`, `road-view-room`) because it derives its rows from the fetched `ratesData.rateplans`. Pushing inventory restrictions on such a property sends `room_code: "executive"` / `"suite"` — codes that do not exist for that property → Aiosell ignores or rejects them (no visible error other than a generic toast, or a false "pushed" success).

## RCA (code-read, line refs confirmed against `frontend/src/pages/pms/RatesTab.jsx` @ 596 lines)
| Line | Code | Effect |
|---|---|---|
| **L21** | `const ROOM_TYPES = ['executive', 'suite'];` | Module constant — the only source of room types for the Inventory sub-tab. |
| **L46** | `initInvForm = () => Object.fromEntries(ROOM_TYPES.map(...))` | `invForm` state keyed by the two literals → no slot for any other code. |
| **L118–L127** | `handlePushInvRestrictions`: `ROOM_TYPES.map(rt => … { room_code: rt, restrictions })` | Payload `rooms[]` always carries `executive` / `suite` regardless of the property → **wrong codes on the wire** for any property whose Aiosell room codes differ. |
| **L360** | `{ROOM_TYPES.map(rt => (…` | Renders exactly two cards. |
| **L362** | `{rt === 'executive' ? 'Executive Room' : 'Suite'}` | Literal labels. |
| **L288** (Rates grid) | `{plan.roomCode === 'executive' ? 'Executive Room' : 'Suite'}` | Group header label in the **Rates** grid: any code ≠ `executive` is captioned **"Suite"** → on a `non-view-room` / `road-view-room` property **both** groups read "Suite". Label only — the rates **push** (`pushRatesData`, `pmsService.js` L449–L458) maps `rateplanCode → roomCode` from `ratesData.rateplans`, so the pushed `room_code` is correct. |
| L370/L380 | `data-testid={`rt-inv-${rt}-${f.key}`}` | Test IDs also built from the literals (fine once `rt` is the real code). |
| **L411–L414** (Rate Restrictions) | `ratesData?.rateplans.map(({ roomCode, rateplanCode }) => …` | **Correct pattern** — rows/keys/payload from fetched data. |

Why it passed CR-358-P5 QA (Gate 5B 2026-09-09, "Inv Restrictions ✅"): the only sandbox (TGK) has Aiosell room codes `executive` + `suite`, so the literals coincidentally matched.

## Blast radius
- **Affected:** every property whose Aiosell room codes are not exactly `{executive, suite}` — e.g. the owner's preprod property with `non-view-room` / `road-view-room`. Also any property with **3+** room types (3rd+ type cannot be restricted at all), and any property with only one type (a phantom second card is pushed).
- **Inventory Restrictions push:** wrong `room_code` values → restriction silently not applied on the OTA (stop-sell / min-stay / CTA / CTD ineffective) or rejected. **Operational risk: overbooking when staff believe stop-sell is on.** No money figure is computed or sent by this screen (no D50/G-02 exposure).
- **Rates grid header (L288):** wrong caption ("Suite" for every non-`executive` group) — cosmetic/misleading; rates push unaffected.
- **Rate Restrictions:** unaffected.
- **Not affected:** TGK sandbox (codes match), Front Desk (Beta), legacy PMS pages — see grep below.
- **Other legacy PMS pages hard-coding the literals (`grep -rniE "'executive'|\"executive\"|'suite'|\"suite\"|Executive Room" frontend/src`):** **0 production hits outside `RatesTab.jsx`.** All 139 other hits are test data / fixtures mirroring the TGK sandbox: `api/services/__tests__/pmsService.tapeChart.cr358p4.test.js` (L47–56, L139–140), `api/transforms/__tests__/roomStatusTransform.cr358p4.test.js` (L51–55), `components/pms/frontdesk/__tests__/phase1.cr385.test.jsx` (L25, L165), `__fixtures__/cr385/room_availability.json`, `__fixtures__/cr385/local_reservations_view_all.json` (+ other cr385 fixtures). None drive runtime behaviour. `ChannelManagerPage.jsx` Room Mapping uses `ar.roomName ?? ar.roomCode` from the catalogue (L433–L435) — correct.

## Proposed fix (1 file + 1 new test file; no API / transform / service change)
`frontend/src/pages/pms/RatesTab.jsx` (`// BUG-450` markers):
1. **Delete** `ROOM_TYPES` (L21). Derive `roomTypes = useMemo(() => [...new Set((ratesData?.rateplans ?? []).map(p => p.roomCode).filter(Boolean))], [ratesData])` — same source Rate Restrictions already trusts. **Fallback** when rates are not loaded yet: read the Room Mapping catalogue (`aiosellRooms[].roomCode/roomName` — the `rooms` state already held by `ChannelManagerPage.jsx` L43; pass as an optional `aiosellRooms` prop, +1 line at L469) or show the existing "Load rates first…" empty state (as Rate Restrictions does at L410). Owner to pick: (i) prop from Room Mapping, or (ii) empty state only.
2. **Labels**: `roomLabel(code)` = `aiosellRooms.find(r => r.roomCode === code)?.roomName ?? code` — **never a literal**. Apply at L288 (Rates grid group header) and L362 (Inventory card header).
3. **`invForm` keyed by the real codes**: initialise lazily — `invForm[rt] ?? DEFAULT_RESTRICTION` when reading (same idiom as `rrForm` at L413); `handlePushInvRestrictions` iterates `roomTypes`, so the payload `rooms[].room_code` is always a fetched code.
4. **Guard**: if `roomTypes.length === 0` disable `rt-inv-push-btn` and show the empty state.
5. **Unit tests** (new `src/pages/pms/__tests__/RatesTab.bug450.test.jsx`, mock `@/api/services/pmsService`):
   - 2-code property (`non-view-room`, `road-view-room`): two cards with those labels/codes; `pushInvRestrictionsData` called with `rooms[].room_code` = exactly those two, **no literal `executive`/`suite` anywhere in the payload**.
   - 3-code property: three cards, three payload rows.
   - Rates grid group headers show the catalogue `roomName` (or the code) — never "Executive Room"/"Suite" for a foreign code.
   - Regression: TGK shape (`executive`, `suite`) still renders two cards and pushes both codes.
6. **Guard grep** (add to the CR-385/PMS guard script or run in Gate 5A): `grep -nE "'executive'|'suite'|Executive Room" frontend/src/pages/pms/RatesTab.jsx` must return 0 hits.
Estimated diff: ~30–40 changed lines in `RatesTab.jsx` (+1 optional line in `ChannelManagerPage.jsx`) + 1 new test file (~80 lines).

## Routing options (owner to choose)
| | Option | Effort | Notes |
|---|---|---|---|
| **(a)** | **Fast-lane style bug fix now, as BUG-450** — before/independent of the CR-385 combined smoke (not on the smoke path: `RatesTab.jsx` is not imported by any Front Desk (Beta) or legacy PMS page other than `ChannelManagerPage` Tab 3) | ≈1.5 h: fix 30 min · unit tests 30 min · testing_agent read-only spot-check on preprod `/pms/channel-manager` (labels + payload capture with QA_TGK, **no push to OTA**) 30 min | Strictly exceeds ALPHA Fast Lane limits (≤10 lines, 1 file) → run as a **mini gate** like P3.5/P4.5: intake ✔ → owner GO → fix + tests → Gate 5A → QA spot-check → owner smoke row "CM-S01: Inventory Restrictions lists the property's real room types" appended to the combined smoke. |
| (b) | Fold into **FU-385-C / Phase 5** | 0 now; same ≈1.5 h later | Leaves a MAJOR operational defect (ineffective stop-sell) live on every non-TGK property until FU-385-C; FU-385-C is a legacy-page cutover CR, and this file is Channel Manager, not Front Desk — poor fit. |
| (c) | Separate CR (CR-358 follow-up) | ≈3 h incl. full gate paperwork | Over-processing for a 1-file, no-API change. |

**Recommendation: (a).** Rationale: MAJOR operational risk (overbooking) on any real property, 1 file, no API/transform/money logic, zero overlap with the CR-385 smoke path or frozen hotspots, and the fix pattern already exists 50 lines below (Rate Restrictions). Sequence: land BUG-450 (fix + tests + spot-check) **before** the combined smoke so the owner's next preprod session sees the corrected screen; then start the M2+M3+M4 smoke.

## Owner smoke row (if (a))
| CM-S01 | `/pms/channel-manager` › Rates & Restrictions › Inventory Restrictions | Load rates → open sub-tab | One card per real room type (same names as Room Mapping / Rate Restrictions), no "Executive Room"/"Suite" unless the property really has them; Rates grid group headers read the same names. Do **not** push. | | |
