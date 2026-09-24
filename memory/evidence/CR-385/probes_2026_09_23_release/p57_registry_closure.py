import json, re, sys
M='/app/memory/'
D='2026-09-24'
FU_C='separate CR after CR-385 closes. Gate 5 closes without it; BUG-431/432/443/444/446/449, X-06 and legacy rounding stay DEFERRED-TO-FU-385-C with that sentence in the sign-off.'
FU_D='separate follow-up CR. D88 stays; `frontdesk.css` + `hideSectionRows` guard unchanged; OG-PMS-048 stays OPEN pending FU-385-D.'
QA='test_reports/QA_REPORT_2026_09_24_CR385_P5_ROLE4.md'
changed=[]

# ---------- A. registry.json ----------
p=M+'control/registry.json'; raw=open(p,'rb').read(); r=json.loads(raw)
assert json.dumps(r,indent=2,ensure_ascii=True).encode()==raw
items=r['items']; by={i.get('id'):i for i in items}
cr=by['CR-385']
files=[
 "App.js (+1 import +1 route — M0)",
 "components/layout/Sidebar.jsx (+1 item 'Front Desk (Beta)' — M0, OD-385-14 a)",
 "api/constants.js (+CR-385 endpoint constants)",
 "api/services/frontDeskService.js (NEW — M0/M2/M3/M4/M5/M6)",
 "api/services/restaurantSettingsService.js (+getFrontDeskRules/updateFrontDeskRules — M7)",
 "api/transforms/frontDeskTransform.js (NEW — M0)",
 "api/transforms/roomStatusTransform.js (additive hkAssignee/isOccupied/guest.phone+email/meta — M0, O-6/G-52)",
 "api/transforms/restaurantSettingsTransform.js (M7 +2 keys; no CR-385 marker — legacy transform)",
 "components/pms/CancelBookingDialog.jsx (+inline prop, D2 — M2; BUG-440)",
 "components/pms/NoShowDialog.jsx (+inline prop, D2 — M2)",
 "components/pms/frontdesk/AlertBar.jsx (NEW — M0)",
 "components/pms/frontdesk/ArrivalsPanel.jsx (NEW — M0/M2/M3)",
 "components/pms/frontdesk/CheckInForm.jsx (NEW — M3 COPY of pages/pms/CheckInPage.jsx form body; mirror rule until FU-385-C)",
 "components/pms/frontdesk/DeparturesPanel.jsx (NEW — M0/M4/M5/M6)",
 "components/pms/frontdesk/ExtendStayForm.jsx (NEW — M4, OD-385-16 a)",
 "components/pms/frontdesk/FolioCheckoutPanel.jsx (NEW — M6 Layout B host; BUG-448 prefill; CollectPaymentPanel imported, never edited)",
 "components/pms/frontdesk/GlobalSearch.jsx (NEW — M0)",
 "components/pms/frontdesk/GuestTable.jsx (NEW — M0)",
 "components/pms/frontdesk/InHousePanel.jsx (NEW — M0/M5/M6)",
 "components/pms/frontdesk/KpiTabStrip.jsx (NEW — M0)",
 "components/pms/frontdesk/ModifyBookingForm.jsx (NEW — M2, OD-385-16 a)",
 "components/pms/frontdesk/NewBookingForm.jsx (NEW — M1)",
 "components/pms/frontdesk/NightsLines.jsx (NEW — M4/M6 shared nights_detail renderer)",
 "components/pms/frontdesk/RoomDetail.jsx (NEW — M0/M3/M6)",
 "components/pms/frontdesk/RoomTile.jsx (NEW — M0 COPY of pages/pms/RoomStatusPage.jsx tile @8c7745f; mirror rule until FU-385-C)",
 "components/pms/frontdesk/RoomsPanel.jsx (NEW — M0)",
 "components/pms/frontdesk/WorkstationHeader.jsx (NEW — M0)",
 "components/pms/frontdesk/frontdesk.css (NEW — M0 + M6 host rules .frontdesk-bill 440×560, D57 three toggles hidden, BUG-448 .fd-bill-tab-prefilled, D88 payment-split-btn hidden)",
 "components/pms/frontdesk/money.js (NEW — M0)",
 "pages/pms/FrontDeskWorkstationPage.jsx (NEW — M0 host)",
 "pages/pms/FrontDeskRulesTab.jsx (NEW — M7, OD-385-17)",
 "pages/pms/ChannelManagerPage.jsx (+1 TABS entry +1 import +1 render line — M7; +1 prop aiosellRooms — BUG-450)",
 "pages/pms/RatesTab.jsx (BUG-450 fix in legacy CR-358-P5 file; marker BUG-450)",
 "pages/pms/ArrivalsPage.jsx (BUG-441 numeric LR id — P1.5)",
 "pages/pms/ReservationsPage.jsx (BUG-441/442 legacy id / cancelled_by — P1.5)",
 "api/services/__tests__/frontDeskService.cr385.test.js (NEW)",
 "api/transforms/__tests__/frontDeskTransform.cr385.test.js (NEW)",
 "api/transforms/__tests__/roomStatusTransform.cr358p4.test.js (+testCr385Additive)",
 "components/pms/frontdesk/__tests__/money.cr385.test.js (NEW)",
 "components/pms/frontdesk/__tests__/GuestTable.cr385.test.jsx (NEW)",
 "components/pms/frontdesk/__tests__/GlobalSearch.cr385.test.jsx (NEW)",
 "components/pms/frontdesk/__tests__/phase05.cr385.test.jsx (NEW)",
 "components/pms/frontdesk/__tests__/phase1.cr385.test.jsx (NEW, + __snapshots__/)",
 "components/pms/frontdesk/__tests__/bug439.cr385.test.jsx (NEW)",
 "tests/cr385/phase1_5.cr385.test.jsx (NEW)",
 "tests/cr385/phase1_5c.cr385.test.jsx (NEW)",
 "tests/cr385/phase2.cr385.test.jsx (NEW)",
 "tests/cr385/phase3.cr385.test.jsx (NEW)",
 "tests/cr385/phase4.cr385.test.jsx (NEW)",
 "tests/cr385/bug447.cr385.test.jsx (NEW)",
 "tests/cr385/hideSectionRows.cr385.test.js (NEW — D57/D88 guard)",
 "pages/pms/__tests__/RatesTab.bug450.test.jsx (NEW — BUG-450, 7 tests)",
 "__fixtures__/cr385/{local_reservations_view_all,room_status_board,dashboard_kpis,settings_list_basic,room_availability,direct_reservation_201,direct_reservation_422_norate,direct_reservation_skipped,checkin_200_upgrade,extend_200_calendar,extend_200_held_fallback,extend_409,inhouse_guests,folio_room_upgrade,bill_payment_already_paid}.json (NEW — 15 fixtures)",
 "public/cr385-frontdesk-mockup.html (LOCKED v2.29, sha256 12fd0f4a343fc89d…)",
 "public/cr385-master-checklist.html (mirror; ticks only)",
]
cr['files']=files
cr['status']=("P5 REGRESSION PASSED 2026-09-24 — awaiting owner sign-off (§5.8); NOT CLOSED until the owner's verbatim close word. "
 "Role 4 report "+QA+": 34 rows 34 PASS / 0 FAIL (row 34 = Step 5 registry checklist executed 2026-09-24). Sessions A'/B/C PASS (it.30–34), D17 legs A/B/C ALL_PASS, "
 "probe pack 5/5 + held_fallback skipped-no-recipe, guards 6/6 on origin HEAD b2db5a0 (hotspots byte-identical by sha256; 642ccb8 obsolete — history re-imported 2026-09-23), zero code changes in frontend/src, "
 "sandbox restored (owner stay r1 #256 untouched). Findings F1–F13 MINOR/NOTE/process only; Phase 5.5 not triggered. FU-385-C / FU-385-D = separate CRs (owner 2026-09-23). Prior: "+cr['status'])
