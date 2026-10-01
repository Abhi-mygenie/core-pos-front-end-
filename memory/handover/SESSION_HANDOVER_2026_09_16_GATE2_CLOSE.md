# Session Handover — 2026-09-16 (Gate 2 Close — All Batches)

```
Written:         2026-09-16
Session status:  CLOSED — Gate 2 Impact Analysis complete for all 3 batches (6 bugs).
                 All ODs deferred — owner will answer when reopening Gate 3.
Next agent role: PLANNING (Gate 3 — Implementation Plans) after owner locks all ODs.
Workspace:       /app (branch 16sep, frontend-only)
Credentials:     /app/memory/test_credentials.md (goankitchen_owner alias)
Registry:        680 items (BUG-417..423 registered; BUG-418/419/420/421/422/423 at GATE_2_COMPLETE)
```

---

## §0 — Boot Sequence (MANDATORY)
```
1. Read this handover IN FULL
2. Read /app/memory/control/AGENT_PROMPT_ALPHA.md → confirm PLANNING role (Gate 3)
3. Read /app/memory/control/CONTROL_DASHBOARD.md
4. Read all 3 IA docs (§2 below) — do NOT re-derive; use existing analysis
5. Present owner decisions (§3) to owner → get all ODs locked → then write Gate 3 plans
```

---

## §1 — What Was Done This Session

- **Investigation (Role 6):** 7 issues code-traced. Report: `investigations/INV_ISSUES_A_B_C_D_E_F_G_2026_09_16.md`
- **Intake (Role 1):** BUG-417..423 registered and batched
- **Planning Gate 2 (Role 2):** Impact Analysis written for all 3 batches

---

## §2 — Impact Analysis Docs (read before Gate 3)

| Batch | Bugs | IA Doc | Status |
|---|---|---|---|
| BATCH-PMS2-1 | BUG-422, BUG-423, BUG-418 | `impact/BATCH_PMS2_1_BUG422_423_418_IMPACT_ANALYSIS.md` | GATE_2_COMPLETE |
| BATCH-PMS2-2 | BUG-420, BUG-419 | `impact/BATCH_PMS2_2_BUG420_419_IMPACT_ANALYSIS.md` | GATE_2_COMPLETE |
| BATCH-PMS2-3 | BUG-421 | `impact/BATCH_PMS2_3_BUG421_IMPACT_ANALYSIS.md` | GATE_2_COMPLETE |
| PARKED | BUG-417 | `change_requests/BUG-417_*_INTAKE.md` | Parked — needs OD-417-01/02 |

---

## §3 — ALL Open Owner Decisions (present these when Gate 3 opens)

### BATCH-PMS2-1 (GST Cluster — CRITICAL)

| OD | Plain English | Likely Answer |
|---|---|---|
| **OD-422-01** | Old check-in popup should store balance = room + GST − advance (same as new page)? | YES |
| **OD-423-01** | Folio page computes balance fresh as room + GST − advance − received (ignores stored value)? | YES |
| **OD-423-02** | Total Balance Due = Room Balance + F&B Posted — no change needed? | CONFIRM |
| **OD-418-01** | Checkout Grand Total shows GST bundled in balance as one figure (not separate GST line)? | YES |
| **OD-418-02** | Checkout button amount includes GST (e.g. ₹920 not ₹870)? | YES |

### BATCH-PMS2-2 (Check-in UX)

| OD | Plain English | Likely Answer |
|---|---|---|
| **OD-420-01** | Is the "Documents on File" green section NOT showing at all, or shows but no images? | Owner to confirm |
| **OD-420-02** | Showing doc type + date + "View" link (opens in new tab) enough — or need inline image? | Owner to confirm |
| **OD-420-03** | Old modal should auto-lookup CRM on 10-digit phone (same as new page)? | YES |
| **OD-419-01** | Corp/B2B moves to right below Name/Phone, before Room Assignment — confirmed? | YES |

**Probe required before BUG-420 Gate 3:**
- **Q-420-01:** Live probe `GET /pos/customers/{id}/documents` with a returning guest's CRM ID → check `doc.file_url` field value. Save to `evidence/BUG-420/crm_doc_probe.json`

### BATCH-PMS2-3 (Data Layer)

| OD | Plain English | Likely Answer |
|---|---|---|
| **OD-421-01** | In-house Balance = room + GST − advance (same formula as folio, includes GST)? | YES |
| **OD-421-02** | Page makes one API call per in-house guest on load (parallel, ~1 sec) — acceptable? | Owner to confirm |

---

## §4 — Key Findings from Gate 2 (quick ref for Gate 3 agent)

| Bug | File | Change | Lines |
|---|---|---|---|
| BUG-422 | `RoomCheckInModal.jsx` | `balancePayment` useMemo: add GST in formula | L363-367 |
| BUG-423 | `GuestFolioPage.jsx` | `roomBalance` recomputed FE-side | L100 (1 line) |
| BUG-418 | `PmsCheckoutDrawer.jsx` | `correctedRoomBalance` passed to CollectPaymentPanel | L158-172, L260-283 |
| BUG-420 | `RoomCheckInModal.jsx` | RC-A: auto-lookup; RC-B: fallback display on file_url fail | L518-527, L1033-1037 |
| BUG-419 | `CheckInPage.jsx` | Corp/B2B JSX block moved after Name/Phone | L731-763 → after L597 |
| BUG-421 | `pmsService.js` + `InHouseGuestsPage.jsx` | Step 3 parallel order fetch; balance from room_info | After L68 (~20 lines) |

**Confirmed from live probe (BUG-421):** `local-reservations.balance_payment` = `None` for in-house guests → cannot use LR fields → must fetch from POS order.

**Impl sequence (file conflict management):**
`BUG-422 → BUG-423 → BUG-418` (Batch 1, all different files)
`→ BUG-420` (Batch 2 — RoomCheckInModal, AFTER BUG-422)
`→ BUG-419` (Batch 2 — CheckInPage, no conflict)
`→ BUG-421` (Batch 3 — pmsService.js, no conflict)

---

## §5 — Next Session Agenda

**Priority 1:** Present §3 ODs to owner → lock all answers → Gate 3 GO
**Priority 2:** Write Implementation Plans for BATCH-PMS2-1 (BUG-422/423/418) — Gate 3
**Priority 3:** Write Implementation Plans for BATCH-PMS2-2 (BUG-420/419) — Gate 3 (after probe Q-420-01)
**Priority 4:** Write Implementation Plan for BATCH-PMS2-3 (BUG-421) — Gate 3
**Priority 5 (carry-forward):** Gate 6 owner smoke for BUG-410/411/415/416 (from 2026-09-15)
**Priority 6 (parked):** BUG-417 — owner confirms OD-417-01/02 then probe order 1232392

---

*Handover written 2026-09-16 · Gate 2 session close*
*Next agent: PLANNING (Gate 3) — present ODs first, then write impl plans*
