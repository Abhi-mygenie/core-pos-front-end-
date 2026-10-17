# BUG-582 — TableCard: Inline status text labels ("• Preparing", "• Ready", "• Served") should be removed from table view

**ID:** BUG-582
**Type:** BUG
**Registered:** 2026-10-17
**Registered by:** INTAKE agent (owner voice — session 2026-10-17)
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE

---

## 1. Description

The table view (TableCard.jsx) shows inline status text labels next to the waiter/customer name:
- `• Preparing` (fOrderStatus === 1)
- `• Ready` (fOrderStatus === 2)
- `• Served` / `• Dispatched` (fOrderStatus === 5)
- `• Confirming` (fOrderStatus === 7)

Owner directive: **remove all these inline text labels from the table view.** The 2px coloured border (CR-433) already communicates status visually — the text labels are redundant and clutter the card.

---

## 2. Classification

- **Type:** BUG (undesired text present in UI)
- **Severity:** P2 — cosmetic, not blocking any flow
- **Risk:** LOW — display-only change, no logic, no API, no state
- **Fast Lane eligible:** YES (1 file, ≤5 lines, LOW risk, no hotspot, no financial logic)

---

## 3. Evidence

- **Source:** OWNER-REPORTED (voice — 2026-10-17 session)
- **Steps to reproduce:** Login → Dashboard → table view → any occupied table → waiter name row shows "• Preparing" / "• Ready" / "• Served"
- **Screenshot:** not provided
- **Confidence:** CONFIRMED — code verified live at TableCard.jsx lines 437-441

### Code location (confirmed by grep):
```jsx
// TableCard.jsx lines ~437-441
{table.fOrderStatus === 1 && <span style={{ color: COLORS.primaryOrange }}> • Preparing</span>}
{table.fOrderStatus === 2 && <span style={{ color: COLORS.primaryGreen }}> • Ready</span>}
{table.fOrderStatus === 5 && <span style={{ color: COLORS.primaryGreen }}> • {isAggregator ? 'Dispatched' : 'Served'}</span>}
{table.fOrderStatus === 7 && <span style={{ color: COLORS.amber }}> • Confirming</span>}
```

---

## 4. Blast Radius

- **Files:** 1 — `src/components/cards/TableCard.jsx`
- **Lines:** ~4 (remove 4 span elements)
- **Hotspot files touched:** NO
- **Estimated scope:** SMALL
- **Downstream risk:** NONE — purely cosmetic removal

---

## 5. Duplicate Check

- **CR-433:** Implemented status borders in TableCard. Gap A noted removal of these labels but CR-433 implementation did NOT remove them. This is DISTINCT — the labels were added during CR-433 and not cleaned up.
- **BUG-581:** Item-level action word labels in OrderCard — DISTINCT (different component, different labels)
- **Duplicate check result:** DISTINCT

---

## 6. Related

- **Related to:** CR-433 (Gap A note), Gap A handover (SESSION_HANDOVER_2026_10_17_NOV_BATCH_SESSION2_CLOSE.md §2)

---

## 7. Open Questions

None. Owner directive is clear: remove all four inline status labels from TableCard.

---

## 8. Next Step

Fast Lane eligible. Awaiting owner Fast Lane approval → Implementation (1 file, remove 4 lines).
