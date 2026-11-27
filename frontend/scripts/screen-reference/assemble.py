#!/usr/bin/env python3
# CR-390: Screen Reference pipeline — PDF assembler (per module)
# Usage: python3 assemble.py --module MM [--layout side|bottom] [--limit N] [--suffix SAMPLE_side]
# Reads PNGs from /app/memory/evidence/CR-390/<MODULE>/
# Outputs PDF to /app/memory/design_briefs/downloads/screen_reference/<MODULE>/
# Every screen page carries: What it is / Controls & actions (numbered) / Narration — so a downstream
# agent can turn the PDF into a narrated video without re-discovering the UI.

import argparse
import json
import sys
from pathlib import Path
from datetime import date

BASE_DIR = Path(__file__).parent
EVIDENCE_DIR = Path("/app/memory/evidence/CR-390")
OUT_DIR = Path("/app/memory/design_briefs/downloads/screen_reference")
FONT_DIR = Path("/usr/share/fonts/truetype/liberation")
GREEN = (50, 153, 55)      # MyGenie brand green #329937
GREEN_TINT = (240, 253, 244)
ORANGE = (242, 107, 51)
WHITE = (255, 255, 255)
DARK = (30, 30, 30)
GREY = (100, 100, 100)
LIGHT_GREY = (150, 150, 150)
RULE = (225, 228, 232)
PAGE_W, PAGE_H = 297, 210
SHOT_RATIO = 900 / 1440


def load_manifest(module_code):
    """CR-390: Load validated manifest for the given module."""
    manifests = list((BASE_DIR / "manifests").glob(f"{module_code}_*.json"))
    if not manifests:
        sys.exit(f"[CR-390] ERROR: No manifest found for module '{module_code}'")
    manifest = json.loads(manifests[0].read_text(encoding="utf-8"))
    if not manifest.get("journey_approved"):
        sys.exit(f"[CR-390] BLOCKED: journey_approved=false for '{module_code}'. Get owner GO first.")
    return manifest


def flatten(manifest):
    """Yield (badge, section, state) in journey order."""
    badge = 1
    for route_entry in manifest["journey"]:
        for state in route_entry.get("states", []):
            yield badge, route_entry.get("section", ""), state
            badge += 1


