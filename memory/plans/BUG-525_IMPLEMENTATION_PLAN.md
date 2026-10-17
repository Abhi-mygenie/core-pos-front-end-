# BUG-525 — Implementation Plan (Gate 3)
## Split Room Payment Legs Amount Cap

**Date:** 2026-10-09
**Risk:** MEDIUM
**Impact Analysis:** `impact/BUG-525_IMPACT_ANALYSIS.md`
**OD-525-01:** BLOCK (confirmed)

---

## Scope Lock

**Files WILL change:**
- `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` — 5 edits

**Files WILL NOT touch:**
- `CollectPaymentPanel.jsx` (R5)
- `frontDeskService.js`
- `profileTransform.js`
- Any test files

---

## Edits

### E1 — `FolioCheckoutPanel.jsx` after L273: add `roomSplitTotal` + `roomSplitOverBalance` useMemos

**Insert after current L273** (`}, [roomDiscount, roomDiscountType, maxCheckoutDiscount, row.charge?.booking_charge]);`):

**Current L273-274:**
```js
  }, [roomDiscount, roomDiscountType, maxCheckoutDiscount, row.charge?.booking_charge]);
  // BUG-522: foodDiscountRs removed — CPP's collectBillExisting handles F&B discount natively
```

**New L273-283:**
```js
  }, [roomDiscount, roomDiscountType, maxCheckoutDiscount, row.charge?.booking_charge]);
  // BUG-525: room split legs over-balance guard
  const roomSplitTotal = useMemo(() =>
    roomSplitEnabled ? roomSplitLegs.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0) : 0,
    [roomSplitEnabled, roomSplitLegs]
  );
  const roomSplitOverBalance = useMemo(() => {
    if (!roomSplitEnabled) return false;
    const effectiveBalance = Math.max(0, (baseBalance ?? 0) - roomDiscountInfoRs);
    return effectiveBalance > 0 && roomSplitTotal > effectiveBalance;
  }, [roomSplitEnabled, roomSplitTotal, baseBalance, roomDiscountInfoRs]); // BUG-525
  // BUG-522: foodDiscountRs removed — CPP's collectBillExisting handles F&B discount natively
```

---

### E2 — `FolioCheckoutPanel.jsx` L45: add props to `RoomDiscountControls`

**Current L45:**
```js
  maxCheckoutDiscount, baseBalance,
}) => {
```

**New L45:**
```js
  maxCheckoutDiscount, baseBalance, roomSplitOverBalance, roomSplitTotal, // BUG-525
}) => {
```

---

### E3 — `FolioCheckoutPanel.jsx` after L135: add over-balance alert in `RoomDiscountControls`

**Current L133-139:**
```jsx
              className="text-[10px] text-[#329937] mt-0.5">+ Add leg</button>
          </div>
        )}
      </div>
    </div>
  );
};
```

**New L133-145:**
```jsx
              className="text-[10px] text-[#329937] mt-0.5">+ Add leg</button>
          </div>
        )}
        {/* BUG-525: over-balance alert — mirrors discountOverMax alert pattern */}
        {roomSplitOverBalance && (
          <div className="text-[11px] text-[#B91C1C] bg-red-50 border border-red-200 rounded px-2 py-1 mt-1" data-testid="bill-room-split-over-balance-alert">
            Split total ₹{roomSplitTotal?.toLocaleString()} exceeds room balance. Reduce leg amounts.
          </div>
        )}
      </div>
    </div>
  );
};
```

---

### E4 — `FolioCheckoutPanel.jsx` L285: add guard in `handlePaid`

**Current L285:**
```js
    if (discountOverMax) { setPayError('Discount % exceeds the maximum for this booking. Reduce % or switch to Amount mode.'); return; }
```

**New L285-286:**
```js
    if (discountOverMax) { setPayError('Discount % exceeds the maximum for this booking. Reduce % or switch to Amount mode.'); return; }
    if (roomSplitOverBalance) { setPayError('Split room payment total exceeds the room balance. Reduce the leg amounts.'); return; } // BUG-525
```

---

### E5 — `FolioCheckoutPanel.jsx` L362-363: pass new props to `RoomDiscountControls` JSX

**Current L362-363:**
```jsx
                maxCheckoutDiscount={maxCheckoutDiscount} baseBalance={baseBalance}
              />
```

**New L362-363:**
```jsx
                maxCheckoutDiscount={maxCheckoutDiscount} baseBalance={baseBalance}
                roomSplitOverBalance={roomSplitOverBalance} roomSplitTotal={roomSplitTotal} />
```

---

## Execution Order

E1 first (defines `roomSplitTotal` + `roomSplitOverBalance` in main scope)
→ E2 + E3 in parallel (different sections of `RoomDiscountControls`)
→ E4 + E5 in parallel (different sections of main component)

---

## Verification Matrix

| Edit | File | How to verify | Automated? |
|---|---|---|:---:|
| E1 | FolioCheckoutPanel.jsx | `grep -n "roomSplitTotal\|roomSplitOverBalance" FolioCheckoutPanel.jsx` → found | YES |
| E2 | FolioCheckoutPanel.jsx | `grep -n "roomSplitOverBalance" FolioCheckoutPanel.jsx` → in props L45 | YES |
| E3 | FolioCheckoutPanel.jsx | `grep -n "bill-room-split-over-balance-alert" FolioCheckoutPanel.jsx` | YES |
| E4 | FolioCheckoutPanel.jsx | `grep -n "Split room payment total" FolioCheckoutPanel.jsx` | YES |
| E5 | FolioCheckoutPanel.jsx | `grep -n "roomSplitTotal={roomSplitTotal}" FolioCheckoutPanel.jsx` | YES |
| V1 | Browser | Legs total > balance → alert shows, Checkout blocked | NO |
| V2 | Browser | Legs total ≤ balance → no alert, Checkout proceeds | NO |
| V3 | Browser | roomSplitEnabled = Off → no validation at all | NO |
| V4 | Compile | webpack 0 new warnings | YES |

---

## Post-Code Registry Checklist

```
□ 1. registry.json: BUG-525 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
□ 2. BUG_TRACKER.md: BUG-525 row → GATE_5A_IMPLEMENTED
□ 3. FILE_OWNERSHIP.md: FolioCheckoutPanel.jsx → BUG-525, 2026-10-09
□ 4. Code markers: // BUG-525 in all 5 edited locations ✓ (in plan above)
□ 5. Compile check: webpack 0 new warnings
```
