# Investigation Report — 7 PMS Issues (2026-09-16)

## Scope
Issues A–G reported by owner on 2026-09-16. No IDs yet — pending owner intake approval.
Screenshots: from live server (frontend-pos-live.preview.emergentagent.com).
Code examined: `/app/frontend/src/` (branch 16sep).

---

## ISSUE A — Advance ₹0 on Folio + F&B Not Posting to Room
**Guest:** aoi, order #000054, r4, order_id 1232392

### Hypotheses tested
| # | Hypothesis | Test | Result |
|---|---|---|---|
| H1 | aoi was checked in with advance=0 (no advance collected) | Code trace: folioTransform reads ri.advance_payment pass-through | POSSIBLE — if ₹0 was entered at check-in, backend stores 0 |
| H2 | F&B transferred but associated_order_list missing | Code trace: GuestFolioPage.associatedOrders = raw.associated_order_list | INCONCLUSIVE — needs live probe of order 1232392 |

### Data Flow (F&B)
API: `POST /get-single-order-new {order_id: 1232392}` →
Response: `raw.associated_order_list` →
`folioTransform.fromAPI()` line 90: `associatedOrders = (raw.associated_order_list || []).map(...)` →
`GuestFolioPage` line 239: shows "No F&B orders posted" when array is empty

### Finding
- **Advance ₹0**: Stored as ₹0 at check-in. Code correctly reads `ri.advance_payment`. No FE bug found. Either staff did not enter an advance, or the backend stored 0 regardless.
- **F&B not posting**: `associated_order_list` is empty from API. Cannot determine from FE code alone whether food orders exist but aren't linked, or no food was transferred at all.
- **Root cause**: INCONCLUSIVE — requires live API probe of order 1232392 to inspect `associated_order_list`.
- **Classification**: Possibly BACKEND_BUG if food was transferred but not returned in associated_order_list.

### Recommendation
Live probe: `POST /api/v2/vendoremployee/order/get-single-order-new { order_id: 1232392 }` → inspect `associated_order_list`. Also probe CR-163 (Move Items) to confirm table-to-room transfer linkage.

---

## ISSUE B — GST Missing from Checkout Bill Display (PmsCheckoutDrawer)
**Guest:** aoi, r4 — Checkout Drawer — GRAND TOTAL shows ₹1,000, GST ₹50 missing

### Data Flow Trace
```
API: POST /get-single-order-new {order_id: <aoi>}
→ orderTransform.fromAPI.order() → detail
→ detail.roomInfo.gstTax = parseFloat(api.room_info.gst_tax) || 0   ← BUG-401 fix maps this correctly
→ PmsCheckoutDrawer line 158: const roomGstTax = detail.roomInfo?.gstTax ?? 0
→ if (roomGstTax > 0) payload.room_gst_tax = roomGstTax  ← injected in PAYLOAD ONLY
→ CollectPaymentPanel receives: total={detail.amount || 0}, roomInfo={detail.roomInfo}
→ CollectPaymentPanel line 196-202:
    roomBalance = roomInfo.roomPaymentSummary?.remainingRoomBalance ?? roomInfo.balancePayment
    = ₹1,000 (stored balance_payment, advance=0)
→ Grand Total displayed = roomBalance = ₹1,000  ← NO GST shown
```

### Root Cause
**FE_DISPLAY_GAP** — BUG-401 fix (2026-09-15) correctly injects `room_gst_tax` into the BILL_PAYMENT API payload, but the DISPLAYED total in CollectPaymentPanel never includes `room_gst_tax`. The cashier sees and collects ₹1,000 but the backend charges ₹1,050 (adds GST server-side). This creates a display/reality mismatch.

The fix only addressed the PAYLOAD gap. The DISPLAY gap is still open.

### Break Point
`PmsCheckoutDrawer.jsx` line 260-283: passes `total={detail.amount || 0}` and `roomInfo`. CollectPaymentPanel computes `effectiveTotal = finalTotal + roomBalance` (no room GST added). The `roomGstTax` variable at line 158 is NEVER passed to CollectPaymentPanel.

### Confidence: HIGH (code-traced, no live probe needed)
### Classification: FE_BUG
### Planning skip eligible: NO — multiple files, financial display (R6)

---

## ISSUE C — Corporate/B2B Billing Position in Check-In Form
**Current:** After Occupancy/Adults-Children block (line 731–763)
**Owner wants:** Immediately after Name/Phone row (before Room Assignment)

### Form Layout Trace (CheckInPage.jsx)
```
Line 585: Name + Phone grid
Line 600: Room Assignment                    ← Owner wants Corp/B2B HERE (after Name/Phone)
Line 616: Check-in / Nights / Check-out
Line 631: Occupancy & Guest Register
Line 731: Corporate / B2B toggle  ← CURRENT POSITION
Line 766: ID Document (GuestDocsSection)
Line 780: Room Amount + Advance Payment
```

