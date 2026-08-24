# CR-131 — Customer Report: Show Data Source Indicator (CRM vs POS)

**ID:** CR-131  
**Type:** CR  
**Priority:** P2 — MEDIUM  
**Risk:** LOW (display-only, no logic change)  
**Status:** INTAKE  
**Gate:** 1  
**Sprint:** pos_5_1  
**Registered:** 2026-08-05  
**Source:** OWNER-REPORTED  

---

## Description

In the Customer Intelligence / Customer reports, the owner needs to know where each data point is coming from — CRM API or POS (local order data). Currently there is no indicator on the report screens showing the data source.

Affected screens:
- `CustomersMixMockup.jsx` → Guest vs Registered (Sidebar: "Guest vs Registered")
- `CustomersRfmMockup.jsx` → Customer Intelligence (Sidebar: "Customer Intelligence")

## Evidence
- Screenshot: not provided
- Steps to reproduce: Go to Customer Intelligence or Guest vs Registered reports → no source indicator visible
- Source: OWNER-REPORTED
- Confidence: REPORTED (unverified — needs investigation to map exact data sources)

## Area
Reports → Customer Intelligence / Guest vs Registered

## Code Reality Check
- `CustomersRfmMockup.jsx` — exists, source of data feeds needs investigation
- `CustomersMixMockup.jsx` — exists
- **Code Reality: FULL — screens exist. Data source labelling is the missing piece.**

## Duplicate Check
- DISTINCT — no prior CR for data source transparency in customer reports
- RELATED: CR-002 (CRM Customer Intelligence), BUG-190 (CRM sync), BUG-191 (customer phone)

## Blast Radius
- `CustomersRfmMockup.jsx` — add source badge/indicator
- `CustomersMixMockup.jsx` — add source badge/indicator
- ~2 files, SMALL blast radius
- Hotspot files: NO

## Expected Behavior
Each data section/metric should show a small badge or tooltip indicating "Source: CRM" or "Source: POS" so the owner can understand and trust the data.

## Risk Classification
- **Risk: LOW**
- Trigger: Display-only, no logic or API change
- Fast Lane eligible: Possibly (LOW risk) — owner approval needed

## Open Questions
- OQ-1: Should source be shown per-metric or per-screen?
- OQ-2: What are the actual data sources today? (investigation needed first)

## Next Step
INVESTIGATION first to map data sources → then PLANNING (likely small, fast-lane eligible).
