# BUG-398 Implementation Plan — Gate 3
## CR-163 Move Items: Path B hidden — missing roomNo fallback

**ID:** BUG-398
**Date:** 2026-09-13
**Planning agent:** ROLE 2 (AGENT_PROMPT_ALPHA v0.7)
**Risk:** HIGH (R5 hotspot)
**Impact Analysis:** `impact/BUG-398_IMPACT_ANALYSIS.md`

---

## Scope Lock

**Files WILL change:**
- `src/components/order-entry/OrderEntry.jsx`

**Files will NOT touch:**
- `SplitRoomItemsModal.jsx`
- `orderTransform.js`
- `tableTransform.js`
- `roomService.js`
- `pmsService.js`
- `DashboardPage.jsx`
- Any other file

---

## Edit Sites — 1 total

### E1 — `OrderEntry.jsx` ≈ L2798 — `roomNo` prop fallback

**Location:** Inside `{showSplitModal && table?.isRoom && ( <SplitRoomItemsModal ... /> )}` block.

**Current (wrong):**
```jsx
        <SplitRoomItemsModal
          cartItems={cartItems}
          roomNo={orderData?.roomInfo?.roomNo}
          onClose={() => setShowSplitModal(false)}
          onSplit={handleSplitRoomItems}
          freeTables={freeDineInTables}
        />
```

**New (correct):**
```jsx
        <SplitRoomItemsModal
          cartItems={cartItems}
          roomNo={orderData?.roomInfo?.roomNo || table?.tableNumber} {/* BUG-398: fallback to table.tableNumber when room_info.room_no absent */}
          onClose={() => setShowSplitModal(false)}
          onSplit={handleSplitRoomItems}
          freeTables={freeDineInTables}
        />
```

**Change:** Add `|| table?.tableNumber` to the `roomNo` prop — one additional token.

**Verification:** After edit, `grep -n "roomNo" OrderEntry.jsx` must show `|| table?.tableNumber` on that line.

---

## Execution Sequence

```
1. Verify L2798 current state matches plan (Entry Verification — mandatory per R5 hotspot)
2. Apply E1
3. Webpack compile check — 0 new warnings
4. Self-test Verification Matrix
```

---

## Verification Matrix

| # | Test | How | Expected |
|---|---|---|---|
| V-01 | `roomNo` prop has fallback | Grep: `grep -n "table?.tableNumber" OrderEntry.jsx` | Returns L2798 with `|| table?.tableNumber` |
| V-02 | `room_info.room_no` path unchanged | Grep: `orderData?.roomInfo?.roomNo` still present on same line | Yes — `||` preserves existing value |
| V-03 | Compile clean | `tail /var/log/supervisor/frontend.out.log` | `webpack compiled with 1 warning` (same pre-existing warning, 0 new) |
| V-04 | Browser: Path B Create row visible | Open room order → Move Items → Path B "Create Room r5" row renders with dashed border + PlusCircle | Visible |
| V-05 | "or" divider visible | Between free table cards and Create row | "or" line separator present |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-398 → status: IMPLEMENTED, gate: 5, sprint_key: pos_pms_1
- [ ] BUG_TRACKER.md: row updated to IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: OrderEntry.jsx entry added for BUG-398
- [ ] Code marker: // BUG-398 comment on modified line
- [ ] Webpack: 0 new warnings
```

---

## Risk Register

| Risk | Level | Mitigation |
|---|---|---|
| Line drift from CR-163 | LOW | Entry verify: confirm L2798 reads `roomNo={orderData?.roomInfo?.roomNo}` before editing |
| `table?.tableNumber` undefined for walk-in | N/A | Guard `table?.isRoom` at L2795 ensures this block only runs for room orders |
| `\|\|` evaluates wrong when roomNo is `""` (empty string) | LOW | `""` is falsy in JS → fallback fires correctly |

---

*Plan complete: BUG-398. Gate 3 DONE. Awaiting Gate 4 GO from owner.*
