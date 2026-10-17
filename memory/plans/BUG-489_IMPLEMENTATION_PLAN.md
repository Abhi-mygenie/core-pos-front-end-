# BUG-489 — Implementation Plan

**ID:** BUG-489
**Gate:** 3 — IMPLEMENTATION PLAN
**Date:** 2026-10-05
**Risk:** MEDIUM
**OD-489-01:** LOCKED — Option A (`c.booking_charge` as percent base)

**Scope lock:**
- Files WILL change: `components/pms/frontdesk/CheckInForm.jsx` · `api/services/frontDeskService.js`
- Files will NOT touch: `CheckInPage.jsx` · `pmsService.js` · `FolioCheckoutPanel.jsx` · `orderTransform.js` · any other file

---

## Edit E-1 — CheckInForm.jsx: add 2 state variables

**File:** `src/components/pms/frontdesk/CheckInForm.jsx`
**After line 39** (after `const [error, setError] = useState(null);`)

**Insert:**
```javascript
  // BUG-489: mirror CR-407 Sub-scope A — check-in room discount
  const [ciRoomDiscountAmt,  setCiRoomDiscountAmt]  = useState('');      // raw input (₹ or %)
  const [ciRoomDiscountType, setCiRoomDiscountType] = useState('Amount'); // 'Amount' | 'Percent'
```

---

## Edit E-2 — CheckInForm.jsx: add roomDiscountRs useMemo

**File:** `src/components/pms/frontdesk/CheckInForm.jsx`
**After line 52** (after `const ready = missing.length === 0;`)

**Insert:**
```javascript
  // BUG-489: resolve discount to ₹ — OD-489-01: base = c.booking_charge (mirrors form.orderAmount in CheckInPage)
  const roomDiscountRs = useMemo(() => {
    const raw = parseFloat(ciRoomDiscountAmt) || 0;
    if (raw <= 0) return 0;
    if (ciRoomDiscountType === 'Percent') {
      return Math.floor(Number(c.booking_charge || 0) * raw / 100);
    }
    return Math.floor(raw);
  }, [ciRoomDiscountAmt, ciRoomDiscountType, c.booking_charge]);
```

---

## Edit E-3 — CheckInForm.jsx: spread discount into confirm() call

**File:** `src/components/pms/frontdesk/CheckInForm.jsx`

**Current (lines 62–64):**
```javascript
        firmName: b2b ? firm.name.trim() : '', firmGst: b2b ? firm.gst.trim() : '',
        upgradeType: isUpgrade ? upgrade.type : 'none', upgradeAmount: upgrade.amount, upgradeReason: upgrade.reason,
      });
```

**After:**
```javascript
        firmName: b2b ? firm.name.trim() : '', firmGst: b2b ? firm.gst.trim() : '',
        upgradeType: isUpgrade ? upgrade.type : 'none', upgradeAmount: upgrade.amount, upgradeReason: upgrade.reason,
        // BUG-489: pass room discount to backend (mirrors CR-407 A-E3)
        ...(roomDiscountRs > 0 ? {
          roomDiscount:       roomDiscountRs,
          roomDiscountType:   ciRoomDiscountType,
          roomDiscountValue:  parseFloat(ciRoomDiscountAmt) || 0,
          roomDiscountReason: '',
        } : {}),
      });
```

---

## Edit E-4 — CheckInForm.jsx: add discount UI in bill panel

**File:** `src/components/pms/frontdesk/CheckInForm.jsx`

**Current (lines 144–146 — start of "Collect now" section):**
```jsx
          <div className="mt-3 pt-3 border-t border-[#E5E5E5]">
            <Label>Collect now · optional</Label>
```