cr['qa_report_p5']=QA
cr['current_gate']="Gate 5 — P5 regression PASSED 2026-09-24; §5.7 registry closure executed; awaiting §5.8 owner sign-off word (verbatim)"
cr['p5_closure']={"qa_report":QA,"registry_closure_date":D,"r18_marker_count":48,"copy_headers":["components/pms/frontdesk/RoomTile.jsx (@8c7745f L25–27, L198–266)","components/pms/frontdesk/CheckInForm.jsx (CheckInPage L26–57, L787–797, L263–345 @ P2 entry 2026-09-22)"],
 "hotspot_blob_sha256_prefix":{"CollectPaymentPanel.jsx":"b8c1e91f7a17e5cc","orderTransform.js":"065710fa63134dca","pmsService.js":"b5f139c7361b0d3b","PmsCheckoutDrawer.jsx":"14a7e12e5a3163dd"},
 "origin_head":"b2db5a0","sign_off":"PENDING — owner close word + FU-385-C + FU-385-D confirmations to be recorded verbatim in §5.8"}
cr['status_history'].append({"date":D,"event":"\u00a75.7 REGISTRY CLOSURE EXECUTED 2026-09-24 (Step 5 checklist, plan note \u00a77): FILE_OWNERSHIP owed block present (recorded 2026-09-23) + P5 closure rows added; CR-385 files[] rebuilt to the complete actual list (48 marker files via grep -rln CR-385 + css/fixtures/legacy BUG-450 + public mirrors); BUG-418 FIXED+QA-VERIFIED (Beta) via M6, legacy -> FU-385-C; BUG-448 (new registry item) FIXED+QA-VERIFIED P4.5, P5 re-check partial; BUG-450 FIXED+QA-VERIFIED mini-gate it.27 + P5 G2 grep 0; BUG-412 re-verified P5 (D17 legs A/B/C ALL_PASS); BUG-431/432/433/443/444/446/449 DEFERRED-TO-FU-385-C with the owner sentence; BUG_TRACKER, CR_REGISTRY (CR-385 row P5 PASSED awaiting sign-off; FU-385-C row added; FU-385-D row updated), OPEN_GAPS (022 re-observed, 027/BQ-385-19 re-confirmed, 042 kept OPEN, 048 OPEN -> FU-385-D, 049 TRIAGED), CONTROL_DASHBOARD, PRD, SPRINT_STATUS placeholder, master-checklist ticks (evidenced rows only), R18 marker count 48 + copy headers on RoomTile.jsx / CheckInForm.jsx confirmed. QA report row 34 -> PASS (34/34). Status NOT CLOSED — awaits owner's verbatim word (\u00a75.8). Zero code changes."})

