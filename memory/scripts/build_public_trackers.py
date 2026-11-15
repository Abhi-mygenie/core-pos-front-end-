"""Builds the public backend tracker, readable brief/contract pages and the 4-tab design tracker from memory/ docs."""
import html
import re
from pathlib import Path

import markdown

MEM = Path(__file__).resolve().parents[1]
PUB = MEM.parent / "frontend" / "public"
OUT = PUB / "briefs"

PAGE_CSS = (
    "body{font-family:Georgia,serif;margin:0;color:#1d1d1b;background:#faf8f3}"
    ".wrap{max-width:1000px;margin:0 auto;padding:28px 32px}"
    "a{color:#b4471b}table{border-collapse:collapse;width:100%;font-size:13px;background:#fff;margin:10px 0}"
    "th,td{border:1px solid #d6d2c4;padding:6px 8px;text-align:left;vertical-align:top}th{background:#efeadb}"
    "code{background:#efeadb;padding:1px 4px;border-radius:3px;font-size:12px}pre{background:#efeadb;padding:10px;overflow:auto}"
    "blockquote{border-left:4px solid #d6d2c4;margin:8px 0;padding:4px 12px;color:#555}"
    ":target{background:#ffe2c2;outline:2px solid #b4471b}"
    ".top{font-size:13px;margin-bottom:16px}"
    ".copy-md{font:inherit;font-size:11px;padding:2px 7px;border:1px solid #b4471b;background:#faf8f3;"
    "color:#b4471b;border-radius:3px;cursor:pointer;vertical-align:middle}"
    ".copy-md:hover{background:#b4471b;color:#fff}"
)

COPY_JS = (
    "<script>"
    "document.querySelectorAll('.copy-md').forEach(function(b){"
    "b.onclick=function(e){e.preventDefault();"
    "fetch(b.dataset.src).then(function(r){return r.text()}).then(function(t){"
    "if(navigator.clipboard){"
    "navigator.clipboard.writeText(t).then(function(){"
    "b.textContent='Copied!';setTimeout(function(){b.textContent='Copy\u00a0.md'},2000)});"
    "}else{"
    "var ta=document.createElement('textarea');ta.value=t;"
    "document.body.appendChild(ta);ta.select();document.execCommand('copy');"
    "document.body.removeChild(ta);"
    "b.textContent='Copied!';setTimeout(function(){b.textContent='Copy\u00a0.md'},2000);}"
    "}).catch(function(){b.textContent='Error'});}});"
    "</script>"
)

BATCHES = {
    "A": {
        "brief": [
            ("BACKEND_BRIEF_BATCH-A_2026_11_15.html", "Base document (brief + contract links + reply checklist)", "backend_briefs"),
            ("BACKEND_BRIEF_BATCH-A_2026_11_14.md", "Original brief (superseded by base document)", "backend_briefs"),
            ("BACKEND_BRIEF_CR-495_ROOM_COMP_MEAL_PACKAGE_2026_11_14.md", "CR-495 room comp brief — Parth (superseded by base document)", "backend_briefs"),
        ],
        "contracts": sorted(p.name for p in (MEM / "contracts").glob("BATCH-A_*_API_CONTRACT_2026_11_15.md")),
    },
    "B": {
        "brief": [("BACKEND_BRIEF_BATCH-B_2026_11_15.md", "Brief (BB-01..BB-13 + BB-10b)", "backend_briefs")],
        "contracts": sorted(p.name for p in (MEM / "contracts").glob("BATCH-B_*_API_CONTRACT_2026_11_15.md")),
    },
    "C": {"brief": [("BACKEND_BRIEF_BATCH-C_2026_11_15.md", "Brief (ASK 1 + ASK 2) — draft, send after IA freeze", "backend_briefs")], "contracts": sorted(p.name for p in (MEM / "contracts").glob("BATCH-C_*_API_CONTRACT_2026_11_15.md"))},
    "D": {"brief": [("BACKEND_BRIEF_BATCH-D_2026_11_15.md", "Brief (BD-01..BD-09)", "backend_briefs")], "contracts": sorted(p.name for p in (MEM / "contracts").glob("BATCH-D_*_API_CONTRACT_2026_11_15.md"))},
}

HEADINGS = {
    "<h2>Batch A — Cancellation": "A",
    "<h2>Batch B —": "B",
    "<h2>Batch C —": "C",
    "<h2>Batch D —": "D",
}


def page_name(src):
    return Path(src).stem + ".html"


