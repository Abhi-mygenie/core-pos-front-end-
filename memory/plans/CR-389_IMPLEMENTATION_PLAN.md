# Implementation Plan — CR-389
## Registry Excel Export: All CRs + BUGs with Status, Description & Tracking Columns

**Date:** 2026-09-26
**Role:** PLANNING (Gate 3)
**Based on:** `impact/CR-389_IMPACT_ANALYSIS.md`
**Risk:** LOW
**Status:** IMPLEMENTED — GATE_5A (2026-09-27)

> **Implementation note (2026-09-27):** Script implemented as E-1 below with two owner-approved amendments recorded in `handover/QA_HANDOVER_CR389_2026_09_27.md` §0a: (A-1) notes-snippet `rsplit` only when >250 chars; (A-2) `norm_status()` extended to gate-based mapping for legacy statuses (owner: "status will be as per gate"). `memory/reports/registry_export.py` is the source of truth over the listing below.

---

## 1. Scope Lock

**Files WILL be created:**
- `memory/reports/registry_export.py`
- `memory/reports/REGISTRY_EXPORT_<YYYY_MM_DD>.xlsx`

**Files will NOT be touched:**
- `frontend/src/**` — zero app code
- `memory/control/registry.json` — read-only
- `backend/**` — not involved
- Any existing `memory/` docs

---

## 2. Owner Decisions Applied

| OD | Value |
|---|---|
| OD-389-01 | Area set: POS / PMS / INV / CRM / SHARED (inferred from keywords) |
| OD-389-02 | All 21 columns |
| OD-389-03 | All 731 items including INVESTIGATION / GAP / PROD-* / HOTFIX-* |
| OD-389-04 | 3–5 lines for OPEN, 1 line for CLOSED |

---

## 3. Pre-requisite

```bash
pip install openpyxl
```

---

## 4. Edit E-1 — Create `memory/reports/registry_export.py`

**Full script to implement exactly as below:**

