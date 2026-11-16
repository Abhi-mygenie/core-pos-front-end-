# Batch 2 Owner Decisions — 2026-11-16

**Items:** BUG-678, BUG-677, CR-545
**Session:** Impact Analysis pre-questions
**Decided by:** Owner (2026-11-16)

---

## BUG-678 — Service Charge in Payload Despite UI Toggle OFF

No open questions. Fix is clear: remove `!!restaurant?.autoServiceCharge ||` from 2 lines in OrderEntry.jsx. Proceed to IA.

---

## BUG-677 — Socket Disconnection in PWA

### OD-677-01: Scope of fixes
**Decision:** F1 through F6 (full resilience)

| Fix | Scope | Included |
|-----|-------|----------|
| F1 | Infinite reconnection attempts | ✅ YES |
| F2 | Periodic heartbeat health check (30s) | ✅ YES |
| F3 | Explicit disconnect before reconnect | ✅ YES |
| F4 | Aggregator order polling reconciliation | ✅ YES |
| F5 | Auto-retry on reconnect_failed with backoff | ✅ YES |
| F6 | Listen for joined_restaurant ACK, re-emit on timeout | ✅ YES |
| F7 | Service Worker health ping on PWA resume | ❌ NO (P2, deferred) |

**Rationale:** Full resilience covers the main symptom (reconnection) plus edge cases (aggregator orders, ghost connections, room join failures). F7 (Service Worker) deferred as lower priority.

---

## CR-545 — APS (₹1) Web Order: Tag + Cancel + Price Edit

### OD-545-01: Phase scope for IA
**Decision:** Phase 1 + Phase 2 outline
- Phase 1 (FE-only): APS tag + item cancel in ScanOrderPopOut — full IA + implementation plan
- Phase 2 (backend-blocked): Price editing — high-level outline so backend knows the full picture

### OD-545-02: Cancel button approach in ScanOrderPopOut
**Decision:** OK with prop-based cancel for now
- Cancel button delegates via `onCancelItem` prop to DashboardPage
- No direct API calls inside the popup
- Owner: "if needed will see later how we can make user experience better"
- UX improvement deferred — revisit after Phase 1 ships

### OD-545-03: cancel-food-item API on scanner orders (B1)
**Decision:** Assume it works, probe later
- Proceed with implementation assuming `cancel-food-item` works on not-yet-accepted scanner orders
- Backend verification (probe) to be done before QA, not before coding
- If probe fails → cancel button disabled for scanner orders, APS tag still ships

### OD-545-04: Accept button NOT gated (from intake, confirmed)
**Decision:** Accept button works normally even when ₹1 items are present
- Staff can accept order at ₹1, then correct price in OrderEntry afterward
- No blocking/warning on accept

---

## Summary — IA Scope

| Item | Risk | IA Scope |
|------|------|----------|
| BUG-678 | CRITICAL (money) | 2 lines, 1 file. No open questions. |
| BUG-677 | HIGH (realtime) | F1–F6, 6 fixes across ~6 files. F7 deferred. |
| CR-545 | HIGH (order flow) | Phase 1 full IA + Phase 2 outline. Cancel via props. Assume cancel API works. |

**Next:** Write Impact Analysis for all 3 items, one by one (BUG-678 → BUG-677 → CR-545).
