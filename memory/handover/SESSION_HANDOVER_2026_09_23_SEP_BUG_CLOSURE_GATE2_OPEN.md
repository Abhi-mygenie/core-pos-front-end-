# Session Handover — 2026-09-23 · Sprint `sep_bug_closure` · PLANNING Gate 2 (OPEN — owner review pending)

```
Session date:     2026-09-23
Role this session: INVESTIGATION (validation) → INTAKE (Gate 1 closed) → PLANNING (Gate 2 IAs written, NOT closed)
Registry synced:  YES — BUG-451/452/453 + CR-386 at gate=2, status "GATE 2 IA WRITTEN"; 710 items
Scope drift:      NONE — zero src/ or public/ changes all session; docs, registry, evidence only
Status at close:  Gate 2 OPEN for all 4 items. Owner will answer Gate-2 questions Q1–Q6 to the NEXT agent, who continues the IA, then asks for Gate 3.
Next agent role:  PLANNING — Stage: Impact Analysis continuation. Ask Q1–Q6 below FIRST, patch the IAs with the answers, then request "Gate 2 CLOSED → Gate 3 GO".
Workspace:        /app · branch 21implement · HEAD 1be4055 (remote b2db5a01)
Owner language:   English
```

> **Read this file first, then the 4 IA docs, then the 4 intake docs. Do NOT write Implementation Plans until the owner says Gate 2 is closed. Do NOT touch `src/` or `public/`.**

---

## 0. Boot checklist for the next agent (PLANNING role, IA continuation)

1. `/app/memory/control/CONTROL_DASHBOARD.md` — top 2 "Last Updated" lines are this session.
2. Intake docs (Gate 1, all locked decisions live here):
   - `change_requests/BUG-451_PRODUCT_LIST_LIMIT_500_CAP_INTAKE.md`
   - `change_requests/BUG-452_STALE_CART_RESTORED_AFTER_TYPE_TABLE_SWITCH_INTAKE.md`
   - `change_requests/BUG-453_MUTE_DOES_NOT_STOP_RINGER_INTAKE.md`
   - `change_requests/CR-386_PWA_INSTALL_MANIFEST_ICONS_INTAKE.md`
3. Impact Analyses (Gate 2, written, open):
   - `impact/CR-386_IMPACT_ANALYSIS.md`
   - `impact/BUG-453_IMPACT_ANALYSIS.md`
   - `impact/BUG-451_IMPACT_ANALYSIS.md`
   - `impact/BUG-452_IMPACT_ANALYSIS.md`
4. `control/FILE_OWNERSHIP.md` — conflict pre-check already done (see §4); re-verify if HEAD changed (`git log -1`).
5. Evidence: `evidence/BUG-451/`, `evidence/BUG-452/`, `evidence/BUG-453/`, `evidence/CR-386/` (code greps @ HEAD; approved icon PNGs).
6. Source investigation docs (2026-09-18, **contain known errors — do not trust blindly**, see §6): `investigations/INVESTIGATION_2026_09_18_{LIMIT_OFFSET_PRODUCTS,CART_PERSIST_AFTER_ORDER,MUTE_RINGER_NOT_STOPPING,PWA_ICON_MISSING,PWA_APPROACH}.md`
7. Environment check for PLANNING: not required (doc role). For the BUG-451 curl probe you only need network + a credential (see Q3).

---

## 1. QUESTIONS THE OWNER WILL ANSWER TO YOU (ask them verbatim, in one message, before anything else)