**After:**
```jsx
          {/* BUG-489: mirror CR-407 A-E4 — check-in room discount */}
          <div className="mt-3">
            <Label>Room Discount (optional)</Label>
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border border-[#E5E5E5] overflow-hidden text-[11px]">
                {['Amount', 'Percent'].map(t => (
                  <button
                    key={t} type="button"
                    data-testid={`ci-discount-type-${t.toLowerCase()}`}
                    onClick={() => { setCiRoomDiscountType(t); setCiRoomDiscountAmt(''); }}
                    disabled={busy}
                    className={`px-2 py-1 ${ciRoomDiscountType === t ? 'bg-[#329937] text-white' : 'bg-white text-[#555]'}`}
                  >{t === 'Amount' ? '₹' : '%'}</button>
                ))}
              </div>
              <div className="relative flex-1">
                <span className="absolute left-2 top-2 text-[12px] text-[#888]">
                  {ciRoomDiscountType === 'Amount' ? '₹' : '%'}
                </span>
                <input
                  type="number" min="0"
                  max={ciRoomDiscountType === 'Percent' ? 100 : undefined}
                  placeholder="0"
                  value={ciRoomDiscountAmt}
                  onChange={e => setCiRoomDiscountAmt(e.target.value)}
                  onWheel={e => e.target.blur()}
                  disabled={busy}
                  data-testid="ci-room-discount-input"
                  className="w-full pl-6 pr-2 py-1.5 border border-[#E5E5E5] rounded-md text-[12px]"
                />
              </div>
              {roomDiscountRs > 0 && (
                <span className="text-[11px] text-[#329937] font-medium" data-testid="ci-room-discount-rs">
                  −₹{roomDiscountRs}
                </span>
              )}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[#E5E5E5]">
            <Label>Collect now · optional</Label>
```

---

## Edit E-5 — frontDeskService.js: add conditional fd.append block

**File:** `src/api/services/frontDeskService.js`

**Current (lines 106–107):**
```javascript
  fd.append('firm_gst', p.firmGst ?? '');
  fd.append('upgrade_type', p.upgradeType ?? 'none');
```

**After:**
```javascript
  fd.append('firm_gst', p.firmGst ?? '');
  // BUG-489: mirror CR-407 A-E5 — room discount at check-in (mirrors pmsService.js conditional block)
  if ((p.roomDiscount ?? 0) > 0) {
    fd.append('room_discount',        String(p.roomDiscount));
    fd.append('room_discount_type',   p.roomDiscountType   ?? 'Amount');
    fd.append('room_discount_value',  String(p.roomDiscountValue ?? p.roomDiscount));
    fd.append('room_discount_reason', p.roomDiscountReason ?? '');
  }
  fd.append('upgrade_type', p.upgradeType ?? 'none');
```

---

## Verification Matrix

| # | Edit | Check | Method | Auto? |
|---|------|-------|--------|:---:|
| V-1 | E-1 | `ciRoomDiscountAmt` + `ciRoomDiscountType` state in CheckInForm | grep | YES |
| V-2 | E-2 | `roomDiscountRs` useMemo in CheckInForm | grep | YES |
| V-3 | E-2 | useMemo uses `c.booking_charge` as percent base (OD-489-01 = A) | grep | YES |
| V-4 | E-3 | `roomDiscount` spread inside `checkIn({...})` call | grep | YES |
| V-5 | E-3 | Spread guarded: `roomDiscountRs > 0` | Code confirm | YES |
| V-6 | E-4 | `ci-room-discount-input` testid present in CheckInForm | grep | YES |
| V-7 | E-4 | `ci-room-discount-rs` testid present | grep | YES |
| V-8 | E-4 | `ci-discount-type-amount` + `ci-discount-type-percent` testids present | grep | YES |
| V-9 | E-5 | `fd.append('room_discount', ...)` in frontDeskService conditional | grep | YES |
| V-10 | E-5 | Block is conditional — NOT appended when `p.roomDiscount === 0` | Code confirm | YES |
| V-11 | E-5 | Block appears BETWEEN `firm_gst` and `upgrade_type` appends | grep | YES |
| V-12 | All | webpack compiled with 0 new warnings | build log | YES |
| V-13 | E-4 | Discount field visible in check-in panel on front-desk-v2 | Browser | NO |
| V-14 | E-2+E-3 | Enter 10% → `roomDiscountRs = floor(booking_charge × 10/100)` | Browser | NO |
| V-15 | E-5 | Network tab: `room_discount` field present in FormData on confirm | Browser | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-489 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: row BUG-489 updated with GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: CheckInForm.jsx + frontDeskService.js — BUG-489 + date
- [ ] Code markers: // BUG-489 on all 5 edited blocks
- [ ] Compile check: webpack 0 new warnings
```

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| R1: `c.booking_charge` is 0 on some reservations | `Math.floor(Number(c.booking_charge \|\| 0) * raw / 100)` — returns 0, guard `if (raw <= 0) return 0` catches it |
| R2: Discount sent when both fields are empty | Guard: `...(roomDiscountRs > 0 ? {...} : {})` — never sends if computed value is 0 |
| R3: `busy` state not disabling inputs | Both toggle buttons and number input have `disabled={busy}` |
| R4: Mirror drift in future | Note in code: `// BUG-489: mirror CR-407 Sub-scope A` — traceable for FU-385-C cleanup |