### Root Cause
**UI_LAYOUT** — Corporate/B2B block (lines 731–763) is inside the form's `space-y-4` div. Moving it to just after the Name/Phone grid (after line 597) is a pure JSX reorder, no logic change.

### Confidence: HIGH
### Classification: FE_BUG (UI layout only)
### Risk: LOW
### Planning skip eligible: YES — 1 file, <10 lines moved (owner approval needed)

---

## ISSUE D — Returning Guest ID Document Not Visible (No Image Preview)
**Expected:** When returning guest found, show their previously uploaded document images
**Actual:** Only shows doc type card labels ("aadhaar · 15 Sep 26") + "Docs on file — upload to update" text — no images

### Data Flow Trace
```
CheckInPage handleCrmLookup (line 150):
  const docs = await getDocuments(result.id)  → crmDocs state (array of doc objects)

crmDocs displayed at line 549-568:
  crmDocs.map(doc => <div> doc.doc_type · doc.uploaded_at </div>)
  ← shows doc type + date ONLY. No image URL rendered.

GuestDocsSection (line 776):
  hasCrmDocs={crmDocs.length > 0}  ← only boolean passed
  GuestDocsSection line 62-64: shows text "Docs on file — upload to update" ONLY
  ← no image preview, no thumbnail
```

### Root Cause
**FE_DISPLAY_GAP** — `crmDocs` objects are fetched from CRM `getDocuments()` API and stored in state. The CRM doc objects likely have an image URL field (e.g., `document_url` or `file_url`), but:
1. The CRM badge section (line 549-568) renders only `doc.doc_type` + `doc.uploaded_at` — no URL rendered
2. `GuestDocsSection` receives only `hasCrmDocs` boolean — the actual doc array is never passed to it

To show actual images: `crmDocs` must be passed to GuestDocsSection (or rendered inline), and `doc.document_url` (or equivalent) used in an `<img>` tag.

### Unknown
The exact field name for image URL in `getDocuments()` response is not known from FE code alone. Must check `documentService.getDocuments` response shape via live probe or API inspection.

### Confidence: HIGH (display gap confirmed; image URL field name = MEDIUM)
### Classification: FE_BUG
### Planning skip eligible: NO — requires checking API shape + new rendering

---

## ISSUE E — In-House Page Balance Column Shows Booking Amount, Not Outstanding Balance
**Symptom:** All 4 guests show ₹1,000 (= room price), joli with ₹100 advance also shows ₹1,000

### Data Flow Trace
```
pmsService.getInHouseGuests() (line 38-76):
  Step 1: GET_ROOM_LIST → roomListTransform → rows (roomNumber, guestName, phone)
  Step 2: local-reservations → filter in_house → enrich rows
  Line 64: row.balance = match.res.amount_after_tax  ← WRONG FIELD
```

### Root Cause
**WRONG_FIELD** — `amount_after_tax` from local-reservations = the reservation's **total booking amount** (room price × nights, before advance deduction). It does NOT account for:
- Advance already paid (not deducted)
- GST component (may or may not be included depending on backend)

For all guests with ₹1,000 room: `amount_after_tax = ₹1,000` regardless of advance paid.

Correct source for outstanding balance: `room_info.balance_payment` or `room_payment_summary.remaining_room_balance` from the order detail API. But that requires one `get-single-order-new` call per row (expensive).

### Alternative fix approaches
A. Fetch order detail per row on page load (expensive — N API calls)
B. Use `amount_after_tax - advance_payment` from local-reservations if advance is available there
C. Link folio page via "View Bill" (already works — redirects to GuestFolioPage which shows correct balance)

### Confidence: HIGH
### Classification: FE_BUG (wrong field) + potential DATA_ISSUE
### Planning skip eligible: NO — requires API shape investigation for approach B

---

## ISSUE F — balance_payment at New Check-In: Does It Include GST?
**Owner says:** "works in existing dashboard to check in" = OLD modal correctly deducts advance

### Code Comparison
**NEW CheckInPage** → `pmsService.pmsCheckIn()` line 193:
```js
fd.append('balance_payment', String(to2dp(orderAmount + (p.gstTax ?? 0) - advance)));
// → 1000 + 50 - 100 = ₹950  ← CORRECT (includes GST, deducts advance)
```

**OLD RoomCheckInModal** line 363-367:
```js
const balancePayment = useMemo(() => {
  return (Number(roomPrice) - Number(advancePayment)).toFixed(2);
  // → 1000 - 100 = ₹900  ← NO GST, advance deducted only
}, [roomPrice, advancePayment]);
```