| # | Item | Question | Options | Agent recommendation |
|---|---|---|---|---|
| **Q1** | BUG-453 | For a **muted** order, should the toast + notification-list entry still appear (only the sound is muted)? | a) yes, sound-only mute · b) suppress toast too | **a** — matches "mute" wording; b widens scope into `notifications[]` |
| **Q2** | BUG-451 | D1: use one constant `PAGINATION.DEFAULT_LIMIT = 2000` at all 3 call sites (LoadingPage, useRefreshAllData, productService) instead of 3 literals? D2: delete dead `productService.getAllProducts()` (0 callers)? | a) accept both · b) literals only + keep dead fn · c) other | **a** |
| **Q3 (BLOCKER)** | BUG-451 | R11 backend probe `get-products-list?limit=2000` could not run — the credential printed in the old CART investigation doc (§11) is **rejected by preprod** (`auth-001 Unauthorized` on `/login`, `Invalid credentials` on `/common-login`). Which preprod alias account may be used, and how will it be passed? | Aliases in AGENT_PROMPT: `cafe103_no_rooms_postpaid_gst` (RID 644), `welcome_resort_rooms_settlement` (474), `palmhouse_rooms_mixed_discount_roundoff` (541), `pav_prepaid_ready_at` (383), `delivery_assign_no` (478), `goankitchen_owner_rid69` (69) | Any account whose restaurant has **> 500 products** is ideal (proves truncation + fix); otherwise cafe103 proves the endpoint accepts `limit=2000` without error. **Never store or print the password (R20).** |
| **Q4** | BUG-452 | Implementation shape for Option B (always clear on switch): **S1** bump existing `orderEntryResetNonce` in `DashboardPage.handleOrderTypeChange` + `handleTableClick` when OrderEntry already open (remount = exact clean slate; OrderEntry effect untouched) — or **S2** edit the OrderEntry effect (delete old-key write, hand-reset ~6 draft fields)? | a) S1 · b) S2 | **a (S1)** — ~4 lines, no per-field reset list, reuses CR-008 #4 mechanism at `DashboardPage.jsx:1541` |
| **Q5** | BUG-452 | Approve annotating **BUG-334** ("Pre-Place Table Switch Clears Food Cart", CLOSED OWNER-VERIFIED 2026-08-20) as **"REVERSED BY BUG-452 (OD-452-01 Option B)"** in `registry.json`, `BUG_TRACKER.md`, `impact/BATCH-04_IMPACT_ANALYSIS.md`, and rewrite its code comment at `OrderEntry.jsx:504–508`? (Outside the sprint scope lock — owner said "do not touch anything apart from these CR and bug", so explicit yes is required.) | a) yes · b) no, leave BUG-334 untouched (then §F code↔registry audit will flag drift) | **a** |
| **Q6** | BUG-452 | Add a "Discard N items?" confirm dialog before clearing the draft on switch? | a) no — pure clean slate as locked · b) yes | **a** (owner locked "every open is a clean slate, simple, no surprises") |
| Q7 (optional) | CR-386 | Anything to change in the manifest defaults before Gate 3? (`short_name "MyGenie POS"`, `display standalone`, `start_url "/"`, `theme_color #329937`, `background_color #ffffff`) | — | keep |
| Q8 (optional) | BUG-451 | Future "self-healing" re-fetch when `total_size > loaded` (LoadingPage already knows `total`) — register as a separate CR later? | a) later CR · b) fold into BUG-451 · c) drop | **a** — out of BUG-451 scope |

**After answers:** update the four IA docs (fill decisions, mark BLOCKER resolved after the probe), update `registry.json` `owner_decisions`/`status_history`, then ask: *"Gate 2 closed? May I write Gate 3 Implementation Plans (with Verification Matrix + Post-Code Registry Checklist)?"*

---

## 2. LOCKED OWNER DECISIONS (do not re-ask)

