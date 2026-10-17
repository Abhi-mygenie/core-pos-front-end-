# SESSION HANDOVER — CR-385 v2.8 owner-feedback amendment

```
Role: PLANNING (ALPHA v0.7) — HTML mockup + planning docs only
Gate: 2.6 OPEN; v2.8 built/verified, owner visual review pending; no Gate 3/4 approval
Registry synced: 5/5 — CR-385 registered at 2.6, unchanged; no application implementation claim
Scope drift: 5/5 — src/, backend, env, frozen baseline unchanged; mockup viewport containment is not a production mobile scope decision
```

Date: 2026-09-18 environment/browser evidence date. Prior inherited handover used 2026-06; retained history without rewriting its dates.

## 1. Current owner intent
Owner asked to read `control/AGENT_PROMPT_ALPHA.md`, choose PLANNING, continue design changes and follow gates. Approved proceeding after the proposal below, clarified row order, then confirmed `yes` twice. No production implementation authorised.

Owner feedback is now recorded in `plans/CR-385_DESIGN_DECISIONS.md` D9–D12:
- **D9 / FB-1:** Right opens at Bill Summary. Adjustments remain above, reachable by scrolling up. Preserve scroll/focus on edits.
- **D10 / FB-2:** Checkout remains visible outside bill scroll, in a viewport-bounded expansion.
- **D11 / FB-3:** Left Guest & stay → ROOM heading → Adjustments → Room Summary → Transferred orders. Room discount type/value/reason remain disabled until BQ-385-07. No second payment form or added room coupon/loyalty/wallet.
- **D12 / FB-4:** Neutral settlement, exact order **Room orders (F&B) → Transferred orders → Room balance → Grand Total**. Owner wording: `room transfer room balance grand total`; confirmed after those labels were repeated. No contrasting orange background/outline/amount colour inside settlement.

## 2. What exists now
`frontend/public/cr385-frontdesk-mockup.html` **v2.8**:
- Approved amendments applied. 560px maximum, viewport-clamped bill/statement. On desktop opening positions expansion within the workstation; narrower browser preview stacks columns. Both scroll independently.
- Right Summary anchored only for new bills. Visible Adjustments/Summary jump links keep hidden-above controls discoverable.
- Neutral settlement, single Cash/Card/UPI/Credit selector, received display/reference, Checkout.
- Unique test IDs for changed Bill controls/critical amounts; row bill IDs `open-bill-102`, `open-bill-103`, `open-bill-105`; tabs `tab-departures`, etc.
- All transactions, print, loyalty/coupon and housekeeping transitions are **MOCKED local demonstrations**. Room discount disabled. No API writes, no integration changes.
- Existing D6 accepted production condition is NOT changed: real CollectPaymentPanel hides Adjustments with transferred orders/no F&B items. Mockup deliberately displays controls for design review and says so.

## 3. QA and fixes
Reports: `/app/test_reports/iteration_5.json`, `iteration_6.json`, **`iteration_7.json` (final 7/7 PASS)**.
- Original amended layout/order/scroll/room/zero-balance/payment demo checks passed in iteration5; found width-switch clipping.
- **Width-switch RCA:** Changing1440→1024 wraps preceding rows by54px. Restoring old outer scroll181 put Checkout bottom803. Fresh reopen recalculated scroll235 and bottom749. Fixed with `revealBill` on width changes/resize; NOT by arbitrary shorter bill height. Inner scroll/focus preserved. Iteration6 and7 verify.
- **Typing RCA:** `type=number` input rebuilt on every edit loses caret; typing1 then0 produced01 →1% → wrong-looking grand2303. Financial formula was correct. Changed mockup input to `type=text inputmode=decimal`, so existing selectionStart/End restoration preserves digits/caret. Suppressed opening animation on same-bill rerenders. Iteration7 verifies genuine typing10, middle edits, Backspace and flat50.5.
- Main final browser confirmation: real typing10+loyalty Room102 →2236; Room103 default2677; Checkout y715/h34 at both desktop width presets, mobile y767/h34; horizontal offenders[] at1920x800 and390x844. Screenshots visible in conversation; browser-tool log reference `/root/.emergent/automation_output/20260918_162522/console_20260918_162522.log`.
- Testing agent screenshot paths under `/app/test_reports/screens/` were NOT actually present. Do not cite them as existing files. Report7 addendum records this and main confirmation.
- Report7 auto-generated financial commentary had an inaccurate explanation; its observed PASS values were correct. Addendum supplies correct Room102 math:699−70−110=519; CGST12.98+SGST12.98; ceil544.96=545; +741+950=2236. Flat50.5: grand2372.
- Syntax check passed. Bill formula region byte-identical to baseline commit a2d866d. No application build/release QA claimed or required for this mockup-only pass.

