# BUG-361 — Implementation Plan: Sidebar Phase 2 Sweep

**Gate:** 3 — Implementation Plan
**Date:** 2026-08-26
**Impact Analysis:** `/app/memory/impact/BUG-361_IMPACT_ANALYSIS.md`
**Code Reality:** CODE EXISTS — 68 files, identical pattern
**Risk:** LOW
**Files WILL change:** 68 files (see list in intake doc)
**Files will NOT touch:** `Sidebar.jsx`, any service/transform/API

---

## Entry Verification

| # | File | Expected |
|---|---|---|
| 1 | Any of the 67 standard files | `const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);` |
| 2 | Any of the 67 standard files | `setIsExpanded={setIsSidebarExpanded}` (exact string) |
| 3 | `OrderReportBetaPage.jsx:232` | `const [sidebarExpanded, setSidebarExpanded] = useState(false);` |
| 4 | `OrderReportBetaPage.jsx:392` | `setIsExpanded={setSidebarExpanded}` |

---

## Implementation Strategy — Python Script

Given 68 identical changes, a **Python script** is the correct tool — more reliable than 68 individual search_replace calls, and verifiable before and after.

### Script (run via bash tool)

```python
import os, re

PAGES_DIR = '/app/frontend/src/pages'
KEY = 'mygenie_sidebar_expanded'

# Pattern A: standard (isSidebarExpanded)
FIND_INIT_STD   = 'const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);'
REPL_INIT_STD   = (
    '// BUG-361: persist sidebar state across reloads\n'
    '  const [isSidebarExpanded, setIsSidebarExpanded] = useState(\n'
    "    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'\n"
    '  );'
)
FIND_PROP_STD   = 'setIsExpanded={setIsSidebarExpanded}'
REPL_PROP_STD   = (
    'setIsExpanded={(v) => { '
    'setIsSidebarExpanded(v); '
    f"localStorage.setItem('{KEY}', String(v)); "
    '}} // BUG-361'
)

# Pattern B: special (sidebarExpanded — OrderReportBetaPage)
FIND_INIT_SPC   = 'const [sidebarExpanded, setSidebarExpanded] = useState(false);'
REPL_INIT_SPC   = (
    '// BUG-361: persist sidebar state across reloads\n'
    '  const [sidebarExpanded, setSidebarExpanded] = useState(\n'
    "    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'\n"
    '  );'
)
FIND_PROP_SPC   = 'setIsExpanded={setSidebarExpanded}'
REPL_PROP_SPC   = (
    'setIsExpanded={(v) => { '
    'setSidebarExpanded(v); '
    f"localStorage.setItem('{KEY}', String(v)); "
    '}} // BUG-361'
)

changed = []
skipped = []

for root, dirs, files in os.walk(PAGES_DIR):
    dirs[:] = [d for d in dirs if d != 'node_modules']
    for fname in files:
        if not fname.endswith('.jsx'):
            continue
        path = os.path.join(root, fname)
        with open(path) as f:
            src = f.read()
        
        orig = src
        # Apply standard pattern
        if FIND_INIT_STD in src:
            src = src.replace(FIND_INIT_STD, REPL_INIT_STD, 1)
        if FIND_PROP_STD in src:
            src = src.replace(FIND_PROP_STD, REPL_PROP_STD, 1)
        # Apply special pattern (OrderReportBetaPage)
        if FIND_INIT_SPC in src:
            src = src.replace(FIND_INIT_SPC, REPL_INIT_SPC, 1)
        if FIND_PROP_SPC in src:
            src = src.replace(FIND_PROP_SPC, REPL_PROP_SPC, 1)
        
        if src != orig:
            with open(path, 'w') as f:
                f.write(src)
            changed.append(path.replace(PAGES_DIR + '/', ''))
        
print(f'Changed: {len(changed)} files')
for f in sorted(changed):
    print(' ', f)
```

---

## Execution Sequence

1. **Pre-flight verify** — count files with old pattern: `grep -rln "useState(false)" pages/ | wc -l` → should be 68
2. **Run script** via bash — processes all 68 files atomically
3. **Post-flight verify** — count remaining: `grep -rln "useState(false)" pages/ | wc -l` → should be 0 (for sidebar state vars)
4. **Code marker verify** — `grep -rl "BUG-361" pages/ | wc -l` → should be 68
5. **Compile check** → 0 new warnings

---

## Scope Lock

**WILL change:** 68 `*.jsx` files under `/app/frontend/src/pages/` (2 edits per file)
**WILL NOT touch:** `Sidebar.jsx` · any service · any transform · `DashboardPage.jsx` (Phase 1, already fixed)

---

## Verification Matrix (seeds QA)

| # | Edit | Test | Expected | Auto |
|---|---|---|---|---|
| T1 | All | Script output | 68 files changed | AUTO |
| T2 | All | `grep -rl "BUG-361" pages/` | 68 files | AUTO |
| T3 | All | Compile | 0 new warnings | AUTO |
| T4 | Manual | Expand on any report page → reload | Sidebar stays expanded | MANUAL |
| T5 | Manual | Expand on Dashboard → navigate to report → come back | All pages consistent | MANUAL |
| T6 | Manual | OrderReportBetaPage specifically | Persist after reload | MANUAL |
| T7 | Regression | All report pages load without error | No console errors | MANUAL spot-check |

---

## Post-Code Registry Checklist

- [ ] `registry.json`: BUG-361 → `status: "IMPLEMENTED"`, `gate: "5"`
- [ ] `BUG_TRACKER.md`: row updated
- [ ] `FILE_OWNERSHIP.md`: note 68-file sweep with BUG-361
- [ ] Code markers: `// BUG-361` in all 68 modified files
- [ ] Compile: 0 new warnings
