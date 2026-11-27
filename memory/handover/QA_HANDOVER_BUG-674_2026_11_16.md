# QA Handover — BUG-674 (Order-Cancel Notes) — 2026-11-16

## 1. Inherited from Plan (Verification Matrix results)

| Edit | File | Verification | Self-Test Result |
|------|------|-------------|:---:|
| E6 | orderTransform.js L1028 | `reason.reasonNote \|\| reason.reasonText` → `reason.reasonNote \|\| ''` | PASS ✅ — unit test confirms |
| E7 | OrderEntry.jsx L1601 | `{ ...reason, reasonNote: note.trim() }` passed to cancelOrder | PASS ✅ — code verified |
| E8 | DashboardPage.jsx L1383 | Same spread pattern | PASS ✅ — code verified |
| E2 | CancelOrderModal.jsx L103-117 | Notes box visible in cancel + refund modes | PASS ✅ — code verified |
| T1 | cancelAndUpdatePayload.test.js | 2 new tests: blank → `''`, note → note value | PASS ✅ — 25/25 tests pass |

Compile: webpack compiled with 1 warning (pre-existing, NOT from BUG-674). 0 new warnings.

## 2. Test Cases

### TC-1: Notes box visible in cancel mode (E2)
| Step | Action | Expected |
|------|--------|----------|
| 1 | Open an active order → click Cancel Order | Cancel dialog appears |
| 2 | Observe dialog below reason dropdown | "Notes (Optional)" textarea visible with placeholder "Type here…" and `data-testid="cancel-order-note"` |
| 3 | Leave notes blank, pick reason, confirm | Cancel succeeds |

### TC-2: Notes box in refund mode (E2 — regression)
| Step | Action | Expected |
|------|--------|----------|
| 1 | Open a Razorpay PG order → click Cancel (triggers refund mode) | Cancel/Refund dialog appears |
| 2 | Observe dialog | "Refund Note" textarea visible with `data-testid="cancel-order-refund-note"` |
| 3 | Type a note, confirm | Cancel + refund succeeds, note sent |

### TC-3: Blank note sends empty string (E6 + E7/E8)
| Step | Action | Expected |
|------|--------|----------|
| 1 | Cancel order from **order screen** (OrderEntry), leave notes blank | Network tab: `cancellation_note: ""` (empty string, NOT the reason text) |
| 2 | Cancel order from **dashboard card** (DashboardPage), leave notes blank | Same: `cancellation_note: ""` |

### TC-4: Typed note sends correctly (E7/E8)
| Step | Action | Expected |
|------|--------|----------|
| 1 | Cancel order from order screen, type "Guest waited 45 min" | Network tab: `cancellation_note: "Guest waited 45 min"` |
| 2 | Cancel order from dashboard, type "Wrong table" | Network tab: `cancellation_note: "Wrong table"` |

### TC-5: Unit tests (T1)
| Step | Action | Expected |
|------|--------|----------|
| 1 | `npx craco test --watchAll=false --testPathPattern=cancelAndUpdatePayload` | 25/25 pass including 2 new BUG-674 tests |

## 3. Regression Tests

| # | What to verify | Why |
|---|----------------|-----|
| R1 | Razorpay refund cancel still works (CR-165 path) | E7/E8 touch the same handler; refund call already uses `note` separately |
| R2 | Dashboard card cancel still works (non-Razorpay) | E8 touches DashboardPage cancel handler |
| R3 | Order screen cancel still works (non-Razorpay) | E7 touches OrderEntry cancel handler |
| R4 | Item-level cancel unaffected | Different code path (cancelItem, not cancelOrder) |

## 4. Registry Sync Confirmation
- Registry synced: YES
- Items: BUG-674
- Sprint: nov_cr_batch
- EXIT GATE: 5/5 PASSED
  - [x] REGISTRY SYNC: registry.json BUG-674 → GATE_5A_IMPLEMENTED
  - [x] BUG_TRACKER.MD: row updated
  - [x] FILE_OWNERSHIP.MD: 5 files added
  - [x] CODE MARKERS: `// BUG-674` in all 5 modified files
  - [x] COMPILE CHECK: 0 new warnings, 25/25 tests pass

## 5. Credentials + Environment
- Preview URL: https://pull-build-3--2jz687ss.preview.emergentagent.com
- API: https://preprod.mygenie.online/
- Test accounts: see `/app/memory/control/test_credentials.md`

## 6. Files Changed
| File | Lines | Change |
|------|-------|--------|
| `api/transforms/orderTransform.js` | L1028 | Blank note fallback → `''` |
| `components/order-entry/OrderEntry.jsx` | L1601 | Wire note into cancel payload |
| `pages/DashboardPage.jsx` | L1383 | Wire note into cancel payload |
| `components/order-entry/CancelOrderModal.jsx` | L103-117 | Notes box in all modes |
| `__tests__/.../cancelAndUpdatePayload.test.js` | +2 tests | Blank + typed note assertions |

## 7. Blocked Edits (awaiting backend — Gyan)
| Edit | Backend Ask | What FE will do after |
|------|-----------|----------------------|
| B2 | BA-01/BA-02: Order Beta + Cancellation report return `cancellation_reason` + `cancellation_note` | Show reason/note columns in reports |
| B3 | BA-03: Stop overwriting line `reason` on full-order cancel | QA verify only |
| B4 | BA-04: Store empty note as empty | QA verify only |
| B7 | BA-24: Confirm `cancellation_note` key for refund-cancel | Small follow-up if different key |
