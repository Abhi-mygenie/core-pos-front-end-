# SESSION HANDOVER — 2026-07-08 — BUG-168 Tax Gap Investigation

**Registry synced:** YES — no code changes
**Scope drift:** NONE — investigation only
**From:** INVESTIGATION agent · **For:** Backend team + next FE agent

## 1. One-line state
Investigated why `vat_tax: 3.68` is wrong in print payload (should be 11.68). Root cause: backend does NOT return `gst_tax`/`vat_tax` on any read endpoint, despite FE sending them on every write. Backend brief created with visual flow diagrams covering place, edit, collect bill, and print flows.

## 2. Finding
- FE sends `gst_tax` and `vat_tax` on all 4 write paths (place, edit, collect, print)
- Backend stores them but never returns them on socket, list API, or single-order API
- FE manual print path is forced to compute tax locally → computes on base price only (92) instead of full item total (292) → wrong tax
- Same pattern as the `order_sub_total_amount` gap that was just fixed

## 3. Artifact
`/app/memory/evidence/BUG-168-reinvestigation/BACKEND_BRIEF_TAX_GAP.md` — full backend brief with:
- Visual ASCII flow diagrams for all 4 flows (place, edit, collect, print)
- Complete field comparison table (FE sends vs backend returns)
- Specific example (Order #002388: sent vat_tax=11.68, backend doesn't return it, FE computes 3.68)
- Backend ask: add `gst_tax` + `vat_tax` to 3 read endpoints
- FE change plan (2 lines) once backend adds the fields

## 4. Blocked on
Backend adding `gst_tax` and `vat_tax` to socket events + employee-orders-list + get-single-order-new.

---
**HANDOVER:** Share `/app/memory/evidence/BUG-168-reinvestigation/BACKEND_BRIEF_TAX_GAP.md` with backend team. Once fields are added, FE change is 2 lines in `fromAPI.order` + 2 lines in `buildBillPrintPayload` else branch.
