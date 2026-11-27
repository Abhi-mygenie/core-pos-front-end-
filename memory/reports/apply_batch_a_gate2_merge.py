import json

P = "/app/memory/control/registry.json"
DATE = "2026-11-14"
STATUS = f"GATE_2_IMPACT_ANALYSIS — DRAFT {DATE} (owner Q&A round 5 pending; backend brief not written)"
SUMMARY = "memory/impact/BATCH-A_IMPACT_ANALYSIS_SUMMARY_2026_11_14.md"

ITEMS = {
    "CR-071": "IA: only rights Batch A needs; full app-wide wiring ON HOLD until all batches done.",
    "CR-492": "IA: complementary_food key exists but backend does NOT enforce it (comp saved without right) — backend enforcement needed. Existing comp lines read-only.",
    "CR-515": "IA: reuse EXISTING rights (order_unpaid, update_payment, print_icon) instead of 4 new ones; reprint right moved to P1.",
    "CR-493": "IA: block cancel + message when no reasons configured; notes-mandatory setting key missing in backend.",
    "BUG-674": "IA: order note stored as cancellation_note; FE never sends typed note. Save note empty when blank. Order Beta lacks reason/note fields (backend).",
    "BUG-670": "IA: FE drops item notes AND backend has no item cancel-note field (4 keys tried).",
    "CR-494": "IA: all PIN work built inside CR-494; threshold amount incl. tax; no PIN/threshold/limit keys or endpoints exist.",
    "CR-445": "IA: whole-order comp saved as the 100% discount preset.",
    "CR-495": "IA: no meal plan / guest count anywhere (Palm House probe) — backend build needed (Parth).",
    "CR-443": "IA: no alert-right key or event endpoints exist (backend).",
    "CR-372-B": "IA: LOW risk; /local-printer-setup + /restaurant-picker guard ODs open.",
}

d = json.load(open(P))
by_id = {i["id"]: i for i in d["items"]}
for bid, note in ITEMS.items():
    it = by_id[bid]
    it["status"] = STATUS
    it["notes"] = f"[{DATE} Gate 2 IA merged] {note} || " + (it.get("notes") or "")
    refs = it.setdefault("artifact_refs", [])
    for label, path in (("Impact analysis", f"memory/impact/{bid}_IMPACT_ANALYSIS.md"), ("Batch A IA summary", SUMMARY)):
        if not any((r.get("path") if isinstance(r, dict) else r) == path for r in refs):
            refs.append({"label": label, "path": path, "type": "impact"})
for bid in ("CR-529", "CR-540"):
    refs = by_id[bid].setdefault("artifact_refs", [])
    path = f"memory/impact/{bid}_IMPACT_ANALYSIS.md"
    if not any((r.get("path") if isinstance(r, dict) else r) == path for r in refs):
        refs.append({"label": "Impact analysis (dependency only)", "path": path, "type": "impact"})

d["meta"]["last_updated"] = DATE
d["meta"]["last_action"] = "Merged Batch A Gate 2 IA pack from parallel agent: 11 items → GATE_2 DRAFT, 14 impact docs + masked evidence added."
d["meta"]["last_note"] = "Next: Batch A IA owner Q&A round 5 (see SESSION_HANDOVER_2026_11_14_BATCH_A_GATE2_IMPACT.md), then backend brief; Batch E intake pending."
json.dump(d, open(P, "w"), indent=2, ensure_ascii=False)
print("updated", len(ITEMS))
