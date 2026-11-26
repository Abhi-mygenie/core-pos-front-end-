# SESSION HANDOVER — for the agent starting BATCH-1 (Permissions / "Cluster A") — 2026-11-20

**Repo:** `Abhi-mygenie/core-pos-front-end-` (frontend-only; external preprod API). Local `main` is pushed to GitHub (tip `314e9f0`).
**Preprod login (QA):** `owner@cafe103.com` / `Qplazm@10` → `/app/memory/test_credentials.md`.
**Golden rule here:** **code is source of truth** — the registry has been stale before; always grep/view the file before trusting a gate.

---

## 1. What's been done this session (context)
- **Deployed** the repo into `/app`, memory dir synced with remote.
- **BUG-733** (date-picker swap, Credit + Order Beta) — IMPLEMENTED (GATE_5A), unit tests pass, webpack clean.
- **Cluster C** BUG-724/725/726/727/737 — IMPLEMENTED (GATE_5A); **BUG-728 PARKED** by owner (OD-728-01 deferred). QA handover: `handover/QA_HANDOVER_CLUSTER_C_2026-11-20.md`.
- **Cluster B** (714/715/716/717/718/729) — found already implemented in code; **reconciled stale registry** GATE_4→GATE_5A.
- **PLANNING deep-dive + RE-BATCH of all open items** → `impact/OPEN_ITEMS_REBATCH_2026_11_20.md` (registry items tagged with a `rebatch` field). 6 batches B1–B6.
- All pushed to `main`. Nothing from Batch-1 has been coded yet.
- **Awaiting QA** (verification debt, creds available): BUG-733, Cluster C (724/725/726/727/737), Cluster B (714…729), plus earlier 671/685/711/735.

---

## 2. BATCH-1 = Permissions & Access — YOUR TASK
**Items:** BUG-720 (P0, CRITICAL), BUG-721 (P0), **+ BUG-736** (pulled in because it shares `App.js`).
**Risk:** CRITICAL (security + PII). **Gate:** all at GATE_1 intake → you run Gate-2 IA → Gate-3 plan → (owner Gate-4 GO) → implement.

### FIRST, before writing any code
1. **`load_skill("backend-authorization")`** — read it; this batch is pure who-can-see/do-what gating.
2. **Get OD-720 from owner** (BLOCKING): the permission key that guards each route group. Candidates visible in code via `hasPermission('<key>')`. Known keys in use: `print_icon`, `order_cancel` (dashboard), report keys `report`/`show_daily_report` (from CR-490 on the reports routes). You need the owner to map keys for: `/settings`, `/menu`, `/employees`, `/inventory-*`, `/pms/*`. `/employees` is the urgent one (exposes staff email/phone + editable password/role/status).

### BUG-720 — route bypass (code-verified OPEN)
- **File:** `src/App.js`. Sensitive routes still use login-only `ProtectedRoute` instead of `PermissionRoute`:
  - L253 `/menu`, L256 `/settings`, L261 `/employees`, L264-271 `/inventory*`, L277-283 `/pms/*`.
- **Reference pattern:** the reports routes already use `<PermissionRoute permission="...">` (CR-490) — copy that. Guard component at `src/components/guards/PermissionRoute.jsx` (read it first; confirm its prop name — `permission` vs `anyOf` — and its redirect behaviour).
- **Fix:** wrap each sensitive route in `PermissionRoute` with the OD-720 key. Keep the `<Navigate>` redirect aliases (L264/273/274) as-is.

### BUG-721 — ungated dashboard buttons (code-verified OPEN; partially wired)
- `components/dashboard/ChannelColumn.jsx` **already passes** `canCancelOrder={hasPermission?.('order_cancel')}` and `canPrintBill={hasPermission?.('print_icon')}` to `<TableCard>` (L355/361/387/393).
- **Root cause:** `components/cards/TableCard.jsx` **does not destructure or use** those props (see prop list L55); its Cancel (L465-473) and Print (L552/582/683 `print-btn-*`) buttons render unconditionally.
- **Fix:** add `canPrintBill = true, canCancelOrder = true` to TableCard's props and gate the render of the cancel/print `IconButton`s on them (default `true` preserves existing callers). The order-card variant is already gated — mirror its keys. No new permission keys needed (reuse `order_cancel`/`print_icon`), so **not blocked by OD-720**.

### BUG-736 — "Update now" toast overlaps rows (shares App.js)
- "New version available / Update now" toast is rendered in `src/App.js`, pinned bottom-center, covering bottom table rows on every page.
- **Fix:** reposition (e.g. bottom-right, above content) / add safe-area padding so it never overlaps the table. Low risk. **Do it in the same session as BUG-720** so `App.js` has a single owner/PR.

### Session/PR discipline
- `App.js` is the shared hotspot for this batch (720 + 736). One session, one PR. TableCard/ChannelColumn (721) are separate files, safe to include in the same PR.
- After coding: run the EXIT GATE — update `registry.json` (720/721/736 → GATE_5A), `BUG_TRACKER.md`, `FILE_OWNERSHIP.md`, add `// BUG-720/721/736` markers, webpack clean. Then QA with the preprod creds (deep-link `/employees` as a low-rights role must redirect).

---

## 3. Everything you need to read
- Re-batch + per-item code reality: **`impact/OPEN_ITEMS_REBATCH_2026_11_20.md`** (authoritative).
- Original cluster definitions: `handover/SESSION_HANDOVER_2026_11_19_QA_NOV_SPRINT_IA_BRIEF.md`.
- Owner decisions log: `control/OWNER_DECISIONS_2026_11_20.md`.
- Registry: `control/registry.json` (filter `rebatch == "B1-PERMISSIONS*"`).

## 4. The other open batches (not yours, for awareness)
B2 Audit-UI (730/739/722-FE, 1 file) · B3 Audit-backend latency (696/719/722, blocked) · B4 Presets (723, ready, no blocker) · B5 Scan-popout (558/679/702/738; 679/702 likely already fixed by shipped CR-557 — verify-and-close) · B6 Cart/Credit (732/734). Recommended global order was B4→B2→B5→B6→**B1**→B3, but owner asked to do Permissions (B1) — proceed with it.

## 5. Guardrails
- No code edits outside the files named above for this batch.
- Don't re-implement `getRiskTier` / `PopoutItemRow` etc. (other batches).
- Push to `main` only on owner say-so; GitHub PAT is in the secret store (`GITHUB_PAT`, backend) — never print it.
