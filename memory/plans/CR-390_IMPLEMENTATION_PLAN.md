# CR-390 — Implementation Plan
## Screen Reference PDFs for ALL Modules — pipeline foundation

**Gate:** 3 — Implementation Plan
**Date:** 2026-09-27
**Sprint:** `modules_pdf`
**Risk:** LOW
**Based on:** `impact/CR-390_IMPACT_ANALYSIS.md`

## Documentation-only amendment — OD-390-15 (2026-09-28)

Owner selected **(a) video-first with an optional annotated reference PDF**, then instructed: "a update docs and decsion do not start step 1".

For the MM FAQ video pack, source PNGs show the application UI without added explanatory paragraphs, functionality lists or narration boxes. Keep those explanations in separate scripts/mappings/storyboards. Videos consume the PNGs, not PDF pages; the annotated PDF remains an optional reference companion. Existing video subtitles, highlights/zoom, voiceover and intro/outro are unchanged. The original nine-module PDF scope and frozen reference layout are not cancelled or redesigned.

**Step 1 NOT STARTED.** This note records the delivery decision only; it is not the Gate 2 impact-analysis amendment, Gate 3 repair plan, or Gate 4 GO. No capture, code, preprod data or generated artifact changes are authorized. The original foundation plan below remains historical; the forthcoming coverage review must precede the repair plan. External validation of all 70 FAQs remains required before storyboard/video generation.

Current delivery decision and execution hold: `design_briefs/MM_FAQ_VIDEO_PIPELINE_PLAN.md` and `handover/SESSION_HANDOVER_2026_06_CR390_MM_RECAPTURE_AND_VIDEO_PIPELINE.md`.

---

## Scope Lock

**WILL create:**
- `frontend/scripts/screen-reference/runner.py`
- `frontend/scripts/screen-reference/assemble.py`
- `frontend/scripts/screen-reference/master_assemble.py`
- `frontend/scripts/screen-reference/persona.json`
- `frontend/scripts/screen-reference/config/template.json`
- `frontend/scripts/screen-reference/manifests/` — 9 manifest JSON files
- `frontend/scripts/screen-reference/README.md`
- `memory/design_briefs/downloads/screen_reference/` (directory, populated per-module run)

**WILL NOT touch:**
- `frontend/src/**` — zero runtime code change
- `frontend/public/**` — PMS PDFs stay until M6 regen
- `frontend/package.json` — no new yarn dependencies
- `.env`, supervisor configs, any R5 hotspot file

---

## Pre-Implementation

```bash
pip install fpdf2 pypdf pillow
```
Verify: `python3 -c "import fpdf, pypdf, PIL; print('OK')"`

---

## E1 — `frontend/scripts/screen-reference/runner.py`

**Purpose:** Playwright-based screenshot runner. Authenticates → navigates → DOM-swaps name → screenshots.