def app(id_,txt):
    it=by[id_]; it['status']=it['status']+' \u00b7 '+txt; changed.append(id_)
app('BUG-412','FIXED on backend (D17, 2026-09-21) + re-verified P5 2026-09-23: D17 legs A/B/C ALL_PASS (advance 500 / 1,000 / 1,500 cumulative; balance_due = total \u2212 advance; evidence/CR-385/probes_2026_09_23_release/d17_reverify.json). The "BLOCKED ON BUG-411" intake status above is historical.')
app('BUG-418','FIXED + QA-VERIFIED (Beta) via CR-385 M6 2026-09-22 \u2014 legacy path \u2192 FU-385-C \u00b7 P5 re-verified it.32 (SGST \u20b92,835 + CGST \u20b92,835) and it.33 (two lines) 2026-09-23.')
app('BUG-450','FIXED + QA-VERIFIED (mini-gate it.27) via CR-385 P4.5b 2026-09-22 \u00b7 P5 Guard 2 room-type grep = 0 lines 2026-09-24 (FINAL_GUARDS.md); CM-S01 owner smoke PASS 2026-09-23.')
for b in ['BUG-431','BUG-432','BUG-433','BUG-443','BUG-444','BUG-446']:
    app(b,'P5 closure 2026-09-24: legacy path DEFERRED-TO-FU-385-C \u2014 owner 2026-09-23 verbatim: "'+FU_C+'"')
tmpl=by['BUG-450']
def newbug(id_,title,status,intake,files_,related,sev):
    return {"id":id_,"type":"BUG","title":title,"priority":"P1" if id_=="BUG-448" else "P2","risk":"MEDIUM" if id_=="BUG-448" else "LOW","status":status,
            "sprint_key":"pos_pms_2","created_at":"2026-09-22","category":"pms","source":"CR-385 P4 QA (Role 4, it.23)" if id_=="BUG-448" else "CR-385 P4.5 code-read",
            "origin":"CR-385 Phase 4 QA","intake_doc":intake,"files_affected":files_,"related_items":related,"qa_severity":sev,
            "registered":D+" (registered retroactively by the P5 closure agent \u2014 item existed in BUG_TRACKER.md since 2026-09-22; registry item was missing)"}
