# CR-385 Phase 3.5 — Role 4 QA Report (2026-09-22)

## Phase 3.5 — BUG-447 (Role 4)

**Fix under test:** `frontDeskTransform.badgesFor()` returns an array (prepaid | pah [+ advance]); `GuestTable.commonColumns` channel cell iterates `badgesFor(row).map(...)` rendering `<Badge>` twice — testids `fd-row-<id>-badge` (primary) and `fd-row-<id>-badge-advance` (advance chip).

**Auth:** OWNER_TGK (`owner@thegoankitchen.com`), UI login at `/`, `/loading` redirect at 4.x s, landed on `/dashboard` then navigated to `/pms/front-desk-v2?tab=arrivals`. Read-only, zero sandbox mutations.

### Per-row badge table (both viewports 1920×800 and 1366×768 identical)

| Tab · chip | Row id | Channel | fd-row-`<id>`-badge | fd-row-`<id>`-badge-advance | Verdict |
|---|---|---|---|---|---|
| arrivals · late | 15 | Direct | PAY AT HOTEL | — | PAH-only ✓ |
| arrivals · late | 17 | Direct | PAY AT HOTEL | — | PAH-only ✓ |
| arrivals · late | 86 | Direct | PAY AT HOTEL | — | PAH-only ✓ |
| arrivals · late | 21,18,13,22,54 | Direct | PREPAID | — | Prepaid-only ✓ |
| arrivals · late | 7,23 | booking.com | PREPAID | — | Prepaid-only ✓ |
| arrivals · today | (0 rows) | — | — | — | n/a |
| arrivals · tomorrow | (0 rows) | — | — | — | n/a |
| arrivals · upcoming | 235 | booking.com | PREPAID | — | Prepaid-only ✓ |
| arrivals · upcoming | 65 | Direct | PREPAID | — | Prepaid-only ✓ |
| **arrivals · upcoming** | **165** | **Direct** | **PAY AT HOTEL** | **ADVANCE ₹1,000** | **PAH + advance ✓ (BUG-447 fix)** |
| **arrivals · upcoming** | **197** | **Direct** | **PAY AT HOTEL** | **ADVANCE ₹1,000** | **PAH + advance ✓** |
| arrivals · upcoming | 208 | Direct | PAY AT HOTEL | — | PAH-only ✓ |
| **in-house · all** | **174** | **Walk-in** | **PAY AT HOTEL** | **PAID SO FAR ₹100** | **PAH + advance (inHouse label) ✓** |
| **in-house · all** | **155** | **Walk-in** | **PAY AT HOTEL** | **PAID SO FAR ₹100** | **PAH + advance (inHouse label) ✓** |

### Fix acceptance
- **Both testids render together** on PAH + advance rows (upcoming 165/197 with `ADVANCE ₹1,000`; in-house 174/155 with `PAID SO FAR ₹100` — inHouse=true `Paid so far` label variant of the advance chip).
- **PAH alone** (advance = 0) → only `fd-row-<id>-badge` = `PAY AT HOTEL` (rows 15, 17, 86, 208).
- **PREPAID alone** → only `fd-row-<id>-badge` = `PREPAID`, no `-badge-advance` (all PREPAID rows above).
- No PAH+advance row is missing its advance chip, no PREPAID row leaks an advance chip. Fix behaves exactly per BUG-447 owner rule (a).

### X-10 duplicate data-testid audit
| Scope | Duplicates |
|---|---|
| Arrivals 1920×800 (late/today/tomorrow/upcoming chips traversed) | 0 |
| Arrivals 1366×768 (all chips) | 0 |
| In-House · all 1920×800 | 0 |
| In-House · all 1366×768 | 0 |

### Console errors
- **Zero page-side `console.error`** on either tab at either viewport.
- Only pre-existing warnings observed (all unrelated to BUG-447): Firebase FCM denied notification permission, `[OrderPolling] aborted (mount-or-auth, 15000ms)`, transient `wss://presocket.mygenie.online/socket.io` websocket close-before-connect. These are environmental/known-benign.

### 1366×768 overflow check
- Row 165 (PAH + Advance ₹1,000) at 1366 renders both pills inside the Source cell — pills wrap to a second line within the cell (`inline-block ml-1.5`) but do **not** overflow into adjacent columns. Screenshot captured (see `/app/test_reports/bug447_two_badges_1366_auto.png` — auto-screenshot embedded in agent run).

### Viewports covered
- 1920×800 ✓ (Arrivals: late/today/tomorrow/upcoming, In-House: all)
- 1366×768 ✓ (Arrivals: late/today/tomorrow/upcoming, In-House: all)

### Result
**PASS** — BUG-447 fix verified live on the sandbox against 4 real PAH+advance rows (2 pending upcoming with `ADVANCE ₹1,000`, 2 in-house with `PAID SO FAR ₹100`) plus PAH-alone and PREPAID-alone baselines. X-10 clean. Console clean. No overflow at 1366. No mutation performed.
