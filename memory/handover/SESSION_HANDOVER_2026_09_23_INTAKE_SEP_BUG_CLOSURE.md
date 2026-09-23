# Session Handover — 2026-09-23
## INTAKE — BUG-451 / BUG-452 / BUG-453 / CR-386 (new sprint `sep_bug_closure`) from validated 2026-09-18 investigation reports

```
Session date:     2026-09-23
Role:             INVESTIGATION (validation, read-only) → INTAKE (ALPHA v0.7)
Registry synced:  YES — 4 items appended (706 → 710), meta updated; no existing item modified
Scope drift:      NONE — zero src/ or public/ changes; docs + registry + evidence only
Status at close:  GATE 1 CLOSED for all 4 items (owner 2026-09-23). All blocking ODs LOCKED. Gate 2 READY.
Next agent role:  PLANNING (Gate 2 Impact Analysis) — suggested order: CR-386 → BUG-453 → BUG-451 → BUG-452
Workspace:        /app · branch 21implement · HEAD 1be4055 (remote b2db5a01)
```

## Locked owner decisions (2026-09-23, after walkthroughs)
| OD | Decision |
|---|---|
| OD-451-01 / 02 | `limit: 2000` (backend probe at Planning) · fix `PAGINATION.DEFAULT_LIMIT` in same change |
| **OD-452-01** | **OPTION B — always clear cart on type/table switch mid-build.** REVERSES BUG-334 (owner chose knowingly after walkthrough). BUG-334 item NOT edited (owner scope lock) — Planning to propose "REVERSED BY BUG-452" annotation + removal of the BUG-334 carry-forward branch for owner approval. New OD-452-03: placed items on occupied tables never affected. |
| OD-453-01 / 02 / 03 | Fix A + Fix B one bug · anti-rule override APPROVED · **per-order manual mute toggle** (silent until Mute pressed again; no timer, no auto-clear) |
| OD-386-01 | **Option A APPROVED** — wordmark on white: `evidence/CR-386/approved_A_logo192.png`, `approved_A_logo512.png`, `approved_A_maskable_logo512.png` (copy to `public/` only at Implementation). Designer brief for optional square mascot mark: `design_briefs/DESIGN_BRIEF_CR-386_APP_ICON_2026_09_23.md` |
| OD-386-02 / 03 / 04 | Defaults locked: `short_name` "MyGenie POS" · `display` `standalone` · `start_url` `/` (Planning verifies auth redirect) |

## Planning-entry notes
- BUG-452 IA must read `impact/BATCH-04_IMPACT_ANALYSIS.md` (BUG-334) and `OrderEntry.jsx:504–508`; INV Option A location is wrong (effect re-writes after type change) — fix belongs in the OrderEntry effect (R5).
- BUG-453: FCM payload has `data.order_id` (`NotificationContext.jsx:86`) → key for the per-order mute set; keep Sidebar Silent Mode precedence; rewrite `ScanOrderPopOut.jsx:22–27` anti-rule header as owner override 2026-09-23.
- BUG-451: curl-probe `get-products-list?limit=2000` (alias account, masked token) before Gate 3.
- CR-386: `firebase-messaging-sw.js` untouched; `%PUBLIC_URL%` in link tags; check `/` → auth redirect for installed app.

## (superseded — Gate 1 state at first close)
```
Status at close:  4 items at Gate 1 (INTAKE). All blocked on owner decisions before Planning Gate 2.
Next agent role:  PLANNING (Gate 2 Impact Analysis) after owner answers the ODs below
Workspace:        /app · branch 21implement · HEAD 1be4055 (remote b2db5a01)
```

## Owner choices this session
| Q | Answer |
|---|---|
| Role | Investigation → validate the 5 INV docs, report gaps only (no doc edits) → Intake to register |
| Registrations | BUG-453 + proposed CR (Fix B) **merged** into one bug BUG-453 |
| Sprint | **new `sep_bug_closure`** |
| BUG-452 OD-1/OD-2 vs BUG-334 | "do not touch anything apart from these CR and bug — is there any conflict?" → **YES** (recorded as OD-452-01 REOPENED inside BUG-452 only; BUG-334 and the INV docs untouched) |

