# QA Regression Report — CR-358 Full PMS Module (2026-09-03)

## Summary
**22/23 PASS, 1/23 NOTE. 0 BLOCKER. 0 MAJOR. 0 MINOR.**

Full critical-path smoke of all 7 PMS pages across Phases 1-3 + BUG-380 + BUG-381 + 3 cross-flow tests + color audit.

---

## Results by Phase

### Phase 1 (CR-358-P1) — 3/3 PASS
| # | Test | Result |
|---|---|---|
| P1-01 | Channel Manager page | PASS |
| P1-02 | In-House Guests table + KPIs | PASS |
| P1-03 | PMS sidebar navigation | PASS |

### Phase 2 (CR-358-P2) — 3/3 PASS
| # | Test | Result |
|---|---|---|
| P2-01 | New Booking form elements | PASS |
| P2-02 | Room selection + summary | PASS |
| P2-03 | Check-In page + dropdown | PASS |

### Phase 3 (CR-358-P3) — 8/8 PASS
| # | Test | Result |
|---|---|---|
| P3-01 | Front Desk greeting + KPIs | PASS |
| P3-02 | Arrivals preview table | PASS |
| P3-03 | Channel Sync + Departures cards | PASS |
| P3-04 | View all arrivals navigation | PASS |
| P3-05 | Arrivals KPIs + tabs | PASS |
| P3-06 | Arrivals table columns | PASS |
| P3-07 | Departures KPIs + tabs | PASS |
| P3-08 | Departures table + Folio | PASS |

### BUG-380 — 3/3 PASS
| # | Test | Result |
|---|---|---|
| B380-01 | Occupied rooms greyed + badge | PASS |
| B380-02 | Available rooms selectable | PASS |
| B380-03 | Dropdown occupied disabled | PASS |

### BUG-381 — 1/1 PASS
| # | Test | Result |
|---|---|---|
| B381-01 | In-House dates/balance populated | PASS |

### Cross-Flow — 3/3 PASS
| # | Test | Result |
|---|---|---|
| CF-01 | Arrivals KPI → /arrivals → back | PASS |
| CF-02 | Departures KPI → /departures | PASS |
| CF-03 | New Booking btn → /new-booking | PASS |

### Color Audit — 1 PASS + 1 NOTE
| # | Test | Result |
|---|---|---|
| Brand colors | #F26B33 tabs, #329937 buttons | PASS |
| Forbidden colors | Sidebar only (out of scope) | NOTE |

---

## Coverage
- 7/7 PMS pages tested
- 3/3 BUG-380 changed files exercised
- 0/0 BUG-381 changed files (backend-only)
- Hotspot file pmsService.js: 5 test cases exercise its code paths

## Registry Spot-Check
- BUG-380: gate=5, QA PASS
- BUG-381: gate=5, QA PASS

Registry: SYNCED.

## Known Issues (out of scope)
- Sidebar forbidden colors (#3B82F6) — shared component, pre-existing
- Minor React hydration warning in InHouseGuestsPage — cosmetic

## Verdict
**FULL REGRESSION PASS. All phases operational. Ready for Gate 6 (Owner Smoke).**
