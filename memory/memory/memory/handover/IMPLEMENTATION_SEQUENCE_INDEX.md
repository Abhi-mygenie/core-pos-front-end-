# Approved CR Sequencing / Handover Index

## Purpose
Short index for implementation sequencing across the approved CRs:
- CR-001
- CR-003
- CR-004

## Recommended Order
1. **CR-001**
2. **CR-004**
3. **CR-003**

## Why
### CR-001 first
CR-001 fixes the Audit Report foundation:
- status derivation
- tab correctness
- room-order exclusion
- transferred removal
- filter semantics

Both other CRs depend on that cleanup.

### CR-004 second
CR-004 introduces the new Room Orders report after CR-001 removes room orders from Audit Report.
This avoids double display and gives room orders a dedicated home.

### CR-003 third
CR-003 adds row-level financial actions on Hold/Paid rows.
It depends on CR-001 classification correctness and is independent from CR-004 UI delivery once room rows are already excluded from Audit Report.
It is also the highest financial-regression-risk CR, so it is safer after the report foundation is corrected.

## Dependency Summary
- **CR-003 depends on CR-001**
- **CR-004 depends on CR-001**
- **CR-003 does not require CR-004**
- **CR-004 does not require CR-003**

## Risk Summary
- Lowest foundational risk to start: **CR-001**
- Medium/additive read-only feature: **CR-004**
- Highest mutation/financial risk: **CR-003**

## Handover Docs
- `/app/memory/handover/CR_001_IMPLEMENTATION_HANDOVER.md`
- `/app/memory/handover/CR_003_IMPLEMENTATION_HANDOVER.md`
- `/app/memory/handover/CR_004_IMPLEMENTATION_HANDOVER.md`

## Notes
- Each CR should be implemented in isolation.
- Do not combine CR patches unless explicitly requested.
- If implementation begins with a different sequence, dependency checks must be re-validated first.
