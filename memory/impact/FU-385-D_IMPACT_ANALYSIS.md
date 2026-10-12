# FU-385-D — Impact Analysis (Gate 2)
## Split Button Re-enabled in Folio Checkout (Reversal of D88)

**Date:** 2026-10-09
**Code Reality:** PARTIAL — Split button renders correctly; CSS intentionally hides it (D88). No FE logic change needed.
**Conflict Pre-Check:** No open items touch `frontdesk.css` or `hideSectionRows.cr385.test.js`. PARALLEL-SAFE.
**Risk:** LOW — CSS delete + test guard update. Zero financial, zero API, zero state change.

---

## 1. Root Cause (from investigation)

`frontdesk.css` L33 explicitly hides the Split button within `.frontdesk-bill`:
```css
.frontdesk-bill [data-testid="payment-split-btn"] { display: none; }
```

This rule was added intentionally in CR-385 Phase 4.5b (D88) as a temporary deferral to FU-385-D (this item). The Split button IS rendered by React and works correctly — it is only hidden by CSS.

---

## 2. Data Flow

```
FolioCheckoutPanel renders CollectPaymentPanel (lazy, Suspense)
  → CPP: restaurantPaymentTypes.includes({name:'partial'}) → enabledLayout.row2 = ['split',...]
  → CPP renders: <button data-testid="payment-split-btn">Split</button>  ← EXISTS in DOM
  → frontdesk.css rule: .frontdesk-bill [data-testid="payment-split-btn"] { display: none }
  → BROWSER: Split button has display:none → invisible ✗
```

BREAK POINT: `frontdesk.css:33` — CSS rule hiding the button.

---

## 3. Affected Files

**WILL CHANGE:**
- `src/components/pms/frontdesk/frontdesk.css`
  - L33: remove `.frontdesk-bill [data-testid="payment-split-btn"] { display: none; }`
- `src/tests/cr385/hideSectionRows.cr385.test.js`
  - L8: remove `'payment-split-btn'` from TOGGLES array
  - L25-27: convert D88 assertion (CSS hides split) → reverse guard (CSS does NOT hide split)

**WILL NOT TOUCH:**
- `CollectPaymentPanel.jsx` (R5) — no change
- `FolioCheckoutPanel.jsx` — no change
- Any payment logic

---

## 4. Test File Impact Detail

Current test (L25-27):
```js
// D88 / Phase 4.5b: Split hidden only under .frontdesk-bill
const splitLines = css.split('\n').filter((l) => l.includes('payment-split-btn'));
expect(splitLines).toEqual(['.frontdesk-bill [data-testid="payment-split-btn"] { display: none; }']);
```

After FU-385-D — replace with reverse regression guard:
```js
// FU-385-D: Split is now SHOWN — assert the hide rule is gone (regression guard: if re-added, test fails)
const splitLines = css.split('\n').filter((l) => l.includes('payment-split-btn'));
expect(splitLines).toHaveLength(0); // FU-385-D: no hide rule for Split in frontdesk.css
```

The `test.each(TOGGLES)` at L14 checks that each testid in TOGGLES still exists in CPP.
After removing `'payment-split-btn'` from TOGGLES, this test no longer checks it — acceptable
because the CPP's `data-testid="payment-split-btn"` is stable and the split-btn regression is now
covered by the reverse guard above.

---

## 5. Downstream Consumers

| Consumer | Effect | Safe? |
|---|---|---|
| Split button in Folio CPP | Now **visible** — cashier can use split payment | ✅ Intended |
| Dashboard CPP | Unchanged — rule was scoped to `.frontdesk-bill` only | ✅ No impact |
| `hideSectionRows` test | Guard updated — asserts CSS hide is GONE (regression guard) | ✅ Stronger guard |
| BUG-524 (FolioCheckoutPanel discount alert) | Unrelated file section — parallel safe | ✅ |

---

## 6. Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Split panel too wide for 440×560 `frontdesk-bill` host box | LOW | CPP row2 is 3-col grid with Split + Credit + More…; fits in 440px |
| Test regression | LOW | Test updated with reverse guard — stronger protection going forward |
| D88 re-introduced accidentally | LOW | Reverse guard in test catches it immediately |

---

## 7. Owner Decisions

None — owner confirmed D88 reversal. FU-385-D was pre-approved as a follow-up CR.

---

## 8. Verification

| # | What to verify | Method |
|---|---|---|
| V1 | `frontdesk.css` no longer has `payment-split-btn` | `grep -c "payment-split-btn" frontdesk.css` → 0 |
| V2 | Split button visible in Folio CPP (Leaving today → Bill) | Browser: verify Split btn in PAYMENT METHOD row 2 |
| V3 | Dashboard CPP: Split unaffected | Browser: dashboard order → Collect Payment → Split still shows |
| V4 | `hideSectionRows` test passes | `npx craco test --testPathPattern=hideSectionRows` |
| V5 | webpack 0 new warnings | `tail frontend.out.log` |

---

Code Reality: PARTIAL (CSS-hidden, logic correct)
Conflict: PARALLEL-SAFE (no open items on these 2 files)
Owner decisions: NONE (D88 reversal confirmed)
Next: Gate 3 Implementation Plan
