# SESSION HANDOVER — 2026-11-12 — End of Session

**Agent role this session:** MULTI-ROLE (Investigation → Implementation × 6, Intake, Sheet Push/Pull)
**Date:** 2026-11-12
**Branch:** main (pos-react-preview-5)
**Registry total:** 775 items

---

## FIRST ACTION FOR NEXT AGENT (MANDATORY)

```
1. Run: cd /app && python3 memory/reports/sheets_sync.py --pull --dry-run
2. Show full output to owner (Part A: registry drift + Part B: TT inbox)
3. Ask: "What would you like to work on this session?"
4. Wait for owner direction before picking any role.
```

---

## 1. What Was Done This Session

### Bugs Implemented (6 items — all GATE_5A)

| ID | Fix | Status |
|---|---|---|
| **BUG-660** | Credit panel prefilled customer showing duplicate CRM suggestion dropdowns | GATE_5A |
| **BUG-661** | PWA update banner never shows + white screen on deploy (8-file fix) | GATE_5A |
| **BUG-662** | Prepaid manual SC missing from place-order payload | GATE_5A |
| **BUG-663** | New category stationPrinterList reading wrong API key → station_name null | GATE_5A (Fast Lane) |
| **BUG-664** | Tile turns green on Place Order with no bill printed (print_bill_status fallback) | GATE_5A |
| **BUG-665** | Prepaid split SC GST 1-paisa gap — splitCap ≠ order_amount (Layer 2) | GATE_5A |
| **BUG-666** | Split payment still fails — CPP taxTotals item-level GST source mismatch (Layer 1) | GATE_5A |

### Registered (36 items — all GATE_1)
- **Batch intake 2026-11-12:** CR-514 to CR-534, BUG-667 to BUG-676 (31 items from zip bundle)
- **TT batch:** CR-535 to CR-539 (5 items from Tech Tasks inbox)
- **BUG-665, BUG-666:** Registered + implemented for split payment fix

### Investigations
- **INV-TILE-GREEN:** Tile green bug — 3 root causes found, BUG-664 fixed, F-B (postpaid green) still open (backend)
- **INV-BUG661-BROWSER-PWA:** Browser vs PWA update banner difference explained — not a bug, 1 DevOps action pending (SW file no-cache header)
- **BUG-665/666 investigation:** Split payment paisa gap — full root cause traced across 2 layers

### Other
- UAT deployed (BUG-661 banner working on UAT)
- Sheet push ×3 (registry now synced to 1095 items on Sheet)
- Tech Tasks sheet connected (`TECH_TASKS_SHEET_ID` added to env)
- BUG-663 post-fix: owner to manually re-save 7 null-station categories on preprod

---

## 2. Open Items — Needs Owner Decision / QA

### QA Gate 5B needed (live preprod tests)
| ID | What to test |
|---|---|
| **BUG-665 + BUG-666** | Prepaid split with SC on Ruby ZAP (₹114.29 item + SC 10%) — confirm no backend error. BOTH must be deployed together to UAT first. |
| **BUG-662** | Prepaid split with manual SC ON, intercept `place-order` — confirm `service_tax > 0` |
| **BUG-664** | Place prepaid auto-bill order → tile should NOT go green until bill actually printed |

### DevOps action still needed
- **BUG-661 F-2:** `firebase-messaging-sw.js` needs `Cache-Control: no-cache` on UAT/prod nginx/Cloudflare (currently `max-age=14400`). Brief: `backend_briefs/BACKEND_BRIEF_BUG661_CACHE_HEADERS_2026_11_10.md`

### Open investigation
- **BUG-664 F-B:** Postpaid order green background (tile) — backend/printer-agent sets `bill_print` at queue time for `billing_auto_bill_print=Yes` restaurants. UAT team trying to reproduce. No code fix yet.

### Owner re-save required
- **BUG-663:** 7 null-station categories on preprod (cafe103 or relevant restaurant) must be manually re-saved so they pick up the correct printer ID.

---

## 3. P0 Items in Planning — Ready for Gate 2 or Gate 4

### At Gate 1 (need Gate 2 GO) — 15 P0 items, nov_cr_batch

| ID | Risk | Title |
|---|---|---|
| **CR-529** | CRITICAL | Password/OTP guard for cancel, discount, complementary |
| **CR-515** | CRITICAL | Order Beta: staff rights for reprint + collect pay-later |
| **BUG-671** | HIGH | Cannot mark partial-payment orders as unpaid |
| **BUG-672** | HIGH | Prepaid order cannot move to credit |
| **BUG-673** | HIGH | Keyboard nav: wrong item auto-selected on short-code search |
| **BUG-668** | HIGH | UPI ID not reflecting until printer agent refresh |
| **CR-516** | HIGH | PMS: separate Check-In button on dashboard |
| **CR-522** | HIGH | Reconcile amount range customizable per restaurant |
| **CR-526** | HIGH | Credit Management: remove/void unpaid order |
| **CR-532** | HIGH | Order Beta: GST audit tab |
| **BUG-670** | MEDIUM | Item-cancel dialog missing notes field |
| **BUG-674** | MEDIUM | Order-level cancel dialog missing notes field |
| **CR-523** | MEDIUM | Link customer to order after placing without update |
| **CR-524** | MEDIUM | Cancellation report: punch time + duration columns |
| **CR-527** | MEDIUM | Credit Management: filter same phone, different names |

### At Gate 2 (impact complete, needs Gate 3 GO)
| ID | Risk | Title |
|---|---|---|
| **BUG-644** | MEDIUM | Credit Management — order details not showing items |

---

## 4. Credentials
- owner@cafe103.com / Qplazm@10 (cafe103 preprod)
- owner@ruby.com / Qplazm@10 (Ruby ZAP RID 672 — split payment testing)
- POS preview: https://c4220e7e-e76a-4ba7-b323-bd65e8947f74.preview.emergentagent.com
- API: https://preprod.mygenie.online/

## 5. Key Files
- Registry: `/app/memory/control/registry.json` (775 items)
- BUG_TRACKER: `/app/memory/control/BUG_TRACKER.md`
- CR_REGISTRY: `/app/memory/control/CR_REGISTRY.md`
- Sheets config: `/app/frontend/.env` (GOOGLE_SHEET_ID + TECH_TASKS_SHEET_ID)

---

**Session closed 2026-11-12.**