def build_pdf(manifest, png_dir, out_path, today, layout, limit):
    from fpdf import FPDF

    module_name = manifest["module_name"]
    eyebrow = manifest.get("eyebrow", module_name.upper())
    overview = manifest.get("overview", {})
    screens = list(flatten(manifest))
    total_screens = len(screens)
    if limit:
        screens = screens[:limit]

    class ScreenReferencePDF(FPDF):
        def __init__(self):
            super().__init__(orientation="L", unit="mm", format="A4")
            self.set_auto_page_break(False)
            self.set_margins(0, 0, 0)
            self.add_font("Lib", "", str(FONT_DIR / "LiberationSans-Regular.ttf"))
            self.add_font("Lib", "B", str(FONT_DIR / "LiberationSans-Bold.ttf"))
            self.add_font("Lib", "I", str(FONT_DIR / "LiberationSans-Italic.ttf"))

        # ---------- shared pieces ----------
        def footer_line(self, page_label):
            self.set_font("Lib", "I", 7)
            self.set_text_color(*LIGHT_GREY)
            self.set_xy(10, 203)
            self.cell(0, 5, f"MyGenie {module_name}  ·  Screen Reference Guide v1.0  ·  {today}  ·  "
                            f"Sample data  ·  © MyGenie 2026  ·  {page_label}")

        def header_band(self, badge_num, section, title):
            self.set_fill_color(*GREEN)
            self.set_text_color(*WHITE)
            self.set_font("Lib", "B", 10)
            self.set_xy(8, 6)
            self.cell(10, 9, str(badge_num), fill=True, align="C")
            self.set_text_color(*GREY)
            self.set_font("Lib", "", 7)
            self.set_xy(21, 6)
            self.cell(0, 4, f"{eyebrow}  ›  {section.upper()}")
            self.set_text_color(*DARK)
            self.set_font("Lib", "B", 12)
            self.set_xy(21, 10)
            self.cell(0, 6, title)
            self.set_text_color(*LIGHT_GREY)
            self.set_font("Lib", "", 7)
            self.set_xy(PAGE_W - 60, 10)
            self.cell(52, 6, f"Screen {badge_num} of {total_screens}", align="R")

        def shot(self, png_path, x, y, w):
            h = w * SHOT_RATIO
            self.set_draw_color(*RULE)
            self.set_line_width(0.3)
            self.rect(x - 0.5, y - 0.5, w + 1, h + 1)
            if Path(png_path).exists():
                self.image(str(png_path), x=x, y=y, w=w, h=h)
            else:
                self.set_fill_color(240, 240, 240)
                self.rect(x, y, w, h, "F")
                self.set_text_color(*GREY)
                self.set_font("Lib", "I", 11)
                self.set_xy(x, y + h / 2 - 4)
                self.cell(w, 8, f"[Screenshot missing: {Path(png_path).name}]", align="C")
            return h

        def label(self, x, y, text, color=GREEN):
            self.set_text_color(*color)
            self.set_font("Lib", "B", 7)
            self.set_xy(x, y)
            self.cell(0, 4, text.upper())
            return y + 4.5

        def para(self, x, y, w, text, size=8.2, style="", color=DARK, lh=3.9):
            self.set_text_color(*color)
            self.set_font("Lib", style, size)
            self.set_xy(x, y)
            self.multi_cell(w, lh, text)
            return self.get_y() + 1.5

        def numbered(self, x, y, w, items, size=7.6, lh=3.6, max_y=200):
            for i, item in enumerate(items, 1):
                if y > max_y - lh:
                    self.set_font("Lib", "I", 6.5)
                    self.set_text_color(*LIGHT_GREY)
                    self.set_xy(x, y)
                    self.cell(w, lh, f"… +{len(items) - i + 1} more (see manifest)")
                    return y + lh
                self.set_fill_color(*GREEN)
                self.set_text_color(*WHITE)
                self.set_font("Lib", "B", 6.2)
                self.set_xy(x, y + 0.3)
                self.cell(4.2, 3.2, str(i), fill=True, align="C")
                if " — " in item:
                    name, what = item.split(" — ", 1)
                else:
                    name, what = item, ""
                self.set_xy(x + 5.5, y)
                self.set_text_color(*DARK)
                self.set_font("Lib", "B", size)
                if what:
                    self.write(lh, name + " — ")
                    self.set_font("Lib", "", size)
                    self.write(lh, what)
                else:
                    self.write(lh, name)
                y = self.get_y() + lh + 0.9
                self.set_xy(x, y)
            return y

        def narration_box(self, x, y, w, text, size=7.8):
            self.set_fill_color(*GREEN_TINT)
            self.set_font("Lib", "I", size)
            self.set_xy(x + 2, y + 5.5)
            self.set_text_color(*DARK)
            # measure
            lines = self.multi_cell(w - 4, 3.7, text, dry_run=True, output="LINES")
            h = 5.5 + len(lines) * 3.7 + 2.5
            self.rect(x, y, w, h, "F")
            self.set_draw_color(*GREEN)
            self.set_line_width(0.8)
            self.line(x, y, x, y + h)
            self.label(x + 2, y + 1.2, "Narration (video script)")
            self.set_font("Lib", "I", size)
            self.set_text_color(*DARK)
            self.set_xy(x + 2, y + 5.5)
            self.multi_cell(w - 4, 3.7, text)
            return y + h

        # ---------- pages ----------
        def cover_page(self):
            self.add_page()
            self.set_fill_color(*GREEN)
            self.rect(0, 0, PAGE_W, PAGE_H, "F")
            self.set_text_color(*WHITE)
            self.set_font("Lib", "B", 9)
            self.set_xy(20, 58)
            self.cell(0, 7, eyebrow)
            self.set_font("Lib", "B", 30)
            self.set_xy(20, 68)
            self.cell(0, 14, "MyGenie POS")
            self.set_font("Lib", "", 18)
            self.set_xy(20, 86)
            self.cell(0, 10, f"{module_name} — Screen Reference & Functional Guide")
            self.set_draw_color(*WHITE)
            self.set_line_width(0.5)
            self.line(20, 100, 277, 100)
            self.set_font("Lib", "", 10)
            self.set_xy(20, 106)
            self.cell(0, 6, f"{total_screens} screens  ·  every control described  ·  narration-ready")
            self.set_font("Lib", "I", 9)
            self.set_xy(20, 158)
            self.cell(0, 6, "All figures are sample data for illustration purposes only")
            self.set_font("Lib", "", 9)
            self.set_xy(20, 167)
            self.cell(0, 6, f"v1.0  ·  {today}  ·  Screen Reference Guide  ·  Layout: {layout}")

        def overview_page(self):
            if not overview:
                return
            self.add_page()
            self.set_text_color(*GREY)
            self.set_font("Lib", "", 7)
            self.set_xy(10, 8)
            self.cell(0, 4, f"{eyebrow}  ›  MODULE AT A GLANCE")
            self.set_text_color(*DARK)
            self.set_font("Lib", "B", 16)
            self.set_xy(10, 13)
            self.cell(0, 8, f"{module_name} — what it does")
            y = self.para(10, 24, 175, overview.get("summary", ""), size=9, lh=4.4)
            y = self.label(10, y + 1, "Who uses it")
            y = self.para(10, y, 175, overview.get("who_uses", ""), size=8.2)
            y = self.label(10, y + 1, "Key capabilities")
            y = self.numbered(10, y, 175, overview.get("key_capabilities", []), size=8, lh=3.9, max_y=198)
            # right: journey map
            x = 195
            yy = self.label(x, 24, "Journey map (screen numbers)")
            self.set_font("Lib", "", 7.4)
            current = None
            for badge, section, state in flatten(manifest):
                if section != current:
                    current = section
                    yy += 1.2
                    self.set_text_color(*ORANGE)
                    self.set_font("Lib", "B", 7.4)
                    self.set_xy(x, yy)
                    self.cell(0, 3.6, section)
                    yy += 3.8
                self.set_text_color(*DARK)
                self.set_font("Lib", "", 7.2)
                self.set_xy(x + 2, yy)
                self.cell(0, 3.4, f"{badge:02d}  {state['title']}")
                yy += 3.5
                if yy > 198:
                    break
            self.footer_line("Overview")

        def screen_page_side(self, png_path, badge_num, section, state):
            self.add_page()
            self.header_band(badge_num, section, state["title"])
            shot_w = 190
            self.shot(png_path, 8, 19, shot_w)
            x, w = 204, PAGE_W - 204 - 8
            y = self.label(x, 19, "What this screen is")
            y = self.para(x, y, w, state.get("description", ""))
            controls = state.get("controls", [])
            if controls:
                y = self.label(x, y + 0.5, "Controls & actions")
                y = self.numbered(x, y, w, controls, max_y=170)
            if state.get("narration"):
                self.narration_box(x, min(y + 1, 172), w, state["narration"])
            self.footer_line(f"Page {badge_num}")

        def screen_page_bottom(self, png_path, badge_num, section, state):
            self.add_page()
            self.header_band(badge_num, section, state["title"])
            shot_w = 208
            h = self.shot(png_path, (PAGE_W - shot_w) / 2, 19, shot_w)
            top = 19 + h + 4
            lx, lw = 10, 118
            rx, rw = 135, PAGE_W - 135 - 10
            y = self.label(lx, top, "What this screen is")
            y = self.para(lx, y, lw, state.get("description", ""), size=7.8, lh=3.6)
            if state.get("narration"):
                self.narration_box(lx, y, lw, state["narration"], size=7.4)
            controls = state.get("controls", [])
            if controls:
                y2 = self.label(rx, top, "Controls & actions")
                self.numbered(rx, y2, rw, controls, size=7.2, lh=3.3, max_y=201)
            self.footer_line(f"Page {badge_num}")

    pdf = ScreenReferencePDF()
    pdf.cover_page()
    pdf.overview_page()
    skipped = 0
    for badge, section, state in screens:
        png_path = png_dir / f"{badge:02d}_{state['slug']}.png"
        if not png_path.exists():
            print(f"  [WARN] Missing PNG: {png_path.name} — placeholder inserted")
            skipped += 1
        if layout == "bottom":
            pdf.screen_page_bottom(png_path, badge, section, state)
        else:
            pdf.screen_page_side(png_path, badge, section, state)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(out_path))
    return len(screens), skipped