idx=items.index(tmpl)
items.insert(idx+1,newbug("BUG-448","Front Desk (Beta) Bill \u2014 Credit/TAB Checkout stays disabled (TAB name/phone not prefilled from the booking)",
  "FIXED + QA-VERIFIED via CR-385 P4.5 2026-09-22 (it.25 live: TAB block hidden, Checkout enabled, order-bill-payment 200 payment_mode TAB; it.26 QA report P4) \u00b7 P5 re-check partial (it.33 TAB checkout OK, fd-bill-tab-prefilled class not captured; it.34 booking 274 created, check-in not reached \u2014 business_date rollover) \u2014 non-blocking, status stands.",
  "change_requests/BUG-448_FRONTDESK_BILL_TAB_DISABLED_INTAKE.md",["components/pms/frontdesk/FolioCheckoutPanel.jsx","components/pms/frontdesk/frontdesk.css","tests/cr385/phase4.cr385.test.jsx","tests/cr385/hideSectionRows.cr385.test.js"],["CR-385","OD-385-21","BUG-449"],"MAJOR (QA)"))
items.insert(idx+2,newbug("BUG-449","Legacy PmsCheckoutDrawer (/pms/departures) \u2014 Credit/TAB Checkout disabled until staff type TAB name + 10-digit phone",
  "DEFERRED-TO-FU-385-C (owner 2026-09-22, Phase 4.5 code-read; no login) \u00b7 P5 closure 2026-09-24: owner 2026-09-23 verbatim: \""+FU_C+"\" \u00b7 workaround: Cash on legacy Departures; Beta path fixed by BUG-448.",
  "change_requests/BUG-448_FRONTDESK_BILL_TAB_DISABLED_INTAKE.md (\u00a7legacy)",["components/pms/PmsCheckoutDrawer.jsx (hotspot \u2014 NOT edited)"],["CR-385","BUG-448","FU-385-C"],"MINOR"))
open(p,'w').write(json.dumps(r,indent=2,ensure_ascii=True))
json.load(open(p)); changed.append('registry.json')

# ---------- B. BUG_TRACKER ----------
p=M+'control/BUG_TRACKER.md'; lines=open(p).read().split('\n')
notes={
 '412':'**P5 2026-09-24:** backend D17 fixed 2026-09-21; re-verified P5 2026-09-23 \u2014 D17 legs A/B/C ALL_PASS (`probes_2026_09_23_release/d17_reverify.json`). Status: FIXED (backend) + RE-VERIFIED P5.',
 '418':'**P5 2026-09-24:** FIXED + QA-VERIFIED (Beta) via CR-385 M6 2026-09-22 \u2014 legacy path \u2192 FU-385-C; P5 re-verified it.32/it.33 (SGST + CGST two lines).',
 '448':'**P5 2026-09-24:** FIXED + QA-VERIFIED via CR-385 P4.5 2026-09-22 \u2014 P5 re-check partial (it.33 TAB checkout OK, class not captured; it.34 check-in not reached, business_date rollover) \u2014 non-blocking.',
 '450':'**P5 2026-09-24:** FIXED + QA-VERIFIED (mini-gate it.27) via CR-385 P4.5b 2026-09-22; P5 Guard 2 grep = 0 lines; CM-S01 smoke PASS.',
}
for b in ['431','432','433','443','444','446','449']:
    notes[b]='**P5 2026-09-24:** DEFERRED-TO-FU-385-C \u2014 owner 2026-09-23 verbatim: "'+FU_C+'"'
for b,n in notes.items():
    for i,l in enumerate(lines):
        if l.startswith(f'| **BUG-{b}**'):
            c=l.split(' | '); assert len(c)==6,(b,len(c)); c[4]=c[4]+' \u00b7 '+n; lines[i]=' | '.join(c); break
    else: sys.exit('BUG row missing '+b)
open(p,'w').write('\n'.join(lines)); changed.append('BUG_TRACKER.md')

