# BATCH INTAKE — 2026-06 — 30-item owner backlog

**Sprint:** oct_release (reassigned from jun_backlog_2026 per owner; includes BUG-466)
**Gate:** 1 (INTAKE) for all items
**Source:** OWNER-REPORTED (bulk list)
**Registered:** 2026-06
**Zero code.** Classification + severity/risk/route are PROPOSED; owner may override at Gate 2.

Duplicate detection run against 732-item registry. None are exact duplicates of an OPEN item.
Two items carry open decisions (see bottom). IDs assigned: **CR-391…CR-409** (19), **BUG-467…BUG-477** (11).

## Mapping (owner # → ID)
| # | Title | ID | Class | Sev | Risk | Dup check | Route |
|---|-------|----|-------|-----|------|-----------|-------|
| 1 | Table Reservations (restaurant tables) | CR-391 | CR | P2 | HIGH | DISTINCT (≠ PMS room reservations CR-358) | FULL PLANNING |
| 2 | Aggregator Table Reservations | CR-392 | CR | P2 | HIGH | DISTINCT (dep: CR-391 + aggregator API) | FULL PLANNING |
| 3 | Fixed Room Charges | CR-393 | CR | P2 | MEDIUM | RELATED CR-382/CR-384 (PMS rate) | FULL PLANNING |
| 4 | Larger POS Item Tiles | CR-394 | CR | P3 | LOW | DISTINCT | Gate-2 (Fast Lane candidate) |
| 5 | KDS Order Ticket Text Scaling | BUG-467 | BUG | P2 | LOW | DISTINCT (≠ BUG-144 token) | FULL PLANNING |
| 6 | Role-Based Discount Permissions (incl complimentary) | CR-395 | CR | P1 | HIGH | RELATED CR-058 (comp order, parked) | FULL PLANNING |
| 7 | Aggregator Page Navigation (back) | BUG-468 | BUG | P2 | LOW | DISTINCT (≠ BUG-416 night-audit) | FULL PLANNING |
| 8 | Insights Chart Tooltips | BUG-469 | BUG | P2 | MEDIUM | DISTINCT; RELATED BUG-465 (recharts) | FULL PLANNING |
| 9 | Clarify Duplicate Report Modules | CR-396 | CR | P2 | MEDIUM | DISTINCT (consolidation of CR-034/042/117/136) | FULL PLANNING |
| 10 | Direct Table & Printer Settings Links | CR-397 | CR | P3 | LOW | DISTINCT | Gate-2 (Fast Lane candidate) |
| 11 | Unified Restaurant Configuration | CR-398 | CR | P2 | MEDIUM | DISTINCT (merges CR-019 setup + settings) | FULL PLANNING |
| 12 | CRM Features in POS | CR-399 | CR | P2 | HIGH | DISTINCT — **NEEDS SCOPING** | BLOCKED (scope) |
| 13 | Resolve Credit Orders | CR-400 | CR | P1 | HIGH | DISTINCT (financial + audit) | FULL PLANNING |
| 14 | Bulk Ingredient Updates via Excel (incl conversion factor) | CR-401 | CR | P2 | MEDIUM | RELATED BUG-221 (bulk upload shipped) / BUG-226 | FULL PLANNING |
| 15 | Future-Dated Stock Receipt | CR-402 | CR | P2 | MEDIUM | DISTINCT (≠ CR-018 schedule order) | FULL PLANNING |
| 16 | Automated End-of-Day Email Reports | CR-403 | CR | P2 | MEDIUM | DISTINCT (≠ CR-363 night audit) — needs email + scheduler | FULL PLANNING |
| 17 | Settlement Transfer Calculation | BUG-470 | BUG | P1 | HIGH | RELATED BUG-426 / INV-ROOM-001 | FULL PLANNING |
| 18 | Partial Settlement Amount Field (no prefill) | BUG-471 | BUG | P2 | MEDIUM | DISTINCT (≠ CR-162 room partial) | FULL PLANNING |
| 19 | B2B Invoice PDF Download | CR-404 | CR | P2 | LOW | RELATED CR-116 (B2B capture) | FULL PLANNING |
| 20 | Hide Room Metrics Without Rooms | BUG-472 | BUG | P3 | LOW | DISTINCT | Gate-2 (Fast Lane candidate) |
| 21 | macOS Printer Agent | CR-405 | CR | P2 | MEDIUM | RELATED CR-352/353 (agent, Windows) | FULL PLANNING (native, out-of-web) |
| 22 | Preserve Customer Names (Noname) | BUG-473 | BUG | P1 | MEDIUM | **DUPLICATE-CANDIDATE of BUG-356** | OWNER DECISION |
| 23 | Configurable Printed Bill Fields | CR-406 | CR | P2 | MEDIUM | DISTINCT | FULL PLANNING |
| 24 | EDC/Card Device Integration | CR-407 | CR | P2 | HIGH | DISTINCT — hardware/payment integration | FULL PLANNING |
| 25 | Reject Swiggy/Zomato Orders | CR-408 | CR | P2 | MEDIUM | DISTINCT — aggregator API dependent | FULL PLANNING |
| 26 | Timed Swiggy/Zomato Order Acceptance | CR-409 | CR | P2 | MEDIUM | DISTINCT — aggregator API + timer | FULL PLANNING |
| 27 | Service Charge Input Disabled When Feature Off | BUG-474 | BUG | P1 | MEDIUM | DISTINCT (financial display) | FULL PLANNING |
| 28 | Bulk Edit Item Indexing Offset | BUG-475 | BUG | P1 | MEDIUM | DISTINCT (menu Bulk Edit row mapping) | FULL PLANNING |
| 29 | Preserve Aggregator Category on Food Category Deletion | BUG-476 | BUG | P1 | HIGH | DISTINCT — destructive delete | FULL PLANNING |
| 30 | Printer Station List Refresh | BUG-477 | BUG | P2 | LOW | DISTINCT (≠ BUG-288 station dropdown) | FULL PLANNING |

