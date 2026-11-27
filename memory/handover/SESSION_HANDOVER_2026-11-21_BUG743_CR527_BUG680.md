# SESSION HANDOVER — 2026-11-21 (BUG-743 shipped; CR-527 + BUG-680 ready for re-intake)

**Author:** E1 (this session) · **Env:** preprod, restaurant 69 (macha) · **Branch pushed:** `main`
**Roles used this session:** INVESTIGATION → INTAKE → PLANNING → IMPLEMENTATION (for BUG-743).

---

## 1. DONE & SHIPPED — BUG-743 (cancellation note missing on reports)
**Status:** GATE_5A_IMPLEMENTED — code complete, compiles clean. **QA PENDING** (see §4).

**Problem:** All three cancellation reports dropped the staff cancellation note. Root cause (confirmed by live probe): the note is delivered by the backend in **`cancel_item_note`** on every `insights-cancellations` row (both `scope=item` and `scope=order`), but the FE read the almost-always-empty `notes` field.

**Backend was NOT the problem** — verified live: `cancel_item_note` populated for both scopes; `notes` empty ~100%; no `cancellation_note` key. Evidence: `evidence/CR527-BUG680-VERIFY-2026-11-21/cancel_insights_live.json`.

**Fix (11 edits, 3 files, additive display/export only — no contract/money/backend change):**
| File | What changed |
|---|---|
| `frontend/src/pages/reports-module/CancellationsMockup.jsx` | transform maps `cancelItemNote: i.cancel_item_note` (L283); Reason/Notes cell renders `cancelItemNote \|\| notes` (L999-1002); export gains Note column (L420) |
| `frontend/src/pages/reports-module/CancelDetailMockup.jsx` | new **Note** column — `<th>` (L158) + `<td>` reading `item.cancel_item_note` (L169); export Note column (L106); empty-row colSpan 7→8 (L175); tfoot filler colSpan 3→4 (L181) |
| `frontend/src/pages/reports-module/OrderNotesMockup.jsx` | `withNotes` maps `noteText: cancel_item_note\|\|notes` and filters on it (L73-75) — fixes NOTES COVERAGE stuck at 25%; export key `noteText` (L85); render `item.noteText` (L132) |

All source `cancel_item_note` with fallback to `notes`, "—"/empty-filtered when absent. Scope was widened twice per owner: 1 page → 2 pages → **all 3** (owner later confirmed Order Note Audit has the same issue).

**Resolves open gap OG-INV5-002** (marked RESOLVED).

**Docs:** `change_requests/BUG-743_CANCEL_DETAIL_NOTE_COLUMN_INTAKE.md`, `impact/BUG-743_IMPACT_ANALYSIS.md`, `plans/BUG-743_IMPLEMENTATION_PLAN.md`. Registry + BUG_TRACKER + FILE_OWNERSHIP updated.

---

## 2. VERIFIED BACKEND (no FE code yet) — investigation only
`investigations/INV-CR527_BUG680_BACKEND_VERIFICATION_2026-11-21.md` — live-probed preprod and confirmed Gyan's backend handover (archived at `handover/CR-527_BUG-680_BACKEND_HANDOVER.md`):
- **CR-527:** `diner_name`/`diner_mobile` persist on place-order and return distinct from the holder on `employee-orders-list` (v1+v2) and `get-single-order-new`. Live reversible write cycle passed (test order placed + cancelled).
- **BUG-680:** apply 15% → `order_amount` 100→85 propagated; remove with mismatched `fixed` type → full revert to 100 (BUG-680.R). Confirmed.

---

## 3. LEFT FOR NEXT AGENT — re-intake BOTH from INTAKE role
Owner instruction: next agent picks up **CR-527** and **BUG-680** fresh from the **INTAKE** role (re-intake), now that backend is shipped & verified. Both are **FE-only** from here. Backend reply attached at `handover/CR-527_BUG-680_BACKEND_HANDOVER.md`.

### CR-527 — Diner vs Credit-Holder
- Backend: **DONE** (BB-09.2a/2b/3; diner is plain text, no CRM link — OD-B-BB09 resolved).
- FE already implemented: credit-row diner display (creditTransform E1 / CreditCustomerDetailSheet E2 / CreditRow cell E3) — GATE_5A.
- **Remaining FE (re-intake):** editable "Diner (who ate)" capture in `CollectPaymentPanel`; stop seeding holder from diner; thread `diner_name`/`diner_mobile` through `orderTransform.collectBillExisting` + `placeOrderWithPayment` and the place/update/bill-payment payloads (A2 keep/clear semantics: omit=keep, `""`=clear); render diner on running order list + detail sheet. Verify per handover Part A checklist (incl. settle-to-credit row).

### BUG-680 — Order discount not reflected on dashboard
- Backend: **DONE** (R fixed; E1 fixed-discount now re-spread pro-rata — behaviour change to validate in FE; E2 merge/transfer target wins).
- **Remaining FE (re-intake):** switch discount-apply call v1→v2 (`order-discount-manage`); render post-discount `order_amount` + discount line on `OrderCard`; FE clear-discount guardrail no longer required (harmless); validate E1 pro-rata re-spread after add-item. **HIGH risk (financial)** → full Planning Gate 2, no planning-skip.

---

## 4. STANDING RULE — testing not yet run
`testing_agent` is MANDATORY (owner standing rule) and was **NOT run** this session for BUG-743 (owner directed to handover + push first). **Next agent must run it** before closing BUG-743: create 1 item-level + 1 order-level cancellation each WITH a note; confirm the note shows on screen AND in export on all 3 pages (Cancellations, Item Cancellation Detail, Order Note Audit), both scopes. Until then BUG-743 is IMPLEMENTED-but-UNVERIFIED.

## 5. Env / creds
`memory/test_credentials.md` — macha `pms@macha.com` / `Qplazm@10` (Owner, rest 69), preprod `https://preprod.mygenie.online`. `.env` files are gitignored (secrets stored via platform secret store, not committed).