# ---------- C. CR_REGISTRY ----------
p=M+'control/CR_REGISTRY.md'; lines=open(p).read().split('\n')
hdr=f'**Last Updated:** {D} (CR-385 **P5 REGRESSION PASSED \u2014 \u00a75.7 registry closure executed, awaiting owner sign-off (\u00a75.8)** \u2014 Role 4 report `{QA}`: 34/34 rows PASS, 0 FAIL, Phase 5.5 not triggered; Sessions A\u2032/B/C it.30\u201334, D17 ALL_PASS, probe pack 5/5, guards 6/6 on origin HEAD `b2db5a0` (hotspots byte-identical by blob sha256; `642ccb8` obsolete). Zero code changes. FU-385-C row added, FU-385-D row updated (owner sentences 2026-09-23 verbatim). CR-385 flips to CLOSED only on the owner\u2019s verbatim word.)'
lines.insert(0,hdr)
for i,l in enumerate(lines):
    if l.startswith('| **CR-385** |'):
        c=l.split(' | '); assert len(c)>=6
        c[4]=f'**{D} P5 REGRESSION PASSED \u2014 awaiting owner sign-off (\u00a75.8); NOT CLOSED yet.** Role 4 `{QA}` 34/34 PASS · 0 FAIL · Sessions A\u2032/B/C (it.30\u201334) · D17 legs A/B/C ALL_PASS · probe pack 5/5 (+ held_fallback skipped-no-recipe) · guards 6/6 (origin HEAD `b2db5a0`, hotspots byte-identical by sha256) · zero code changes · sandbox restored (owner r1 #256 untouched) · findings F1\u2013F13 MINOR/NOTE only. FU-385-C / FU-385-D separate CRs. Prior: '+c[4]
        lines[i]=' | '.join(c)
        fuc=f'| **FU-385-C** | Front Desk cutover \u2014 retire legacy PMS pages (New Booking, Check-In, Departures drawer, Arrivals, Room Status copies), re-point/redirect `/pms/front-desk`, drop "(Beta)" label, sidebar review (merges FU-385-A); diff copies vs sources (RoomTile, CheckInForm) | P2 | HIGH | **PLANNED \u2014 separate CR after CR-385 closes (owner 2026-09-23 verbatim: "{FU_C}")** | \u2014 | Legacy pages + dialogs unchanged during CR-385 (OD-385-12); copies carry source line ranges in headers | LARGE (11 legacy files) | Carries: BUG-431/432/433 (legacy displays), BUG-443/444/446/449, X-06 legacy browser date, legacy rounding. Opens after the CR-385 sign-off word. |'
        lines.insert(i+1,fuc); break
else: sys.exit('CR-385 row missing')
for i,l in enumerate(lines):
    if l.startswith('| **FU-385-D** |'):
        c=l.split(' | '); c[4]=f'**PLANNED \u2014 separate follow-up CR (owner 2026-09-23 verbatim: "{FU_D}")** \u00b7 P5 closure 2026-09-24: OG-PMS-048 stays OPEN pending FU-385-D; D88 rule + guard unchanged (FINAL_GUARDS G3/G5). Prior: '+c[4]; lines[i]=' | '.join(c); break
else: sys.exit('FU-385-D row missing')
open(p,'w').write('\n'.join(lines)); changed.append('CR_REGISTRY.md')

# ---------- D. OPEN_GAPS_REGISTER ----------
p=M+'control/OPEN_GAPS_REGISTER.md'; t=open(p).read()
old='**Last Updated:** 2026-09-22 (CR-385 D86:'
assert old in t
t=t.replace(old,f'**Last Updated:** {D} (CR-385 P5 closure \u00a75.7: OG-PMS-022 re-observed in the 2026-09-24 probe pack, unchanged; OG-PMS-027 / BQ-385-19 re-confirmed (LR `charge.nights_detail` on gate4 §4 + n11); OG-PMS-042 kept OPEN (P5 drove no legacy Departures drawer \u2014 it.34 had no departure rows); OG-PMS-048 stays OPEN \u2192 FU-385-D (owner sentence verbatim); OG-PMS-049 stays TRIAGED. Info: 24 pre-existing `react-hooks/exhaustive-deps` build warnings in 12 non-CR-385 files (FINAL_GUARDS G6) \u2014 outside CR-385, no P5 gap. Report `{QA}`.). Prior: '+old,1)
def ogapp(t,key,txt):
    lines=t.split('\n')
    for i,l in enumerate(lines):
        if l.startswith(f'| {key} |'):
            c=l.split(' | '); c[2]=c[2]+' \u00b7 '+txt; lines[i]=' | '.join(c); return '\n'.join(lines)
    sys.exit('OG missing '+key)
