import json

P = "/app/memory/control/registry.json"
DOC = "memory/change_requests/BATCH_C_OWNER_DECISIONS_2026_11_14.md"
DATE = "2026-11-14"
BATCH = "BATCH-C-2026-11-14"
READY = f"GATE_1_INTAKE_COMPLETE — OWNER ODs ANSWERED {DATE} (Batch C). Next: IMPACT ANALYSIS BATCH-C."
VALIDATE = f"GATE_1_INTAKE_COMPLETE — INVESTIGATION VALIDATION NEEDED {DATE} (possibly already done)."
WAIT = "Gyan — backend"

UPDATES = {
    "CR-503": dict(status=READY, blocked_on="CR-515", note="Collect pop-up incl. Print Bill; CR-515 rights; move-to-Paid already works."),
    "CR-528": dict(status=READY, blocked_on=WAIT, note="Inside Audit report; rest at impact."),
    "CR-524": dict(status=READY, blocked_on=WAIT, note="Punch Time = item added time; duration in minutes."),
    "BUG-675": dict(status=READY, note="Remove 'Total sale: ₹X' subtitle under Cash Collected (SettlementPanel L249, SettlementPage L224)."),
    "CR-505": dict(status=VALIDATE, note="Likely covered by BUG-645. Owner: any cash part shows under Cash; Cash total = cash part only. Investigation to validate with code."),
    "CR-510": dict(status=VALIDATE, note="OrderDetailSheet renders variations/add-ons; BUG-601 QA-passed. Investigation to validate on real aggregator order."),
    "BUG-605": dict(status=f"CLOSED — MERGED INTO CR-526 ({DATE}, owner)", note="Make Unpaid does nothing on click (all order types); Change Payment Method works. Merged into CR-526."),
}
for p1 in ["CR-504", "CR-506", "CR-507", "CR-508", "CR-509", "CR-511", "CR-532",
           "CR-444", "CR-497", "CR-537", "CR-539", "CR-138", "BUG-192"]:
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
    it["notes"] = f"[{DATE} owner decisions] {u['note']} || " + (it.get("notes") or "")
    refs = it.setdefault("artifact_refs", [])
    if not any((r.get("path") if isinstance(r, dict) else r) == DOC for r in refs):
        refs.append({"label": "Batch C owner decisions", "path": DOC, "type": "decisions"})

cr526 = by_id["CR-526"]
if "BUG-605" not in (cr526.get("related") or []):
    cr526.setdefault("related", []).append("BUG-605")

d["meta"]["last_updated"] = DATE
d["meta"]["last_action"] = "Batch C owner decisions applied: 4 P0 ready for impact, CR-505/CR-510 need investigation validation, BUG-605→CR-526 merged, 13 moved to P1."
d["meta"]["last_session"] = "Intake Q&A 2026-11-14 — Batch A, B, C (P0) closed. Handover at /app/memory/handover/SESSION_HANDOVER_2026_11_14_INTAKE_BATCH_A.md"
d["meta"]["last_note"] = "Next: Batch D intake (P0) or PLANNING Gate 2 for A/B/C after owner GO; INVESTIGATION to validate CR-505/CR-510."
json.dump(d, open(P, "w"), indent=2, ensure_ascii=False)
print("updated", len(UPDATES), "total", len(d["items"]))
