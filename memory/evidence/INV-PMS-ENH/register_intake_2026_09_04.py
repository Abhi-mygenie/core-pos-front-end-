import json
P = '/app/memory/control/registry.json'
d = json.load(open(P))
existing = {i['id'] for i in d['items']}
INV = 'memory/PMS_ENHANCEMENTS_FEASIBILITY_INVESTIGATION.md'

def item(id_, title, prio, risk, area, related, intake, note, blocked, code_reality, blast, files_note):
    status = 'INTAKE — BACKEND-BLOCKED' if blocked else 'INTAKE'
    return {
        'id': id_, 'title': title, 'type': 'CR', 'status': status, 'priority': prio, 'risk': risk,
        'gate': '1', 'completeness': '1/7', 'sprint_key': 'pos_pms_1', 'area': area, 'related': related,
        'category': 'ACTIVE', 'code_reality': code_reality, 'blast_radius': blast,
        'backend_blocked': blocked, 'files': files_note,
        'artifact_refs': [
            {'label': 'Intake', 'path': f'memory/change_requests/{intake}', 'type': 'intake'},
            {'label': 'Investigation', 'path': INV, 'type': 'investigation'},
        ],
        'note': note,
        'status_history': [{'date': '2026-09-04', 'status': 'INTAKE', 'note': 'Intake agent (ALPHA v0.7) — owner-selected post-CR-358 enhancement; priority/risk owner-agreed 2026-09-04 (review later); FULL scope, no v1 workaround; sprint pos_pms_1'}],
    }