t=ogapp(t,'OG-PMS-022','**P5 2026-09-24:** re-observed in the release probe pack (gate4 §6 read-back: `remaining_room_balance` / `balance_payment` 18,188 after TAB departure) \u2014 unchanged; FE unaffected (D50). Stays OPEN \u2014 info.')
t=ogapp(t,'OG-PMS-027','**P5 2026-09-24:** re-confirmed on the release build \u2014 LR list `charge` carries `nights_detail` (gate4 §4, n11 N11-2, d1516 s3/s4); held-mode rows `nights_detail: null` as designed.')
t=ogapp(t,'OG-PMS-042','**P5 2026-09-24:** kept OPEN \u2014 P5 sessions settled every QA stay on the Beta page (Cash it.32, TAB it.33, TAB via API in the probe pack); the legacy Departures drawer was not driven (it.34: no departure rows). Recipe stays in the QA handover template.')
t=ogapp(t,'OG-PMS-048','**P5 2026-09-24:** stays OPEN pending FU-385-D \u2014 owner 2026-09-23 verbatim: "'+FU_D+'". D88 rule + `hideSectionRows` guard unchanged on the release build (FINAL_GUARDS G3/G5); it.34 note: POS `payment-split-btn` not rendered for TGK (no `partial` payment type) \u2014 config, not D88.')
t=ogapp(t,'OG-PMS-049','**P5 2026-09-24:** stays TRIAGED \u2014 P5 jest gate `cr385|bug450` 128/128 on the release build (FINAL_GUARDS G5); quarantined suites untouched.')
open(p,'w').write(t); changed.append('OPEN_GAPS_REGISTER.md')

# ---------- E. CONTROL_DASHBOARD ----------
p=M+'control/CONTROL_DASHBOARD.md'; lines=open(p).read().split('\n')
lines.insert(0,f'**Last Updated:** {D} (CR-385 **P5 REGRESSION PASSED \u2014 \u00a75.7 registry closure executed; awaiting owner sign-off word (\u00a75.8)**. Role 4 report `{QA}`: 34/34 PASS, 0 FAIL, Phase 5.5 not triggered. Guards 6/6 on origin HEAD `b2db5a0`, hotspots byte-identical by sha256 (`642ccb8` obsolete). Zero code changes; sandbox restored (owner r1 #256 untouched). BUG-448/449 registered in registry.json (were tracker-only). FU-385-C row added to CR_REGISTRY. NEXT: owner close word + FU-385-C/D confirmations \u2192 CLOSED, D90, SPRINT_STATUS final, CLOSED handover, Save to GitHub.)')
open(p,'w').write('\n'.join(lines)); changed.append('CONTROL_DASHBOARD.md')

# ---------- F. PRD ----------
p=M+'PRD.md'; t=open(p).read().rstrip('\n')
t+=f'''

## {D} \u2014 Phase 5 \u00a75.6 QA report + \u00a75.7 registry closure executed \u2014 awaiting owner sign-off (\u00a75.8)
- **\u00a75.6** Role 4 report `{QA}`: 34-row matrix **34 PASS / 0 FAIL** (row 34 flipped to PASS after \u00a75.7); entry/exit read-back identical (owner stay r1 #256 untouched, r4/r5 `hk`, settings default, `qa_rows_left: []`); Sessions A\u2032/B/C (it.30\u201334), D17 legs A/B/C ALL_PASS, probe pack 5/5 + held_fallback skipped-no-recipe, guards 6/6 on origin HEAD `b2db5a0` (hotspots byte-identical by blob sha256; `642ccb8` obsolete). Findings F1\u2013F13 all MINOR/NOTE/process/evidence-location. **Phase 5.5 not triggered.** Owner calls: row 24 PASS-with-note (1a), row 14 PASS carried (2a), registry entry included (3a).
- **\u00a75.7** executed: FILE_OWNERSHIP (owed block present since 2026-09-23 + P5 closure rows) \u00b7 `registry.json` CR-385 files[] rebuilt (complete list), status "P5 REGRESSION PASSED \u2014 awaiting owner sign-off", `qa_report_p5`, `p5_closure`; BUG-418/450/412 updated, BUG-448/449 registered (were tracker-only), BUG-431/432/433/443/444/446/449 DEFERRED-TO-FU-385-C with the owner sentence \u00b7 BUG_TRACKER \u00b7 CR_REGISTRY (CR-385 row, FU-385-C added, FU-385-D updated) \u00b7 OPEN_GAPS (022/027/042/048/049) \u00b7 CONTROL_DASHBOARD \u00b7 SPRINT_STATUS placeholder \u00b7 master-checklist ticks (evidenced rows only) \u00b7 R18 markers 48 files, copy headers on RoomTile.jsx / CheckInForm.jsx confirmed.
- **Not done (by rule):** CR-385 status is NOT CLOSED; no D90; SPRINT_STATUS final line not written \u2014 all wait for the owner\u2019s verbatim close word + FU-385-C / FU-385-D confirmations (\u00a75.8). Zero code changes in `frontend/src`.
'''
open(p,'w').write(t+'\n'); changed.append('PRD.md')