```python
# CR-389: Registry Excel Export — All CRs + BUGs
# Re-runnable. Output: memory/reports/REGISTRY_EXPORT_<YYYY_MM_DD>.xlsx

import json, os, re
from datetime import date
from pathlib import Path

try:
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter
except ImportError:
    raise SystemExit("Run: pip install openpyxl")

# ── Paths ──────────────────────────────────────────────────────────────────
MEMORY      = Path(__file__).parent.parent
REGISTRY    = MEMORY / "control" / "registry.json"
CR_DIR      = MEMORY / "change_requests"
OUT_FILE    = Path(__file__).parent / f"REGISTRY_EXPORT_{date.today().strftime('%Y_%m_%d')}.xlsx"

# ── Area inference keywords ────────────────────────────────────────────────
AREA_RULES = [
    ("PMS",    ["pms","room","checkin","check-in","checkout","check-out",
                "frontdesk","front-desk","folio","housekeeping","booking",
                "reservation","arrival","departure","laundry","night audit"]),
    ("INV",    ["inventor","stock","purchase","ingredient","recipe",
                "smart purchase","wastage","vendor"]),
    ("CRM",    ["crm","customer","loyalty","wallet","coupon","credit"]),
    ("SHARED", ["sidebar","printer","printing","auth","login","permission",
                "deploy","security","env","settings","notification",
                "socket","firebase","pwa"]),
]

def infer_area(item):
    """Return area string; use registry value if set, else infer from title."""
    if item.get("area"):
        raw = item["area"].upper()
        for label in ("PMS","INV","CRM","SHARED"):
            if label in raw:
                return label
        return "POS"
    title = (item.get("title","") + " " + item.get("notes","")).lower()
    for label, keywords in AREA_RULES:
        if any(k in title for k in keywords):
            return label
    return "POS"

# ── Type normalisation ─────────────────────────────────────────────────────
def norm_type(raw):
    t = raw.strip().upper()
    if t in ("CR","BUG","GAP","INVESTIGATION"):
        return t
    if t.startswith("CR"):
        return "CR"
    if t.startswith("BUG"):
        return "BUG"
    if t in ("PROD","PROD-HOTFIX","PROD_HOTFIX"):
        return "PROD-HOTFIX"
    return t or "UNKNOWN"

# ── Status normalisation ───────────────────────────────────────────────────
def norm_status(raw):
    u = raw.upper()
    if "CLOSED" in u:          return "CLOSED"
    if "WONT" in u:            return "WONT-FIX"
    if "DUPLICATE" in u:       return "DUPLICATE"
    if "PARKED" in u:          return "PARKED"
    if "GATE_5B" in u or "QA PASS" in u or "QA_PASS" in u:
                               return "QA PASS"
    if "GATE_5A" in u or "IMPLEMENTED" in u:
                               return "IMPLEMENTED"
    if "GATE_4" in u:          return "GATE 4 GO"
    if "GATE_3" in u or "PLAN_COMPLETE" in u:
                               return "PLANNING"
    if "GATE_2" in u:          return "PLANNING"
    if "INTAKE" in u or "GATE_1" in u:
                               return "INTAKE"
    if "BLOCKED" in u or "BACKEND" in u:
                               return "BLOCKED"
    return "OPEN"

def is_closed(status_norm):
    return status_norm in ("CLOSED","WONT-FIX","DUPLICATE","PARKED")

# ── Gate extraction ────────────────────────────────────────────────────────
def extract_gate(item, status_norm):
    g = item.get("gate","")
    if g:
        return str(g)
    mapping = {
        "INTAKE":"1","PLANNING":"2-3","GATE 4 GO":"4",
        "IMPLEMENTED":"5A","QA PASS":"5B",
        "CLOSED":"CLOSED","BLOCKED":"BLOCKED",
        "PARKED":"PARKED","WONT-FIX":"WONT-FIX","DUPLICATE":"DUPLICATE",
    }
    return mapping.get(status_norm, "—")

# ── Description mining ─────────────────────────────────────────────────────
def get_description(item, status_norm):
    """3-5 lines for OPEN, 1 line for CLOSED."""
    iid   = item.get("id","")
    title = item.get("title","")
    notes = item.get("notes","")

    if is_closed(status_norm):
        # 1 line: title (+ first sentence of notes if short)
        note_snippet = notes.split(".")[0].strip() if notes else ""
        return (title + (f". {note_snippet}" if note_snippet and len(note_snippet) < 80 else ""))[:200]

    # OPEN: try intake doc
    intake_path = _find_intake(CR_DIR, iid)
    if intake_path:
        return _mine_intake(intake_path, item)

    # Fallback: title + notes
    base = title
    if notes:
        # First 250 chars of notes
        snippet = notes[:250].rsplit(" ",1)[0]
        base = f"{title}. {snippet}"
    return base[:400]

def _find_intake(cr_dir, iid):
    """Return Path to intake doc or None."""
    for f in cr_dir.iterdir():
        name = f.name
        if name.startswith(iid+"_") or name.startswith(iid+"-") or name.startswith(iid+"."):
            return f
    return None

def _mine_intake(path, item):
    """Extract a 3-5 line description from the intake markdown."""
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return item.get("title","")

    lines = []

    # 1. Try ## 1. Summary or ## Summary section
    m = re.search(r'##\s*(?:\d+\.\s*)?Summary\s*\n(.*?)(?=\n##|\Z)', text, re.S | re.I)
    if m:
        raw = m.group(1).strip()
        # Strip markdown bullets/dashes, keep first 5 non-empty lines
        paras = [l.lstrip("#-*| ").strip() for l in raw.splitlines() if l.strip() and not l.strip().startswith("|")]
        lines = paras[:5]

    # 2. Fallback: first non-heading paragraph after the title
    if not lines:
        paras = [l.strip() for l in text.splitlines()
                 if l.strip() and not l.startswith("#") and not l.startswith("|") and len(l.strip()) > 20]
        lines = paras[:3]

    result = " | ".join(lines[:5]) if lines else item.get("title","")
    return result[:500]

# ── Date extraction ────────────────────────────────────────────────────────
def extract_date(item, field_names):
    for f in field_names:
        v = item.get(f,"")
        if v:
            # Extract YYYY-MM-DD if present
            m = re.search(r'\d{4}-\d{2}-\d{2}', str(v))
            return m.group(0) if m else str(v)[:10]
    return "—"

# ── Blocked derivation ─────────────────────────────────────────────────────
def is_blocked(item, status_norm):
    if status_norm == "BLOCKED":
        return "YES"
    if "BLOCKED" in item.get("status","").upper():
        return "YES"
    return "NO"

def blocked_on(item):
    notes = item.get("notes","") + " " + item.get("status","")
    if "backend" in notes.lower():   return "backend"
    if "credential" in notes.lower() or "cred" in notes.lower(): return "credentials"
    if "owner" in notes.lower():     return "owner decision"
    if "parent" in notes.lower():    return "parent CR"
    return "—"

# ── Build row ──────────────────────────────────────────────────────────────
COLUMNS = [
    "S.No","ID","Type","Title","Description","Area","Module",
    "Priority","Risk","Gate","Status","Status Detail",
    "Date Registered","Date Implemented","Sprint",
    "Blocked","Blocked On","Files","Related","Notes","Docs",
]

def build_row(idx, item):
    status_norm = norm_status(item.get("status",""))
    area        = infer_area(item)

    # Module: infer from title (finer grain than area)
    title_lc = item.get("title","").lower()
    module = "—"
    module_map = [
        ("Order Entry",         ["order entry","order-entry","order_entry"]),
        ("Menu Management",     ["menu","bulk edit","bulk-edit"]),
        ("Inventory",           ["inventor","stock","ingredient","recipe"]),
        ("Smart Purchase",      ["smart purchase","purchase planner"]),
        ("Reports",             ["report","ledger","settlement","sales","daily"]),
        ("PMS Check-In",        ["check-in","checkin"]),
        ("PMS Bookings",        ["booking","reservation","new booking"]),
        ("PMS Front Desk",      ["front desk","frontdesk"]),
        ("PMS Folio",           ["folio"]),
        ("PMS Housekeeping",    ["housekeeping","laundry"]),
        ("PMS Revenue",         ["revenue","night audit"]),
        ("Printing",            ["print","printer","bill","kot"]),
        ("Sidebar / Nav",       ["sidebar","navigation","nav"]),
        ("Settings",            ["settings","config"]),
        ("Auth / Permissions",  ["auth","login","permission","role"]),
        ("Sockets",             ["socket","realtime","real-time"]),
        ("CRM",                 ["crm","customer","loyalty","wallet"]),
        ("Payments",            ["payment","settle","collect","discount","coupon"]),
    ]
    for mod_label, kws in module_map:
        if any(k in title_lc for k in kws):
            module = mod_label
            break

    prio = item.get("priority") or item.get("severity") or "—"
    risk = item.get("risk","—") or "—"

    files_raw = item.get("files", [])
    files_str = ", ".join(files_raw[:5]) if isinstance(files_raw, list) else str(files_raw)
    if isinstance(files_raw, list) and len(files_raw) > 5:
        files_str += f" (+{len(files_raw)-5} more)"

    related = item.get("related","") or item.get("parent","") or "—"
    if isinstance(related, list):
        related = ", ".join(related)

    # Artifact docs
    artifacts = item.get("artifact_refs",{})
    if isinstance(artifacts, dict):
        docs = ", ".join(f"{k}: {v}" for k,v in list(artifacts.items())[:3])
    else:
        docs = str(artifacts)[:100] if artifacts else "—"

    return [
        idx,                                                        # S.No
        item.get("id",""),                                          # ID
        norm_type(item.get("type","")),                             # Type
        item.get("title",""),                                       # Title
        get_description(item, status_norm),                         # Description
        area,                                                       # Area
        module,                                                     # Module
        prio,                                                       # Priority
        risk,                                                       # Risk
        extract_gate(item, status_norm),                            # Gate
        status_norm,                                                # Status
        item.get("status","")[:300],                               # Status Detail
        extract_date(item, ["registered","created","created_at"]), # Date Registered
        extract_date(item, ["implemented","closed_at","date_implemented"]),  # Date Implemented
        item.get("sprint_key","—") or "—",                         # Sprint
        is_blocked(item, status_norm),                              # Blocked
        blocked_on(item) if is_blocked(item, status_norm)=="YES" else "—",  # Blocked On
        files_str or "—",                                          # Files
        str(related),                                               # Related
        (item.get("notes","") or "")[:300],                        # Notes
        docs,                                                       # Docs
    ]

# ── Style helpers ──────────────────────────────────────────────────────────
HEADER_FILL  = PatternFill("solid", fgColor="1F4E79")
HEADER_FONT  = Font(bold=True, color="FFFFFF", size=10)
ALT_FILL     = PatternFill("solid", fgColor="EBF3FB")

STATUS_COLORS = {
    "CLOSED":       "C6EFCE",  # green
    "QA PASS":      "DDEBF7",  # blue-ish
    "IMPLEMENTED":  "D9E1F2",  # light blue
    "INTAKE":       "FFF2CC",  # yellow
    "PLANNING":     "FCE4D6",  # orange-ish
    "BLOCKED":      "F4CCCC",  # red-ish
    "PARKED":       "E2EFDA",
    "WONT-FIX":     "D9D9D9",
    "DUPLICATE":    "D9D9D9",
}

def style_header(ws):
    for cell in ws[1]:
        cell.font      = HEADER_FONT
        cell.fill      = HEADER_FILL
        cell.alignment = Alignment(wrap_text=True, vertical="center")

def style_rows(ws, status_col_idx):
    for r_idx, row in enumerate(ws.iter_rows(min_row=2), start=2):
        fill_color = ALT_FILL if r_idx % 2 == 0 else None
        status_cell = ws.cell(row=r_idx, column=status_col_idx)
        sc = STATUS_COLORS.get(status_cell.value)
        if sc:
            fill_color = PatternFill("solid", fgColor=sc)
        for cell in row:
            cell.alignment = Alignment(wrap_text=True, vertical="top")
            if fill_color:
                cell.fill = fill_color

def set_col_widths(ws, widths):
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w

COL_WIDTHS = [6,14,12,40,60,10,22,10,10,8,14,40,14,14,18,8,14,40,20,40,40]

# ── Summary sheet ──────────────────────────────────────────────────────────
def add_summary(wb, all_rows):
    ws = wb.create_sheet("Summary")
    from collections import Counter

    def section(title, data_rows, col_headers):
        ws.append([])
        ws.append([title])
        ws[-1][0].font = Font(bold=True, size=11)
        ws.append(col_headers)
        for cell in ws[-1]:
            cell.font = Font(bold=True)
            cell.fill = PatternFill("solid", fgColor="1F4E79")
            cell.font = Font(bold=True, color="FFFFFF")
        for row in data_rows:
            ws.append(row)

    # Type × Status
    combo = Counter((r[2], r[10]) for r in all_rows)
    section("Type × Status", [[k[0], k[1], v] for k,v in sorted(combo.items())],
            ["Type","Status","Count"])

    # By Area
    area_cnt = Counter(r[5] for r in all_rows)
    section("By Area", [[k,v] for k,v in sorted(area_cnt.items(), key=lambda x:-x[1])],
            ["Area","Count"])

    # By Sprint
    sprint_cnt = Counter(r[14] for r in all_rows)
    section("By Sprint", [[k,v] for k,v in sorted(sprint_cnt.items(), key=lambda x:-x[1])],
            ["Sprint","Count"])

    # Blocked items
    blocked = [r for r in all_rows if r[15]=="YES"]
    section(f"Blocked Items ({len(blocked)})",
            [[r[1],r[2],r[3][:60],r[16]] for r in blocked],
            ["ID","Type","Title","Blocked On"])

    ws.column_dimensions["A"].width = 20
    ws.column_dimensions["B"].width = 20
    ws.column_dimensions["C"].width = 60
    ws.column_dimensions["D"].width = 20

# ── Main ───────────────────────────────────────────────────────────────────
def main():
    print(f"Reading {REGISTRY} ...")
    with open(REGISTRY, encoding="utf-8") as f:
        data = json.load(f)
    items = data["items"]
    print(f"  {len(items)} items loaded.")

    all_rows = []
    for idx, item in enumerate(items, start=1):
        all_rows.append(build_row(idx, item))
        if idx % 100 == 0:
            print(f"  processed {idx}/{len(items)} ...")

    # Closed statuses to exclude from Open Only
    CLOSED_STATUSES = {"CLOSED","WONT-FIX","DUPLICATE","PARKED"}
    open_rows = [r for r in all_rows if r[10] not in CLOSED_STATUSES]
    print(f"  All: {len(all_rows)} rows | Open: {len(open_rows)} rows")

    wb = openpyxl.Workbook()

    # Sheet 1: All Items
    ws_all = wb.active
    ws_all.title = "All Items"
    ws_all.append(COLUMNS)
    for r in all_rows:
        ws_all.append(r)
    ws_all.freeze_panes = "A2"
    ws_all.auto_filter.ref = ws_all.dimensions
    style_header(ws_all)
    status_col = COLUMNS.index("Status") + 1
    style_rows(ws_all, status_col)
    set_col_widths(ws_all, COL_WIDTHS)

    # Sheet 2: Open Only
    ws_open = wb.create_sheet("Open Only")
    ws_open.append(COLUMNS)
    for r in open_rows:
        ws_open.append(r)
    ws_open.freeze_panes = "A2"
    ws_open.auto_filter.ref = ws_open.dimensions
    style_header(ws_open)
    style_rows(ws_open, status_col)
    set_col_widths(ws_open, COL_WIDTHS)

    # Sheet 3: Summary
    add_summary(wb, all_rows)

    wb.save(OUT_FILE)
    print(f"\n✅  Saved: {OUT_FILE}")
    print(f"   All Items: {len(all_rows)} rows")
    print(f"   Open Only: {len(open_rows)} rows")
    print(f"   Summary:   pivots written")

if __name__ == "__main__":
    main()
```