| Item | Decision | Locked |
|---|---|---|
| Sprint | New sprint key **`sep_bug_closure`** for all 4 items | 2026-09-23 |
| BUG-453 scope | Fix A (soundManager race guards) **+** Fix B (post-mute FCM-retry suppression) = **one bug**, not BUG + CR | 2026-09-23 |
| BUG-453 OD-453-02 | Jan-2026 anti-rule in `ScanOrderPopOut.jsx:22–27` ("NO per-order mute. NO future-sound suppression.") **override APPROVED** | 2026-09-23 |
| BUG-453 OD-453-03 | **Per-order manual mute toggle**: Mute → current chime stops and every later sound for *that order* stays silent **until the cashier presses the same button again** → then it rings again. **No timer. No auto-clear on confirm.** Other orders unaffected. Sidebar Silent Mode still wins. In-memory (existing `snoozedOrders` semantics; lost on reload = acceptable). | 2026-09-23 |
| BUG-451 OD-451-01 | `limit: 2000` (owner "ok" to agent recommendation) — **subject to backend probe** | 2026-09-23 |
| BUG-451 OD-451-02 | Fix stale `PAGINATION.DEFAULT_LIMIT: 100` in the same change | 2026-09-23 |
| BUG-452 OD-452-01 | **OPTION B — always clear** the draft cart (live `cartItems` **and** `cartsByTable[oldKey]`) on order-type switch **and** on table switch mid-build. Owner chose this **knowing it reverses BUG-334** (walkthrough given). | 2026-09-23 |
| BUG-452 OD-452-03 | Placed items (`placed: true`) on an occupied table are never affected — they belong to the server order; only the unplaced draft is cleared. (Satisfied by construction: the effect makes no API call.) | 2026-09-23 |
| CR-386 OD-386-01 | **Option A icon APPROVED**: agent-converted wordmark on white, 12 % padding → `evidence/CR-386/approved_A_logo192.png`, `approved_A_logo512.png`, `approved_A_maskable_logo512.png`. Copy to `public/` **only at Implementation after Gate 4 GO**. Designer brief for an optional square mascot mark (drop-in later, same filenames): `design_briefs/DESIGN_BRIEF_CR-386_APP_ICON_2026_09_23.md` | 2026-09-23 |
| CR-386 OD-386-02/03/04 | Defaults locked: `short_name "MyGenie POS"` · `display "standalone"` · `start_url "/"` (LoginPage redirects when authenticated — `LoginPage.jsx:32–36`) | 2026-09-23 |
| Process | Owner: "**don't jump gate**" — every gate needs explicit owner words. Owner: "**do not touch anything apart from these CR and bug**" — no edits to BUG-334, INV docs, other registry items without explicit approval (hence Q5). | 2026-09-23 |

---

## 3. PER-ITEM STATE (what the IA already established — code-verified at HEAD `1be4055`)