# ---------- G. SPRINT_STATUS ----------
p=M+'control/SPRINT_STATUS.md'; t=open(p).read()
old='**Last Updated:** 2026-06-15 (CR-047 AGENT_PROMPT_ALPHA v0.6 CLOSED \u2014 OWNER VERIFIED; POS 4.0 remains FROZEN)'
assert old in t
t=t.replace(old,f'**Last Updated:** {D} (pos_pms_2 \u2014 CR-385 P5 regression PASSED {D} \u2014 awaiting owner sign-off; see section below). Prior: 2026-06-15 (CR-047 AGENT_PROMPT_ALPHA v0.6 CLOSED \u2014 OWNER VERIFIED; POS 4.0 remains FROZEN)',1)
t=t.rstrip('\n')+f'''

---

## pos_pms_2 \u2014 PMS Front Desk (CR-385) \u2014 Gate 5 closing

| Item | Status |
|---|---|
| **CR-385** | **CR-385 P5 regression PASSED {D} \u2014 awaiting owner sign-off** (Role 4 `{QA}` 34/34 PASS; guards 6/6; zero code changes). Final line is written in \u00a75.8 only after the owner\u2019s verbatim words: "CR-385 CLOSED <date> \u2014 Gate 5 closed; FU-385-C: <owner words>; FU-385-D: <owner words>". |
| FU-385-C | PLANNED \u2014 separate CR after CR-385 closes (owner 2026-09-23 verbatim on record in CR_REGISTRY) |
| FU-385-D | PLANNED \u2014 separate follow-up CR; D88 stays; OG-PMS-048 OPEN pending FU-385-D |
'''
open(p,'w').write(t+'\n'); changed.append('SPRINT_STATUS.md')

# ---------- H. master checklist ticks ----------
p='/app/frontend/public/cr385-master-checklist.html'; h=open(p).read()
tick=['X-02','X-03','X-04','X-05','X-09',
 'M1-01','M1-02','M1-04','M1-05','M1-07',
 'M2-01','M2-02','M2-03','M2-04','M2-05',
 'M3-01','M3-02','M3-03','M3-04','M3-08','M3-09',
 'M4-01','M4-02','M4-04','M4-05','M4-06',
 'M5-01','M5-02','M5-03','M5-04',
 'M6-01','M6-03','M6-04','M6-06','M6-07','M6-08','M6-09','M6-10','M6-11',
 'M7-01','M7-02','M7-03','M7-04',
 'R-01','R-07']
n=0
for k in tick:
    old=f'<tr><td class="k">{k}</td><td class="c"><input type="checkbox"></td>'
    new=f'<tr><td class="k">{k}</td><td class="c"><input type="checkbox" checked></td>'
    assert h.count(old)==1,(k,h.count(old))
    h=h.replace(old,new); n+=1
open(p,'w').write(h); changed.append(f'cr385-master-checklist.html ({n} ticks)')

# ---------- I. FILE_OWNERSHIP ----------
p=M+'control/FILE_OWNERSHIP.md'; t=open(p).read().rstrip('\n')
t+=f'''
| `memory/test_reports/QA_REPORT_2026_09_24_CR385_P5_ROLE4.md` | NEW \u2014 Phase 5 Role 4 QA report (34 rows, 34 PASS after \u00a75.7) | CR-385 P5 \u00a75.6 {D} |
| `memory/evidence/CR-385/probes_2026_09_23_release/{{PROBE_REPORT,FINAL_GUARDS}}.md`, `run_gate4.py`, `run_n7n8.py`, `run_n11.py`, `run_d14.py`, `run_d1516.py`, `_probe_common.py`, `*_requests.jsonl`, `final_guard5_jest.log`, `final_guard6_build.log` | NEW \u2014 \u00a75.4 probe pack (credentials read-by-pattern) + \u00a75.5 guards evidence | CR-385 P5 \u00a75.4/\u00a75.5 2026-09-24 |
| `memory/handover/SESSION_HANDOVER_2026_09_2{{3,4}}_CR385_P5_*.md` | NEW \u2014 P5 session handovers (SESSA/SESSB/SESSC CLOSED, SESSC ENTRY, SEC56 ENTRY, SEC56 DONE) | CR-385 P5 2026-09-23/24 |
| `frontend/public/cr385-master-checklist.html` | ticks only (evidenced rows M1\u2013M7, X-02/03/04/05/09, R-01, R-07) \u2014 `public/`, not `src` | CR-385 P5 \u00a75.7 {D} |
| `memory/control/{{registry.json,BUG_TRACKER.md,CR_REGISTRY.md,OPEN_GAPS_REGISTER.md,CONTROL_DASHBOARD.md,SPRINT_STATUS.md,FILE_OWNERSHIP.md}}`, `memory/PRD.md` | \u00a75.7 registry closure (P5 PASSED, awaiting sign-off; BUG-448/449 registered; FU-385-C row) | CR-385 P5 \u00a75.7 {D} |

`frontend/src` diff: **empty** (verified `git status --short frontend/src` \u2192 0 at \u00a75.7 close). Hotspots byte-identical by sha256 (FINAL_GUARDS G3).
'''
old='**Last Updated:** 2026-09-21 (BUG-439 BUG FIX'
assert old in t
t=t.replace(old,f'**Last Updated:** {D} (CR-385 P5 \u00a75.7 registry closure \u2014 docs/evidence rows added, `frontend/src` diff empty) \u2014 2026-09-21 (BUG-439 BUG FIX',1)
open(p,'w').write(t+'\n'); changed.append('FILE_OWNERSHIP.md')

