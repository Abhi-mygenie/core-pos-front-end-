# Tech Tasks sheet — contract v1.0 and agent addendum

Date: 2026-10-21 (v1.2: Discuss / Drop, per-project tabs) · Owner: Abhishek Jain · Dashboard: MyGenie Tech Dashboard v34 (Morning page)

## What it is

The CEO's tech task list. Two sources feed it:

1. **NeoSapien Dispatch** sheet (`1NOR17bV_UrJKK7BqvS9YCXQWzmXtqtGrvUKknEEj_vk`), tab `Tech`. Abhishek reviews his day's action items each evening; approved ones land there with IDs `TECH-NNN`. The dashboard sync copies rows it has not seen into Tech Tasks. **Nobody writes to the dispatch sheet except its pipeline.**
2. **Manual** tasks added on the dashboard (`+ Add task` on the Morning page).

Abhishek routes each task to a project agent ("intake") from the dashboard. The agents read Tech Tasks on every run and report back on the same row. The dashboard never creates registry items; only the project agents do, in their own registry and sheet.

- **Sheet:** `Tech Tasks` — ID `1_H4vG9Ti4VuFfDcg5CXvGHIKtpPJkmttKow2xTxgq0U`, in the project sheets Drive folder `1fWp4BahzJ0YqENdhvVG6iyLfyKMyWL_J`.
- Row 1 of every tab is the same 15-column header. Never rename, reorder or add columns or tabs. On `Tasks`, never delete or re-sort rows; the dashboard keys on ID and checks the row still holds that ID before writing.

## Tabs

| Tab | Holds | Read by | Written by |
|---|---|---|---|
| `Tasks` | every task; the single source of truth | dashboard, sync, agents | dashboard (A–K, N, O), agents (K, L, M, O by ID) |
| `POS` `SO` `CRM` `INV` `INFRA` | that project's rows with Status `Intake` / `In Progress` / `Blocked` | **that agent**, owner | dashboard, rewritten whole after every Save |
| `Discuss` | Project `Discuss`, Status `Intake`, for the owner's 1:1s | owner | dashboard, rewritten |
| `Dropped` | Project `Drop`, Status `Rejected` | owner | dashboard, rewritten |
| `Done` | Status `Done`, with Agent note and Registry ID | owner | dashboard, rewritten |

The eight derived tabs are filtered copies of `Tasks`. The dashboard overwrites them (header + rows + blank padding) after each Save to sheet, so **nothing written on them survives**: agents find their work on their own tab but write back on `Tasks`.

## Columns

| Col | Header | Values | Written by |
|---|---|---|---|
| A | ID | `TT-NNN`, assigned in order, never reused | sync / dashboard |
| B | Source | `NS-AI` or `MANUAL` | sync / dashboard |
| C | Source ID | `TECH-NNN` for dispatch rows; blank for manual. This is how the sync knows a dispatch row was already copied | sync |
| D | Date | `YYYY-MM-DD` the task was spoken / added | sync / dashboard |
| E | Task | one line | sync / dashboard (set once) |
| F | Context | why / who / where it came up | sync / dashboard (set once) |
| G | Type | as the dispatch gives it (`Task`, `Fix / Issue`, `Setup / Build`, `Follow-up`, `Delivery`, `Communication`, …) | sync / dashboard |
| H | Priority | `High` / `Medium` / `Low` (dispatch uses these, not P0–P3) | owner (dashboard) |
| I | Owner | person responsible | owner (dashboard) |
| J | Project | `POS` / `SO` / `CRM` / `INV` / `INFRA` (an agent), or `Discuss` (a person, not an agent), or `Drop` (not relevant), or blank | owner (dashboard) |
| K | Status | `Open` → `Intake` → `In Progress` → `Done`, or `Blocked`, or `Rejected` | owner sets Open/Intake, Done on Discuss rows, Rejected on Drop; **agent sets the rest on its own rows** |
| L | Agent note | what was done, link, registry item, or why blocked / rejected | **agent** |
| M | Registry ID | the CR / BUG ID the agent registered for this task, if any | **agent** |
| N | Intake date | `YYYY-MM-DD` when Abhishek ticked it | dashboard |
| O | Last updated | `YYYY-MM-DD` of the last change, whoever made it | everyone who writes |

## Dashboard behaviour (Morning page)

- **Tech tasks tile:** rows with Status `Open` (or blank). High first, then newest. Editable: Priority, Owner, Project, and the intake checkbox (enabled once Project is set). `+ Add task` appends a row with the next `TT` number and `Source = MANUAL`.
- **Intake tile:** rows with an agent Project and Status `Intake`, `In Progress` or `Blocked`, grouped by Project, showing Owner, Status, Agent note and Registry ID. **Send back** returns selected rows to `Open`.
- **Discuss tile:** rows with Project `Discuss` and Status `Intake`, grouped by Owner: the list to take into a conversation with that person. **Done** on a row sets Status `Done`, Agent note `discussed`. Agents never act on Discuss rows.
- **Drop:** Project `Drop` + Intake sets Status `Rejected`, Agent note `dropped by owner`. The row leaves every tile but stays in the sheet, so the dispatch copy never re-creates it. The footer's **Show dropped** lists them with **Restore** (back to `Open`, Project blank).
- `Done` and `Rejected` rows are off all tiles (counted in the footer).
- Edits stay on the page until **Save to sheet** on the tile (one read, the writes, one reload); **Discard** throws them away. `+ Add task` writes at once. Every write stamps column O. Without the Google Sheets connector the tiles show the last synced snapshot, read-only.

## Sync step (mygenie-tech-dashboard-sync)

On every run: read dispatch `Tech!A2:J`; for each row whose ID is not in Tech Tasks column C, append a Tech Tasks row (`A` next TT number, `B = NS-AI`, `C` = TECH ID, `D–I` copied, `J` blank, `K = Open`, `O` = today). Report "N new tasks copied". Then read `Tasks!A1:O2000` and rebuild the dashboard with `--tasks @log`. Never modify existing Tech Tasks rows; never write to the dispatch sheet.

## Agent addendum (POS, SO, INFRA, CRM, INV agents)

Add to your run, after the registry sync:

1. Read your own tab (`'POS'!A2:O`, `'SO'!A2:O`, …) of the Tech Tasks sheet. Pick rows with `Status` = `Intake` that you have not seen before (keep the TT ID with whatever you create). Other tabs are not yours: never read `Discuss` / `Dropped` as work, and never write on any derived tab.
2. Decide what the task needs: register it as a CR / BUG in **your own** registry and sheet, answer it, or reject it.
3. Write back on the **`Tasks` tab**, on the row whose column A holds that TT ID (read `'Tasks'!A:A` to find it): `K` Status (`In Progress`, `Done`, `Blocked` or `Rejected`), `L` Agent note (short: what you did, link, or the reason), `M` Registry ID if you registered one, `O` today's date. Your tab shows the new values after the owner's next Save.
4. Keep updating `K` and `L` as the registry item moves; set `Done` when the item is CLOSED, or when the task needed no registry item and is finished.

Rules: match rows by ID in column A of `Tasks`, never by row number. Never edit A–J or N. Never add, delete or re-sort rows, on any tab. A bare `Rejected` or `Blocked` without a note in L will come back as a question. Priority in H is the owner's call; if it is wrong, say so in L.

Report in your run summary: TT IDs picked up this run, and for each the status you set and the registry ID if any.
