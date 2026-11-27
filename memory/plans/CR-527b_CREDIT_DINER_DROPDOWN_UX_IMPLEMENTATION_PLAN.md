# CR-527b — Implementation Plan (Gate 3)

**ID:** CR-527 (slice "b") · **Type:** CR · **Stage:** Gate 3 — Implementation Plan
**Date:** 2026-11-24 · **Role:** PLANNING (plan only — no code until Gate-4 GO)
**Risk:** MEDIUM · **Priority:** P2 · **Client:** ALL · **Assignee:** Abhishek · **Sprint:** nov_cr_batch
**IA:** `impact/CR-527b_CREDIT_DINER_DROPDOWN_UX_IMPACT_ANALYSIS.md`
**Source:** branch `notification-fix` (`8c80bfe`) — per-hunk port.

---

## Entry verification (anchors re-confirmed 2026-11-24)
All target lines on `main` match the IA (unchanged):
`dinerMap.get(key) ||` L612 · `<Popover open={dinerMenuOpen}` L661 · `<PopoverContent className="p-0 w-[300px]" align="start">` L674 · `` value={`${d.label} ${d.key}`} `` L686 · active-summary L700.
`ui/popover.jsx`: `Popover = PopoverPrimitive.Root` (accepts `modal`); `PopoverContent` spreads `...props` (accepts `onWheel`/`onTouchMove`). ✅ No new imports needed.

## Scope lock
- **WILL change (1 file):** `frontend/src/components/credit/CreditCustomerDetailSheet.jsx` — region **L612-L700** only.
- **WILL NOT touch:** mapper L270-271 · `dinerKeyOf`/`dinerLabelOf` L115-116 · `matchesDiner`/FIFO coverage · date block (BUG-733 L471-478) · `CreditRow` Diner cell L133-143 · `CREDIT_TABLE_HEAD` · `CreditManagementPanel.jsx` · any API/transform/fetch.

---

## Edits (exact current → new)

### E1 — dinerMap entry carries `mobile` (L612) + add CR-527b marker
**Current:**
```jsx
                    const cur = dinerMap.get(key) || { key, label: dinerLabelOf(c), count: 0, open: 0, noName: !c.dinerName };
```
**New:**
```jsx
                    // CR-527b: carry diner mobile for label disambiguation
                    const cur = dinerMap.get(key) || {
                      key,
                      label: dinerLabelOf(c),
                      mobile: c.dinerMobile || '',
                      count: 0,
                      open: 0,
                      noName: !c.dinerName,
                    };
```

### E2 — chip (≤5 branch): add `title` + mobile in label (chip button, ~L646-657)
**Current:**
```jsx
                                  style={dinerFilter === d.key
                                    ? { background: '#1A1A1A', color: '#fff', borderColor: '#1A1A1A' }
                                    : { color: COLORS.darkText, borderColor: COLORS.borderGray }}
                                >
                                  {d.label} ({d.count})
                                </button>
```
**New:**
```jsx
                                  style={dinerFilter === d.key
                                    ? { background: '#1A1A1A', color: '#fff', borderColor: '#1A1A1A' }
                                    : { color: COLORS.darkText, borderColor: COLORS.borderGray }}
                                  title={d.mobile ? `${d.label} · ${d.mobile}` : d.label}
                                >
                                  {d.mobile ? `${d.label} · ${d.mobile}` : d.label} ({d.count})
                                </button>
```

### E3 — Popover non-modal (L661)
**Current:** `<Popover open={dinerMenuOpen} onOpenChange={setDinerMenuOpen}>`
**New:** `<Popover modal={false} open={dinerMenuOpen} onOpenChange={setDinerMenuOpen}>` {/* CR-527b */}

### E4 — trigger active label + mobile (L670)
**Current:**
```jsx
                                  <b>{activeDiner ? activeDiner.label : `All (${filteredCredits.length} orders · ${distinctDinerCount} diners)`}</b>
```
**New:**
```jsx
                                  <b>{activeDiner
                                    ? (activeDiner.mobile ? `${activeDiner.label} · ${activeDiner.mobile}` : activeDiner.label)
                                    : `All (${filteredCredits.length} orders · ${distinctDinerCount} diners)`}</b>
```

### E5 — scroll-isolation on PopoverContent + CommandList, and CommandItem value+2-line label (L674-L691)
**Current:**
```jsx
                              <PopoverContent className="p-0 w-[300px]" align="start">
                                <Command>
                                  <CommandInput placeholder="Search diner…" data-testid="credit-diner-search" />
                                  <CommandList>
                                    <CommandEmpty>No diner found.</CommandEmpty>
                                    <CommandItem value="__all__" onSelect={() => { setDinerFilter('ALL'); setDinerMenuOpen(false); }}>
                                      <span className="flex-1">All</span>
                                      <span className="text-xs text-zinc-400">{filteredCredits.length}</span>
                                    </CommandItem>
                                    {diners.map((d) => (
                                      <CommandItem
                                        key={d.key}
                                        value={`${d.label} ${d.key}`}
                                        onSelect={() => { setDinerFilter(d.key); setDinerMenuOpen(false); }}
                                      >
                                        <span className="flex-1 truncate" title={d.label}>{d.label}</span>
                                        <span className="text-xs text-zinc-400 whitespace-nowrap">{d.count} · {formatINR(d.open)}</span>
                                      </CommandItem>
                                    ))}
                                  </CommandList>
                                </Command>
                              </PopoverContent>
```
**New:**
```jsx
                              <PopoverContent
                                className="p-0 w-[300px]"
                                align="start"
                                onWheel={(e) => e.stopPropagation()}  {/* CR-527b: isolate scroll from sheet */}
                                onTouchMove={(e) => e.stopPropagation()}
                              >
                                <Command>
                                  <CommandInput placeholder="Search diner…" data-testid="credit-diner-search" />
                                  <CommandList
                                    onWheel={(e) => e.stopPropagation()}
                                    onTouchMove={(e) => e.stopPropagation()}
                                  >
                                    <CommandEmpty>No diner found.</CommandEmpty>
                                    <CommandItem value="__all__" onSelect={() => { setDinerFilter('ALL'); setDinerMenuOpen(false); }}>
                                      <span className="flex-1">All</span>
                                      <span className="text-xs text-zinc-400">{filteredCredits.length}</span>
                                    </CommandItem>
                                    {diners.map((d) => (
                                      <CommandItem
                                        key={d.key}
                                        value={`${d.label} ${d.mobile || ''} ${d.key}`}
                                        onSelect={() => { setDinerFilter(d.key); setDinerMenuOpen(false); }}
                                      >
                                        <span className="flex-1 min-w-0 pr-2">
                                          <span className="block truncate" title={d.label}>{d.label}</span>
                                          {d.mobile ? (
                                            <span className="block truncate text-xs text-zinc-400" title={d.mobile}>{d.mobile}</span>
                                          ) : null}
                                        </span>
                                        <span className="text-xs text-zinc-400 whitespace-nowrap">{d.count} · {formatINR(d.open)}</span>
                                      </CommandItem>
                                    ))}
                                  </CommandList>
                                </Command>
                              </PopoverContent>
```

