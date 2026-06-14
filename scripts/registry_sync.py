#!/usr/bin/env python3
"""
POS 4.0 Gap Audit — registry.json Sync Script
Run once by CLOSURE agent. Adds missing items, fixes sprint_keys, updates statuses.
"""
import json
import copy
import sys

REG_PATH = "/app/memory/control/registry.json"

with open(REG_PATH, "r") as f:
    data = json.load(f)

items = data["items"]
id_map = {item["id"]: item for item in items}

# ── 1. ADD 18 MISSING ITEMS ──────────────────────────────────────────────

new_items = [
    {"id":"CR-020","title":"Restaurant Settings Wizard — Bug Sweep (15 bugs B1-B15)","type":"cr","status":"IMPLEMENTED","priority":"P1","area":"Restaurant Settings","sprint_key":"pos_4_0","created_date":"2026-06-10","completeness":"5/7","art1_intake":"PRESENT","art2_impact":"PRESENT","art3_plan":"PRESENT","art4_code_gate":"PRESENT","art5_impl_summary_qa":"PRESENT","art6_owner_smoke":"MISSING","artifact_refs":"memory/change_requests/CR_020_RESTAURANT_SETTINGS_BUG_SWEEP.md","category":"Restaurant Settings / Bug Fix"},
    {"id":"CR-021","title":"Collect Bill — Split/Partial Payment Defects + Prepaid Parity","type":"cr","status":"CLOSED — OWNER VERIFIED","priority":"P1","area":"Payments","sprint_key":"pos_4_0","created_date":"2026-06-10","completeness":"7/7","art1_intake":"PRESENT","art2_impact":"PRESENT","art3_plan":"PRESENT","art4_code_gate":"PRESENT","art5_impl_summary_qa":"PRESENT","art6_owner_smoke":"PRESENT","artifact_refs":"memory/change_requests/CR_021_COLLECT_BILL_SPLIT_PAYMENT_CR.md","category":"Payments / Split"},
    {"id":"CR-022","title":"Menu Management — Food Type Filters (item_type enum fix)","type":"cr","status":"CLOSED — OWNER VERIFIED","priority":"P1","area":"Menu Management","sprint_key":"pos_4_0","created_date":"2026-06-10","completeness":"7/7","art1_intake":"PRESENT","art2_impact":"PRESENT","art3_plan":"PRESENT","art4_code_gate":"PRESENT","art5_impl_summary_qa":"PRESENT","art6_owner_smoke":"PRESENT","artifact_refs":"memory/change_requests/CR_022_MENU_FOOD_TYPE_FILTERS.md","category":"Menu Management / Filter"},
    {"id":"CR-023","title":"Bulk Editor — Typing Lag Fix (422 items)","type":"cr","status":"CLOSED — OWNER VERIFIED","priority":"P1","area":"Menu Management / Bulk Editor","sprint_key":"pos_4_0","created_date":"2026-06-10","completeness":"7/7","art1_intake":"PRESENT","art2_impact":"PRESENT","art3_plan":"PRESENT","art4_code_gate":"PRESENT","art5_impl_summary_qa":"PRESENT","art6_owner_smoke":"PRESENT","artifact_refs":"memory/change_requests/CR_023_BULK_EDITOR_TYPING_LAG.md","category":"Menu Management / Performance"},
    {"id":"CR-024","title":"Channel Visibility Override (StatusConfigPage feature-gate)","type":"cr","status":"CLOSED — OWNER VERIFIED","priority":"P1","area":"StatusConfig / Dashboard","sprint_key":"pos_4_0","created_date":"2026-06-10","completeness":"7/7","art1_intake":"PRESENT","art2_impact":"PRESENT","art3_plan":"PRESENT","art4_code_gate":"PRESENT","art5_impl_summary_qa":"PRESENT","art6_owner_smoke":"PRESENT","artifact_refs":"memory/change_requests/CR_024_CHANNEL_VISIBILITY_OVERRIDE.md","category":"Dashboard / Channel Config"},
    {"id":"CR-025","title":"Discount Payload Fix — order_discount sends amount not percentage (P0 money)","type":"cr","status":"IMPLEMENTED","priority":"P0","area":"Payments / Discount","sprint_key":"pos_4_0","created_date":"2026-06-10","completeness":"5/7","art1_intake":"PRESENT","art2_impact":"PRESENT","art3_plan":"PRESENT","art4_code_gate":"PRESENT","art5_impl_summary_qa":"PRESENT","art6_owner_smoke":"MISSING","artifact_refs":"memory/change_requests/CR_025_DISCOUNT_PAYLOAD_FIX.md","category":"Payments / Discount / Money"},
    {"id":"CR-026","title":"Report Data & Rounding Sweep (6 session-3 fixes)","type":"cr","status":"IMPLEMENTED","priority":"P1","area":"Reports","sprint_key":"pos_4_0","created_date":"2026-06-11","completeness":"5/7","art1_intake":"PRESENT","art2_impact":"PRESENT","art3_plan":"PRESENT","art4_code_gate":"PRESENT","art5_impl_summary_qa":"PRESENT","art6_owner_smoke":"MISSING","artifact_refs":"memory/change_requests/CR_026_REPORT_DATA_ROUNDING_SWEEP.md","category":"Reports / Data Quality"},
    {"id":"CR-027","title":"Unified Toast & Error Surfacing (3-phase rollout)","type":"cr","status":"REGISTERED — NOT STARTED","priority":"P2","area":"UX / Error Handling","sprint_key":"pos_4_0","created_date":"2026-06-11","completeness":"1/7","art1_intake":"PRESENT","art2_impact":"MISSING","art3_plan":"MISSING","art4_code_gate":"MISSING","art5_impl_summary_qa":"MISSING","art6_owner_smoke":"MISSING","artifact_refs":"memory/change_requests/CR_027_UNIFIED_TOAST_ERROR_SURFACING_CR.md","category":"UX / Error Handling"},
    {"id":"CR-028","title":"Item-Level Discount — payload + give_discount exclusion (P1 money)","type":"cr","status":"INTAKE COMPLETE — NO CODE","priority":"P1","area":"Payments / Discount","sprint_key":"pos_4_0","created_date":"2026-06-11","completeness":"1/7","art1_intake":"PRESENT","art2_impact":"MISSING","art3_plan":"MISSING","art4_code_gate":"MISSING","art5_impl_summary_qa":"MISSING","art6_owner_smoke":"MISSING","artifact_refs":"memory/change_requests/CR_028_ITEM_LEVEL_DISCOUNT.md","category":"Payments / Discount / Money"},
    {"id":"CR-029-QSR","title":"QSR Payload Parity + round_up Persistence on Collect Bill","type":"cr","status":"GATE 3 COMPLETE","priority":"P1","area":"QSR / Payments","sprint_key":"pos_4_0","created_date":"2026-06-12","completeness":"3/7","art1_intake":"PRESENT","art2_impact":"PRESENT","art3_plan":"PRESENT","art4_code_gate":"MISSING","art5_impl_summary_qa":"MISSING","art6_owner_smoke":"MISSING","artifact_refs":"memory/change_requests/CR_029_QSR_PAYLOAD_PARITY_AND_ROUND_UP.md","category":"QSR / Payments"},
    {"id":"CR-036","title":"Bulk Editor — Add Item Row Visibility (Top-Pinned, Empty Category)","type":"cr","status":"GATE 4 CONFIRMED","priority":"P2","area":"Menu Management / Bulk Editor","sprint_key":"pos_4_0","created_date":"2026-06-12","completeness":"4/7","art1_intake":"PRESENT","art2_impact":"PRESENT","art3_plan":"PRESENT","art4_code_gate":"PRESENT","art5_impl_summary_qa":"MISSING","art6_owner_smoke":"MISSING","artifact_refs":"memory/change_requests/CR_036_BULK_EDITOR_ADD_ITEM_TOP_ROW.md","category":"Menu Management / Bulk Editor"},
    {"id":"CR-036-FU-01","title":"Bulk Editor — Validation UX (toast + red border + focus + Trash2)","type":"cr","status":"GATE 3 COMPLETE","priority":"P2","area":"Menu Management / Bulk Editor","sprint_key":"pos_4_0","created_date":"2026-06-12","completeness":"3/7","art1_intake":"PRESENT","art2_impact":"PRESENT","art3_plan":"PRESENT","art4_code_gate":"MISSING","art5_impl_summary_qa":"MISSING","art6_owner_smoke":"MISSING","artifact_refs":"memory/change_requests/CR_036_FU_01_BULK_EDITOR_VALIDATION_UX.md","category":"Menu Management / Bulk Editor / UX"},
    {"id":"CR-036-FU-02","title":"Bulk Editor — Column Reorder + Sold By (Unit) Tier-1 Promotion","type":"cr","status":"GATE 3 COMPLETE","priority":"P3","area":"Menu Management / Bulk Editor","sprint_key":"pos_4_0","created_date":"2026-06-12","completeness":"3/7","art1_intake":"PRESENT","art2_impact":"PRESENT","art3_plan":"PRESENT","art4_code_gate":"MISSING","art5_impl_summary_qa":"MISSING","art6_owner_smoke":"MISSING","artifact_refs":"memory/change_requests/CR_036_FU_02_BULK_EDITOR_COL_REORDER_SOLDBY.md","category":"Menu Management / Bulk Editor / Cosmetic"},
    {"id":"CR-036-FU-03","title":"Bulk Editor — Tax-Required Validation + Backdrop Loader + Data-Loss Race Guard","type":"cr","status":"GATE 3 COMPLETE","priority":"P1","area":"Menu Management / Bulk Editor","sprint_key":"pos_4_0","created_date":"2026-06-12","completeness":"3/7","art1_intake":"PRESENT","art2_impact":"PRESENT","art3_plan":"PRESENT","art4_code_gate":"MISSING","art5_impl_summary_qa":"MISSING","art6_owner_smoke":"MISSING","artifact_refs":"memory/change_requests/CR_036_FU_03_BULK_EDITOR_TAX_VALIDATION_OVERLAY.md","category":"Menu Management / Bulk Editor / Validation"},
    {"id":"CR-044","title":"Insights Module: Report Data Persistence Across Navigation (Shared Cache)","type":"cr","status":"IMPLEMENTED","priority":"P1","area":"Insights / Performance","sprint_key":"pos_4_0","created_date":"2026-06-12","completeness":"5/7","art1_intake":"PRESENT","art2_impact":"PRESENT","art3_plan":"PRESENT","art4_code_gate":"PRESENT","art5_impl_summary_qa":"PRESENT","art6_owner_smoke":"MISSING","artifact_refs":"memory/change_requests/CR_044_INSIGHTS_REPORT_DATA_PERSISTENCE.md","category":"Insights / Performance / Cache"},
    {"id":"CR-045","title":"Insights Module: Suppress/Ignore Unused API Response Fields (FE Strip)","type":"cr","status":"IMPLEMENTED","priority":"P2","area":"Insights / Performance","sprint_key":"pos_4_0","created_date":"2026-06-12","completeness":"5/7","art1_intake":"PRESENT","art2_impact":"PRESENT","art3_plan":"PRESENT","art4_code_gate":"PRESENT","art5_impl_summary_qa":"PRESENT","art6_owner_smoke":"MISSING","artifact_refs":"memory/change_requests/CR_045_SUPPRESS_UNUSED_API_FIELDS.md","category":"Insights / Performance / Payload"},
    {"id":"BUG-122-POST","title":"BUG-122 Post-Delivery: 3 FE fixes (POS YTC Cancel, snooze web-gate, schedule_at)","type":"bug","status":"IMPLEMENTED","priority":"P1","area":"OrderCard / TableCard / CartPanel","sprint_key":"pos_4_0","created_date":"2026-06-10","completeness":"5/7","art1_intake":"PRESENT","art2_impact":"PRESENT","art3_plan":"PRESENT","art4_code_gate":"PRESENT","art5_impl_summary_qa":"PRESENT","art6_owner_smoke":"MISSING","artifact_refs":"memory/handover/CR018_BUG122_FE_FIXES_HANDOVER_2026_06_10.md","category":"Dashboard / OrderCard / Fix"},
    {"id":"BUG-125-B","title":"Food Type (item_type) not persisting on Edit — imported from discount-menu branch","type":"bug","status":"PLANNING COMPLETE (other branch)","priority":"P1","area":"Menu Management","sprint_key":"pos_4_0","created_date":"2026-06-11","completeness":"2/7","art1_intake":"PRESENT","art2_impact":"PRESENT","art3_plan":"MISSING","art4_code_gate":"MISSING","art5_impl_summary_qa":"MISSING","art6_owner_smoke":"MISSING","artifact_refs":"memory/change_requests/BUG_125_B_FOOD_TYPE_NOT_PERSISTING.md","category":"Menu Management / Data Persistence"}
]

