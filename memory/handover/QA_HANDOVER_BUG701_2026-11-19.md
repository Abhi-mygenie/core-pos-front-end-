# QA Handover — BUG-701 (Room edit-confirm popup disappears on item-cancel)

**Date:** 2026-11-19 · **QA Role Handover**  
**Implementer:** Abhishek · **Sprint:** nov_cr_batch

---

## 1. Inherited from Plan — Verification Matrix

| Edit # | File | Change Description | Self-Test Result |
|--------|------|--------------------|:---:|
| E-1a | `src/contexts/OrderContext.jsx` L147 | `// BUG-701` marker present | ✅ Verified — grep confirms |
| E-1b | `src/contexts/OrderContext.jsx` L154-158 | Guard block: `const existing = prev.find(...); let merged = updatedOrder; if (existing && existing.isWebOrder && !updatedOrder.isWebOrder) { merged = {...} }` | ✅ Verified — code review L147-165 |
| E-1c | webpack compile | 0 new warnings from BUG-701 change | ✅ PASS — "webpack compiled with 1 warning" (pre-existing SettlementReportMockup lint, not OrderContext) |
| E-1d | No other lines changed | Only updateOrder block modified | ✅ Verified — diff confined to L147-158 |

**Self-test: 4/4 edits verified. Compile: PASS (0 new warnings).**

---

## 2. Test Cases for QA

### TC-01 (PRIMARY — BUG fix) Room web-edit popup stays on item-cancel
**Risk:** HIGH · **Priority:** BLOCKER if fails  
**Account:** owner@cafe103.com / Qplazm@10 (or pms@macha.com for RID 69)  
**Precondition:** Need a room order with at least one unconfirmed web-edit item (food_status=7)

Steps:
1. Log in to preprod.mygenie.online
2. Navigate to Dashboard
3. Locate a room order that has the edit-confirm popup visible (ScanOrderPopOut)
4. In the popup, cancel one newly-added item
5. Observe: does the popup remain open with the remaining items?

Expected: Popup **stays open** after the cancel. Remaining unconfirmed items still listed.  
Actual (before fix): Popup disappeared entirely.  
Evidence of fix: `updateOrder` guard fires → `isWebOrder` preserved → `hasUnconfirmedWebEditItems()` stays true → popup remains.

**Fallback if no live room web-edit order:** Verify the guard logic by code inspection:
- L154: `const existing = prev.find(o => o.orderId === orderId)` ← reads prior order from state
- L156: `if (existing && existing.isWebOrder && !updatedOrder.isWebOrder)` ← guard condition
- L157: `merged = { ...updatedOrder, orderFrom: existing.orderFrom, isWebOrder: true }` ← preserves web origin

---

### TC-02 (REGRESSION) Table web-order popup unaffected
Steps:
1. Find a **table** (dine-in) order with unconfirmed web-edit items
2. Cancel one item in the popup
3. Verify popup **stays open** (same as before fix — no regression)

Expected: Table web orders unaffected (they carry `order_from='web'` → `updatedOrder.isWebOrder=true` → guard condition `!updatedOrder.isWebOrder` is **false** → guard does NOT fire → unchanged behaviour)

---

### TC-03 (REGRESSION) Non-web room order — no false popup
Steps:
1. Find a room order that was created via POS (not web-edited)
2. Update any item on it
3. Verify **no** edit-confirm popup appears unexpectedly

Expected: `existing.isWebOrder=false` for non-web room orders → guard does NOT fire → `isWebOrder` stays false → no popup created.

---

### TC-04 (REGRESSION) Paid/cancelled room orders still removed
Steps:
1. Find a room order
2. Mark it as paid/cancelled
3. Verify order **disappears from dashboard**

Expected: Terminal orders go through `removeOrder()` path in socket handlers (not `updateOrder`) → guard irrelevant → removal unaffected.

---

### TC-05 (CODE) Guard correctness — non-web → web impossible
Verify via code reading:
- L156: `if (existing && existing.isWebOrder && !updatedOrder.isWebOrder)` — guard fires ONLY when existing was web. If existing was non-web (`existing.isWebOrder=false`), guard never fires → cannot accidentally promote a non-web order to web.

---

## 3. Regression Tests (from Verification Matrix § what to protect)

| # | What to verify | Why |
|---|----------------|-----|
| R1 | All running orders still appear on Dashboard after login | `updateOrder` path unchanged for non-web orders |
| R2 | dineIn / takeAway / delivery socket updates still work | Guard only adds 1 `find()` + conditional in `else` branch; no structural change |
| R3 | Socket order updates (non-room, non-web) show correct data | Full object replace still happens when guard doesn't fire |
| R4 | BUG-082 poll guard still active (useOrderPollingReconciliation.js L174-177) | Not touched by this change |

---

## 4. Registry Sync Confirmation

```
Registry synced:        YES
Item:                   BUG-701 → status: IMPLEMENTED
Sprint:                 nov_cr_batch
FILE_OWNERSHIP.md:      BUG-701 IMPL row added for OrderContext.jsx
BUG_TRACKER.md:         BUG-701 row → IMPLEMENTED
Code marker:            // BUG-701 at OrderContext.jsx L147
EXIT GATE:              5/5 PASS
  □1 Registry: PASS (registry.json updated)
  □2 BUG_TRACKER: PASS (row updated)
  □3 FILE_OWNERSHIP: PASS (IMPL row added)
  □4 Code marker: PASS (// BUG-701 at L147)
  □5 Compile: PASS (0 new warnings from this change)
```

---

## 5. Credentials + Environment

**Test account:** owner@cafe103.com / Qplazm@10  
**Alternative (original investigation account):** pms@macha.com (restaurant 69) — for room order context  
**Preprod URL:** https://preprod.mygenie.online  
**Local preview:** http://localhost:3000  

**Key file changed:** `src/contexts/OrderContext.jsx` lines 147–164 (updateOrder function)  
**Files NOT changed:** socketHandlers.js, orderTransform.js, useOrderPollingReconciliation.js, ScanOrderPopOut.jsx