def wrap_page(title, body, src_name=None):
    md_link = ""
    if src_name and not src_name.endswith(".html"):
        md_href = f"/briefs/{src_name}"
        md_link = (
            f" \u00b7 <a href=\"{md_href}\" target=\"_blank\">Open&nbsp;.md</a>"
            f" <button class=\"copy-md\" data-src=\"{md_href}\" title=\"Copy .md to clipboard\">Copy&nbsp;.md</button>"
        )
    return (
        f'<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>{html.escape(title)} \u2014 MyGenie POS</title>'
        f"<style>{PAGE_CSS}</style></head><body><div class=\"wrap\">"
        f'<p class="top"><a href="/backend-tracker.html" data-testid="back-to-tracker">&larr; Backend tracker</a> \u00b7 '
        f'<a href="/design-tracker.html">Design tracker</a>{md_link}</p>{body}'
        f"{COPY_JS}</div></body></html>"
    )


def fix_links(text):
    text = re.sub(r'href="\.\./contracts/([^"]+)\.md"', r'href="\1.html"', text)
    return re.sub(r'href="([A-Za-z0-9_\-]+)\.md"', r'href="\1.html"', text)


def add_anchors(body):
    body = re.sub(r"<td>((?:BA|BB|BD|B-495)-[0-9]+[a-z]?)(</td>| \()", r'<td id="\1">\1\2', body)
    return re.sub(r"<h2>ASK (\d)", r'<h2 id="ASK-\1">ASK \1', body)


def render_doc(folder, name):
    src = MEM / folder / name
    if name.endswith(".html"):
        out = fix_links(src.read_text(encoding="utf-8"))
    else:
        raw_md = src.read_text(encoding="utf-8")
        # Also serve the raw .md from briefs/ (enables Open .md / Copy .md)
        (OUT / name).write_text(raw_md, encoding="utf-8")
        body = markdown.markdown(raw_md, extensions=["tables", "fenced_code"])
        out = wrap_page(Path(name).stem, add_anchors(fix_links(body)), src_name=name)
    (OUT / page_name(name)).write_text(out, encoding="utf-8")
    return f"/briefs/{page_name(name)}"


def contract_links_for(batch_key, item, row_id):
    """Return HTML + MD + Copy .md links if the contract file exists; else None."""
    ids = re.findall(r"(?:CR|BUG)-\d+", item)
    for i in ids:
        contract_file = f"BATCH-{batch_key}_{i}_API_CONTRACT_2026_11_15.md"
        if (MEM / "contracts" / contract_file).exists():
            stem = contract_file[:-3]
            html_href = f"/briefs/{stem}.html"
            md_href = f"/briefs/{contract_file}"
            return (
                f'<a href="{html_href}" target="_blank">HTML</a>'
                f" \u00b7 <a href=\"{md_href}\" target=\"_blank\">MD</a>"
                f" <button class=\"copy-md\" data-src=\"{md_href}\" title=\"Copy .md to clipboard\">Copy&nbsp;.md</button>"
            )
    return None


def batch_links(key):
    cfg = BATCHES[key]
    items = [f'<li><a href="{render_doc(folder, n)}" target="_blank">{html.escape(label)}</a></li>' for n, label, folder in cfg["brief"]]
    if cfg["contracts"]:
        cons = []
        for n in cfg["contracts"]:
            html_href = render_doc("contracts", n)
            label = re.sub(r"^BATCH-[A-Z]_|_API_CONTRACT_2026_11_15\.md$", "", n)
            md_href = f"/briefs/{n}"
            cons.append(
                f'<li><a href="{html_href}" target="_blank">{label} contract</a>'
                f' [<a href="{md_href}" target="_blank">MD</a>'
                f' <button class="copy-md" data-src="{md_href}" title="Copy .md to clipboard">Copy&nbsp;.md</button>]</li>'
            )
        status_label = "DRAFT v1" if key != "A" else "locked, R19/R20"
        if key not in ("A",) and cfg["contracts"]:
            try:
                if all(
                    "FINAL v1 \u2014 LOCKED" in (MEM / "contracts" / n).read_text(encoding="utf-8")
                    for n in cfg["contracts"]
                ):
                    status_label = "FINAL v1 \u2014 LOCKED 2026-11-15"
            except Exception:
                pass
        items.append(f"<li>API contracts ({status_label}):<ul>{''.join(cons)}</ul></li>")
    else:
        items.append("<li>API contracts: none written yet — the brief is the contract for now.</li>")
    return f'<div class="docs" data-testid="tracker-docs-batch-{key.lower()}"><b>Documents</b><ul>{"".join(items)}</ul></div>'


