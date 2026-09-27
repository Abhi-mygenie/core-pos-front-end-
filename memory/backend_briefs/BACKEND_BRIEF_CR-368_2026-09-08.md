# BACKEND_BRIEF_CR-368_2026-09-08 — Two questions for the Dev team

**From:** MyGenie POS frontend (CR-368 test-suite clean-up)
**To:** Backend / Dev team
**Priority:** P3 — not blocking production. Blocks only our test clean-up.
**What we need from you:** two YES/NO answers. No code work requested.

---

## Question 1 — Printer font sizes: is the "old" field allowed to change on save?

**Endpoint:** `GET` / `POST` `/api/v2/vendoremployee/restaurant-settings/printer-agent-config`
**Field group:** `style_config.bill_print_style.<section>.<row>` and `style_config.kot_print_style.<section>.<row>`

Each printed line (e.g. restaurant name) carries font sizes in **two places** in your JSON:

```json
"restaurant_name": {
  "windows": { "font_size_58mm": 11, "font_size_80mm": 14, "bold": "Yes" },   ← NEW place
  "android": { "font_size_58mm": 2,  "font_size_80mm": 2,  "bold": "Yes" },
  "font_size_58mm": 12,  "font_size_80mm": 17,  "bold": "Yes"                 ← OLD flat place
}
```

**What the frontend does today (since BUG-363):** when the user saves, we write the Windows values into `windows.*` **and copy the same numbers into the old flat fields** (`font_size_58mm`, `font_size_80mm`, `bold`). So after a save, old flat = windows. In the example above, the old `12 / 17` would become `11 / 14`.

**Our understanding:** the backend / printer agent reads `windows.*` for Windows printing and `android.*` for Android; the flat fields are legacy and nobody reads them anymore.

**Please answer:**

| | Answer |
|---|---|
| **Q1-a** Does anything (backend, printer agent, reports, old app versions) still **read** the flat `font_size_58mm` / `font_size_80mm` / `bold` fields? | YES / NO |
| **Q1-b** Is it OK that the frontend **overwrites** the flat fields with the `windows` values on every save? | YES / NO |

- If **Q1-a = NO** and **Q1-b = YES** → frontend keeps current behaviour; we only update our test.
- If **Q1-a = YES** → tell us *who* reads it and what value it expects, and we will file a bug to preserve the flat value instead of overwriting it.

---

## Question 2 — Do we need to keep the full server payload on the printer-config screen?

Same endpoint as Question 1.

**What the frontend does today (since CR-133):** on `GET` we keep a copy of the **entire** response (`_raw`). On `POST` we start from that copy and only change the fields the user edited. Reason: the screen does not display every key you send (e.g. `server_configuration`, `api_authentication`, `field_visibility`, extra per-row keys like `alignment`, `content`, `visible`), and we did not want a save to wipe them out.

**Please answer:**

| | Answer |
|---|---|
| **Q2-a** If the frontend `POST`s **only** the fields shown on the screen (and omits the others), does the backend **keep** the omitted keys unchanged — or does it **delete/reset** them? | KEEPS / DELETES |

- If **KEEPS** → we can drop the full-payload copy later (optional clean-up); our test rule stays strict.
- If **DELETES** → the full-payload copy is required; we relax our test rule for this one screen.

---

## Why we are asking
Two old automated tests fail because of the behaviours above. We do not want to change production code or the API contract based on a guess. Your answers decide only how the **tests** are written.

## Frontend workaround
- Available: YES — production is unaffected either way; only tests are pending.

## Evidence
- Live fixture used by the failing test: `frontend/src/api/transforms/__tests__/fixtures/cr133_printer_agent_config.json` (restaurant 478 GET response)
- Frontend code: `frontend/src/api/transforms/printerAgentConfigTransform.js` L108-135 (read) · L140-158 (write, flat mirror) · L194 (`_raw` retained) · L277 (`POST` body built from `_raw`)
- Analysis: `memory/impact/CR-368_IMPACT_ANALYSIS.md` §6 (OD-CR368-05 ii, OD-CR368-06)

## Reply format (copy-paste)
```
Q1-a: YES / NO   (who reads flat fields, if YES: ______)
Q1-b: YES / NO
Q2-a: KEEPS / DELETES
```