## Registered
| ID | Title (short) | P | Risk | Intake doc | Evidence |
|---|---|---|---|---|---|
| BUG-451 | Product list `limit: 500` cap | P1 | HIGH | `change_requests/BUG-451_PRODUCT_LIST_LIMIT_500_CAP_INTAKE.md` | `evidence/BUG-451/` |
| BUG-452 | Stale cart under old key after type/table switch | P2 | HIGH | `change_requests/BUG-452_STALE_CART_RESTORED_AFTER_TYPE_TABLE_SWITCH_INTAKE.md` | `evidence/BUG-452/` |
| BUG-453 | Mute doesn't stop ringer (race) + FCM-retry restart | P1 | MEDIUM | `change_requests/BUG-453_MUTE_DOES_NOT_STOP_RINGER_INTAKE.md` | `evidence/BUG-453/` |
| CR-386 | PWA install: manifest + icons + index.html | P2 | LOW | `change_requests/CR-386_PWA_INSTALL_MANIFEST_ICONS_INTAKE.md` | `evidence/CR-386/` |

Rows added: `BUG_TRACKER.md` (section 2026-09-23 + Last Updated), `CR_REGISTRY.md` (section 2026-09-23 + Last Updated), `CONTROL_DASHBOARD.md` (Last Updated + Active Sprints row). Dashboard JSON sync **not run** — `frontend/public/__dev/data/` does not exist in this checkout.

## Open owner decisions (block Gate 2)
| OD | Item | Question |
|---|---|---|
| OD-451-01 | BUG-451 | Target `limit` (1000 / 2000 / other) |
| OD-451-02 | BUG-451 | Fix stale `PAGINATION.DEFAULT_LIMIT: 100` in same change? |
| **OD-452-01** | BUG-452 | **(a)** keep BUG-334 carry-forward + clear old key (move) — recommended · **(b)** always clear on switch (reverses BUG-334, owner-verified) |
| OD-452-02 | BUG-452 | Fix location `DashboardPage.jsx:2070` handler vs `OrderEntry.jsx:383–386` (both R5) |
| OD-453-02 | BUG-453 | Override Jan-2026 anti-rule "NO future-sound suppression" (`ScanOrderPopOut.jsx:22–27`) |
| OD-453-03 | BUG-453 | Fix B approach: time-based mute window vs per-order mute set |
| OD-386-01 | CR-386 | Icon assets: owner PNGs vs agent SVG→PNG (blocks implementation) |
| OD-386-02/03/04 | CR-386 | `short_name` · `display` · `start_url` (`/` = Login page) |

## Validation findings on the 2026-09-18 INV docs (docs NOT modified — owner instruction)
All 4 technical root causes still hold at HEAD. Gaps to fix when those docs are next edited:
- **INV-CART-PERSIST-001:** "DashboardPage not R5" is wrong (R5 + HIGH-RISK FILE TRAPS list it) → planning-skip claim invalid; Option A fix location does not work (effect re-writes after type change); missed **BUG-334** (carry-forward, CLOSED) — repro step "cart appears empty" untrue; "only cleared by stay-on-order" also `:545`; §5 vs §11 grid-click inconsistency; **raw password printed §11 (R20)**.
- **INV-LIMIT-001:** §7 vs §8 OD contradiction; no curl evidence (R11); no item risk label (R21); no duplicate check.
- **INV-MUTE-RINGER-001:** valid; no evidence dir; CLOSED with open ODs.
- **INV-PWA-ICON-001:** valid; SW icon refs at L40–41 (doc 38–39).
- **INV-PWA-APPROACH-001:** conclusion valid; "Chrome requires a service worker" is stale (dropped in Chrome 108/112).
- Process: none of the INV IDs were registered (R0); no session handover existed for the 09-18 investigation session; no evidence dirs; all marked CLOSED with open ODs.
- **Not done (owner scope lock):** OPEN_GAPS_REGISTER entries for the stale INV docs (R1) — recommend filing at the next Closure/Planning session.

## Self-assessment
| Dimension | Score | Notes |
|---|---|---|
| Registry synced? | 5 | 4 new items, verified by re-read; backup `/tmp/registry_backup.json` (session-only) |
| Scope drift? | 5 | No code, no existing registry items, no INV docs touched |
| Role correctly identified? | 5 | Investigation (validate) → Intake, owner-driven |
| Required docs read? | 5 | Dashboard, CR registry, tracker, intake workflow, latest handover |
| Outputs complete? | 4 | Dashboard JSON sync skipped (dir absent); OPEN_GAPS entries deferred by owner scope |
| Handover written? | 5 | This file |
| Stale docs flagged? | 4 | Flagged here + inside each intake doc; not yet in OPEN_GAPS_REGISTER |