added = 0
for ni in new_items:
    if ni["id"] not in id_map:
        items.append(ni)
        id_map[ni["id"]] = ni
        added += 1
        print(f"  ADDED: {ni['id']}")
    else:
        print(f"  SKIP (already exists): {ni['id']}")

print(f"\n=== Added {added} new items ===\n")

# ── 2. FIX 24 SPRINT_KEYS ────────────────────────────────────────────────

sprint_fix_ids = [
    "CR-017","CR-018","CR-019",
    "CR-029","CR-030","CR-031","CR-032","CR-033","CR-034","CR-035",
    "BUG-112","BUG-113","BUG-114","BUG-115","BUG-116","BUG-117","BUG-118","BUG-119",
    "BUG-122","BUG-123","BUG-124","BUG-125","BUG-126","BUG-127","BUG-128","BUG-129"
]

fixed_keys = 0
for sid in sprint_fix_ids:
    if sid in id_map:
        old = id_map[sid].get("sprint_key","NONE")
        if old != "pos_4_0":
            id_map[sid]["sprint_key"] = "pos_4_0"
            fixed_keys += 1
            print(f"  SPRINT_KEY: {sid} — {old} → pos_4_0")
    else:
        print(f"  WARN: {sid} not in registry (skipped sprint_key fix)")