---

## 5. Verification Matrix

| # | Check | Method |
|---|---|---|
| V-1 | Script runs without error | `python3 memory/reports/registry_export.py` → exit 0, see "✅ Saved" |
| V-2 | "All Items" row count = 731 | Open xlsx → count rows in All Items (excl. header) |
| V-3 | "Open Only" has fewer rows | Row count < 731 |
| V-4 | "Summary" sheet present with 4 sections | Open Summary tab |
| V-5 | Spot-check 5 OPEN items | Description column has 3+ sentences |
| V-6 | Spot-check 5 CLOSED items | Description column is 1 line ≤ 200 chars |
| V-7 | 21 columns present | Count header columns |
| V-8 | No `None` / `null` in ID column | Filter ID column |
| V-9 | Type column normalised (no lowercase) | Filter Type column, verify only CR/BUG/INVESTIGATION/GAP/PROD-HOTFIX/UNKNOWN |
| V-10 | Re-run produces fresh date-stamped file | Run again → new file with today's date |

---

## 6. Post-Code Registry Checklist

```
- [ ] registry.json: CR-389 → status: IMPLEMENTED, sprint_key: sep_bug_closure
- [ ] CR_REGISTRY.md: row updated to IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: memory/reports/registry_export.py — CR-389 — 2026-09-26
- [ ] Code marker: # CR-389 present in registry_export.py (line 1)
```

