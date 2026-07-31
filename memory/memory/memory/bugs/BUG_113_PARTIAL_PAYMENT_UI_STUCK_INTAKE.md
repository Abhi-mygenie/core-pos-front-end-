# BUG-113 — Partial Payment UI Stuck — Auto-Fill Locks Amount Fields

**Status:** DISCOVERY COMPLETE
**Priority:** P1
**Sprint:** POS 4.0
**Opened:** 2026-06-07
**Reporter:** Owner
**Component:** CollectPaymentPanel.jsx

---

## 1. Problem Statement (Owner Verbatim)

> In partial payment, when we are doing a partial payment for cash, card and UPI, the UI gets stuck. Auto-filling is happening for the amount, and we are not able to refill that amount.

---

## 2. Root Cause (Code-Traced)

### File: `CollectPaymentPanel.jsx` L2626–2645 — Split payment `onChange` handler

```js
onChange={(e) => {
  const typedVal = e.target.value;
  const typedNum = parseFloat(typedVal) || 0;
  setSplitPayments(prev => {
    const newSplit = prev.map(s => ({ ...s }));
    // BUG-080: cap at effectiveTotal minus other rows
    const othersSum = newSplit.reduce((sum, s, i) => i !== idx ? sum + (parseFloat(s.amount) || 0) : sum, 0);
    const maxForThisRow = Math.max(0, Math.round((effectiveTotal - othersSum) * 100) / 100);
    const cappedNum = Math.min(typedNum, maxForThisRow);
    const cappedVal = typedNum > maxForThisRow ? String(cappedNum) : typedVal;
    newSplit[idx].amount = cappedVal;
    // BUG-080 enhancement: 2-row auto-fill
    if (newSplit.length === 2) {
      const otherIdx = idx === 0 ? 1 : 0;
      const remaining = Math.max(0, Math.round((effectiveTotal - cappedNum) * 100) / 100);
      newSplit[otherIdx].amount = remaining > 0 ? String(remaining) : "";
    }
    return newSplit;
  });
}}
```

### Three problems identified:

**Problem 1 — Circular auto-fill (2 split rows):**
When restaurant has exactly 2 enabled payment methods (e.g., Cash + UPI), `splitPayments.length === 2`, and the auto-fill block at L2639 fires on every keystroke:
1. User types "50" in Cash → UPI auto-fills with `effectiveTotal - 50`
2. User tries to edit UPI → types "30" → Cash auto-fills with `effectiveTotal - 30`
3. Editing one field always overwrites the other → **circular ping-pong**

**Problem 2 — Can't clear a field to retype:**
When user backspaces to empty, `parseFloat("") || 0 = 0`, so `cappedNum = 0`. For 2-row case, the other row auto-fills with full `effectiveTotal`. For 3-row case, `maxForThisRow` recalculates based on the other (now locked) amounts. User is stuck.

**Problem 3 — Real-time capping prevents free entry (3 rows):**
Even with 3 rows (Cash + Card + UPI, `length !== 2` so no auto-fill), the capping logic at L2632-2635 limits what you can type. If Card already has ₹500 and UPI has ₹200, Cash max = `effectiveTotal - 700`. User can't type a larger number in Cash without first clearing Card/UPI — but clearing those triggers their own recalculation.

### How split rows are initialized (L340-343):
```js
const [splitPayments, setSplitPayments] = useState(() => {
  return (enabledPrimaryMethods.length > 0 ? enabledPrimaryMethods : ['cash']).map(m => ({
    method: m, amount: "", transactionId: "",
  }));
});
```
Row count = number of enabled methods (Cash/UPI/Card). Commonly 2 or 3.

---

## 3. Impact Analysis

| Scenario | # Rows | Auto-fill? | Stuck? |
|---|---|---|---|
| Cash + Card | 2 | YES (L2639) | **YES — circular override** |
| Cash + UPI | 2 | YES (L2639) | **YES — circular override** |
| Cash + Card + UPI | 3 | NO | **PARTIAL — capping prevents redistribution** |

---

## 4. Affected Files

| File | Lines | Issue |
|---|---|---|
| `CollectPaymentPanel.jsx` | L2626–2645 | `onChange` handler — auto-fill + capping logic |
| `CollectPaymentPanel.jsx` | L340–343 | `splitPayments` initialization |

---

## 5. Fix Options

### Option A — Remove real-time auto-fill, only auto-fill last row (RECOMMENDED)
- Remove the 2-row auto-fill block (L2639-2643)
- Instead: auto-fill only the **last empty row** with the remaining amount on blur (not on every keystroke)
- Remove real-time capping — validate on submit only
- Show "Remaining: ₹X" label (already exists at L2685) as guidance

### Option B — Auto-fill only on focus-out (blur)
- Keep auto-fill logic but move to `onBlur` instead of `onChange`
- User can freely type; distribution happens when they leave the field

### Option C — "Distribute" button
- Remove all auto-fill from `onChange`
- Add an explicit "Auto-distribute" button that splits evenly or fills remaining

---

## 6. Open Questions

| # | Question |
|---|---|
| Q-113-1 | Should remaining auto-fill into the last row, or show as "Remaining: ₹X" for manual entry? |
| Q-113-2 | Should capping be removed entirely (allow over-entry, validate on submit) or kept as a warning? |