**Key structure:**
```python
# CR-390: Screen Reference pipeline — Playwright screenshot runner
import argparse, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_DIR = Path(__file__).parent
EVIDENCE_DIR = Path("/app/memory/evidence/CR-390")
LOGIN_URL = "https://preprod.mygenie.online/api/v1/auth/vendoremployee/login"
FICTIONAL_NAME = "Sharma Hotel & Restaurant"   # OD-390-02

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--module", required=True)   # e.g. MM
    parser.add_argument("--url", required=True)       # app preview URL
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()

    manifest = json.loads((BASE_DIR / "manifests" / f"{args.module}_*.json").read_text())
    assert manifest["journey_approved"], f"Sub-gate G-journey NOT approved for {args.module}. Get owner approval first."

    out_dir = EVIDENCE_DIR / args.module
    out_dir.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # Step 1: Login
        page.goto(args.url)
        page.fill("input[type='email']", args.email)
        page.fill("input[type='password']", args.password)
        page.click("button:has-text('LOG IN')")
        page.wait_for_url("**/restaurant-picker", timeout=10000)
        # Select restaurant (first one)
        page.click(".restaurant-card") if page.query_selector(".restaurant-card") else None
        page.wait_for_url("**/dashboard", timeout=10000)

        # Step 2: Screenshot each route in journey order
        counter = 1
        for route_entry in manifest["journey"]:
            page.goto(f"{args.url}{route_entry['route']}")
            page.wait_for_load_state("networkidle")

            for state in route_entry["states"]:
                # Execute pre-actions
                for action in state.get("pre_actions", []):
                    _execute_action(page, action)

                # DOM-swap restaurant name (OD-390-02)
                _swap_restaurant_name(page, FICTIONAL_NAME)

                filename = f"{counter:02d}_{state['slug']}.png"
                page.screenshot(path=str(out_dir / filename), full_page=False)
                print(f"  [{counter:02d}] {state['slug']} → {filename}")
                counter += 1

        browser.close()
    print(f"Done. {counter-1} screenshots saved to {out_dir}")

def _execute_action(page, action):
    # CR-390: pre-action dispatcher
    t = action["type"]
    if t == "click":
        page.click(action["selector"])
        page.wait_for_timeout(500)
    elif t == "type":
        page.fill(action["selector"], action["value"])
    elif t == "wait":
        page.wait_for_timeout(action.get("ms", 1000))
    elif t == "wait_for":
        page.wait_for_selector(action["selector"])

def _swap_restaurant_name(page, fictional_name):
    # CR-390: DOM-swap restaurant name → fictional (OD-390-02)
    page.evaluate(f"""
        const name = document.querySelector('[data-testid="sidebar-restaurant-name"], .restaurant-name, .sidebar-name');
        if (name) name.textContent = '{fictional_name}';
    """)

if __name__ == "__main__":
    main()
```

**CLI usage:**
```bash
python3 runner.py --module MM --url https://core-pos-deploy-25.preview.emergentagent.com --email owner@palmhouse.com --password ****
```

---

## E2 — `frontend/scripts/screen-reference/assemble.py`

**Purpose:** Reads PNGs from evidence dir + manifest metadata → builds styled per-module PDF.

**Key structure:**
```python
# CR-390: Screen Reference pipeline — PDF assembler per module
from fpdf import FPDF
import argparse, json, glob
from pathlib import Path
from datetime import date

BASE_DIR = Path(__file__).parent
EVIDENCE_DIR = Path("/app/memory/evidence/CR-390")
OUT_DIR = Path("/app/memory/design_briefs/downloads/screen_reference")
GREEN = (50, 153, 55)      # MyGenie brand green #329937

class ScreenReferencePDF(FPDF):
    # CR-390: Custom FPDF subclass for MyGenie screen reference template
    def __init__(self, module_name, eyebrow, today):
        super().__init__(orientation="L", unit="mm", format="A4")
        self.module_name = module_name
        self.eyebrow = eyebrow
        self.today = today
        self.set_auto_page_break(False)

    def cover_page(self):
        # Green brand block (OD-390-08 PMS v2.0 template)
        self.add_page()
        self.set_fill_color(*GREEN)
        self.rect(0, 0, 297, 210, 'F')
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(255, 255, 255)
        self.set_xy(20, 60)
        self.cell(0, 8, self.eyebrow, ln=True)
        self.set_font("Helvetica", "B", 28)
        self.set_xy(20, 72)
        self.cell(0, 12, "MyGenie POS", ln=True)
        self.set_font("Helvetica", "", 16)
        self.set_xy(20, 88)
        self.cell(0, 8, self.module_name, ln=True)
        # Disclaimer on cover (OD-390-14b)
        self.set_font("Helvetica", "I", 9)
        self.set_xy(20, 160)
        self.cell(0, 6, "All figures are sample data for illustration purposes only")
        # Edition line
        self.set_font("Helvetica", "", 9)
        self.set_xy(20, 170)
        self.cell(0, 6, f"v1.0  ·  {self.today}")

    def screen_page(self, png_path, badge_num, section, title, description):
        self.add_page()
        # Screenshot (full-width, leaving room for header + footer)
        self.image(str(png_path), x=10, y=20, w=277, h=155)
        # Badge (numbered, top-left)
        self.set_fill_color(*GREEN)
        self.set_xy(10, 8)
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(255, 255, 255)
        self.cell(8, 7, str(badge_num), fill=True, align="C")
        # Section eyebrow
        self.set_text_color(100, 100, 100)
        self.set_font("Helvetica", "", 7)
        self.set_xy(20, 9)
        self.cell(0, 5, section.upper())
        # Title
        self.set_text_color(30, 30, 30)
        self.set_font("Helvetica", "B", 11)
        self.set_xy(20, 14)
        self.cell(0, 5, title)
        # Footer (OD-390-14b)
        self.set_font("Helvetica", "I", 7)
        self.set_text_color(150, 150, 150)
        self.set_xy(10, 203)
        self.cell(0, 5, f"MyGenie {self.module_name}  ·  Screen Reference Guide v1.0  ·  {self.today}  ·  Sample data  ·  © MyGenie 2026")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--module", required=True)
    args = parser.parse_args()

    # Load manifest
    manifest_files = list((BASE_DIR / "manifests").glob(f"{args.module}_*.json"))
    assert manifest_files, f"No manifest for module {args.module}"
    manifest = json.loads(manifest_files[0].read_text())
    assert manifest["journey_approved"], "Journey not approved — run G-journey sub-gate first"

    today = date.today().strftime("%Y-%m-%d")
    module_name = manifest["module_name"]
    eyebrow = manifest.get("eyebrow", module_name.upper())
    png_dir = EVIDENCE_DIR / args.module

    pdf = ScreenReferencePDF(module_name, eyebrow, today)
    pdf.cover_page()

    badge = 1
    for route_entry in manifest["journey"]:
        section = route_entry["section"]
        for state in route_entry["states"]:
            png_path = png_dir / f"{badge:02d}_{state['slug']}.png"
            if not png_path.exists():
                print(f"  WARNING: missing {png_path} — skipping")
                continue
            pdf.screen_page(png_path, badge, section, state["title"], state["description"])
            badge += 1

    out_module_dir = OUT_DIR / args.module
    out_module_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_module_dir / f"MyGenie_{module_name.replace(' ', '_')}_Screen_Reference_v1_{today}.pdf"
    pdf.output(str(out_path))
    print(f"PDF saved: {out_path}  ({badge-1} pages)")

if __name__ == "__main__":
    main()
```