BRIEF_PAGE = {
    "b": "/briefs/BACKEND_BRIEF_BATCH-B_2026_11_15.html",
    "c": "/briefs/BACKEND_BRIEF_BATCH-C_2026_11_15.html",
    "d": "/briefs/BACKEND_BRIEF_BATCH-D_2026_11_15.html",
}


def contract_cell(batch, row_id, item):
    if batch.startswith("a"):
        ids = ["CR-495"] if batch == "a-cr495" else re.findall(r"(?:CR|BUG)-\d+", item)
        links = [
            f'<a href="/briefs/BATCH-A_{i}_API_CONTRACT_2026_11_15.html" target="_blank">{i} contract</a>'
            for i in ids
            if (MEM / "contracts" / f"BATCH-A_{i}_API_CONTRACT_2026_11_15.md").exists()
        ]
        return "<br>".join(links) or '<span class="nc">No contract (P1 / phase 2)</span>'
    # Batches B, C, D — link to contract when file exists
    if batch in ("b", "c", "d"):
        links = contract_links_for(batch.upper(), item, row_id)
        if links:
            return links
    anchor = row_id.replace(" ", "-")
    return f'<a href="{BRIEF_PAGE[batch]}#{anchor}" target="_blank">Brief \u00a7{row_id}</a><br><span class="nc">no contract yet</span>'


def add_contract_column(src):
    def table(m):
        batch, body = m.group(1), m.group(2)
        body = body.replace("<th>Status</th>", "<th>Contract</th><th>Status</th>", 1)

        def row(r):
            cells = re.findall(r"<td>(.*?)</td>", r.group(0))
            item = cells[1] if len(cells) > 1 else ""
            cell = f'<td data-testid="contract-{batch}-{cells[0].replace(" ", "-").lower()}">{contract_cell(batch, cells[0], item)}</td>'
            return r.group(0).replace('<td><span class="s', cell + '<td><span class="s', 1)

        return f'<table data-testid="tracker-batch-{batch}">' + re.sub(r"<tr><td>.*?</tr>", row, body) + "</table>"

    return re.sub(r'<table data-testid="tracker-batch-([a-z0-9-]+)">(.*?)</table>', table, src, flags=re.S)


def build_backend():
    OUT.mkdir(exist_ok=True)
    src = (MEM / "backend_briefs" / "BACKEND_BRIEF_TRACKER.html").read_text(encoding="utf-8")
    src = src.replace(
        '<a href="BACKEND_BRIEF_BATCH-A_2026_11_15.html">', '<a href="/briefs/BACKEND_BRIEF_BATCH-A_2026_11_15.html" target="_blank">'
    )
    for start, key in HEADINGS.items():
        i = src.index(start)
        end = src.index("</h2>", i) + len("</h2>")
        src = src[:end] + f'<a id="batch-{key.lower()}"></a>' + batch_links(key) + src[end:]
    src = add_contract_column(src)
    nav = (
        '<p class="nav" data-testid="tracker-nav">Jump to: <a href="#batch-a">Batch A</a> \u00b7 <a href="#batch-b">Batch B</a> \u00b7 '
        '<a href="#batch-c">Batch C</a> \u00b7 <a href="#batch-d">Batch D</a> \u00b7 <a href="/design-tracker.html">Design tracker &rarr;</a></p>'
    )
    src = src.replace("</h1>", "</h1>" + nav, 1)
    src = src.replace(
        "</style>",
        ".docs{background:#fff;border:1px solid #d6d2c4;padding:8px 14px;margin:6px 0 12px;font-size:13px}"
        ".nc{color:#888;font-size:11px}.docs ul{margin:4px 0 0 18px;padding:0}.docs li{margin:2px 0}"
        "a{color:#b4471b}.nav{font-size:14px}"
        ".copy-md{font:inherit;font-size:11px;padding:2px 7px;border:1px solid #b4471b;background:#faf8f3;"
        "color:#b4471b;border-radius:3px;cursor:pointer;vertical-align:middle}"
        ".copy-md:hover{background:#b4471b;color:#fff}"
        "</style>",
        1,
    )
    # Inject Copy .md JS before </body>
    src = src.replace("</body>", COPY_JS + "</body>", 1)
    (PUB / "backend-tracker.html").write_text(src, encoding="utf-8")