---

## 7. Execution Notes

- Script is **re-runnable** — each run creates a new dated file, does not overwrite old ones.
- Output file is **binary (.xlsx)** — not committed to git (add to `.gitignore` if needed).
- Python script IS committed: `memory/reports/registry_export.py`.
- No `frontend/` restart needed. No supervisor action needed.
- `pip install openpyxl` only needed once per environment.

---

## 8. Recurring Workflow (Weekly Cadence)

This is **not a one-time task**. CR-389 establishes a recurring weekly export pattern.

**Each session the owner returns for this:**
1. No new Gate 2/3/4 cycle required — the plan is already complete and locked.
2. Agent simply runs:
   ```bash
   pip install openpyxl   # skip if already installed
   python3 /app/memory/reports/registry_export.py
   ```
3. A new dated file `REGISTRY_EXPORT_YYYY_MM_DD.xlsx` is generated under `memory/reports/`.
4. The export always reflects the **latest state of registry.json** at the time of the run — statuses, new CRs, new BUGs, gate changes are all picked up automatically.
5. Share the output file with the owner.

**File retention:**
- Keep the last **4 weekly exports** (roughly 1 month of history) — delete older ones to avoid clutter.
- Naming convention `REGISTRY_EXPORT_YYYY_MM_DD.xlsx` makes ordering and cleanup trivial.

**No code change needed between runs** unless:
- New columns are requested → small plan amendment (owner decision + agent updates the script).
- Area inference rules need tuning → 1-line edit in `AREA_RULES` inside the script.
- openpyxl is not installed in a fresh pod → run `pip install openpyxl` once.

**Registry note:** This recurring run does NOT change `registry.json`. It only reads it. No gate process, no registry update needed for repeat runs.

---

```
Planning complete: CR-389
Stage: Impact Analysis (Gate 2) + Implementation Plan (Gate 3) — BOTH DONE
Code reality: NONE
Risk: LOW
Files WILL change: memory/reports/registry_export.py (NEW) + REGISTRY_EXPORT_*.xlsx (NEW output)
Files WILL NOT touch: frontend/src/**, memory/control/registry.json, backend/**
Owner decisions: OD-389-01..04 ALL LOCKED
Next: Gate 4 GO → owner says "Gate 4 GO" → Implementation agent runs the script
```
