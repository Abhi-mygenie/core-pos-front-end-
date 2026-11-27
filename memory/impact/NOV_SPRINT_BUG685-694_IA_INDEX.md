# IA Bundle — QA Nov Sprint defects BUG-685 … BUG-694 (Gate 2)

**Date:** 2026-11-18 · **Stage:** Gate 2 Impact Analysis only (no code) · **Build:** main @ c30f4c05

All 10 bugs are now `GATE_2_IA_COMPLETE` in `registry.json`.

## Contents
| File | Bug(s) | Risk | Summary |
|------|--------|------|---------|
| BUG-685_IMPACT_ANALYSIS.md | 685 | HIGH 🔴 | Add-to-cart crash — CartPanel missing `onEdit` prop |
| BUG-686_IMPACT_ANALYSIS.md | 686 | HIGH 🟠 | Dashboard wipes running orders on rejected poll |
| BUG-687_BUG-691_AUDIT_LOG_IMPACT_ANALYSIS.md | 687 + 691 | MED/LOW | Audit Log spec vs CR-546 v3; TIME cell "2026-" clip (same file, batch) |
| BUG-688_IMPACT_ANALYSIS.md | 688 | LOW | `join_restaurant` double-emit on reconnect |
| BUG-689_IMPACT_ANALYSIS.md | 689 | LOW | Auto-email hard-appends `.com` |
| BUG-690_IMPACT_ANALYSIS.md | 690 | LOW | Add-on list no refresh after create |
| BUG-692_IMPACT_ANALYSIS.md | 692 | LOW | "New version" banner / build-id mismatch (likely env) |
| BUG-693_IMPACT_ANALYSIS.md | 693 | LOW | Login logo blank (remote asset) |
| BUG-694_IMPACT_ANALYSIS.md | 694 | MED | `/loading` >10s boot chain |

## Conflict
BUG-687 + BUG-691 + existing BUG-695…700 all edit `AuditLogMockup.jsx` → Gate 3 must batch in one pass.

## Owner decisions — RESOLVED 2026-11-18
- **OD-687-01 = A** keep CR-546 v3 (locked). BUG-687 working-as-designed → recommend CLOSE, retire CR-528 spec. No code.
- **OD-689-01 = restaurant's REAL domain** (not hard-coded `.com`). Gate 3: source domain from restaurant record/config.
- **OD-692-01 = A** preview build-id/env artifact, not a code defect. Fix env `REACT_APP_BUILD_ID` vs `version.json`.
- **OD-693-01 = A** bundle the logo as a static asset (replace remote `GENIE_LOGO_URL`).
- **OD-694-01 = INVESTIGATION** loaders already parallel; confirm the real sequential/slow loader before any fix. Route to INVESTIGATION, not Gate 3.

## Next
Owner review → Gate 3 Implementation Plans. Start with BUG-685 (BLOCKER) + BUG-686 (MAJOR).