new = [
    item('CR-361', 'PMS — Room Assignment on Tape Chart (pre-arrival mapping to physical rooms)', 'P1', 'MEDIUM',
         'PMS > Tape Chart (S2)', ['CR-358-P4', 'CR-358-P2', 'BUG-380', 'OG-PMS-013'],
         'CR-361_PMS_ROOM_ASSIGNMENT_TAPE_CHART_INTAKE.md',
         'No assign endpoint (6 routes probed → 404). Needs PATCH local-reservations/{id}/rooms/{line} + board soft-allocation clarification (OG-PMS-013). Button disabled at ReservationsPage.jsx:195.',
         True, 'PARTIAL', 'MEDIUM', 'pages/pms/ReservationsPage.jsx, api/services/pmsService.js, api/constants.js, components/pms/AssignRoomPicker.jsx (NEW)'),
    item('CR-362', 'PMS — Booking Modification & Cancellation (cancel / modify dates-room / extend stay / no-show)', 'P1', 'CRITICAL',
         'PMS > Arrivals (S9) / Departures (S10) / Tape Chart (S2) / In-House (S6)', ['CR-358-P5', 'CR-358-P3', 'CR-357', 'CR-165'],
         'CR-362_PMS_BOOKING_MODIFICATION_CANCELLATION_INTAKE.md',
         'Only mark-no-show exists (booking.com/gommt only, verified). Cancel/modify/extend endpoints all 404. Sandbox has 0 cancelled samples. Money + inventory + OTA contract → owner approval at Gate 4.',
         True, 'NONE', 'LARGE', 'pmsService.js, aiosellTransform.js, ArrivalsPage.jsx, DeparturesPage.jsx, InHouseGuestsPage.jsx, ReservationsPage.jsx, 3 NEW dialogs'),
    item('CR-363', 'PMS — Night Audit Report (end-of-day room reconciliation)', 'P1', 'HIGH',
         'PMS > Reports', ['CR-358-P3', 'CR-011-ROOM', 'CR-015', 'CR-016', 'CR-364'],
         'CR-363_PMS_NIGHT_AUDIT_REPORT_INTAKE.md',
         'FE-only composition of dashboard-kpis + daily-sales-revenue-report + getReservationOps + get-single-order-new (all 200). No server aggregation (404). KPI semantics (R6) + business-day boundary need owner decisions OD-363-01/02 before Gate 2.',
         False, 'NONE', 'MEDIUM', 'pages/pms/NightAuditPage.jsx (NEW), api/transforms/nightAuditTransform.js (NEW), pmsService.js, App.js, Sidebar.jsx (SC ack)'),
    item('CR-364', 'PMS — Guest Folio Detail Page (itemised charges, payments, balance, checkout)', 'P1', 'HIGH',
         'PMS > In-House (S6) / Departures (S10) / Tape Chart (S2)', ['CR-358-P3', 'CR-360', 'CR-358-P4', 'CR-162', 'CR-357', 'OG-PMS-003'],
         'CR-364_PMS_GUEST_FOLIO_DETAIL_PAGE_INTAKE.md',
         'get-single-order-new room_info/associated_order_list verified; PmsCheckoutDrawer fetch + orderTransform.roomInfo reusable. Display-only money (D3 folio unchanged); payment history endpoint missing (optional B-364-01).',
         False, 'PARTIAL', 'MEDIUM', 'pages/pms/GuestFolioPage.jsx (NEW), api/transforms/folioTransform.js (NEW), pmsService.js, App.js, InHouseGuestsPage.jsx, DeparturesPage.jsx, ReservationsPage.jsx'),
    item('CR-365', 'PMS — Housekeeping Workflow (task queue, checklist, assignment, time tracking, notifications)', 'P2', 'MEDIUM',
         'PMS > Room Status (S7)', ['CR-358-P4', 'OG-PMS-010', 'CR-124', 'CR-354'],
         'CR-365_PMS_HOUSEKEEPING_WORKFLOW_INTAKE.md',
         'Board + PATCH room-status exist; hk-tasks/housekeeping/employee-list routes 404. Prerequisite: fix OG-PMS-010 (auto-HK not firing / booked precedence). Socket handler touch if live updates.',
         True, 'PARTIAL', 'LARGE', 'pages/pms/HousekeepingPage.jsx (NEW), components/pms/HkTaskCard.jsx (NEW), HkChecklistDialog.jsx (NEW), api/services/hkService.js (NEW), RoomStatusPage.jsx, App.js, Sidebar.jsx, socketHandlers.js'),
    item('CR-366', 'PMS — Revenue Dashboard / Analytics (Occupancy %, ADR, RevPAR, channel split, trends)', 'P2', 'MEDIUM',
         'PMS > Reports / Insights', ['CR-358-P3', 'CR-044', 'CR-045', 'CR-011-ROOM', 'CR-363'],
         'CR-366_PMS_REVENUE_DASHBOARD_ANALYTICS_INTAKE.md',
         'dashboard-kpis ≤31d/call with per-day per-room-type occupancy (verified); channel block returns null → client-side split from local-reservations. Revenue basis OD-366-01 (R6) must be frozen before Gate 2. insightsCache reuse.',
         False, 'NONE', 'MEDIUM', 'pages/pms/RevenueDashboardPage.jsx (NEW), api/transforms/revenueTransform.js (NEW), pmsService.js, aiosellTransform.js (+fromDashboardKpisRange), App.js, Sidebar.jsx'),
    item('CR-367', 'PMS — WhatsApp / SMS Guest Notifications (confirmation, check-in instructions, checkout reminder)', 'P2', 'HIGH',
         'PMS > Arrivals / New Booking / Departures / Channel Manager settings', ['CR-017', 'CR-358', 'BUG-092'],
         'CR-367_PMS_WHATSAPP_SMS_GUEST_NOTIFICATIONS_INTAKE.md',
         'Only razor-pay/payment-link (order-bound) exists; 7 notification routes 404; backend declined self-CI token APIs (OD-P3-08). Needs templated send endpoint + scheduler + settings + delivery log + provider/DLT compliance.',
         True, 'NONE', 'MEDIUM', 'api/services/notificationService.js (NEW), components/pms/SendGuestMessageDialog.jsx (NEW), NewBookingPage.jsx, ArrivalsPage.jsx, DeparturesPage.jsx, ChannelManagerPage.jsx, constants.js'),
]
p5 = item('CR-358-P5', 'PMS Phase 5 — Rates & Restrictions tab (S8-C) + Mark No-Show (S8-D) + module regression', 'P1', 'HIGH',
          'PMS > Channel Manager (S8)', ['CR-358-P1', 'CR-358-P4', 'CR-362', 'OG-PMS-004'],
          'CR-358-P5_PMS_RATES_RESTRICTIONS_NO_SHOW_INTAKE.md',
          'Entry gate CLEARED 2026-09-04: push-rates, fetch-rates, push-inventory-restrictions, push-rate-restrictions (405 GET / 422 empty POST), fetch-rates 200 with 8 rateplans; mark-no-show rule verified live (booking.com/gommt only). Tab 3 placeholder at ChannelManagerPage.jsx:466. rates[] item schema still needs backend doc (B-P5-01).',
          False, 'PARTIAL', 'MEDIUM', 'ChannelManagerPage.jsx, aiosellService.js (+5), aiosellTransform.js (+fromRates), pmsService.js (+markNoShow), ArrivalsPage.jsx, ReservationsPage.jsx')
p5['status_history'][0]['note'] = 'Intake agent — planned Phase 5 of CR-358 registered as own item on owner instruction 2026-09-04; entry-gate endpoints live-verified'
new.append(p5)

added = []
for n in new:
    if n['id'] in existing:
        print('SKIP exists', n['id']); continue
    d['items'].append(n); added.append(n['id'])
d['meta']['last_updated'] = '2026-09-04'
d['meta']['last_action'] = 'INTAKE — 8 PMS items registered (CR-361..CR-367 + CR-358-P5) from PMS_ENHANCEMENTS_FEASIBILITY_INVESTIGATION.md; 4 backend-blocked, 4 unblocked. Next: owner picks Gate 2 order.'
d['meta']['total_items'] = len(d['items'])
d['meta']['total'] = d['meta'].get('total', 0) + len(added)
json.dump(d, open(P, 'w'), indent=2, ensure_ascii=False)
print('added', added, 'total items', len(d['items']))
