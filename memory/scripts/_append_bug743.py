import json, sys

REG = "/app/memory/control/registry.json"
d = json.load(open(REG))
items = d["items"]
if any(i.get("id") == "BUG-743" for i in items):
    print("BUG-743 already exists — aborting")
    sys.exit(0)

entry = {
    "id": "BUG-743",
    "type": "BUG",
    "title": "Item Cancellation Detail (CancelDetailMockup) \u2014 cancellation note (cancel_item_note) not shown or exported",
    "priority": "P1",
    "risk": "LOW",
    "status": "GATE_1_INTAKE 2026-11-21 \u2014 registered; awaiting Gate 2 IA. FE-only; backend contract verified live (cancel_item_note populated both scopes).",
    "sprint_key": "nov_cr_batch",
    "area": "Reports / Analytics",
    "assignee": "Abhishek",
    "client": "ALL",
    "source": "Owner-reported (screenshot /reports-module/cancel-detail) + investigations/INV-CR527_BUG680_BACKEND_VERIFICATION_2026-11-21.md \u00a74b + handover/SESSION_HANDOVER_2026-11-21_INVESTIGATION_CR527_BUG680_CANCELNOTES.md item #3",
    "intake_doc": "change_requests/BUG-743_CANCEL_DETAIL_NOTE_COLUMN_INTAKE.md",
    "duplicate_check": "DISTINCT; RELATED to BUG-708 (removed dead note col on empty-data assumption \u2014 now disproven by live probe), BUG-670/674 (note capture side), and sibling screens CancellationsMockup/OrderNotesMockup",
    "blocked_on": "",
    "registered_date": "2026-11-21",
    "release_date": "",
    "notes": "FE-only. CancelDetailMockup.jsx spreads ...i (L80) so cancel_item_note is on every row, but table (L152-169) and buildExportPayload (L103-109) render no note column. Fix: add Note column reading item.cancel_item_note (fallback notes) in table + export, '\u2014' when empty; verify item + order scope. Blast radius SMALL (1 file). testing_agent mandatory after fix (owner standing rule).",
    "gate": "GATE_1",
    "current_gate": 1,
    "severity": "MAJOR",
}
items.append(entry)
json.dump(d, open(REG, "w"), indent=1, ensure_ascii=False)
print("BUG-743 appended. total items:", len(items))
