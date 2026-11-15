# QA HANDOVER — CR-429
## Active First toggle — Channel View

**Date:** 2026-10-17 | **Risk:** LOW
**Files changed:** DashboardPage.jsx · Header.jsx · ChannelColumnsLayout.jsx · ChannelColumn.jsx

---

## 1. Verification Matrix

| # | Edit | Self-Test |
|---|---|---|
| E-1 | `channelActiveFirst` state reads `mygenie_channel_active_first` from localStorage | ✅ |
| E-2 | Handler writes to localStorage on toggle | ✅ |
| E-3 | `activeFirst` only truthy when `dashboardView === 'channel'` | ✅ |
| E-4 | "Active First" pill in Channel View header, orange outline when ON | ✅ Screenshot confirmed |
| E-5 | `activeFirst` prop passed through ChannelColumnsLayout → ChannelColumn | ✅ |
| E-6 | `else if (activeFirst)` sort branch: occupied first, available last | ✅ Screenshot confirmed |

---

## 2. Test Cases

| # | Test | Steps | Expected |
|---|---|---|---|
| V1 | Pill visible in Channel View | Login palmhouse → dashboard (Channel View default) | "Active First" pill after Schedule |
| V2 | Pill OFF by default | Fresh session / cleared localStorage | Pill grey, tables in label-numeric order |
| V3 | Toggle ON → occupied sort to top | Click "Active First" | Occupied cards first, available cards below in each channel column |
| V4 | Available tables still visible | Toggle ON | Available cards still render, just pushed below occupied ones |
| V5 | Toggle OFF → label-numeric restored | Click "Active First" again | Tables back to label-numeric order (1, C-1, 2, C-2…) |
| V6 | Persists after reload | Toggle ON → reload page | Still ON after reload |
| V7 | Status View unaffected | Switch to Status View with toggle ON | Status View sort unchanged |

---

## 3. Regression Tests

| # | What | Why |
|---|---|---|
| R1 | Status View sort still works (occupied-first by status priority) | E-6 added `else if` before existing `else` |
| R2 | Search still works with Active First ON | `filteredItems` upstream of sort; no interaction |
| R3 | Column arrows (← →) still work | ChannelColumnsLayout unchanged except added prop pass |

---

## 4. Registry Sync
```
Registry: CR-429 → GATE_5A_IMPLEMENTED ✅
FILE_OWNERSHIP.md: updated ✅
Code markers: 10x // CR-429 across 4 files ✅
Compile: webpack compiled successfully, 0 new warnings ✅
EXIT GATE: 5/5 PASS
```

---

## 5. Credentials
| Account | Password |
|---|---|
| owner@palmhouse.com | Qplazm@10 |
| owner@cafe103.com | Qplazm@10 |

**URL:** https://pos-front-preview-10.preview.emergentagent.com
