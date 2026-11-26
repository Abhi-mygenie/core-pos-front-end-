# SESSION HANDOVER — for the next agent — 2026-11-20 (EOD)

**Repo:** `Abhi-mygenie/core-pos-front-end-` (frontend-only; external preprod API). `main` is pushed to GitHub.
**Preprod login (QA, WORKS):** `owner@cafe103.com` / `Qplazm@10`  → `/app/memory/test_credentials.md`.
**DO NOT USE:** `owner@mealbreak.com` — returns **401** on preprod (not provisioned).
**Golden rule:** code is source of truth — grep/view the file before trusting the registry.

---

## WHO TAKES IT FROM HERE
The next **PLANNING agent** picks the next batch → Gate-2 IA → Gate-3 plan → (owner Gate-4 GO) → **IMPLEMENTATION** → **QA (testing_agent)** → EXIT GATE → push on owner say-so. Same flow as `control/AGENT_PROMPT_ALPHA.md`.
- **Agreed global order:** B4 → B2 → B5 → B6 → B1 → B3. **B4 is DONE**, so **B2 is next** — but B2 is blocked on OD-739 + OD-730.
- **If owner hasn't given those ODs, do B5 next** (no blocker; mostly verify-and-close).
- **B1 (Permissions) is the only CRITICAL batch** (security/PII) — owner may jump the queue to it, but it needs OD-720 first.

---

## WHAT SHIPPED TO `main` THIS SESSION (all pushed)
1. **Deployed** the repo into `/app`; memory dir synced with remote.
2. **CR-527 / BB-09** — diner name on credit rows. IMPLEMENTED + QA_PASS (with caveat: preprod rows have `diner_name=null` → show "—"; chips/6+ dropdown unverified until BB-09 migration deploys to `manage.mygenie.online`). Files: `creditTransform.js`, `CreditCustomerDetailSheet.jsx`, `__tests__/creditTransform.cr527.test.js`.
3. **Re-batch restored** — `impact/OPEN_ITEMS_REBATCH_2026_11_20.md` + `rebatch` tags on 15 registry items.
4. **B4 / BUG-723** — preset chip sync. IMPLEMENTED + **QA_PASS 11/11** (iteration_12). Shared `matchPreset` in `utils/datePresets.js`; `SalesMockup`/`CancellationsMockup`/`DashboardMockup` chip-init + `setSharedFrom/To` propagation; **added missing Dashboard `30D` case** (QA follow-up). Unit test `datePresets.matchPreset.test.js` 6/6. `AuditLogMockup` (B2) left untouched.
5. **BATCH-1 Permissions handover** doc (prior agent's, was missing).

`main` tip at handover: see `git rev-parse main`. `.env` files are gitignored (secrets in the secret store; `GITHUB_PAT` in backend slot).

---

## THE 6 BATCHES (14 open items)  — authoritative: `impact/OPEN_ITEMS_REBATCH_2026_11_20.md`
| Batch | Items | Files | State |
|---|---|---|---|
| ~~B4 · Presets~~ | ~~BUG-723~~ | SalesMockup, DashboardMockup, CancellationsMockup, datePresets.js | **DONE — QA_PASS, on main** |
| **B2 · Audit-UI** | BUG-730, 739, 722(FE) | AuditLogMockup.jsx (+riskTier util) | **BLOCKED** — needs OD-739, OD-730 |
| **B5 · Scan-popout** | CR-558, 679, 702, 738 | ScanOrderPopOut, PopoutItemRow, orderTransform | ready-ish; **679/702 likely already fixed by CR-557 → verify-and-close**; 738 needs OD-738; CR-558 = Option B |
| **B6 · Cart/Credit** | BUG-732, 734 | CartPanel.jsx, CreditCustomerDetailSheet.jsx | needs quick IA. NOTE CreditCustomerDetailSheet also carries CR-526 + CR-527 — additive, watch regions |
| **B1 · Permissions** | BUG-720, 721, +736 | App.js, PermissionRoute, ChannelColumn, TableCard | **CRITICAL**; needs OD-720 + `load_skill("backend-authorization")` |
| **B3 · Audit-backend** | BUG-696, 719, 722(BE) | backend insights-dashboard | backend track, blocked |

### Code-truth notes (re-verified this session)
- **BUG-721**: `ChannelColumn.jsx` passes `canCancelOrder`/`canPrintBill`; `TableCard.jsx` ignores them → still OPEN. Fix = add props (default `true`) + gate the cancel/print buttons. Not blocked by OD-720 (reuses `order_cancel`/`print_icon`).
- **BUG-679/702**: `PopoutItemRow.jsx` + `v.values` parsing from CR-557 already in place → verify-and-close, don't rebuild.
- **BUG-736**: "Update now" banner is in `App.js` (~L133-143) → folded into B1 so App.js has one owner/PR.

---

## OWNER DECISIONS BLOCKING Gate-4 (ask owner)
- **OD-720** — permission key per route (`/settings`, `/menu`, `/employees`, `/inventory-*`, `/pms/*`). `/employees` urgent (leaks staff email/phone + editable password/role).
- **OD-739** — "Total Events" relabel vs true event count.
- **OD-730** — audit drill-down columns.
- **OD-738** — authoritative channel + amount (B5).
- **Backend approach** — 722/719/696 (insights-dashboard latency).

---

## GOTCHAS / ENV NOTES (save yourself time)
- **InsightsCache shared date range is IN-MEMORY** (`contexts/InsightsCacheContext.jsx`, defaults to today), scoped to `/reports-module/*`. It persists only across **in-app SPA navigation** — a full page reload / fresh `page.goto` resets it. Tell testing_agent to navigate via in-app links, else false failures.
- **registry.json** gets fully re-serialized when edited via `json.dump(..., indent=2)` → large but harmless diffs (data intact).
- **Auto-commit**: each agent turn is auto-committed to the current branch. Check `git log`/`git status` before assuming work is lost; `git checkout main` can hide uncommitted work that lives on a side branch.
- **Push to main**: only on owner say-so. Use `GITHUB_PAT` from the backend secret slot (`$GITHUB_PAT` in shell) — never print it. `.env` is gitignored.
- **CR-527 production**: needs the BB-09 migration deployed to `manage.mygenie.online`; historical credit rows stay "—" until backfilled.
- **Separate open P1 (needs intake):** prepaid discrepancy — rest 672, order 1578984 placed ₹127 but credited ₹132.71.

---

## QA / VERIFICATION DEBT (creds available)
- CR-527 chips/6+ dropdown — pending BB-09 migration data.
- Earlier items still awaiting QA from prior sessions: BUG-733, Cluster C (724/725/726/727/737), Cluster B (714…729), 671/685/711/735.

## MUST-READ FILES
- `control/AGENT_PROMPT_ALPHA.md` (roles/gates), `impact/OPEN_ITEMS_REBATCH_2026_11_20.md` (batches), `control/registry.json` (filter `rebatch`), `control/CR_REGISTRY.md`, `control/FILE_OWNERSHIP.md`, `control/OWNER_DECISIONS_2026_11_20.md`, `test_reports/iteration_11.json` + `iteration_12.json` (B4 QA).