print(f"\n=== Fixed {fixed_keys} sprint_keys ===\n")

# ── 3. UPDATE 10 STALE STATUSES ──────────────────────────────────────────

status_updates = {
    "CR-037": {"status":"IMPLEMENTED","completeness":"5/7","art2_impact":"PRESENT","art3_plan":"PRESENT","art4_code_gate":"PRESENT","art5_impl_summary_qa":"PRESENT"},
    "CR-038": {"status":"IMPLEMENTED","completeness":"5/7","art2_impact":"PRESENT","art3_plan":"PRESENT","art4_code_gate":"PRESENT","art5_impl_summary_qa":"PRESENT"},
    "CR-039": {"status":"IMPLEMENTED","completeness":"5/7","art2_impact":"PRESENT","art3_plan":"PRESENT","art4_code_gate":"PRESENT","art5_impl_summary_qa":"PRESENT"},
    "CR-040": {"status":"IMPLEMENTED","completeness":"5/7","art2_impact":"PRESENT","art3_plan":"PRESENT","art4_code_gate":"PRESENT","art5_impl_summary_qa":"PRESENT"},
    "CR-041": {"status":"INVESTIGATION COMPLETE — 3 owner decisions pending","completeness":"3/7","art2_impact":"PRESENT","art3_plan":"PRESENT"},
    "CR-042": {"status":"IMPLEMENTED","completeness":"5/7","art2_impact":"PRESENT","art3_plan":"PRESENT","art4_code_gate":"PRESENT","art5_impl_summary_qa":"PRESENT"},
    "BUG-131": {"status":"IMPLEMENTED","completeness":"5/7","art2_impact":"PRESENT","art3_plan":"PRESENT","art4_code_gate":"PRESENT","art5_impl_summary_qa":"PRESENT"},
    "BUG-132": {"status":"IMPLEMENTED","priority":"P1","completeness":"5/7","art2_impact":"PRESENT","art3_plan":"PRESENT","art4_code_gate":"PRESENT","art5_impl_summary_qa":"PRESENT"},
    "BUG-133": {"status":"IMPLEMENTED","priority":"P1","completeness":"5/7","art2_impact":"PRESENT","art3_plan":"PRESENT","art4_code_gate":"PRESENT","art5_impl_summary_qa":"PRESENT"},
    "CR-043": {"status":"REGISTERED — GATE 1 ONLY","completeness":"1/7"}
}

updated = 0
for uid, fields in status_updates.items():
    if uid in id_map:
        for k, v in fields.items():
            old_v = id_map[uid].get(k, "NONE")
            id_map[uid][k] = v
        updated += 1
        print(f"  STATUS: {uid} → {fields.get('status','(no status change)')}")
    else:
        print(f"  WARN: {uid} not in registry (skipped status update)")

print(f"\n=== Updated {updated} statuses ===\n")

# ── 4. WRITE BACK ────────────────────────────────────────────────────────

data["items"] = items
with open(REG_PATH, "w") as f:
    json.dump(data, f, indent=1, ensure_ascii=False)

total = len([i for i in items if i.get("sprint_key") == "pos_4_0"])
print(f"✅ registry.json saved. POS 4.0 items now: {total}")
print(f"   Added: {added} | Sprint keys fixed: {fixed_keys} | Statuses updated: {updated}")