### CR-386 — PWA install support · P2 · Risk LOW · Code reality NONE
- Today: no `public/manifest.json`, no `logo192.png`/`logo512.png`/`favicon.ico`; `index.html` L6 `theme-color #000000`, L8 external CDN SVG favicon, no manifest/apple-touch-icon links. Chrome "Create shortcut" → letter icon from `document.title` (AppTitleSync sets restaurant name → "C"). `firebase-messaging-sw.js:40–41` references `/logo192.png` → 404 → push icons broken.
- Chrome install criteria (current, verified via web): HTTPS + manifest with name/short_name, icons 192+512, start_url, display. **Service worker no longer required** (Chrome 108 mobile / 112 desktop) — the 09-18 PWA_APPROACH doc's "SW required" claim is stale.
- Plan shape (IA §2): NEW `public/manifest.json` (~20 lines: short_name, name, icons ×3 incl. `purpose: "maskable"`, start_url, display, theme_color, background_color, scope) · NEW 3 PNGs · `index.html`: theme-color → `#329937`, `+<link rel="manifest" href="%PUBLIC_URL%/manifest.json">`, `+<link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png">`.
- NOT touched: any `src/**`, `firebase-messaging-sw.js`, craco, package.json, .env.
- Verification seeds: curl `-I /manifest.json` 200 · DevTools Application→Manifest clean · install icon appears · standalone window · push icon shows logo · `yarn build` 0 · login→loading→dashboard regression.
- Post-deploy owner step: delete old shortcut, re-install via address-bar Install (icons don't auto-refresh).
- Open: nothing (Q7 optional).

### BUG-453 — Mute doesn't stop ringer · P1 · Risk MEDIUM · Code reality NONE
- Root cause A (CODE_ERROR): `src/utils/soundManager.js` `error` handler L74–77 and `play().catch` L79–83 set `this.currentAudio = null` **without** `if (this.currentAudio === audio)` (the `ended` handler L68–72 has the guard). Two FCMs within ~100 ms → audio1's AbortError catch wipes audio2's reference → `stop()` (L89–95) is a no-op → ringer continues.
- Root cause B (PLAN_GAP): `src/contexts/NotificationContext.jsx` L132–135 `soundManager.play(resolvedSound)` on every FCM (foreground L172 + SW-forwarded L175–181), no per-order check. `snoozedOrders` (`DashboardPage.jsx:459`, `toggleSnooze` L1280–1290) is passed only to visual consumers (OrderListSection L146, ScanOrderPopOut L1670/L1807, TableCard L1964, OrderCard L1915). FCM payload carries `data.order_id` (`NotificationContext.jsx:86`, used as dedup key) → per-order mute is feasible.
- Design recommended (IA §2, **B1**): `soundManager` gains `mutedOrders = new Set()` + `muteOrder/unmuteOrder/toggleOrderMute/isOrderMuted/clearMutes`; `DashboardPage.toggleSnooze` calls `soundManager.toggleOrderMute(String(orderId))` (+2 lines incl. import — the only R5 touch, additive); `NotificationContext.processNotification` derives `String(data.order_id || data.orderId || '')` and skips `play()` when muted (placed **after** BUG-034 dedup, **before** the `'silent'` return); logout effect (L194–198) adds `clearMutes()`; `ScanOrderPopOut.jsx` header comments (L22–27, L46–49) rewritten to record the owner override — **no logic change there** (`handleSnoozeClick` L191–207 already calls `stop()` + `onToggleSnooze`). Alternatives B2 (ref bridge) / B3 (lift state into provider) documented and not recommended.
- Interactions kept: Sidebar Silent Mode (`setEnabled`, L101–103) still wins; POS2-007 confirm-tone override untouched; pop-out's local 2-min re-pop hide-set (R-SNOOZE-9) untouched — visual re-pop after 2 min with sound still muted is intended.
- **Gate 3 validation step (mandatory, MEDIUM risk):** capture one real FCM payload on preprod (console log at `NotificationContext.jsx:71` prints it) and confirm `data.order_id` equals the YTC card `order.orderId` (string vs number → normalise with `String()`).
- New test file: `src/utils/__tests__/soundManager.bug453.test.js` (race: first `play()` promise rejects → `currentAudio` still second audio → `stop()` pauses it; mute toggle; string/number key).
- Files WILL change: `soundManager.js`, `NotificationContext.jsx`, `DashboardPage.jsx` (+2), `ScanOrderPopOut.jsx` (comments), new test. WILL NOT: `AppProviders.jsx` (R7), `firebase-messaging-sw.js`, `OrderCard.jsx`, `TableCard.jsx`, socket hooks.
- Open: Q1.

### BUG-451 — Product list `limit: 500` cap · P1 · Risk HIGH (class) / LOW (edit) · Code reality NONE
- Call sites: `src/pages/LoadingPage.jsx:422` (boot, inside `loadProducts` L418–437; note L426 already computes `totalCount = productsResponse.total` → boot counter shows `500 / total_size` when truncated), `src/hooks/useRefreshAllData.js:29` (sidebar refresh), `src/api/services/productService.js:28` (`getAllProducts` — **dead, 0 callers**), default `src/api/constants.js:463–467` `PAGINATION.DEFAULT_LIMIT: 100` (used by `productService.getProducts` L14 and `settingsService.getCancellationReasons` L14 only when caller omits `limit`; every live caller passes one). `insightsService.js:62` uses 10000 (safe). Cancellation reasons (`limit: 100` at LoadingPage L491, settingsService L27, insightsService L64) out of scope.
- Transform: `productTransform.js` `productListResponse` → `{ products, total: api.total_size }`.
- Conflict: `api/constants.js` last touched by CR-385 M1 (E16 `AIOSELL_ENDPOINTS.ROOM_AVAILABILITY`, 2026-09-22) — different block → parallel-safe. `LoadingPage.jsx` last BUG-340 / boot parallelization — literal-only edit, no sequencing change.
- **BLOCKER:** R11 probe not done (Q3). Probe plan: `POST /api/v1/auth/vendoremployee/common-login` `{email,password}` → `token`; then `GET /api/v1/vendoremployee/get-products-list?limit={500,1000,2000,5000}&offset=1&type=all` with `Authorization: Bearer` → record HTTP status, `total_size`, returned count, time → save to `evidence/BUG-451/probe_limit_<N>.json` with token stripped. Base URL `https://preprod.mygenie.online`.
- Open: Q2 (D1/D2), Q3 (credential), Q8 (optional).

### BUG-452 — Stale cart under old key after switch · P2 · Risk HIGH · Code reality NONE (BUG-334 code exists and is being reversed)
- Mechanism: `OrderEntry.jsx` effect L378–512 (`useEffect([table?.id, orderType])`): W1 `onCartChange(oldKey, cartItems)` L383–386 **copies** the draft into `DashboardPage.cartsByTable[oldKey]` (handler L2070); C1 BUG-334 branch L504–508 carries the same items forward in the live cart; R1 L390–391 restores `savedCart` on next mount of that key. Only clears: `DashboardPage.jsx:545` (sidebar refresh, OrderEntry closed) and L1540 (PROD-004 stay-on-order). Triggers: type dropdown `OrderEntry.jsx:2436` → `handleOrderTypeChange` L1504–1511; table list L2494 → `handleTableClick` L1462–1497 (component stays mounted). Normal close L1513–1520 → `setOrderEntryType(null)` → unmount gate L2058 → no write (why the bug is rare). `key={orderEntryResetNonce}` L2061 only bumps at L1544 (stay-on-order).
- **Latent second defect found in IA:** switching *from an occupied table* writes **placed** items into `cartsByTable[tableA]`; reopening A takes R1 (savedCart) over fresh `orderData` → stale snapshot/financials. Option B removes W1 → also fixed.
- Shapes (IA §2): **S1** (rec) — in `handleOrderTypeChange` and `handleTableClick`, when `orderEntryType !== null`, `setOrderEntryResetNonce(n => n + 1)` → remount → `cartKeyRef` null → no W1, all state default, occupied target loads from `orderData`. `OrderEntry.jsx` change = only the BUG-334 comment/dead branch. **S2** — edit the effect: delete W1, in C1 `setCartItems([])` + reset `customer/orderNotes/selectedAddress/deliveryCharge/orderFinancials`.
- Gate 3 checks for S1: in-OrderEntry flows with `initialShowMerge/Shift/Payment` props while switching table (props persist across remount → modal re-opens; verify); `handleTableClick(null)` (post-prepaid, L1463–1466) returns before any bump — unchanged; grid-click entry points with `orderEntryType === null` → no bump.
- Dead plumbing after fix (`cartsByTable`, `savedCart`, `onCartChange`, R1 branch, L545, L1540): **keep** (scope lock); file an OPEN_GAPS entry "remove in cleanup CR".
- Regression checklist (R5 ×2, R13): walk-in place → close → Add → empty; type switch mid-build → empty; table switch mid-build → empty; reopen old key → empty; occupied table open/edit/place; merge + shift flows; prepaid `onSelectTable(null)`; stay-on-order ON → Collect Bill → fresh walk-in (PROD-004); sidebar Refresh with OrderEntry closed.
- Related items: **BUG-334** (CLOSED, reversed by OD-452-01 — Q5), PROD-004 / PROD-HOTFIX-004 (SHIPPED 2026-05-27, L1540), INV-OE-001 (parent of BUG-334; `/app/memory/investigation/INV-OE-001_DEFAULT_WALKIN_TABLE_SWITCH_CART_RESET.md`), BUG-334 IA `impact/BATCH-04_IMPACT_ANALYSIS.md`.
- Open: Q4, Q5, Q6.

---

## 4. CONFLICT PRE-CHECK RESULTS (FILE_OWNERSHIP + registry, 2026-09-23)
- `DashboardPage.jsx`: BUG-452 (L1504–1520 handlers) and BUG-453 (L1280–1290 `toggleSnooze`) both touch it this sprint — **different regions, parallel-safe**; recommended order BUG-453 first (smaller), then BUG-452. CR-385 (PMS, open) does not touch DashboardPage.
- `api/constants.js`: CR-385 open (AIOSELL block) vs BUG-451 (`PAGINATION` block) — parallel-safe.
- `OrderEntry.jsx`: no open item; last BUG-334/BUG-330/CR-348.
- `soundManager.js`, `NotificationContext.jsx`, `ScanOrderPopOut.jsx`, `index.html`, `public/` root: no open item.
- `AppProviders.jsx`: not involved anywhere (R7 safe).

## 5. RISK LABELS (R21)
BUG-451 HIGH · BUG-452 HIGH · BUG-453 MEDIUM · CR-386 LOW. None financial. Fast Lane: none eligible. Planning skip: none (owner wants full gates).

## 6. KNOWN ERRORS IN THE 2026-09-18 INVESTIGATION DOCS (do not propagate; docs deliberately NOT edited — owner scope lock)
- CART doc: says DashboardPage is "not R5" (**wrong** — R5 lists it); says planning-skip eligible (**wrong**); Option A "clear inside `handleOrderTypeChange` before `setOrderEntryType`" **does not work** (effect re-writes after the type change); missed **BUG-334** (repro step "cart appears empty after switch" is untrue at HEAD — items carry forward); "only cleared by stay-on-order" (also L545); §5 vs §11 grid-click contradiction; bare `OrderEntry.jsx` path (actual `src/components/order-entry/OrderEntry.jsx`); **§11 prints a raw password (R20) — mask it when the doc is next edited (needs owner OK); note the credential is rejected by preprod anyway.**
- LIMIT doc: §7 "owner decision needed" vs §8 "no decisions needed"; no curl evidence (R11); no item risk label; no duplicate check; `insightsService.js:64` reasons limit unlisted.
- MUTE doc: valid; no evidence dir; CLOSED with ODs open (now resolved).
- PWA_ICON doc: valid; SW icon refs at L40–41 (doc says 38–39).
- PWA_APPROACH doc: "Chrome requires a service worker" is stale.
- Process gaps: INV IDs were never registered (fixed by this intake); no session handover existed for 09-18; no evidence dirs (created now under the BUG/CR IDs). **OPEN_GAPS_REGISTER entries for these stale docs are NOT yet filed** (scope lock) — propose to owner.

## 7. ARTIFACTS CREATED / MODIFIED THIS SESSION
- Intake docs ×4 (`change_requests/…_INTAKE.md`) — Gate 1 CLOSED sections + locked ODs.
- IAs ×4 (`impact/…_IMPACT_ANALYSIS.md`).
- `control/registry.json` — 4 items appended (gate 2, `status`, `owner_decisions`, `status_history`, `impact_analysis`, `intake_doc`, `evidence_dir`, `investigation_doc`, `related_items`); `meta.total 710`.
- `control/BUG_TRACKER.md` (section "2026-09-23 — BUG-451, BUG-452, BUG-453" + Last Updated line), `control/CR_REGISTRY.md` (section "2026-09-23 — PWA INSTALL SUPPORT" + Last Updated), `control/CONTROL_DASHBOARD.md` (2 Last Updated lines + Active Sprints row `sep_bug_closure`).
- `design_briefs/DESIGN_BRIEF_CR-386_APP_ICON_2026_09_23.md`.
- `evidence/CR-386/` — `logo111.svg` (source), `approved_A_logo192.png`, `approved_A_logo512.png`, `approved_A_maskable_logo512.png`, rejected previews (`preview_*`).
- `evidence/BUG-451|452|453/*_code_grep_2026_09_23.txt`.
- `PRD.md` appended (3 lines). Dashboard JSON sync **not run** — `frontend/public/__dev/data/` does not exist in this checkout.
- Previous handover of this session (superseded by this file): `handover/SESSION_HANDOVER_2026_09_23_INTAKE_SEP_BUG_CLOSURE.md`.

## 8. WHAT THE NEXT AGENT MUST NOT DO
- Do not close Gate 2 or write Gate 3 plans before the owner answers Q1–Q6 and says Gate 2 is closed.
- Do not edit `src/`, `public/`, BUG-334, the INV docs, or any registry item outside the 4 IDs without explicit owner words.
- Do not store/print the credential the owner gives for the probe (R20); save probe JSON with the token stripped.
- Do not re-open locked decisions in §2 (Option B, per-order manual mute, limit 2000, Option A icon, sprint key).
- Do not use `api.post` reasoning for any update call (R25 — not relevant to these items, but keep the grep-guard habit).

## 9. Suggested Gate 3 order (after Gate 2 close)
CR-386 (LOW, no src) → BUG-453 (MEDIUM, 3 files + test) → BUG-451 (probe then 4 literals) → BUG-452 (HIGH, R5 ×2, needs BUG-334 bookkeeping). Each plan needs: exact edits (file:line current→new), Verification Matrix, Post-Code Registry Checklist, R5 regression checklist where applicable, `// BUG-45x` / `// CR-386` code markers (R18).

## 10. Self-assessment
| Dimension | Score | Notes |
|---|---|---|
| Registry synced? | 5 | All 4 items reflect Gate 2 IA state |
| Scope drift? | 5 | No code; no out-of-scope doc edits |
| Role correctly identified? | 5 | Investigation → Intake → Planning (IA only), owner-driven |
| Required docs read? | 5 | Dashboard, registries, FILE_OWNERSHIP, OPEN_GAPS, intake workflow, source |
| Outputs complete? | 4 | IAs written; Gate 2 intentionally left open; probe pending credential |
| Handover written? | 5 | This file |
| Stale docs flagged? | 4 | In IAs/intakes/this file; OPEN_GAPS entries pending owner OK |