### E6 — active-summary line + mobile (L700)
**Current:**
```jsx
                              {activeDiner.label}: {activeDiner.count} orders · {formatINR(activeDiner.open)} open
```
**New:**
```jsx
                              {activeDiner.label}{activeDiner.mobile ? ` · ${activeDiner.mobile}` : ''}: {activeDiner.count} orders · {formatINR(activeDiner.open)} open
```

---

## Verification Matrix (seeds QA)

| # | Edit | How to verify | Automated? |
|---|---|---|:--:|
| 1 | E1 dinerMap `mobile` | Build compiles; chips/dropdown render mobile for diners with a number | NO (render) |
| 2 | E2 chip label | Holder with 2-5 distinct diners → chips show `name · mobile (count)` + hover title | NO |
| 3 | E3 `modal={false}` | Open 6+ dropdown → page/sheet behind not inert; click outside still closes dropdown | NO |
| 4 | E4 trigger label | Select a diner → trigger `<b>` shows `name · mobile` | NO |
| 5 | E5 scroll-isolation | 6+ diners, open dropdown, wheel/touch-scroll inside list → list scrolls, **sheet behind does NOT** | NO |
| 6 | E5 search value | Type a mobile number in search → matching diner filters in | NO |
| 7 | E5 2-line item | Each item shows name (line 1) + muted mobile (line 2); blank-mobile → name only | NO |
| 8 | E6 summary | Active diner summary shows `name · mobile: N orders · ₹X open` | NO |
| 9 | Same-name disambiguation (core value) | Two diners same name, different mobile → appear as 2 distinct, distinguishable entries | NO |
| 10 | Compile | `webpack compiled successfully`, **0 new warnings** | YES |

**No unit test** — pure-render component; `notification-fix` adds none. Verification = compile + browser QA (authenticated, preprod `pms@macha`, a holder with 6+ distinct diners).

## Regression tests (for QA)
- Credit sheet still opens; buckets (covered/partial/open), FIFO coverage %, and amounts unchanged.
- Date-range filter (BUG-733 DatePicker L471-478) still works; diner counts respect date filter.
- `matchesDiner` filtering unchanged: selecting a diner filters rows to that `name|mobile` key.
- 0-1 diner → no filter UI; 2-5 → chips; 6+ → dropdown (branch thresholds unchanged).

## Execution sequence
1. Apply E1-E6 via `search_replace` (single file, one pass).
2. `tail -f /var/log/supervisor/frontend.out.log` → confirm `Compiled successfully`.
3. Browser self-test rows 2-9; screenshot the 6+ dropdown showing name·mobile + scroll-isolation.
4. Run EXIT GATE (below) → write QA handover.

## Post-Code Registry Checklist (Implementation agent executes)
- [ ] `registry.json`: CR-527 status += `IMPLEMENTED CR-527b (GATE_5A)`; `sprint_key=nov_cr_batch`; append `files` + plan artifact_ref.
- [ ] `CR_REGISTRY.md`: prepend CURRENT CR-527b IMPLEMENTATION block.
- [ ] `FILE_OWNERSHIP.md`: add row — `CreditCustomerDetailSheet.jsx` CR-527b (diner dropdown mobile + scroll-isolation + modal=false), region L612-700, line-disjoint from BUG-733/CR-526/CR-527.
- [ ] Code marker: `// CR-527b` present in the file (E1 + E3 + E5).
- [ ] Compile: webpack 0 new warnings.

## Risk register
| Risk | Mitigation |
|---|---|
| `modal={false}` dismissal/focus regression | QA row 3 — outer click closes; search input focuses |
| `stopPropagation` over-blocks | Intended; only inner wheel/touch; QA row 5 confirms sheet scroll elsewhere still works |
| cmdk `value` change | Only adds mobile to search string — broadens match (QA row 6) |
| Hotspot file regression | Edits confined to L612-700; QA regression list above |

**Owner decisions still open (Gate 4):** OD-527b-1 confirm P2/MEDIUM · OD-527b-2 ship as-on-`nf` (recommended) vs design pass. OD-527b-3 RESOLVED (parallel-safe).

---

**Gate status:** GATE_3_PLAN_COMPLETE
**Next:** Owner **Gate-4 GO** → IMPLEMENTATION (apply E1-E6, self-test, EXIT GATE, QA handover). No app code changed in this role.
