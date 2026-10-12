# BUG-493 — Implementation Plan (Gate 3)

**ID:** BUG-493
**Date:** 2026-10-06
**Author:** Planning agent
**Sprint:** oct_bug_batch
**Risk:** MEDIUM
**Files WILL change:** `src/api/services/pmsService.js`
**Files WILL NOT touch:** FolioCheckoutPanel.jsx, CheckInPage.jsx, CheckInForm.jsx, CollectPaymentPanel.jsx, any hotspot (R5)

---

## Scope Lock

**Single file. 2 edit sites. No new imports. No new state.**

---

## Edit E-493-1 — pmsService.js Step 2: expose `row.charge`

**Location:** `src/api/services/pmsService.js` L67
**Current (line 67):**
```javascript
        row.channel       = match.res.channel                  ?? null;
```
**After (insert line 68):**
```javascript
        row.channel       = match.res.channel                  ?? null;
        row.charge        = match.res.charge                   ?? null;  // BUG-493: expose LR charge.sgst/cgst for Step 3 chargeGst
```

**Method:** `search_replace` — insert the new line after L67.

---

## Edit E-493-2 — pmsService.js Step 3: guard `bp === 0` (OD-493-01 Option B)

**Location:** `src/api/services/pmsService.js` L112-114
**Current:**
```javascript
        const roomBalance = bp != null
          ? Math.max(0, bp + chargeGst)
          : Math.max(0, rp + gt - ap - rb - Number(ri.room_discount_amount ?? 0));
```
**After:**
```javascript
        const roomBalance = bp != null
          ? (bp === 0 ? 0 : Math.max(0, bp + chargeGst))   // OD-493-01 Option B: bp=0 → GST waived
          : Math.max(0, rp + gt - ap - rb - Number(ri.room_discount_amount ?? 0));
```

**Method:** `search_replace` — exact string match on the 3-line block.

---

## Verification Matrix

| Edit | File | Change | How to Verify |
|------|------|--------|---------------|
| E-493-1 | pmsService.js L68 | `row.charge` set from `match.res.charge` | grep: `row\.charge\s*=` → 1 hit at L68 |
| E-493-2 | pmsService.js L112-114 | `bp===0 ? 0` guard added | grep: `bp === 0 \? 0` → 1 hit; code review confirms OD-493-01 |
| V-493-2 | In-house table RID 69 | Order 1232903 BALANCE = ₹1,002.50 | Browser: `/pms/front-desk-v2?tab=inhouse` |
| V-493-3 | In-house table RID 69 | Order 1232965 BALANCE = ₹802.50 | Browser |
| V-493-4 | In-house table RID 69 | Order 1232972 (#000324) BALANCE = ₹0 | Browser |
| V-493-5 | Compile | webpack 0 new warnings | `tail -5 /var/log/supervisor/frontend.out.log` |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-493 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-493 row → GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: pmsService.js BUG-493 L67-114 — 2026-10-06
- [ ] Code marker: // BUG-493 present on both edit lines
- [ ] Compile PASS: 0 new warnings
```

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| `match.res.charge` absent for some restaurants (no LR `charge` field) | `?? null` guard → chargeGst falls back to 0 (same as before fix) |
| bp=0 guard hides real GST debt (OD-493-01 Option B) | Owner explicitly chose Option B 2026-10-06 |
| Step 3 fallback formula untouched | Verified: only the `bp != null` branch changes |

---

## Execution Sequence

1. E-493-1 (search_replace on L67)
2. E-493-2 (search_replace on L112-114)
3. Compile check
4. Registry + ownership update
5. Write QA handover

Gate 4 GO → IMPLEMENTATION (planning-skip eligible, owner = this session).
