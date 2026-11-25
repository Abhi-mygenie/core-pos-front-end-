# BUG-675 — BUG-629 Fix Not Working: "definition pending" Text Still Showing in Settlement

**Registered:** 2026-11-12
**Type:** BUG (regression / implementation failure)
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

**BUG-629** (Settlement 'Cash Collected' KPI subtitle shows "Total sale: ₹X · definition pending") was implemented (2026-11-05) and marked `GATE_5B_QA_PASS` on 2026-11-08. However, the owner reports the fix is **not reflected** — the "definition pending" dev artifact text is **still visible** in the Settlement page.

**Current behaviour:** Settlement page still shows "definition pending ⓘ" or "Total sale: ₹X · definition pending" under the Cash Collected KPI subtitle, despite BUG-629 being marked fixed and QA-passed.

**Expected behaviour:** The "definition pending" text is fully removed across all three settlement files, as was the stated fix for BUG-629.

---

## 2. Classification

- **Type:** BUG (regression / implementation not reflected)
- **Severity:** P1 — High (dev artifact visible in production; impacts credibility with end users)
- **Risk:** LOW — same files as BUG-629 fix; text-only change
- **Area:** Reports / Analytics
- **Fast Lane:** NOT eligible until root cause confirmed (is code not deployed? wrong file? conditional render?)

---

## 3. Duplicate Check

- **BUG-629** (parent — GATE_5B_QA_PASS): this is a follow-up / regression on BUG-629
- **Result: RELATED BUG-629** — BUG-675 is a re-open / failure-to-deploy of the BUG-629 fix

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Screenshot:** not provided
- **Confidence:** CONFIRMED by owner

---

## 5. Likely Root Causes (for investigation)

1. Code change exists in repo but not deployed to preprod/production
2. Fix was applied to wrong component (`SettlementMockup.jsx` instead of live `SettlementPage.jsx` / `SettlementPanel.jsx`)
3. Conditional logic renders the text via a different code path not covered by the fix
4. The fix was merged to a branch that hasn't been pulled into the active deployment

---

## 6. Blast Radius

- `src/components/panels/SettlementPanel.jsx`
- `src/pages/SettlementPage.jsx`
- `src/pages/SettlementMockup.jsx`
- **Estimated scope:** SMALL (3 files already identified, same as BUG-629)

---

## 7. Code Reality

- **Status:** PARTIAL — fix exists in codebase (BUG-629 notes: "removed definition pending text from 3 files") but not reflected at runtime

---

## 8. Open Questions

- OD-675-01: Is this a deployment issue (fix not deployed) or a code issue (wrong file/conditional path missed)?
- OD-675-02: Is the text appearing on the live preprod URL or only on the owner's local device?

---

## 9. Related

- BUG-629 (parent — GATE_5B_QA_PASS 2026-11-08, same 3 files)
- CR-033 (original source of "definition pending" artifact)