## 4. Important source reality correction for next gate
**OG-PMS-021**, now in `control/OPEN_GAPS_REGISTER.md` and IA Rev3.2 notes:
- Real `CollectPaymentPanel.jsx` scroll body startsL1321. Payment MethodL2681 is INSIDE it throughL3297. Only Pay ButtonL3299–3326 is outside.
- Old IA claim that payment methods were already pinned was incorrect. Hiding three section rows (~4 lines) does not deliver the approved full settlement layout.
- Q6 is still OPEN. Before production planning, account for settlement placement, initial scroll and row order, not just hidden sections. No CRITICAL-file edits approved in this continuation.

## 5. Files changed
- `frontend/public/cr385-frontdesk-mockup.html` (only executable mockup file)
- `memory/plans/CR-385_DESIGN_DECISIONS.md` (D9–D12, header/process wording)
- `memory/impact/CR-385_IMPACT_ANALYSIS_REV3_GATE_2_6.md` (§7 approved feedback, current gate state, source correction; header remains Rev3.1, consolidation pending)
- `memory/control/OPEN_GAPS_REGISTER.md` (OG-PMS-021)
- `memory/control/FILE_OWNERSHIP.md` (mockup-only row, no production ownership changes)
- `/app/design_guidelines.json` (consultation blueprint; adopted container scroll/reorder details corrected)
- `/app/test_result.md`, `/app/test_reports/iteration_5..7.json`
- `memory/PRD.md`, this handover

**NOT touched:** `frontend/src/`, backend, `.env`, supervisor, dependencies, `memory/final/`, `registry.json`, `CR_REGISTRY.md`, `CONTROL_DASHBOARD.md`, credentials. Source/backend/env/registry verified unchanged via before/after SHA256; registry gate stays2.6. Source code reality still **NONE** for CR-385 workstation.

## 6. Exact next step — owner visual review FIRST
Read this handover + DESIGN_DECISIONS D9–D12. Use preview URL only from frontend `.env` REACT_APP_BACKEND_URL.
1. Open `/cr385-frontdesk-mockup.html` (ribbon v2.8).
2. Departures → Bill **P. Nair · Room103** (owner screenshot case, F&B986 / transferred741 / room950 / total2677).
3. Review initial Summary position, scroll up to Adjustments, scroll left to room/transfers, visible Checkout, neutral row order. Test width1440↔1024 without closing.
4. Ask owner for approval or feedback. **Do not close Gate2.6 from a generic approval of the design.** Require explicit gate close.
5. If more feedback: suggest wording, get approval, append amendments, change mockup, verify. Do not silently re-open Gate2.5 or rebuild frozen sections.

After owner approves visual design:
- Resolve Q6 mechanism with accurate scope reflecting OG-PMS-021. Existing b prop/c wrapper discussion needs to include more than hiding rows.
- Write `backend_briefs/BACKEND_BRIEF_CR-385_ADDENDUM_2_BQ-385-07.md` (room discount API) and mirror if required by existing brief convention.
- Consolidate IA Rev3.2, source counts/risks, then request explicit `close Gate 2.6`.
- ONLY on explicit close: sync registry/CR_REGISTRY/CONTROL_DASHBOARD and PRD.
- Gate3 requires separate owner approval: approved half-day throw-away spike → evidence → implementation plan/verification matrix → owner closeGate3 → Gate4 GO before app code.

## 7. Parked / future (do not pull in now)
- FU-385-A sidebar review; FU-385-C beta cutover/source-copy reconciliation and retirement of old pages; FU-385-D other PMS screen review.
- FU-385-E guest notes; FU-385-F bulk rooms; FU-385-G hourly late checkout; FU-385-H date navigation.
- BQ-385-01 sockets;02 aggregation/trends;03 balances;04 all-channel No-Show;05 check-in/out settings;06 date availability.
- BQ-385-07 room discounts disabled pending contract; CR-364-PRINT folio template.
- Transferred-orders retirement; D-1(b) adjustment eligibility change only if owner revisits accepted D6.
- No refactoring work in this design amendment. Legacy mockup limitations (global adjustment demo state between guests, sample row balances, generic coupon demo) are not live production semantics; use fresh load between arithmetic cases.