# ---------- J. QA report row 34 ----------
p=M+QA; t=open(p).read()
old='| 34 | all | Registry Step 5 checklist executed | **PENDING** | closes in §5.7 (registry closure tick list) — will be flipped to PASS with the R18 marker count once §5.7 is done | not yet run at the time of this report |'
assert old in t
t=t.replace(old,'| 34 | all | Registry Step 5 checklist executed | **PASS** | §5.7 executed 2026-09-24 (`registry.json` CR-385 `status_history` "§5.7 REGISTRY CLOSURE EXECUTED"; FILE_OWNERSHIP · BUG_TRACKER · CR_REGISTRY (+FU-385-C/D) · OPEN_GAPS · CONTROL_DASHBOARD · PRD · SPRINT_STATUS placeholder · master-checklist ticks) · R18: `grep -rln "CR-385" frontend/src --include=*.js --include=*.jsx | wc -l` → **48**; copy headers present on `RoomTile.jsx` (`@8c7745f L25–27, L198–266`) and `CheckInForm.jsx` (CheckInPage L26–57 / L787–797 / L263–345) | CR-385 status deliberately NOT CLOSED — waits for the owner\u2019s verbatim word (§5.8) |')
t=t.replace('**Tally: 33 PASS (incl. 1 PASS-carried, 1 PASS-with-note) · 0 FAIL · 1 PENDING (row 34, §5.7).**','**Tally: 34 PASS (incl. 1 PASS-carried, 1 PASS-with-note) · 0 FAIL · 0 PENDING (row 34 closed by §5.7 on 2026-09-24).**')
t=t.replace('**Phase 5 regression PASSED 2026-09-24** — 34-row matrix: **33 PASS · 0 FAIL · 1 PENDING** (row 34 = registry Step 5 checklist, closes in §5.7);','**Phase 5 regression PASSED 2026-09-24** — 34-row matrix: **34 PASS · 0 FAIL** (row 34 registry Step 5 checklist executed 2026-09-24, §5.7);')
t=t.replace('**Ready for owner sign-off (§5.8)** after §5.7 registry closure.','**Ready for owner sign-off (§5.8)** — §5.7 registry closure executed 2026-09-24.')
t=t.replace('Next steps: §5.7 registry closure tick list (FILE_OWNERSHIP owed block · `registry.json` files[] + BUG statuses · BUG_TRACKER · CR_REGISTRY + FU-385-C/D rows · OPEN_GAPS_REGISTER · CONTROL_DASHBOARD · PRD · SPRINT_STATUS placeholder · master-checklist ticks · R18 marker count → row 34 PASS) → §5.8 one sign-off message to the owner.','Next step: §5.8 — one sign-off message to the owner (close word + FU-385-C + FU-385-D confirmations, recorded verbatim); only then registry CLOSED, D90, SPRINT_STATUS final line, CLOSED handover, "Save to GitHub".')
assert '| 34 | all | Registry Step 5 checklist executed | **PASS**' in t and '34 PASS · 0 FAIL' in t
open(p,'w').write(t); changed.append('QA report row 34 -> PASS')
print('CHANGED:'); [print(' -',c) for c in changed]
