#!/usr/bin/env python3
# CR-390: Screen Reference pipeline — master PDF assembler
# Usage: python3 master_assemble.py
# Merges all per-module PDFs into one master in OD-390-07 sequence order.
# Requires: pip install pypdf

import sys
from pathlib import Path
from datetime import date

# CR-390: OD-390-07 locked module sequence (PMS last, deferred per OD-390-13)
MODULE_ORDER = ["MM", "EM", "IM", "DC", "CM", "DR", "IN-Basic", "IN-Advanced", "PMS"]

OUT_DIR = Path("/app/memory/design_briefs/downloads/screen_reference")


def main():
    """CR-390: Merge all per-module PDFs into a single master PDF."""
    try:
        from pypdf import PdfWriter, PdfReader
    except ImportError:
        sys.exit("[CR-390] ERROR: pypdf not installed. Run: pip install pypdf")

    print("\n[CR-390] Master assembler starting ...")
    arrow = " \u2192 "
    print(f"  Module order: {arrow.join(MODULE_ORDER)}")

    writer = PdfWriter()
    included = []
    skipped = []

    for module in MODULE_ORDER:
        module_dir = OUT_DIR / module
        if not module_dir.exists():
            print(f"  SKIP {module} \u2014 directory not found")
            skipped.append(module)
            continue

        pdfs = sorted(module_dir.glob("*.pdf"))
        if not pdfs:
            print(f"  SKIP {module} \u2014 no PDF found yet")
            skipped.append(module)
            continue

        latest_pdf = pdfs[-1]  # latest by filename (date-stamped)
        try:
            reader = PdfReader(str(latest_pdf))
            page_count = len(reader.pages)
            for page in reader.pages:
                writer.add_page(page)
            included.append(module)
            print(f"  + {module}: {page_count} page(s) from {latest_pdf.name}")
        except Exception as e:
            print(f"  ERROR reading {latest_pdf}: {e}")
            skipped.append(module)

    if not included:
        sys.exit("[CR-390] No module PDFs found. Run assemble.py for each module first.")

    today = date.today().strftime("%Y-%m-%d")
    out_path = OUT_DIR / f"MyGenie_Complete_Screen_Reference_v1_{today}.pdf"
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    with open(str(out_path), "wb") as f:
        writer.write(f)

    total_pages = sum(len(PdfReader(str(sorted((OUT_DIR / m).glob('*.pdf'))[-1])).pages) for m in included)

    print(f"\n[CR-390] Master PDF saved: {out_path}")
    print(f"  Modules included ({len(included)}): {', '.join(included)}")
    print(f"  Modules skipped  ({len(skipped)}): {', '.join(skipped) or 'none'}")
    print(f"  Total pages: {total_pages}")


if __name__ == "__main__":
    main()