---

## E3 — `frontend/scripts/screen-reference/master_assemble.py`

**Purpose:** Merges all per-module PDFs into one master PDF in OD-390-07 sequence order.

**Key structure:**
```python
# CR-390: Screen Reference pipeline — master PDF assembler
from pypdf import PdfWriter, PdfReader
from pathlib import Path
from datetime import date

MODULE_ORDER = ["MM", "EM", "IM", "DC", "CM", "DR", "IN-Basic", "IN-Advanced"]  # PMS last, deferred
OUT_DIR = Path("/app/memory/design_briefs/downloads/screen_reference")

def main():
    writer = PdfWriter()
    for module in MODULE_ORDER:
        pdfs = list((OUT_DIR / module).glob("*.pdf"))
        if not pdfs:
            print(f"  SKIP {module} — no PDF found yet")
            continue
        reader = PdfReader(str(sorted(pdfs)[-1]))  # latest version
        for page in reader.pages:
            writer.add_page(page)
        print(f"  + {module}: {len(reader.pages)} pages")

    today = date.today().strftime("%Y-%m-%d")
    out_path = OUT_DIR / f"MyGenie_Complete_Screen_Reference_v1_{today}.pdf"
    with open(out_path, "wb") as f:
        writer.write(f)
    print(f"Master PDF: {out_path}")

if __name__ == "__main__":
    main()
```

---

## E4 — `frontend/scripts/screen-reference/persona.json`

```json
{
  "_comment": "CR-390: Shared fictional business persona (OD-390-02). Business name used in all PDFs.",
  "business_name": "Sharma Hotel & Restaurant",
  "business_short": "Sharma Hotel",
  "location": "Connaught Place, New Delhi — 110001",
  "gst_number": "07AAAAS0000A1Z5",
  "phone": "+91 98100 00001",
  "email": "manager@sharmahotel.example",
  "outlets": ["Main Restaurant", "Bar & Lounge", "Room Service"],
  "reference_week": {
    "start": "2026-09-14",
    "end": "2026-09-20",
    "label": "Week of 14–20 Sep 2026"
  },
  "currency": "INR",
  "gst_type": "CGST+SGST"
}
```