def main():
    parser = argparse.ArgumentParser(description="CR-390: MyGenie Screen Reference PDF pipeline — PDF assembler")
    parser.add_argument("--module", required=True)
    parser.add_argument("--layout", choices=["side", "bottom"], default="side")
    parser.add_argument("--limit", type=int, default=0, help="Only first N screens (for samples)")
    parser.add_argument("--suffix", default="", help="Filename suffix, e.g. SAMPLE_side")
    args = parser.parse_args()

    manifest = load_manifest(args.module)
    module_name = manifest["module_name"]
    today = date.today().strftime("%Y-%m-%d")
    png_dir = EVIDENCE_DIR / args.module
    if not png_dir.exists():
        sys.exit(f"[CR-390] ERROR: No screenshots at {png_dir}. Run runner.py first.")

    safe_name = module_name.replace(" ", "_").replace("/", "-")
    suffix = f"_{args.suffix}" if args.suffix else ""
    out_path = OUT_DIR / args.module / f"MyGenie_{safe_name}_Screen_Reference_v1_{today}{suffix}.pdf"
    n, skipped = build_pdf(manifest, png_dir, out_path, today, args.layout, args.limit)
    print(f"[CR-390] Done. {n} screen page(s), {skipped} placeholder(s), layout={args.layout}")
    print(f"  PDF: {out_path}")


if __name__ == "__main__":
    main()
