# QA Handover — CR-123 — Stock Update Sticky Submit Button

**Date:** 2026-07-31
**Item:** CR-123
**Risk:** LOW
**Implementation Agent:** CR-123 IMPL agent

---

## 1. Inherited from Plan (Verification Matrix)

| Edit # | File | Change | How to Verify | Self-Test Result |
|--------|------|--------|---------------|:---:|
| 1 | SmartPurchasePanel.jsx:217 | `pb-20` on panel container | Scroll to bottom — last row not obscured | ✅ Verified — L217 has `className="pb-20"` |
| 2a | SmartPurchasePanel.jsx:288-297 | Fixed button visible while scrolling | Select item + rate → scroll → button bottom-right | ✅ Verified — `fixed bottom-6 right-6 z-50` at L290 |
| 2b | SmartPurchasePanel.jsx:288-297 | Button hidden when no items selected | No items selected → no button | ✅ Verified — `{activeRows.length > 0 && (...)}` gate at L289 |
| 2c | SmartPurchasePanel.jsx:288-297 | Spinner visible during submit | Click submit → spinner shows, button stays | ✅ Verified — `submitting` state renders `<Loader2>` inside fixed div |
| 2d | SmartPurchasePanel.jsx:288-297 | `data-testid` preserved | `[data-testid="smart-purchase-submit"]` found | ✅ Verified — L292 has `data-testid="smart-purchase-submit"` |

---

## 2. Test Cases for QA Agent

| TC# | Test | Steps | Expected |
|-----|------|-------|---------|
| TC-1 | Button floats on scroll | Inventory → Stock Update → select 1 item + enter rate + select vendor → scroll item list down | "Update Stock (1 vendor)" button always visible at bottom-right regardless of scroll position |
| TC-2 | Button hidden when nothing selected | Open Stock Update → ensure no items selected | No floating button visible anywhere on screen |
| TC-3 | Spinner during submit | Select items with rate → click "Update Stock" → observe immediately | Button shows spinner and stays visible; does NOT disappear during API call |
| TC-4 | Content not obscured | Select items → scroll to very bottom of list | Last item row is fully visible above button (pb-20 clearance) |
| TC-5 | testid preserved | DevTools console: `document.querySelector('[data-testid="smart-purchase-submit"]')` | Returns element (not null) |
| TC-6 | canSubmit gate — disabled when submitting | Click button rapidly twice | Second click has no effect (disabled during submission) |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---------------|-----|
| R-1 | GroupedVendorPreview still renders at top | CR-122 placed it above the list; CR-123 must not affect this |
| R-2 | `handleSubmit` still fires correctly | We only moved the button UI; logic untouched |
| R-3 | Toolbar sticky (`sticky top-0`) still works | BUG-263 fix; separate element, must not conflict with CR-123 `fixed` button |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Items: CR-123
Status: IMPLEMENTED
Sprint: pos_5_0
Gate: 5
EXIT GATE: ALL 5 PASSED
  ✅ 1. registry.json — CR-123 IMPLEMENTED, pos_5_0
  ✅ 2. CR_REGISTRY.md — status: IMPLEMENTED, gates 0-5 all ✅
  ✅ 3. FILE_OWNERSHIP.md — CR-123 entry added (2026-07-31)
  ✅ 4. Code markers — // CR-123 at L217, L288 in SmartPurchasePanel.jsx
  ✅ 5. Compile — webpack 1 warning (pre-existing SettlementReportMockup.jsx:140, 0 new)
```

---

## 5. Credentials + Environment

| Field | Value |
|---|---|
| Login | `owner@18march.com` / `Qplazm@***` |
| URL | From `REACT_APP_BACKEND_URL` in `/app/frontend/.env` |
| Route | Inventory → Stock Update tab → select any item |
| Notes | Items must have a vendor assigned + rate > 0 for `activeRows.length > 0` gate to pass |