### Finding
The NEW `CheckInPage` formula (pmsService line 193) is CORRECT: it includes GST and deducts advance.
The OLD `RoomCheckInModal` formula is INCOMPLETE: it deducts advance but does NOT include GST.

The "dashboard" guest folio shows balance ₹870 = ₹1,000 − ₹130 (old formula pattern, no GST). This means the "dashboard" guest was likely checked in via the **OLD RoomCheckInModal**, not the new CheckInPage.

### Root Cause
**DATA_ISSUE** — Old modal stores `balance_payment = room_price - advance` (no GST). New page stores correct formula. Backend data for guests checked in via old modal will always be missing GST in `balance_payment`.

### Confidence: MEDIUM (confirmed by code; cannot confirm which modal was used for "dashboard" guest without live probe)
### Classification: FE_BUG in OLD RoomCheckInModal (incomplete formula). NEW CheckInPage is CORRECT.
### Recommendation: Fix OLD RoomCheckInModal `balancePayment` to include GST (same as BUG-396 fix for new page)

---

## ISSUE G — Folio Balance Does Not Include GST
**Guest:** "dashboard", r4, order 1232397 — Folio shows Room Balance ₹870, should be ₹920

### Data Flow Trace
```
API: POST /get-single-order-new {order_id: 1232397}
→ folioTransform.fromAPI():
    roomPrice:      num(ri.room_price)       = ₹1,000  ✅
    gstTax:         num(ri.gst_tax)          = ₹50     ✅ (visible in folio)
    advancePayment: num(ri.advance_payment)  = ₹130    ✅
    balancePayment: num(ri.balance_payment)  = ₹870    ← stored value (no GST)
    remainingRoomBalance: num(rps.remaining_room_balance) = ₹870 or 0

→ GuestFolioPage line 100:
    roomBalance = folio.remainingRoomBalance || folio.balancePayment  = ₹870

→ Folio displays: Room Balance ₹870, Total Balance Due ₹870
   Correct balance: ₹1,000 + ₹50 − ₹130 = ₹920
```

### Root Cause
**STORED_VALUE_WRONG + FE_DISPLAY_GAP** — Two components:

1. **Stored value wrong**: `balance_payment = ₹870` (room − advance, no GST). This was stored via OLD RoomCheckInModal (see Issue F). The folio reads the stored value directly.

2. **FE display gap**: `GuestFolioPage` trusts the stored `balance_payment`/`remaining_room_balance` and does not re-derive the balance from first principles. A FE fix: compute `roomBalance = max(0, folio.roomPrice + folio.gstTax - folio.advancePayment - folio.receiveBalance)` — this would show the correct ₹920 regardless of what's stored.

### Note
This is RELATED to Issue B: the same GST exclusion in balance_payment affects both the folio display and the checkout drawer display.

### Confidence: HIGH
### Classification: FE_BUG (display can be fixed FE-side) + DATA_ISSUE (stored value from old modal)
### Planning skip eligible: YES for folio formula fix — 1 file, ~1 line (GuestFolioPage.jsx line 100), owner approval needed

---

## Summary Table

| Issue | Classification | Confidence | Root Cause File | Planning Skip? |
|---|---|---|---|---|
| A (Advance ₹0 + F&B) | INCONCLUSIVE | LOW | Backend probe needed | N/A |
| B (GST in checkout display) | FE_BUG | HIGH | `PmsCheckoutDrawer.jsx` L260 | NO (financial, R6) |
| C (Corp/B2B position) | FE_BUG (UI) | HIGH | `CheckInPage.jsx` L731 | YES (LOW risk, 1 file) |
| D (Docs not visible) | FE_BUG | HIGH | `CheckInPage.jsx` + `GuestDocsSection.jsx` | NO (needs API shape check) |
| E (In-house balance wrong) | FE_BUG (wrong field) | HIGH | `pmsService.js` L64 | NO (needs API investigation) |
| F (balance_payment old modal) | FE_BUG (old modal) | MEDIUM | `RoomCheckInModal.jsx` L363 | NO (financial, R6) |
| G (Folio balance no GST) | FE_BUG + DATA_ISSUE | HIGH | `GuestFolioPage.jsx` L100 | YES for formula fix |

---

## Non-PMS: Customer Beta Report — Room Customer Documents
**Question:** Does Customer Beta Report show ID documents for room customers?
**Finding:** NO. `CustomerIntelligenceBeta.jsx` is a CRM analytics report (lifecycle, tiers, revenue, win-back). It shows name, phone, tier, visit stats only. No document viewer or column exists. Room check-in docs (uploaded via GuestDocsSection) are stored in CRM but never surfaced in this report. This is a DESIGN DECISION (not a bug) — the report is for retention analytics, not ID management.

---

*Written: 2026-09-16 | Role: INVESTIGATION | Steps used: 10/10*
