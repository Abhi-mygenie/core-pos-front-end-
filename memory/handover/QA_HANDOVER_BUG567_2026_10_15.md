# QA Handover — BUG-567 — 2026-10-15

## 0. Registry Sync Confirmation
Registry synced: YES
Items: BUG-567
Sprint: oct_cr_batch
Status: GATE_5A_IMPLEMENTED
EXIT GATE: ALL 5 PASSED
- ☑ registry.json: GATE_5A_IMPLEMENTED, files: OrderEntry.jsx
- ☑ BUG_TRACKER.md: updated with IMPLEMENTED row
- ☑ FILE_OWNERSHIP.md: OrderEntry.jsx BUG-567 E1 added
- ☑ Code markers: 2× BUG-567 at L55-56
- ☑ Compile: webpack 1 warning (pre-existing), 0 new

## 1. Edit Applied

| Edit | File | Lines | Change |
|---|---|---|---|
| E1 | `OrderEntry.jsx` | 55–56 | ROTATE_MQ portrait threshold: `1279` → `767`. Comment updated. |

Before:
```js
// BUG-555 WP-A (OD-555-13=c): (portrait AND <1280) OR <800 → rotate overlay
const ROTATE_MQ = '(orientation: portrait) and (max-width: 1279px), (max-width: 799px)';
```

After:
```js
// BUG-555 WP-A (OD-555-13=c) · BUG-567 (OD-567-01=a): (portrait AND <768) OR <800 → rotate overlay
const ROTATE_MQ = '(orientation: portrait) and (max-width: 767px), (max-width: 799px)'; // BUG-567
```

## 2. Verification Matrix (from Plan §4)

| # | Check | Viewport | Expected |
|---|---|---|---|
| V-1 | iPad 11" portrait: NO overlay | ~820×1180 | `order-entry-rotate-overlay` absent |
| V-2 | Phone portrait: overlay STILL shows | 390×844 | testid present + backdropFilter blur |
| V-3 | iPad Mini portrait: overlay STILL shows | 744×1133 | testid present |
| V-4 | Portrait 768px: NO overlay (new lower boundary) | 768×1024 | testid absent |
| V-5 | Portrait 767px: overlay shows (upper blocked boundary) | 767×1024 | testid present |
| V-6 | BUG-555 V3 regression: 533×893 portrait overlay shows | 533×893 | testid present, blur, static icon |
| V-7 | BUG-555 V1 regression: 893×533 landscape overlay absent | 893×533 | testid absent |
| V-8 | BUG-555 cart round-trip: add items → 533 portrait → back → cart intact | 893↔533 | cart preserved |
| V-9 | OE layout no overflow at 820×1180 | 820×1180 | scrollWidth = clientWidth |
| V-10 | Compile: 1 pre-existing warning only | — | webpack clean |
| V-11 | Code marker: BUG-567 in OrderEntry.jsx | — | grep ≥1 ✅ |

## 3. Credentials + Environment
- Login: owner@cafe103.com / *** (masked)
- Preview: https://pos-frontend-app-4.preview.emergentagent.com
- Compile: 1 pre-existing warning (SettlementReportMockup), 0 new
