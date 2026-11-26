import json, re, glob, sys

ROOT = "/app/memory"
OUT = sys.argv[1]

BATCHES = [
    ("A — Cancellation, Complimentary & Permissions", ["CR-493", "BUG-674", "BUG-670", "CR-492", "CR-494", "CR-529", "CR-515", "CR-495", "CR-496", "CR-058", "CR-445", "CR-071", "CR-372-B", "CR-443"]),
    ("B — Payments, Credit & GST", ["BUG-671", "BUG-672", "CR-514", "CR-522", "CR-526", "CR-527", "CR-536", "CR-517", "BUG-607", "CR-394", "BUG-475", "BUG-118", "CR-126", "CR-425", "CR-438", "CR-447", "CR-520"]),
    ("C — Order Beta Report & Reports", ["BUG-605", "CR-503", "CR-504", "CR-505", "CR-506", "CR-507", "CR-508", "CR-509", "CR-510", "CR-511", "CR-532", "CR-528", "CR-524", "BUG-675", "CR-444", "CR-497", "CR-537", "CR-539", "CR-138", "CR-050", "BUG-192", "CR-424", "CR-446"]),
    ("D — Dashboard, Order Entry & Order Cards", ["CR-518", "CR-525", "CR-521", "CR-523", "BUG-673", "BUG-667", "CR-516", "BUG-669", "CR-441", "BUG-594", "CR-439", "CR-437", "BUG-609", "CR-404", "CR-376-FU-C"]),
    ("E — Scan Order & Aggregator / Sockets", ["BUG-676", "CR-533", "CR-534", "CR-399", "CR-375", "CR-535"]),
    ("F — Inventory & Recipes", ["CR-519", "CR-530", "CR-531", "CR-498", "CR-499", "CR-436", "CR-154", "CR-151", "CR-421", "CR-538"]),
    ("G — PMS / Rooms", ["BUG-193", "CR-391", "CR-361", "CR-367", "CR-381", "CR-364-PRINT", "CR-384"]),
    ("H — Backend-Blocked Performance & Data", ["BUG-610", "BUG-611", "BUG-612", "BUG-613", "BUG-630", "CR-469"]),
    ("I — Printer Agent (Piyush / PA team)", ["BUG-469", "BUG-474", "BUG-476", "BUG-479", "BUG-554", "BUG-668", "BUG-345", "CR-152", "CR-168", "CR-403", "CR-500", "CR-501"]),
    ("J — Tooling", ["CR-369"]),
]

SKIP_PREFIX = ("CLOSED", "SUBSUMED", "RETIRED", "GATE_5", "GATE 5", "QA")
KEEP_SECTIONS = ("description", "problem", "requirement", "expected", "current", "scope", "evidence", "blast radius", "open questions", "owner decisions", "open owner", "summary", "context")


def sections(md):
    out, cur, buf = [], None, []
    for line in md.splitlines():
        m = re.match(r"^##+\s+(.*)", line)
        if m:
            if cur is not None:
                out.append((cur, "\n".join(buf).strip()))
            cur, buf = m.group(1).strip(), []
        elif cur is not None:
            buf.append(line)
    if cur is not None:
        out.append((cur, "\n".join(buf).strip()))
    return out


def header_meta(md):
    keep = []
    for line in md.splitlines()[:15]:
        if re.match(r"^\*\*(Severity|Risk|Source|Client|Related|Classification)", line):
            keep.append(line.strip())
    return keep


reg = json.load(open(f"{ROOT}/control/registry.json"))
items = {i["id"]: i for i in reg["items"]
         if "INTAKE" in str(i.get("status", "")).upper()
         and not str(i.get("status", "")).upper().startswith(SKIP_PREFIX)}

mapped = {x for _, ids in BATCHES for x in ids}
extra = [i for i in items if i not in mapped]
if extra:
    BATCHES.append(("Z — Unbatched", extra))

lines = ["# Intake Requirement Briefs — 2026-11-14", "",
         f"Open intake items: **{len(items)}**. Each brief = registry record + full requirement text from the intake doc + open questions.",
         "Items marked **REQUIREMENT NOT CAPTURED** have no intake doc — owner must describe the requirement.", "",
         "Draft batch order: A → B (sequential, shared payment/cancel hotspots) · D after A · C, E, F, G, H parallel · I tracking-only.", ""]
missing = []
for bname, ids in BATCHES:
    ids = [x for x in ids if x in items]
    if not ids:
        continue
    lines += ["---", "", f"# BATCH {bname} ({len(ids)} items)", ""]
    for bid in ids:
        it = items[bid]
        docs = sorted(f for f in glob.glob(f"{ROOT}/**/*{bid}_*.md", recursive=True)
                      if "INTAKE_OPEN_QUESTIONS" not in f and "INTAKE_REQUIREMENT_BRIEFS" not in f)
        docs = [d for d in docs if "INTAKE" in d.upper()] or docs
        lines += [f"## {bid} — {it.get('title')}", "",
                  f"- Type: {it.get('type')} · Area: {it.get('area')} · Priority: {it.get('priority', '-')} · Assignee: {it.get('assignee') or 'UNASSIGNED'} · Client: {it.get('client') or 'NOT SET'}",
                  f"- Status: {it.get('status')}"]
        if it.get("notes"):
            lines.append(f"- Registry notes: {str(it['notes']).strip()}")
        if docs:
            md = open(docs[0], errors="ignore").read()
            lines.append(f"- Intake doc: `{docs[0].replace(ROOT + '/', '')}`")
            lines += [f"- {m}" for m in header_meta(md)]
            lines.append("")
            for title, body in sections(md):
                if body and any(k in title.lower() for k in KEEP_SECTIONS):
                    lines += [f"### {title}", "", body, ""]
        else:
            missing.append(bid)
            refs = []
            srcs = [f"{ROOT}/control/BUG_TRACKER.md", f"{ROOT}/control/CR_REGISTRY.md"] + sorted(glob.glob(f"{ROOT}/investigations/*.md"))
            for f in srcs:
                for l in open(f, errors="ignore"):
                    if re.search(rf"\b{re.escape(bid)}\b", l):
                        refs.append((f.replace(ROOT + "/", ""), re.sub(r"\s+", " ", l.strip())[:500]))
            seen, uniq = set(), []
            for src, txt in refs:
                if txt not in seen:
                    seen.add(txt); uniq.append((src, txt))
            lines += ["", "**REQUIREMENT NOT CAPTURED** — no intake doc. Owner to describe: what is wrong / what is wanted, which screen, which client, expected result.", ""]
            if uniq:
                lines += ["### What the tracker / investigations already say", ""]
                lines += [f"- `{src}`: {txt}" for src, txt in uniq[:6]]
                lines.append("")
lines += ["---", "", f"## Items with no requirement captured ({len(missing)})", "", ", ".join(missing), ""]
open(OUT, "w").write("\n".join(lines))
print(len(items), "items,", len(missing), "missing:", missing)
