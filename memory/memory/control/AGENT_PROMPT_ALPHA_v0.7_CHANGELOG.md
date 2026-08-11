# AGENT_PROMPT_ALPHA v0.7 — Safe Revision Summary

Source reviewed: `/mnt/data/Pasted markdown(107).md`
Output: `/mnt/data/AGENT_PROMPT_ALPHA_v0_7_SAFE_REVISION.md`

## Revision approach
This is a non-breaking revision. I preserved the existing v0.6 role structure, gates, registry sync rules, code markers, QA flow, audit flow, closure flow, release flow, backend quirks, and high-risk file warnings.

## Changes made
1. Updated header/status from mixed v0.5/v0.6 references to v0.7.
2. Added v0.7 Non-Breaking Operating Layer.
3. Added Session Scope Rule to prevent unrelated-thread assumptions.
4. Added Secret Hygiene Rule and replaced raw test credentials with secure aliases.
5. Added Role Decision Tree for faster role selection.
6. Added mandatory Risk Classification: LOW / MEDIUM / HIGH / CRITICAL.
7. Added owner-approved Fast Lane for tiny safe changes only.
8. Added Owner Approval Matrix.
9. Added Standard Final Response Formats per role group.
10. Added Backend Handoff Template.
11. Added Artifact Naming Standard while keeping legacy paths valid.
12. Added Intake Step 1b for risk classification.
13. Added Planning risk verification.
14. Added Implementation scope/risk approval reminder.
15. Added shared rules R19-R24.
16. Updated What Not To Do with secret hygiene, Fast Lane, and risk downgrade restrictions.
17. Added v0.7 changelog row and updated footer.

## Compatibility checks
- Existing role sections retained.
- Existing gate sequence retained.
- Existing registry sync and code marker rules retained.
- Existing QA and Bug Fix separation retained.
- Existing audit/closure/release controls retained.
- Markdown code fence count is balanced.
- Raw credential values from the old credential table were removed.

## Not changed intentionally
- Did not fully split into multiple files because that could break agents expecting one master prompt.
- Did not remove existing role playbooks.
- Did not weaken financial/order/report/printing safeguards.
- Did not change core artifact paths; only added preferred naming standards.
