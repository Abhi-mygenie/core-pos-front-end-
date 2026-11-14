# MyGenie Screen Reference Pipeline — CR-390

A reusable Playwright + Python pipeline that generates client-facing Screen Reference PDFs for every MyGenie POS module using real preprod data with a fictional business persona.

---

## Quick Start (per module)

```bash
# Step 1: Get owner approval for module journey (sub-gate G-journey)
#   → Set journey_approved=true + journey_approved_date in manifests/<MODULE>_*.json

# Step 2: Owner provides credentials for this module's restaurant

# Step 3: Take screenshots
python3 runner.py \
  --module MM \
  --url https://core-pos-deploy-25.preview.emergentagent.com \
  --email owner@restaurant.com \
  --password ****

# Step 4: Assemble PDF
python3 assemble.py --module MM

# Step 5 (after all modules): Build master PDF
python3 master_assemble.py
```

---

## Module Sequence (OD-390-07)

```
MM → EM → IM → DC → CM → DR → IN-Basic → IN-Advanced → PMS (redo, last)
```

Each module = one mini-cycle:
1. Owner approves journey (G-journey sub-gate)
2. Owner provides credentials for that module's restaurant
3. `runner.py` → screenshots saved
4. `assemble.py` → per-module PDF
5. Owner reviews PDF → feedback → re-run if needed
6. Owner approves → edition v1.0 locked

---

## Output Locations

| Artifact | Path |
|---|---|
| Screenshots (PNGs) | `/app/memory/evidence/CR-390/<MODULE>/` |
| Per-module PDF | `/app/memory/design_briefs/downloads/screen_reference/<MODULE>/` |
| Master PDF | `/app/memory/design_briefs/downloads/screen_reference/` |

---

## Dependencies

```bash
pip install fpdf2 pypdf pillow playwright
playwright install chromium
```

---

## Rules (OD-390-02/03/04/14)

- **NEVER** run a module before G-journey sub-gate is approved (`journey_approved: true` in manifest)
- **NEVER** include Beta labels, coming-soon screens, or dev test-IDs in screenshots
- **NEVER** use real restaurant names — DOM-swapped to `"Sharma Hotel & Restaurant"`
- Max **3 screenshots per route** (primary + 1-2 interaction states)
- PMS PDFs in `public/` to be **moved here** during M6 regen (closes CR-372 carve-out)
- Client-facing PDFs: fictional business data, realistic ₹/GST figures, no internal CR/BUG IDs

---

## Manifest Format

Each `manifests/<MODULE>_*.json` contains:
- `journey_approved: false/true` — must be `true` before runner will execute
- `journey_approved_date` — set when owner approves
- `journey[]` — ordered list of routes + states + pre-actions

To approve a journey:
```json
{
  "journey_approved": true,
  "journey_approved_date": "2026-09-28",
  "journey": [ ... ]
}
```

---

## File Structure

```
frontend/scripts/screen-reference/
├── runner.py           # Playwright screenshot runner
├── assemble.py         # Per-module PDF assembler (fpdf2)
├── master_assemble.py  # Master PDF merger (pypdf)
├── persona.json        # Fictional business persona (OD-390-02)
├── config/
│   └── template.json     # PDF template config
├── manifests/
│   ├── MM_menu.json
│   ├── EM_expenses.json
│   ├── IM_inventory.json
│   ├── DC_day_closure.json
│   ├── CM_credit.json
│   ├── DR_daily_report.json
│   ├── INB_insights_basic.json
│   ├── INA_insights_advanced.json
│   └── PMS_pms.json      # Skeleton — journey DEFERRED (OD-390-13)
└── README.md
```

---

*CR-390 — Screen Reference PDF Pipeline — Phase A: Pipeline Foundation*
