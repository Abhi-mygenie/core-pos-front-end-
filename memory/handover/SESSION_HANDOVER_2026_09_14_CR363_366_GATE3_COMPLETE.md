# Session Handover — CR-363 + CR-366 (Gate 3 COMPLETE — all probes done)

```
Written:         2026-09-14
Status at close: GATE 3 COMPLETE. All probes verified. Implementation Plan final + BN-6 addendum.
                 Awaiting Gate 4 GO.
Next agent role: IMPLEMENTATION (after Gate 4 GO)
Plan doc:        /app/memory/plans/CR-363_CR-366_JOINT_IMPLEMENTATION_PLAN.md
Workspace:       /app  (branch 14sep, frontend-only)
```

---

## 1. Gate 3 probe results — ALL PASS

| # | Probe | HTTP | Finding |
|---|---|---|---|
| P1 | `night-audit?date=2026-09-13` | **200** | All 8 sections present. `guest_name=null` confirmed (BN-1 still live). |
| P2 | `revenue-summary?group_by=day` 7D | **200** | 7 buckets. `adr_booked=3597.97`, `revpar_booked=2569.98`. |
| P3 | `revenue-summary?group_by=month` full-year | **200** | 12 monthly buckets. **Reduced schema** — see below. |

Evidence saved:
- `evidence/CR-363/probe_night_audit_reconfirm_2026_09_14.json`
- `evidence/CR-366/probe_revenue_summary_day_reconfirm_2026_09_14.json`
- `evidence/CR-366/probe_revenue_summary_month_2026_09_14.json`

---

## 2. BN-6 critical finding — month bucket reduced schema

**10 fields missing from month buckets** (present in day/week):
```
adr_collected, revpar_collected, arrivals, departures, in_house,
no_shows, cancellations, rooms_capacity, rooms_ooo, tax_collected
```

**Plan impact:** `revenueTransform.js` handles this safely (`num(undefined)=0`). `RevenueDashboardPage.jsx` **must** suppress the `adrCollected`/`revparCollected` chart lines when `groupBy==='month'` (see Plan §7 addendum). No new files needed.

---

## 3. Other Gate 3 entry checks — ALL PASS

| Check | Result |
|---|---|
| `constants.js` append point | L595 = `EXTEND_STAY`, L596 = `};` — unchanged ✅ |
| `pmsService.js` EOF | L442 — unchanged ✅ |
| `App.js` imports/routes | L106 / L264 — unchanged ✅ |
| `Sidebar.jsx` pms.children | L241 = `pms-room-status` — unchanged ✅ |
| `reportExporter.js` params | `{title,subtitle,restaurant,dateRange:{from,to},generatedBy,kpis,sheets}` confirmed ✅ |
| test_credentials.md | Updated with `goankitchen_owner` alias (value masked) ✅ |

---

## 4. Implementation Plan — final summary

**Plan:** `/app/memory/plans/CR-363_CR-366_JOINT_IMPLEMENTATION_PLAN.md` (+ §7 addendum)

8 edits in strict order:

| # | File | Type | Key |
|---|---|---|---|
| 1 | `src/api/constants.js` | MOD | +`NIGHT_AUDIT` +`REVENUE_SUMMARY` before L596 |
| 2 | `src/api/services/pmsService.js` | MOD | +`getNightAudit` +`getRevenueSummary` at EOF |
| 3 | `src/api/transforms/nightAuditTransform.js` | NEW | Pure transform, 8 sections, null→'—' |
| 4 | `src/pages/pms/NightAuditPage.jsx` | NEW | 8 cards, badge on F, amber warnings |
| 5 | `src/api/transforms/revenueTransform.js` | NEW | Pure transform + `groupByAutoSelect` |
| 6 | `src/pages/pms/RevenueDashboardPage.jsx` | NEW | Side-by-side KPI, 3 charts (month suppresses collected lines), 4 tables |
| 7 | `src/App.js` | MOD | +2 imports +2 routes |
| 8 | `src/components/layout/Sidebar.jsx` | MOD | +2 children (SC ack done) |

---

## 5. Impl agent: start instructions

```
1. Read: plans/CR-363_CR-366_JOINT_IMPLEMENTATION_PLAN.md (incl §7 addendum)
2. Read: design_guidelines.json
3. Read: public/pms-mockup.html (reference for section layout)
4. Compile baseline: tail -5 /var/log/supervisor/frontend.out.log
5. Execute edits 1→8 in order. Compile-check after each file.
6. Run Verification Matrix (Plan §3 — 18 checks)
7. Run Post-Code Registry Checklist (Plan §5 — 9 checkboxes) BEFORE writing handover.
8. Write QA Handover at memory/handover/QA_HANDOVER_CR363_366_<DATE>.md
```

---

## 6. All decisions locked

| Decision | Value |
|---|---|
| OD-363-07 | Show "as of now" badge always |
| OD-363-08 | "—" for null + amber warning |
| OD-366-05 | No cache |
| OD-366-06 | No % comparison v1 |
| OD-366-07 | 7D default |
| OD-366-08 | Side-by-side (Option A) |
| BN-6 | Month bucket reduced — suppress collected lines in month chart view |

---

## 7. Blocked CRs (next in queue)

- CR-364 Guest Folio · CR-357 Room Advance · BUG-193 Room Transfer Trail

*Handover written 2026-09-14 · Planning agent (ALPHA v0.7) — Gate 3 COMPLETE*
