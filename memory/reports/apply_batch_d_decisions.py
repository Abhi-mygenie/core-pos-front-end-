import json

P = "/app/memory/control/registry.json"
DOC = "memory/change_requests/BATCH_D_OWNER_DECISIONS_2026_11_14.md"
DATE = "2026-11-14"
BATCH = "BATCH-D-2026-11-14"
READY = f"GATE_1_INTAKE_COMPLETE — OWNER ODs ANSWERED {DATE} (Batch D). Next: IMPACT ANALYSIS BATCH-D."

UPDATES = {
    "BUG-667": dict(status=READY, note="Sidebar bottom restaurant name → wrap 2 lines. Confirm screen at impact."),
    "BUG-669": dict(status=READY, note="Add-ons + variations with ₹0; price must be typed, 0 allowed; Menu Mgmt + Bulk Editor (impact to check)."),
    "BUG-673": dict(status=READY, note="After search+add, Enter re-adds default item. Fix: selection returns to search box after add."),
    "CR-525": dict(status=READY, note="After print: one Collect Bill button (table+order cards); button + card tap open Collect Bill screen; edit after print restores KOT+Bill."),
    "CR-521": dict(status=READY, blocked_on="CR-525 (shared card files)", note="Keep green border, background orange (table+order cards). Shade by design agent at impact."),
    "CR-523": dict(status=READY, blocked_on="Gyan — backend", note="Save customer link immediately on pop-up save, also after print. Change customer if possible."),
}
for p1 in ["CR-518", "CR-516", "CR-437", "CR-404"]:
    UPDATES[p1] = dict(priority="P1", note="Moved to P1 (take later).")

d = json.load(open(P))
by_id = {i["id"]: i for i in d["items"]}
for bid, u in UPDATES.items():
    it = by_id[bid]
    for k in ("status", "priority", "blocked_on"):
        if k in u:
            it[k] = u[k]
    it["client"] = "ALL"
    it["batch"] = BATCH
    if not it.get("assignee"):
        it["assignee"] = "Abhishek"
    it["notes"] = f"[{DATE} owner decisions] {u['note']} || " + (it.get("notes") or "")
    refs = it.setdefault("artifact_refs", [])
    if not any((r.get("path") if isinstance(r, dict) else r) == DOC for r in refs):
        refs.append({"label": "Batch D owner decisions", "path": DOC, "type": "decisions"})

d["meta"]["last_updated"] = DATE
d["meta"]["last_action"] = "Batch D owner decisions applied: 6 P0 ready for impact, 4 moved to P1."
d["meta"]["last_session"] = "Intake Q&A 2026-11-14 — Batch A, B, C, D (P0) closed. Handover at /app/memory/handover/SESSION_HANDOVER_2026_11_14_INTAKE_BATCH_A.md"
d["meta"]["last_note"] = "Next: Batch E intake (P0) or PLANNING Gate 2 for A–D after owner GO; INVESTIGATION to validate CR-505/CR-510."
json.dump(d, open(P, "w"), indent=2, ensure_ascii=False)
print("updated", len(UPDATES), "total", len(d["items"]))