## Integration / dependency flags (need keys or external APIs — raised at planning)
- CR-403 (EOD email): email provider (Resend/SendGrid) + platform scheduler (cron skill).
- CR-407 (EDC/card device): hardware/payment-terminal SDK — vendor + protocol TBD.
- CR-408 / CR-409 (Swiggy/Zomato reject & timed accept): aggregator channel API support — confirm per aggregator.
- CR-404 (B2B invoice PDF): client-side jsPDF likely (pattern from CR-089).
- CR-405 (macOS printer agent): native desktop agent — outside the web app; separate build track.
- CR-392 / CR-391: table reservation data model; aggregator reservation needs channel support.

## OPEN OWNER DECISIONS (block planning for these two only)
- **OD-BATCH-01 (BUG-473 / item 22):** "names replaced with Noname" looks like the same root cause as **BUG-356** (customer name/phone not saved on order, currently INTAKE—awaiting live test). Fold item 22 into BUG-356, or keep BUG-473 separate?
- **OD-BATCH-02 (CR-399 / item 12):** "CRM features in POS" is too broad to plan. Which specific features? (e.g., customer lookup at cart, loyalty points, visit history, saved addresses, segments). Pick the subset for Phase 1.

## Next
Owner answers OD-BATCH-01/02 and picks which items to take into PLANNING first (recommend starting with the P1 financial/destructive BUGs: BUG-470, BUG-474, BUG-476, and CR-395 / CR-400). Then "Gate 2 GO: <IDs>".

---

## ADDENDUM — CR batch #2 (integrations & voice) — sprint `oct_release`
All CRs, Gate 1, zero code.

| Item | ID | Sev · Risk | Dup check | Integration |
|------|----|-----------|-----------|-------------|
| Native Swiggy/Zomato Integration | CR-410 | P2 · HIGH · NEEDS SCOPING | RELATED CR-106 (UrbanPiper) | Direct Swiggy/Zomato partner APIs |
| Razorpay Integration (in-POS) | CR-411 | P1 · HIGH · NEEDS SCOPING | RELATED CR-017/CR-165 | Razorpay keys |
| Barcode Inventory | CR-412 | P2 · MEDIUM | DISTINCT | Scanner/camera + SKU map |
| UPI/Card Settlement | CR-413 | P2 · HIGH · NEEDS SCOPING | RELATED CR-083 | Payment provider (links CR-411) |
| Dynamic QR with Razorpay | CR-414 | P2 · HIGH | DISTINCT (dep CR-411) | Razorpay dynamic-QR API |
| Voice to Menu Search | CR-415 | P3 · MEDIUM | DISTINCT | STT (Whisper / browser speech) |
| Voice Item/Food-Level Notes | CR-416 | P3 · MEDIUM | DISTINCT | STT |

### Open decisions (CR batch #2)
- **OD-BATCH-03 (CR-411):** Razorpay scope — full in-POS card/UPI collection, or payment links only (CR-017 already ships links)?
- **OD-BATCH-04 (CR-410):** Native direct Swiggy/Zomato vs existing UrbanPiper middleware (CR-106) — which path?
- **OD-BATCH-05 (CR-415/CR-416):** Voice engine — OpenAI Whisper (Emergent key) vs on-device browser SpeechRecognition?