---

## E5 — `frontend/scripts/screen-reference/config/template.json`

```json
{
  "_comment": "CR-390: PDF template config (OD-390-08 — PMS v2.0 template as interim default)",
  "brand_green": "#329937",
  "page_size": "A4",
  "orientation": "landscape",
  "viewport": { "width": 1440, "height": 900 },
  "screenshot_region": { "x": 10, "y": 20, "w": 277, "h": 155 },
  "footer_text": "Sample data · © MyGenie 2026",
  "cover_disclaimer": "All figures are sample data for illustration purposes only",
  "edition_format": "vMAJOR.MINOR",
  "scrub_rules": [
    "No 'Beta' labels",
    "No coming-soon screens",
    "No real restaurant names (DOM-swap to persona.business_name)",
    "No internal CR/BUG IDs visible in UI",
    "Realistic INR/GST figures"
  ]
}
```

---

## E6a — Manifest Schema (all 9 manifests follow this structure)

```json
{
  "module_code": "MM",
  "module_name": "Menu Management",
  "eyebrow": "MENU MANAGEMENT",
  "journey_approved": false,
  "journey_approved_date": null,
  "journey": [
    {
      "route": "/menu",
      "section": "Menu Overview",
      "states": [
        {
          "slug": "menu-overview",
          "title": "Menu Management",
          "description": "All menu categories with item counts and availability status.",
          "pre_actions": []
        },
        {
          "slug": "menu-item-list",
          "title": "Category — Item List",
          "description": "Items within a category, showing price, tax, status and type.",
          "pre_actions": [
            { "type": "click", "selector": "[data-testid='category-row']:first-child" },
            { "type": "wait", "ms": 500 }
          ]
        }
      ]
    }
  ]
}
```

*`journey_approved: false` until owner approves via sub-gate G-journey at module start.*
*Journey array is a DRAFT — order and states confirmed with owner before locking.*

---

## E6b–E6i — Remaining 8 manifests (EM, IM, DC, CM, DR, INB, INA, PMS)

Same schema as above. Route inventories from IA §Module × Route Inventory.
- `EM_expenses.json` — 2 routes, journey PENDING
- `IM_inventory.json` — 8 routes, journey PENDING
- `DC_day_closure.json` — 4 routes, journey PENDING
- `CM_credit.json` — 1 route, journey PENDING
- `DR_daily_report.json` — 6 routes (OD-390-11), journey PENDING
- `INB_insights_basic.json` — 13 routes (OD-390-12), journey = sidebar order (PENDING G-journey confirm)
- `INA_insights_advanced.json` — 23 routes (OD-390-12), journey = sidebar order (PENDING G-journey confirm)
- `PMS_pms.json` — skeleton only; `journey_approved: false`, note: DEFERRED OD-390-13

---

## E7 — `frontend/scripts/screen-reference/README.md`

```markdown
# MyGenie Screen Reference Pipeline — CR-390

## Quick start (per module)

1. Get owner approval for module journey (sub-gate G-journey)
2. Set journey_approved=true + date in the manifest
3. Run screenshots:
   python3 runner.py --module MM --url https://... --email ... --password ...
4. Assemble PDF:
   python3 assemble.py --module MM
5. Master PDF (all modules):
   python3 master_assemble.py

## Output locations
- PNGs: /app/memory/evidence/CR-390/<MODULE>/
- Module PDF: /app/memory/design_briefs/downloads/screen_reference/<MODULE>/
- Master PDF: /app/memory/design_briefs/downloads/screen_reference/

## Module sequence (OD-390-07)
MM → EM → IM → DC → CM → DR → IN-Basic → IN-Advanced → PMS (redo, last)

## Rules
- NEVER run a module before G-journey sub-gate is approved
- NEVER include Beta, coming-soon, real restaurant names (OD-390-14)
- DOM-swap: restaurant name → "Sharma Hotel & Restaurant" (OD-390-02)
- Max 3 screenshots per route (OD-390-03)
- PMS PDFs in public/ to be MOVED here during M6 regen (closes CR-372 carve-out)
```

