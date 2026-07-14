# CR-005/CR-008 Buckets A3 + A4 + B3 + B4 — Parked Handover

**Status:** All four buckets parked pending backend data availability.
**Author:** Implementation Agent · 2026-05-02 (updated 2026-05-02 to add B3, then B4).
**Source planning handover:** `/app/memory/change_requests/implementation_handover/CR_005_to_009_IMPLEMENTATION_HANDOVER.md` §10.A3, §10.A4, §10.B3, §10.B4, §12.
**Session context:** Parked mid-session after completing Bucket A2 (CR-007). Owner instruction pattern: *"backend needs to provide data — park it"* applied to A3, A4, B3, and B4.

---

## 1. Buckets parked

| Bucket | Title | CR | Blocked on |
|---|---|---|---|
| **A3** | Action Time + Time Diff columns in Audit Report | CR-008 Sub-CR #2 | **BE-T** — dedicated terminal-action timestamps |
| **A4** | Web order attribution — PUNCHED BY = `Customer`, ACTIONED BY = `Auto` | CR-005 Phase A | **BE-U** — verify `is_auto_confirmed` + `order_from` fields are actually populated on preprod |
| **B3** | Drop `Employee #<id>` synthesis on item-level `cancelByName` | CR-005 #5 partial | **BE-V** — item-level `cancel_by_name` **NOT yet shipped** per owner (2026-05-02) |
| **B4** | Item-level "Order Taken" stage + optional order-level timeline refinement | CR-005 #4 partial | **BE-W** — `order_serve_at` / `kot_at` / per-item paid-stage fields (BE-3 / BE-4 / BE-9) — confirmed not live per owner (2026-05-02) |
| **B2 Phase 2** (PG Status column) | Auto-revealing `snapshot_razorpay_status` column in Audit Report | CR-005 #1 Phase 2 | **BE-W2** — backend ship `snapshot_razorpay_status` on PG rows. Frontend col already wired with auto-reveal guard; appears automatically when any row carries a non-null value (zero frontend code change required at unblock). |

---

## 2. Bucket A3 — full parking snapshot

### 2.1 Scope (what A3 would have shipped)
Two new columns inserted after `ACTIONED BY`, before `PAYMENT`, in the Audit Report:

| Column | Content |
|---|---|
| **ACTION TIME** | Timestamp of the terminal action per status (cancelled → cancel time; merged → merge time; paid → collect-bill time; transferred → transfer time; else `—`) |
| **TIME DIFF** | Integer minutes between `createdAt` and `actionTime`. `—` for running rows. |

Both in:
- `api/services/reportService.js` (derive fields per row ~L897-933)
- `components/reports/OrderTable.jsx` (col defs L113-135; cell renderer L440-520)
- `components/reports/ExportButtons.jsx` (CSV)

### 2.2 Pre-locked defaults (Q-T1..T3) — accepted
| Q | Decision |
|---|---|
| Q-T1 format | `23m` minute integer |
| Q-T2 running rows | `—` |
| Q-T3 column position | after ACTIONED BY, before PAYMENT |

### 2.3 Reason for parking

Investigation during the session surfaced that **dedicated backend timestamps do NOT exist** for all terminal actions. Only `api.collect_bill` (paid) and `api.cancelled_at` (cancelled) exist on the audit row. `merged_at` / `transferred_at` / `credited_at` have **no dedicated fields anywhere in the codebase** (grep-confirmed).

| Status | Timestamp source | Accuracy |
|---|---|---|
| paid | `api.collect_bill` | ✅ Dedicated, accurate |
| cancelled | `api.cancelled_at` (currently dropped on audit row, easy add) | ✅ Dedicated, accurate |
| merged | Fallback to `api.updated_at` | ⚠️ Inaccurate if row edited after merge |
| transferred / roomTransfer | Fallback to `api.updated_at` | ⚠️ Same caveat |
| credit | Fallback to `api.updated_at` | ⚠️ Same caveat |