DESIGN_TABS = [
    ("A", "Batch A — Cancel · Comp · Rights · PIN · Room comp", "design/BATCH-A_GATE2_5_MOCKUPS_2026_11_14.html", None),
    ("B", "Batch B — Payments · Credit · GST", "design/BATCH-B_GATE2_5_MOCKUPS_2026_11_15.html", None),
    ("C", "Batch C — Order Beta report", None, None),
    ("D", "Batch D — Dashboard · Order entry · Cards", "mockups/CR-521_CURRENT_VS_PROPOSED_2026_11_15.html", "design/CR-521_ORANGE_SHADE_DECISION_2026_11_15.md"),
]

STATUS = {
    "C": "No design mockups in the Batch C pack yet (Gate 2 paused, not frozen).",
    "D": "CR-521 printed-card colour #FFEDD5 (owner decision R1\u2013R6). Releases with CR-525 after backend BD-01.",
}


def status_line(key, text):
    if key in STATUS:
        return STATUS[key]
    m = re.search(r"STATUS:([^<]*)", text)
    return m.group(1).strip() if m else ""


def build_design():
    tabs, panels = [], []
    for i, (key, title, mock, note) in enumerate(DESIGN_TABS):
        k = key.lower()
        active = " on" if i == 0 else ""
        tabs.append(f'<button class="tab{active}" data-tab="{k}" data-testid="design-tab-{k}">Batch {key}</button>')
        mock_html = (MEM / mock).read_text(encoding="utf-8") if mock else ""
        body = f'<h2>{html.escape(title)}</h2><p class="meta" data-testid="design-status-{k}">{html.escape(status_line(key, mock_html))}</p>'
        if note:
            body += f'<details class="note"><summary>Design decision note</summary>{markdown.markdown((MEM / note).read_text(encoding="utf-8"), extensions=["tables"])}</details>'
        if mock:
            body += f'<p class="meta">Source: <code>memory/{mock}</code></p>'
            body += f'<iframe title="Batch {key} mockups" data-testid="design-frame-{k}" srcdoc="{html.escape(mock_html, quote=True)}"></iframe>'
        else:
            body += '<div class="empty" data-testid="design-empty-c">No mockups yet for this batch.</div>'
        panels.append(f'<section class="panel{active}" id="tab-{k}">{body}</section>')
    page = (
        '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Design Mockup Tracker \u2014 Batches A\u2013D \u2014 MyGenie POS</title><style>'
        "body{margin:0;font-family:Georgia,serif;background:#faf8f3;color:#1d1d1b}header{padding:22px 32px 0}h1{font-size:26px;margin:0 0 4px}"
        ".meta{font-size:13px;color:#555;margin:2px 0 10px}a{color:#b4471b}"
        ".tabs{display:flex;gap:4px;padding:14px 32px 0;border-bottom:2px solid #1d1d1b}"
        ".tab{font:inherit;font-size:15px;padding:8px 18px;border:1px solid #d6d2c4;border-bottom:none;background:#efeadb;cursor:pointer;border-radius:6px 6px 0 0}"
        ".tab.on{background:#1d1d1b;color:#fff;border-color:#1d1d1b}.panel{display:none;padding:18px 32px}.panel.on{display:block}"
        "h2{font-size:19px;margin:0 0 4px}iframe{width:100%;height:80vh;border:1px solid #d6d2c4;background:#fff}"
        ".note{background:#fff;border:1px solid #d6d2c4;padding:8px 14px;margin:0 0 12px;font-size:13px}"
        ".empty{background:#fff;border:1px dashed #b9b4a6;padding:40px;text-align:center;color:#555}"
        "</style></head><body><header><h1>Design Mockup Tracker</h1>"
        '<p class="meta">One file, one tab per batch. Gate 2.5 current-vs-proposed mockups. '
        '<a href="/backend-tracker.html" data-testid="design-to-backend">Backend tracker &rarr;</a></p></header>'
        f'<nav class="tabs">{"".join(tabs)}</nav>{"".join(panels)}'
        "<script>document.querySelectorAll('.tab').forEach(function(b){b.onclick=function(){"
        "document.querySelectorAll('.tab,.panel').forEach(function(e){e.classList.remove('on')});"
        "b.classList.add('on');document.getElementById('tab-'+b.dataset.tab).classList.add('on');history.replaceState(null,'','#'+b.dataset.tab)}});"
        "var h=location.hash.slice(1);var t=document.querySelector('.tab[data-tab=\"'+h+'\"]');if(t){t.click()}</script></body></html>"
    )
    (PUB / "design-tracker.html").write_text(page, encoding="utf-8")


if __name__ == "__main__":
    build_backend()
    build_design()
    print("built", sorted(p.name for p in OUT.iterdir()), "backend-tracker.html", "design-tracker.html")