---

## Verification Matrix

| # | Edit | File | How to Verify | Automated? |
|---|---|---|---|:---:|
| V1 | E1 runner.py | `scripts/screen-reference/runner.py` | `python3 runner.py --help` prints usage without error | YES (syntax check) |
| V2 | E1 G-journey guard | runner.py | Attempt run with `journey_approved: false` → assert fires | YES (unit test) |
| V3 | E1 DOM swap | runner.py | Run on a test route → PNG text contains "Sharma Hotel" not real name | NO (visual check) |
| V4 | E2 assemble.py | `scripts/screen-reference/assemble.py` | `python3 assemble.py --help` prints usage | YES |
| V5 | E2 cover page | assemble.py | Run on MM (after runner) → PDF opens, cover shows green block + module name + disclaimer | NO (visual) |
| V6 | E2 footer | assemble.py | Each page footer shows "Sample data · © MyGenie 2026" | NO (visual) |
| V7 | E3 master | `master_assemble.py` | Run after MM + EM assembled → master PDF contains both modules in order | NO (visual) |
| V8 | E4 persona | `persona.json` | `python3 -c "import json; json.load(open('persona.json'))"` → no error | YES |
| V9 | E5 template | `config/template.json` | JSON loads without error | YES |
| V10 | E6a MM manifest | `manifests/MM_menu.json` | JSON loads; `journey_approved == false` (pre-G-journey state correct) | YES |
| V11 | E6b–i all manifests | 8 manifests | All 8 JSON files load without error | YES |
| V12 | E7 README | `README.md` | File exists, contains module sequence MM→EM→…→PMS | YES (grep) |
| V13 | Output dir | `memory/design_briefs/downloads/screen_reference/` | Directory exists after first run | YES |
| V14 | PNG packs | `memory/evidence/CR-390/MM/` | After MM run: ≥1 PNG file exists | YES |

---

## Post-Code Registry Checklist

Implementation agent MUST execute before handover:

```
[ ] registry.json: CR-390 → status: IMPLEMENTED, sprint_key: modules_pdf
[ ] CR_REGISTRY.md: row updated with IMPLEMENTED status
[ ] FILE_OWNERSHIP.md: add all N1–N15 new files with CR-390 + date
[ ] Code markers: every new .py and .json file contains a # CR-390 or // CR-390 comment
[ ] compile/syntax check: python3 -m py_compile runner.py assemble.py master_assemble.py
```

---

## Execution Sequence

```
1. pip install fpdf2 pypdf pillow
2. Create directory: frontend/scripts/screen-reference/ + subdirs
3. E4 — persona.json
4. E5 — config/template.json
5. E6a–i — 9 manifest JSONs
6. E1 — runner.py
7. E2 — assemble.py
8. E3 — master_assemble.py
9. E7 — README.md
10. Create output dir: memory/design_briefs/downloads/screen_reference/
11. Syntax checks (V1/V4/V8/V9/V10/V11)
12. Post-Code Registry Checklist
```

**Per-module execution (AFTER Gate 4 GO, one module at a time):**
```
For each module in MM → EM → IM → DC → CM → DR → IN-Basic → IN-Advanced → PMS:
  A. Present journey draft to owner → G-journey approval
  B. Owner provides credentials for this module's restaurant
  C. python3 runner.py --module <CODE> --url ... --email ... --password ...
  D. python3 assemble.py --module <CODE>
  E. Owner reviews PDF → feedback → re-run if needed
  F. Owner approves → edition v1.0 locked

After all modules:
  G. python3 master_assemble.py
  H. Owner reviews master PDF
```

---

## Open Owner Decisions (non-blocking for pipeline foundation)

| OD | Status | Impact on plan |
|---|---|---|
| OD-390-01 | DEFERRED — credentials per module at Gate 4 | `runner.py` CLI accepts `--email/--password`; no fixtures baked in |
| G-journey per module | PENDING — approved live at module start | manifests ship with `journey_approved: false`; runner guards on this flag |
| OD-390-13 (PMS journey) | DEFERRED | PMS manifest ships as skeleton |

---

*Plan ready — awaiting owner Gate 4 GO.*