Owner's evaluation: the `updated_at` fallback is not acceptable — it lies when a merge is followed by an unrelated edit. Waiting for dedicated backend fields is the right call over shipping a half-accurate column.

### 2.4 BE-T — backend ask
| Field | Detail |
|---|---|
| Tag | **BE-T (CR-008 #2 — Action time data plumbing)** |
| Options for backend | (a) Add dedicated `merged_at`, `transferred_at`, `credited_at` fields to the audit API response, OR (b) Add a single `action_at` field computed server-side per row's terminal status. Either works; (b) is cleaner frontend-side. |
| Coupling | Any new field must appear on the endpoint that feeds the Audit Report specifically (the orchestrator calls multiple endpoints — field must be present regardless of which terminal state is being listed). |
| Not blocked | Paid + cancelled are already accurate; could partial-ship as Option 2 (drop merged/transferred cells to `—`), but owner rejected partial-ship. |
| Owner | Backend team |
| Unblocks | A3 — 5-minute frontend implementation once fields land. |

### 2.5 Test protocol once unblocked
- Happy path per status: cancelled → cancel-time; merged → merge-time; paid → collect-bill-time; transferred → transfer-time.
- Running rows → `—` both cells.
- Sort by ACTION TIME works.
- CSV export includes both new columns.
- Width regression check on ≤1280px viewports (peak 11 visible cols; 14 with PG cols from Bucket B2).
- No change to existing `ACTIONED BY` column position.

### 2.6 Sequencing caveat
`OrderTable.jsx` is touched by **A0a → A3 → B2**. A0a has already shipped; when A3 unblocks, verify line numbers still match §10.A3 plan (L113-135 col defs, L440-520 cell renderer). If B2 is shipped ahead of A3 (valid, not currently planned), the anchors will have shifted and A3 diff must target the latest tip.

---

## 3. Bucket A4 — full parking snapshot

### 3.1 Scope (what A4 would have shipped)
Two narrow rule changes for `platform === 'web'` rows only in the Audit Report:

| Column | Today | After A4 |
|---|---|---|
| **PUNCHED BY** | `api.waiter_name` (often blank) | Literal `'Customer'` |
| **ACTIONED BY** | blank — doesn't read auto-confirm flag | `'Auto'` when `api.is_auto_confirmed === 1`. Else `—`. Else (Phase B, deferred to Bucket C1 with BE-2) POS confirmer name. |

All in `api/services/reportService.js` (punchedBy ~L824, actionedBy ~L843-880).

### 3.2 Pre-locked default (Q5-A)
Phase A only ships now. Phase B (POS confirmer name) deferred to Bucket C1 + BE-2.

### 3.3 Reason for parking

Owner instruction: the two backend fields A4 depends on — `api.is_auto_confirmed` and `api.order_from === 'web'` — have not been **live-verified** on the preprod API response for scan/web orders. The handover marks BE-1 as shipped (per CR-005 Q-B4 lock) but there's no reproducible trace.

Owner's concern: shipping A4 without a live trace risks rendering `'Customer'` / `'Auto'` literals based on fields that may be empty/missing/mis-cased on actual web orders → worse than the current blank behaviour.

### 3.4 BE-U — backend ask
| Field | Detail |
|---|---|
| Tag | **BE-U (CR-005 Phase A — Web order attribution data)** |
| Need 1 | Preprod confirmation that `api.is_auto_confirmed` is non-null (0 or 1) on **all** web rows. |
| Need 2 | Preprod confirmation that `api.order_from === 'web'` (exact string) is set on web orders. |
| Need 3 (Phase B) | **BE-2 — POS confirmer name field** for non-auto-confirmed web orders. Field name TBD by backend. |
| Owner | Backend team + Owner to run preprod trace |
| Unblocks | A4 Phase A — 5-minute frontend implementation once fields are verified. |

### 3.5 Validation protocol once unblocked
1. Preprod: place a scan order, let it auto-confirm, note response shape.
2. DevTools → Network → find audit row payload → confirm `is_auto_confirmed: 1` and `order_from: 'web'`.
3. Preprod: place a scan order, manually confirm at POS, confirm `is_auto_confirmed: 0` and (Phase B) whatever field name holds the POS-confirmer name.
4. Report findings. If fields present → unpark A4 Phase A; Phase B waits for BE-2.

### 3.6 Test protocol once implemented
- Web auto-confirmed → PUNCHED BY `Customer`, ACTIONED BY `Auto`.
- Web non-auto-confirmed → PUNCHED BY `Customer`, ACTIONED BY `—` (until BE-2 ships).
- Non-web (POS) rows → unchanged.
- CSV export → literals appear correctly.
- All audit tabs (Paid, Cancelled, Merged, Credit) → no regression.

### 3.7 No sequencing concern
A4 edits are at `reportService.js:L824, L843-880`. A3 would have edited `reportService.js:L897-933`. Non-overlapping. Either can ship first once unblocked.

---

## 4. Combined open questions register (awaiting backend + owner)

| ID | Question | Who answers |
|---|---|---|
| BE-T scope | (a) Dedicated per-status timestamps OR (b) single computed `action_at` field? | Backend |
| BE-T endpoint coverage | Does the new field need to land on every audit-report endpoint (paid, cancelled, merged, credit, room-transfer)? | Backend |
| BE-U verification | Live trace of `is_auto_confirmed` + `order_from` on preprod | Owner + Backend |
| BE-U Phase B | Field name for POS-confirmer name (BE-2) | Backend |
| BE-V scope | Ship `cancel_by_name` on item level in `/get-single-order-new` response. Main handover §10.B3 said "already shipped per QA handover" but owner confirmed 2026-05-02 that **it is NOT present on actual response**. Needs preprod verification + backend work. | Backend |
| BE-V coverage | Does `cancel_by_name` need to land on other endpoints that surface item-level data? (e.g. audit detail, order detail) | Backend |
| Regression risk | After A3 adds 2 cols + B2 (Bucket B2, separate) adds 3 cols, is the 14-col Audit table width acceptable on ≤1280px viewports? | Owner via visual check |

---

## 4a. Bucket B3 — parking snapshot (added 2026-05-02)

### Scope (what B3 would have shipped)
One-line transform fix at `reportTransform.js:625-627`:
```js
// BEFORE:
cancelByName: item.cancel_by 
  ? (item.cancel_by === employee.id ? (employee.f_name || `Employee #${item.cancel_by}`) : `Employee #${item.cancel_by}`)
  : null,

// AFTER (intended):
cancelByName: item.cancel_by_name || null,
```

### Reason for parking
Owner verified 2026-05-02 that backend has **NOT** shipped `cancel_by_name` at item level in the `/get-single-order-new` response, despite the handover §10.B3 + §6.1 claims. Shipping the fix now would result in every cancelled item showing "Cancelled By: **—**" since `item.cancel_by_name` would always be falsy.

Shipping the fix without backend readiness would be a **strict regression** — today's `Employee #<id>` synthesis is admittedly ugly but at least displays something; the new behaviour would show nothing until backend ships, which is worse UX than the status quo.

### BE-V — backend ask
| Field | Detail |
|---|---|
| Tag | **BE-V (CR-005 #5 — item-level cancel_by_name)** |
| Need | `cancel_by_name` field on each item object in `/get-single-order-new` response. When a cancellation actor exists, populate with actor's display name. When absent (e.g. auto-cancelled by system), leave null. |
| Pairing | Consider shipping alongside **BE-5/6/7** (handover §9 line 185) which were already flagged as pending: `cancel_by_name`, `ready_by_name`, `served_by_name` at item + order level. B3 is specifically about the item-level `cancel_by_name` subset. |
| Owner | Backend team + Owner to re-verify once shipped |
| Unblocks | B3 — 1-line frontend diff + comment. |

### Validation protocol once unblocked
1. Backend reports BE-V shipped.
2. Preprod: cancel an item on a placed order → refresh audit detail side panel.
3. DevTools → Network → `/get-single-order-new` → confirm response contains item-level `cancel_by_name: "<actor display name>"`.
4. If confirmed → unpark B3, apply the 1-line diff from §10.B3 of main handover.

### Test protocol once implemented
- Cancelled item with backend `cancel_by_name = "p"` → side panel shows "Cancelled By: **p**" (not `Employee #3631`)
- Cancelled item missing `cancel_by_name` → shows "Cancelled By: **—**"
- Refetch / reload / re-entry → consistent
- Regression — no other transform or consumer affected

### Dependency
None. Independent of A3, A4, CR-011, B1, B2, B4, D1.

---

## 4b. Bucket B4 — parking snapshot (added 2026-05-02)

### Scope (what B4 would have shipped)
Core change (2 edits in `OrderDetailSheet.jsx`):
- Add `ClipboardList` to lucide-react imports (L5-9).
- Rebrand "Created" event to "Order Taken" in `ItemTimeline` (L251-257): change icon `Circle → ClipboardList`, color `text-zinc-400 → text-zinc-500`, key `'created' → 'order_taken'`. Continue to consume `item.createdAt` as the timestamp source until BE-4 ships `kot_at`.

Optional enhancement (1 edit in `reportTransform.js:565`):
- Order-level `Timeline`: `served: items[0]?.order_serve_at || lastServeAt` — prefer item-level `order_serve_at` when present, with graceful fallback to derived `lastServeAt`.

### Reason for parking
Owner verified 2026-05-02 that `order_serve_at` is **NOT** present on the item objects in the current backend response at order level. The optional enhancement would be a no-op and the main handover's promise ("already in payload") is inaccurate. Owner preference is to wait for backend to ship **all** B4-related timeline fields together so the stage enrichment goes out as a single coherent UX change instead of trickling in piecewise.

The core rename (Circle → ClipboardList, "Order Taken" semantics) **could** ship standalone since it doesn't depend on new backend data, but owner chose to park the full bucket together pending BE readiness.

### BE-W — backend ask
| Field | Detail |
|---|---|
| Tag | **BE-W (CR-005 #4 — item-level timeline data)** |
| Sub-asks | **BE-3** per-item paid stage timestamp; **BE-4** dedicated item-level `kot_at` (Order Taken moment, distinct from item's `created_at`); **BE-9** order-level timeline keys (`order_serve_at`, `order_ready_at`, etc.). |
| Need 1 (BE-3) | Add a per-item `paid_at` (or `item_paid_at`) field so the item-level timeline can render a Paid stage. |
| Need 2 (BE-4) | Add a dedicated `kot_at` per item so Order Taken uses the true KOT-sent moment rather than record-creation time (more accurate for late-added items). |
| Need 3 (BE-9) | Add order-level `order_ready_at`, `order_served_at`, `order_paid_at` fields so the order-level `Timeline` component can render without deriving from item aggregates. |
| Owner | Backend team + Owner to verify once shipped |
| Unblocks | B4 core (Order Taken rename — could be shipped independently of BE-W if owner wants partial ship) and B4 optional (transform enhancement — needs at minimum `order_serve_at` on items[0]). |

### Validation protocol once unblocked
1. Backend reports BE-W shipped (which sub-asks landed).
2. Preprod: open a placed + served order → audit detail side panel → inspect item timeline.
3. DevTools → Network → `/get-single-order-new` → confirm item object shape:
   - `kot_at` present → rebase Order Taken timestamp source (edit B4 core to use `item.kot_at || item.createdAt`).
   - `paid_at` present → add Paid stage (new 5th event in `ItemTimeline`).
   - `order_serve_at` present on items[0] → apply B4 optional enhancement.
4. Ship the subset of B4 that matches what backend shipped.

### Test protocol once implemented
- Happy path: item card timeline shows 4 (or 5 with BE-3) stages with correct icons + timestamps + durations.
- First stage icon = clipboard-list (was circle).
- Cancelled-only item → terminates at Cancelled stage (no regression).
- Refetch / reload / re-entry → consistent.
- Order-level `Timeline` component (separate from `ItemTimeline`) still renders correctly; if optional enhancement shipped, uses `order_serve_at` when present.
- CSV export unchanged (timeline is UI-only).

### Dependency
None on other parked buckets. Item-level `cancel_by_name` (B3 / BE-V) could ship independently of B4 but can bundle as a shared backlog sprint for the reports side panel if convenient.

### Partial-ship option
If backend ships any of BE-3 / BE-4 / BE-9 individually, B4 can be split:
- **B4-core-only**: Just the Circle → ClipboardList rebrand. Zero backend dep. 5-min ship. Owner parked this deliberately; can unpark any time.
- **B4-BE4-only**: Add `item.kot_at` as Order Taken source (fallback to `createdAt`).
- **B4-BE3-only**: Add per-item Paid stage to timeline.
- **B4-BE9-only**: Apply order-level transform optional enhancement.

---

## 5. Dependencies on other parked / blocked items

| Parked item | Dependency on A3/A4? |
|---|---|
| CR-011 (PG-paid scan serve) | None — independent (frontend transform boundary fix) |
| C6 (CR-008 #1 — delivery fee BE-A) | None |
| C7 (CR-008 #3 — dispatch BE-B..E, HARD-BLOCKING) | None |
| C8 (CR-008 #4 — `default_landing_screen` BE-F) | None |
| D1 (CR-008 #4 Phase A localStorage stub) | None — can still run if owner explicitly approves |

---

## 6. Unblocking checklist (for the agent/backend team who picks this up later)

### For A3
- [ ] Backend to ship BE-T (dedicated per-status timestamps OR single `action_at`).
- [ ] Owner to accept the field shape.
- [ ] Sanity-check that the new field is on the same endpoints that currently feed Audit Report (run the frontend orchestrator in `reportService.js` and confirm all paths surface the field).
- [ ] Apply the frontend diff per §10.A3 of the main planning handover (anchors may have shifted — re-verify L113-135 and L440-520 against the live tip of `OrderTable.jsx`).
- [ ] Lint, manual UI validation (all 4 tabs + CSV export), sign-off handover.

### For A4
- [ ] Owner to run §3.5 preprod trace. Confirm BE-U satisfied.
- [ ] Apply the frontend diff per §10.A4 of the main planning handover.
- [ ] Phase A only — Phase B awaits BE-2.
- [ ] Lint, manual UI validation, sign-off handover.

---

## 7. Sign-off status

| Item | Status |
|---|---|
| Owner awareness | ✅ Owner explicitly parked both buckets 2026-05-02 |
| Backend team notified | ⏳ Pending — this doc is the canonical notification; separate email/ticket to backend-team recommended |
| Main planning handover updated | ⏳ Not yet — `CR_005_to_009_IMPLEMENTATION_HANDOVER.md` §6.1 recommended sequence remains A3/A4 in order; owner may want that §6.1 flagged with PARKED badges next pass |
| CR-011 separately filed | ✅ `/app/memory/change_requests/CR_011_PG_SCAN_SERVE_PAYMENTTYPE_CASE_MISMATCH.md` |

---

## 8. Session continuation state (for the next agent)

After parking A3 + A4 + B3 + B4, the active sprint moved to:
- **B2** (CR-005 #1 PG columns conditional) — next logical candidate, degrades gracefully to `—` without BE-10. Awaiting owner confirmation.
- **B1** (CR-006 Phase B multi-select) — requires Q-V4 preprod payload verification before coding; frontend-only work otherwise.
- **D1** — hotspot, gated on explicit go-ahead.
- **CR-011** (PG-scan-serve) parked for owner validation; 1-line fix ready when cleared.

Pattern observed: owner prefers to park every bucket that has a soft or hard backend dependency and ship them as a batch once backend is ready, rather than partial-ship and revisit. Respect this preference for the remaining buckets.

---

*End of parked handover. Unpark when BE-T + BE-U data lands and owner greenlights implementation.*
