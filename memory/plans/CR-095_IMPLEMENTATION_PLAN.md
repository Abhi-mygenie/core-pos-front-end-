# CR-095 — Implementation Plan: Waiter-to-Waiter Transfer (Unlock Settlement Feature)

**ID:** CR-095
**Gate:** 3 (Implementation Plan)
**Risk:** HIGH (R6 — settlement/money)
**Code Reality:** PARTIAL — modal shell exists, all inputs disabled
**Impact Analysis:** `/app/memory/impact/CR-095_IMPACT_ANALYSIS.md` — verified accurate 2026-07-22

---

## Scope Lock

**Files WILL change:**
1. `components/panels/SettlementPanel.jsx` — enable transfer modal + wire API
2. `api/services/settlementService.js` — add `transferCollection()` function

**Files WILL NOT touch:** `constants.js`, `App.js`, `Sidebar.jsx`, `settlementTransform.js`, `DayClosurePage.jsx`, `SettlementPage.jsx` (standalone page — mirror later if needed), `SettlementMockup.jsx`

---

## Execution Sequence

### Edit 1: `api/services/settlementService.js` — Add transfer function

**After line 35** (after `selfSettle`), insert:

```javascript
/** CR-095: Transfer collection between waiters */
export const transferCollection = (payload) =>
  api.post(`${BASE}/transfer-collection`, payload);
```

**Verification:** `grep -n "transferCollection" /app/frontend/src/api/services/settlementService.js` → returns line number

---

### Edit 2: `components/panels/SettlementPanel.jsx` — Add transfer state variables

**After line 47** (`const [transferModal, setTransferModal] = useState(null);`), insert:

```javascript
  // CR-095: Transfer modal state
  const [selectedToWaiter, setSelectedToWaiter] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferType, setTransferType] = useState('full');
  const [transferRemark, setTransferRemark] = useState('');
  const [transferring, setTransferring] = useState(false);
```

**Verification:** `grep -c "transferType\|transferRemark\|transferring" SettlementPanel.jsx` → 3+ hits

---

### Edit 3: `components/panels/SettlementPanel.jsx` — Add reset + submit handlers

**After the `handleOpeningBalance` function** (around line 130, after its closing `};`), insert:

```javascript
  // CR-095: Transfer handlers
  const resetTransferState = () => {
    setSelectedToWaiter('');
    setTransferAmount('');
    setTransferType('full');
    setTransferRemark('');
  };

  const handleTransfer = async () => {
    if (!selectedToWaiter || transferring) return;
    const amt = transferType === 'full'
      ? parseFloat(transferModal.balanceToSettle) || 0
      : parseFloat(transferAmount) || 0;
    if (amt <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }
    if (amt > (parseFloat(transferModal.balanceToSettle) || 0)) {
      toast({ title: 'Amount exceeds available balance', variant: 'destructive' });
      return;
    }
    setTransferring(true);
    try {
      const res = await settlementService.transferCollection({
        from_waiter_id: transferModal.waiterId,
        to_waiter_id: parseInt(selectedToWaiter),
        date: formatDateISO(date),
        transfer_type: transferType,
        amount: amt,
        remark: transferRemark || undefined,
      });
      toast({ title: res.data?.message || 'Transfer successful' });
      setTransferModal(null);
      resetTransferState();
      fetchReport(date);
    } catch (err) {
      toast({ title: err.readableMessage || 'Transfer failed', variant: 'destructive' });
    } finally {
      setTransferring(false);
    }
  };
```

**Verification:** `grep -n "handleTransfer" SettlementPanel.jsx` → returns line number

---

### Edit 4: `components/panels/SettlementPanel.jsx` — Replace transfer modal body (L455-491)

**Replace the entire block** from `{/* ── Transfer Modal (Backend-Blocked) ── */}` to its closing `)}` with:

```jsx
      {/* ── Transfer Modal — CR-095 ── */}
      {transferModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" data-testid="transfer-modal">
          <div className="bg-white rounded-2xl w-[440px] shadow-xl">
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: COLORS.borderGray }}>
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4" style={{ color: "#8B5CF6" }} />
                <div>
                  <h3 className="text-base font-semibold" style={{ color: COLORS.darkText }}>Transfer Cash</h3>
                  <p className="text-xs" style={{ color: COLORS.grayText }}>From: {transferModal.name} · {fmt(transferModal.balanceToSettle)}</p>
                </div>
              </div>
              <button onClick={() => { setTransferModal(null); resetTransferState(); }} className="p-1 rounded-lg hover:bg-gray-100" data-testid="transfer-close-btn"><X className="w-4 h-4" style={{ color: COLORS.grayText }} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Transfer To */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: COLORS.grayText }}>Transfer To</label>
                <select
                  value={selectedToWaiter}
                  onChange={e => setSelectedToWaiter(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-purple-200"
                  style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                  data-testid="transfer-to-select"
                >
                  <option value="">Select waiter...</option>
                  {(waiterList.length > 0 ? waiterList : waiters).filter(w => (w.id || w.waiterId) !== transferModal.waiterId).map(w => (
                    <option key={w.id || w.waiterId} value={w.id || w.waiterId}>{w.name}</option>
                  ))}
                </select>
              </div>
              {/* Transfer Type */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: COLORS.grayText }}>Transfer Type</label>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => { setTransferType('full'); setTransferAmount(String(Math.abs(parseFloat(transferModal.balanceToSettle) || 0))); }}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-all ${transferType === 'full' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                    data-testid="transfer-type-full"
                  >Full</button>
                  <button
                    onClick={() => { setTransferType('partial'); setTransferAmount(''); }}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-all ${transferType === 'partial' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                    data-testid="transfer-type-partial"
                  >Partial</button>
                </div>
              </div>
              {/* Amount */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: COLORS.grayText }}>Amount</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: COLORS.grayText }}>₹</span>
                  <input
                    type="number" min={0}
                    value={transferType === 'full' ? Math.abs(parseFloat(transferModal.balanceToSettle) || 0) : transferAmount}
                    onChange={e => setTransferAmount(e.target.value)}
                    readOnly={transferType === 'full'}
                    className={`w-full pl-7 pr-4 py-2.5 text-lg font-mono rounded-lg border outline-none focus:ring-2 focus:ring-purple-200 ${transferType === 'full' ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                    data-testid="transfer-amount-input"
                  />
                </div>
              </div>
              {/* Remark */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wide" style={{ color: COLORS.grayText }}>Remark <span className="normal-case">(optional)</span></label>
                <textarea
                  value={transferRemark}
                  onChange={e => setTransferRemark(e.target.value)}
                  rows={2}
                  placeholder="e.g. Waiter left mid shift"
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-purple-200 resize-none"
                  style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                  data-testid="transfer-remark-input"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2" style={{ borderColor: COLORS.borderGray }}>
              <button onClick={() => { setTransferModal(null); resetTransferState(); }} className="px-4 py-2 text-sm rounded-lg border" style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }} data-testid="transfer-cancel-btn">Cancel</button>
              <button
                onClick={handleTransfer}
                disabled={!selectedToWaiter || transferring}
                className="px-6 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                style={{ background: "#8B5CF6" }}
                data-testid="transfer-submit-btn"
              >{transferring ? 'Transferring...' : 'Transfer'}</button>
            </div>
          </div>
        </div>
      )}
```

**Verification:** Screenshot Day Closure → click Transfer on a waiter → modal opens with enabled inputs

---

## Verification Matrix

| Edit # | File | Change Description | How to Verify | Automated? |
|--------|------|--------------------|---------------|:---:|
| 1 | `settlementService.js:37` | Add `transferCollection()` | `grep transferCollection settlementService.js` returns match | NO |
| 2 | `SettlementPanel.jsx:48-53` | Add 5 state variables | `grep transferType SettlementPanel.jsx` returns match | NO |
| 3 | `SettlementPanel.jsx:~131` | Add `resetTransferState` + `handleTransfer` | `grep handleTransfer SettlementPanel.jsx` returns match | NO |
| 4 | `SettlementPanel.jsx:455+` | Replace disabled modal with enabled modal | Browser: /day-closure → expand waiter → Transfer → modal opens → inputs enabled → select waiter + amount → submit | NO |
| 5 | — | Compile check | webpack compiles with 0 new warnings | NO |
| 6 | — | API integration test | curl transfer endpoint with valid waiter IDs → success response | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-095 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: CR-095 row updated with IMPLEMENTED + files list
- [ ] FILE_OWNERSHIP.md: add SettlementPanel.jsx (CR-095), settlementService.js (CR-095)
- [ ] Code markers: // CR-095 comment in every modified file
```

---

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Double-click submits twice | MEDIUM | `transferring` state disables button during API call |
| Amount > balance | HIGH | Client-side validation before API call |
| Transfer to self | LOW | Dropdown filters out source waiter by ID |
| Date format mismatch | MEDIUM | Uses existing `formatDateISO(date)` — YYYY-MM-DD |
| Modal state leak on close | LOW | `resetTransferState()` on both Cancel and X button |

---

## Next
Gate 4 GO (Owner approval) → Implementation
