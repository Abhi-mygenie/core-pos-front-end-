# SESSION HANDOVER — CR-390 MM: Screenshot Re-capture, External Validation Loop & FAQ Video Pipeline

**Current handover — read first:** `SESSION_HANDOVER_2026_09_28_CR390_STEP1_GATE2_REVIEW.md`. Step 1 complete; OD-390-16…22 LOCKED FOR PLANNING. Palm House Normal; Kunafa Mahal Aggregator; Palm House Premium for switching/comparison only; no Party setup. **Await separate Step 2 instruction; Gate 3 NOT STARTED; no new Gate 4 GO.** Historical hold/recapture instructions below are preserved, not current status or execution permission. Do not re-ask the seven accepted general decisions.
**Date:** June 2026  
**For:** Next agent (respond to user in **English only**)  
**Supersedes:** `SESSION_HANDOVER_2026_09_27_CR390_MM_PHASE2_COMPLETE.md` (its "50 unique screens, all valid" claim is FALSE — see §2)

---

## 0. Current owner decision and execution hold — OD-390-15 (2026-09-28)

**Owner selected (a): video-first, with an optional annotated PDF retained separately for reference.**
**Owner instruction (verbatim):** "a update docs and decsion do not start step 1".

- Clean source PNGs show the actual application UI, not added functionality descriptions, controls lists or narration boxes. Keep native UI labels and the existing privacy/persona safeguards.
- Keep explanations and narration in separate FAQ scripts/mappings and, after validation, storyboards. Videos use the PNGs, never the annotated PDF pages. Previously approved subtitles, highlights/zoom, voiceover and intro/outro remain unchanged.
- Required video-preparation pack: clean PNGs, separate scripts, inventory/mappings and validation evidence. The annotated PDF is an **optional reference companion**, not a mandatory regeneration step or input to video frames. If supplied, it must match validated assets.
- This decision does not cancel the original nine-module PDF scope or alter its frozen layout.
- **Step 1 NOT STARTED.** This session updates documentation/decision records only. No coverage review, revised scene matrix, capture, code edit, preprod mutation, PDF/ZIP regeneration or storyboard/TTS/video generation is authorized.

### Proposed sequence — wait for separate owner instruction

1. **PLANNING — Step 1:** amend the coverage/impact analysis against actual UI and all 70 FAQs. Use FAQ action/scene coverage, not a fixed image count. The historical repair list below is not an approved complete checklist.
2. **PLANNING + OWNER — Step 2:** resolve capture/data permissions and narration corrections, then approve the exact repair plan and verification matrix. Await explicit Gate 4 GO.
3. **IMPLEMENTATION — Step 3:** repair the runner, add validation and recapture only the approved scope; do not touch `/app/frontend/src/**`.
4. **IMPLEMENTATION → QA → OWNER — Step 4:** build the clean-image preparation ZIP and separate mappings/scripts/evidence; optionally regenerate the reference PDF. Independently verify, then hand the pack to the user for external validation. **STOP until the user confirms every FAQ 01–70 is green.**

Only after that external gate may storyboard/video work begin under its approved plan. EM remains blocked until the owner reviews final MM videos. Operational details in §§3–7 below are historical proposals pending the Step 1/2 amendments, not permission to execute.

---

## 1. Context & product

- **Product:** MyGenie POS (restaurant point-of-sale). React frontend only in `/app/frontend` (branch `21implement`), supervisor on port 3000. No backend of our own in this repo (the app talks to a preprod API).
- **CR-390:** produce client-facing Screen Reference PDFs per module + FAQ how-to videos. Phase 2 = Menu Management (MM). Phases 3+ = EM, IM, DC, CM, DR, IN-Basic, PMS.
- **Persona rule:** screens must show fictional name "Sharma Hotel & Restaurant" (runner DOM-swaps real name). Real names must never appear.
- **Credentials:**
  - Palm House (standard flows): `owner@palmhouse.com` / `Qplazm@10`
  - Kunafa Mahal (aggregator flows, screens 33–38): `owner@kunafamahal.com` / `Qplazm@10`
- **App URL for capture:** see `README.md` in the scripts folder (`--url https://core-pos-deploy-25.preview.emergentagent.com` was used last; confirm it still resolves — if not, ask user).
- **Preprod is slow.** A loading splash ("Please wait while we set up your system") can sit for 10–20 s. This is the root cause of most bad captures.

### Key paths
| Path | What |
|---|---|
| `/app/frontend/scripts/screen-reference/runner.py` | Playwright capture runner. Args: `--module MM --url … --email … --password … [--real-name] [--only 8,9,39]` |
| `/app/frontend/scripts/screen-reference/assemble.py` | PDF generator (fpdf2, "Option 2 bottom layout", user-approved) |
| `/app/frontend/scripts/screen-reference/master_assemble.py` | Multi-module assembler |
| `/app/frontend/scripts/screen-reference/manifests/MM_menu.json` | Manifest: `journey[]` → each has `route`, `section`, optional `login_as`, `states[]` (slug, title, description, controls, narration, actions). Screen number = running counter over all states (1-based). 10 journey entries, 50 states total |
| `/app/frontend/scripts/screen-reference/persona.json` | Fictional persona |
| `/app/memory/evidence/CR-390/MM/NN_slug.png` | Captured screens (1440×900 @2x) |
| `/app/memory/design_briefs/MM_FAQ_VIDEO_SCRIPTS_70.md` | 70 FAQ scripts (1175 lines) — narration is final, do not rewrite except FAQ 02 (see §3) |
| `/app/memory/handover/FAQ_VIDEO_AGENT_HANDOVER_MM_2026_09_27.md` | Brief for external agent: screen inventory + FAQ→screen mapping (all 70) + output format. **Must be updated after re-capture** |
| `/app/memory/design_briefs/downloads/screen_reference/MM/MyGenie_Menu_Management_Screen_Reference_v1_2026-09-27.pdf` | Current PDF (contains the bad screens — regenerate as v2) |
| `/app/frontend/public/downloads/MM_FAQ_Video_Pack.zip` | Public pack the user gives to the external agent. Contents: handover md, scripts md, `screens/` (50 PNG), PDF. Regenerate after re-capture |
| `/app/memory/design_briefs/MM_FAQ_VIDEO_PIPELINE_PLAN.md` | Approved video pipeline plan (also summarised in §6) |

---

## 2. What went wrong (audit result — verified by viewing the PNGs and md5)

The user pasted the current pack into an external agent (Claude/ChatGPT). It checked FAQ 01–10 and flagged problems. I verified all of them are real and found more.

### Byte-identical duplicates (md5sum)
| Group | Files | Reality |
|---|---|---|
| A | `01_sidebar-entry` = `03_menu-type-premium` = `08_category-add-form` = `09_category-drag-reorder` | All four are the **POS dashboard / table view**. Only 01 is legitimately correct |
| B | `04_category-list` = `10_item-card-anatomy` | Same shot; acceptable, 10 redundant |
| C | `15_item-quick-edit` = `44_quick-edit-full-view` | Same shot; 44 redundant |
| D | `24_addons-master-panel` = `45_addons-master-inline-edit` | Same shot; 45 was supposed to show inline edit mode — **missing** |
| E | `38_aggregator-variation-stock` = `50_aggregator-variation-stock-populated` | Same (empty state); 50 redundant |
| F | `41_menu-type-party` = `49_menu-type-party-quick-edit` | Same; 49 redundant |

### Wrong content (not duplicates)
| Screen | Claimed | Actually shows |
|---|---|---|
| `39_status-config-overview` | Local Settings → Status Config | **Loading splash** (14 %) |
| `40_active-menu-selector` | Active Menu dropdown | **Loading splash** (86 %) |
| `06_category-inline-edit` | Inline edit form | Correct form, but with yellow warning **"No printer mapped to BAR"** — contradicts FAQ 09 ("change kitchen printer") |
| `41_menu-type-party` | Party menu | Correct, but Palm House Party menu has **0 items** ("No products found") — FAQ 02 ("different prices on Party/Premium") cannot be demonstrated |

### Missing "result" frames
FAQ 07 (rename category) and FAQ 08 (delete category) map to 06 / 07 which are **mid-action** states (form open / "Delete? No Yes"). There is no "after" frame showing the renamed / removed category, so the video has no payoff shot.

### Net effect
Real unique, correct screens = **40 of 50**. The previous handover's fallback notes covered 03/10/42/49/50 but **silently missed 08, 09, 39, 40, 44, 45**.

### FAQs directly impacted
| FAQ | Problem |
|---|---|
| 01, 02, 16 | Screen 41 empty Party menu; FAQ 02 not demonstrable |
| 04, 05 | Screen 40 is a loading splash |
| 06 | Screen 08 is the dashboard |
| 07, 08 | No result frame |
| 09 | Screen 06 shows "No printer mapped" warning |
| 10 | Screen 09 is the dashboard |
| 39 | Secondary screen 44 = 15 (harmless) |
| 48 | Screen 45 = 24, inline edit never captured |
| 68 | Screen 38/50 empty state (known, accepted by user earlier — keep, but state it plainly in handover) |

### Root causes (so you fix the process, not just the files)
1. Runner captured before the app finished its loading splash / before route navigation completed → dashboard or splash shot.
2. No uniqueness or content assertion after capture — duplicates were only noticed in a later manual pass and then "papered over" with fallback notes instead of re-captured.
3. Preprod data gaps (Party menu empty, no printer on BAR) were not checked before writing scripts.

---

## 3. Re-capture list (do all of these)

Use `runner.py --only …` where the state already exists in the manifest; add new manifest states where noted (append to the relevant `journey[]` entry so existing numbering is not disturbed — new screens become 51+; or, if you renumber, you MUST regenerate the whole mapping table in the external-agent handover).

| # | Screen | Account | How to get the state | Assertion before shooting |
|---|---|---|---|---|
| 1 | `08_category-add-form` | Palm House | `/menu` → click "Add Category" (bottom of category column) | Inline form with name input + station select visible; header text "Menu Management" |
| 2 | `09_category-drag-reorder` | Palm House | `/menu` → mouse down on drag handle of 2nd category, move 120 px down, hold, shoot | A category row is lifted / placeholder gap visible |
| 3 | `39_status-config-overview` | Palm House | Navigate to Local Settings → Status Config; **wait until loading splash is gone** (`wait_for_selector` on panel title, timeout 60 s) | Panel title present, no "Please wait" text |
| 4 | `40_active-menu-selector` | Palm House | Local Settings → Active Menu dropdown → click to open | Dropdown options (Normal / Party / Premium / Aggregator) visible |
| 5 | `06_category-inline-edit` (re-shoot) | Palm House | Hover + pencil on a category whose station HAS a printer (try a KDS category, e.g. COLD DRINKS) | Form visible AND no "No printer mapped" text. If every station lacks a printer on preprod → ask user to map one, or keep and rewrite FAQ 09 narration to mention the warning |
| 6 | NEW `51_category-renamed-result` | Palm House | Rename a category (e.g. append " Test"), Save, shoot list, then rename back | New name visible in list |
| 7 | NEW `52_category-deleted-result` | Palm House | Only if a safe throw-away category exists (create "ZZ Temp" via Add Category, then delete it). Shoot the list right after "Yes" | "ZZ Temp" absent, list intact |
| 8 | NEW `53_menu-type-premium-with-items` | Palm House | Select Premium in header dropdown; wait for products | If Premium has items → capture; use for FAQ 02/16. If Premium is also empty → do not capture; instead rewrite FAQ 02 narration to "Party/Premium menus start empty — add items and give each its own price" and note it for the user |
| 9 | `45_addons-master-inline-edit` (re-shoot) | Palm House | Add-ons panel → click "Edit" on first row | Row turns into editable inputs |
| 10 | `03_menu-type-premium` | Palm House | Same as #8 but dropdown state only | Header dropdown shows "Premium" |

Delete nothing from `/app/memory/evidence/CR-390/MM/` until the new capture passes the gate; keep a `_old/` copy of replaced files for diffing.

**Preprod tips (from previous sessions):** navigate to `/menu` first and wait for `text=Menu Management` before performing any action; toasts are scrubbed by `scrub_toasts()` (CSS injection) — keep it; use `owner@kunafamahal.com` only for 33–38.

---

## 4. Hard validation gate (add to `runner.py`, run automatically after every capture)

Purpose: make the pipeline fail loudly instead of producing fallback notes.

1. **Loading-splash check:** page must not contain text "Please wait while we set up your system" and must not show the progress bar. Wait (up to 60 s) until gone; if still present → raise, do not shoot.
2. **Route/header check:** for `/menu` states, assert `text=Menu Management` header visible; for Local Settings states assert the panel title; for Add-ons assert "Add Addon" / panel title; for Bulk Editor assert grid header. Put the expected text in the manifest as `assert_text` per state.
3. **Dashboard guard:** assert page does **not** contain "Table View" / "Dine-In" tabs unless the state is `01_sidebar-entry`.
4. **Duplicate guard (post-run):** compute md5 + perceptual hash (`imagehash.phash`, `pip install imagehash`) for every PNG in the module folder. Any exact duplicate → hard fail listing both files. Any phash distance ≤ 2 between two screens whose slugs are not explicitly whitelisted as "intentionally identical" → hard fail.
5. **Empty-state guard:** if page contains "No products found" and the state is not whitelisted (41 is), fail.
6. **Report:** write `/app/memory/evidence/CR-390/MM/validation_report.json` (per screen: pass/fail, checks, phash) and print a summary table. `assemble.py` must refuse to build the PDF if the report has any failure.

Test the gate by running it on the **current** folder first — it must flag exactly the groups in §2. That is your regression test.

---

## 5. External validation loop (mandatory, every round)

The user validates every re-capture with an external agent. Your job is to make that validation easy and to never claim "done" yourself.

**After each capture round:**
1. Optionally regenerate `MyGenie_Menu_Management_Screen_Reference_v2_<date>.pdf` as a separate annotated reference (OD-390-15). PDF regeneration is not required for the video-preparation pack; never use its pages as video frames.
2. Update `FAQ_VIDEO_AGENT_HANDOVER_MM_<date>.md`:
   - Screen inventory: one row per file, no "use fallback" notes — if a screen needs a fallback, it is not done.
   - FAQ→screen mapping: update primary/supporting for FAQs 01–10, 39, 45, 48 as per §3 results.
   - Add a "Changes since v1" section listing every re-captured / new file.
3. Rebuild `/app/frontend/public/downloads/MM_FAQ_Video_Pack.zip` with separate handover/mapping, scripts, clean `screens/` PNGs and `validation_report.json`; an updated annotated PDF may be included as an explicitly optional reference companion (OD-390-15).
4. Give the user the download link **and** the validation prompt below.
5. Wait. Fix whatever the external agent reports. Repeat until it reports zero visual gaps for all 70 FAQs.

**Validation prompt for the user to paste into the external agent (with the ZIP attached):**

> You are the QA validator for the MyGenie POS Menu Management FAQ video pack. Attached: `FAQ_VIDEO_AGENT_HANDOVER_MM_<date>.md` (brief + screen inventory + FAQ→screen mapping), `MM_FAQ_VIDEO_SCRIPTS_70.md` (70 scripts), `screens/` (PNGs), `validation_report.json`.
> Do NOT produce storyboards yet. For every FAQ 01–70: open the mapped primary and supporting PNGs and answer: (a) does the screen actually show what the inventory row claims? (b) does it support every scene label in the script? (c) is anything visible that contradicts the narration (error toasts, warnings, empty states, wrong page)? (d) is a result/"after" frame needed but missing?
> Also list any PNGs that look identical to each other.
> Output one table: FAQ | Primary | Supporting | Verdict (OK / WEAK / BROKEN) | Exact issue | Suggested fix. Then a short summary: count of OK/WEAK/BROKEN. Do this in batches of 10 FAQs and wait for "continue" between batches.

Previous round result (v1 pack, FAQ 01–10 only): BROKEN 04, 05, 06, 10; WEAK 01, 02, 07, 08, 09. FAQ 11–70 not yet externally validated — expect issues at 39/44, 48/45, 68/38.

---

## 6. FAQ Video Pipeline — APPROVED PLAN (not started)

User decisions (June 2026):
| Decision | Choice |
|---|---|
| Voice | **ElevenLabs** (multilingual v2) primary; **Sarvam AI (Bulbul)** as Hindi alternative for A/B. User will supply both API keys |
| Languages | **English + Hindi** (Hindi narration keeps UI nouns in English: "Quick Edit पर क्लिक करें") |
| Storyboards | Generated **in-pipeline by LLM** (Emergent LLM key), not by the external agent. External agent's role = validator only |
| Video style | Screenshot on 1920×1080 canvas + zoom/highlight box on callout + same-language burned-in subtitles + VO + **branded intro card (MyGenie + module + FAQ title) and outro card** |
| Runtime | Python scripts in `/app/frontend/scripts/faq-video/` + small FastAPI service (`/api/faq-video/*`, port 8001) + **standalone HTML web UI** (pick FAQ → EN/HI → preview `<video>`, download, re-render). UI must NOT live in `/app/frontend/src` |
| Output | 70 × 2 = 140 MP4s, `MM_FAQ_Videos_en.zip` / `_hi.zip` in `/app/frontend/public/downloads/` + `manifest.json` |

Pipeline: `scripts.md → [1] storyboard JSON (LLM, strict validator) → [2] Hindi translation (glossary-locked) → [3] TTS per frame with word timestamps (cached) → [4] Pillow frame render (zoom toward region from regions.json, dim rest, subtitles ≤2 lines, Noto Sans / Noto Sans Devanagari) → [5] ffmpeg compose (intro + frames + outro, h264/aac, faststart) → [6] batch (resumable, background), package, web UI`.

Rules: frame duration = max(planned, audio + 0.4 s) so audio is never cut; `regions.json` maps (screen, callout) → bounding box and per-screen mask rects for any residual toast; everything manifest-driven so EM/IM/DC reuse it with zero code changes.

Human checkpoints (only 3): (1) after Hindi translation of 5 FAQs + ElevenLabs vs Sarvam voice A/B; (2) FAQ 01 final MP4 EN + HI; (3) full batch review in the web UI.

Before coding: call `integration_expert` for ElevenLabs, Sarvam, and the LLM. Needed from user: ElevenLabs key, Sarvam key (optional), outro card text.

Full detail: `/app/memory/design_briefs/MM_FAQ_VIDEO_PIPELINE_PLAN.md`.

**Precondition:** §5 external validation must be green for all 70 FAQs first. Storyboards built on wrong screens are wasted money (TTS + LLM).

---

## 7. Sequence for the next agent (step-by-step, each testable)

| Step | Action | Test |
|---|---|---|
| 1 | Build the validation gate (§4) and run it on the current MM folder | It reports exactly duplicate groups A–F and splash screens 39, 40 |
| 2 | Add `assert_text` to every state in `MM_menu.json`; add new states 51–53 | `python -c "import json; json.load(open(...))"` and dry-run `--only 51` |
| 3 | Re-capture §3 items 1–10 with `--only` (Palm House) | Gate passes for each; view each PNG yourself before declaring it |
| 4 | Re-run gate on whole folder | 0 failures, `validation_report.json` all pass |
| 5 | Regenerate PDF v2, update handover mapping (FAQ 01–10, 39, 45, 48, 02/16 narration decision), rebuild ZIP | ZIP opens, PDF page count = screens + 2, link `https://<REACT_APP_BACKEND_URL>/downloads/MM_FAQ_Video_Pack.zip` returns 200 |
| 6 | Hand link + §5 prompt to user; **stop** | User returns external agent's table |
| 7 | Fix reported items, repeat 3–6 until zero BROKEN/WEAK | External agent summary: 70 OK |
| 8 | Ask user for ElevenLabs / Sarvam keys + outro text → start §6 Step 0 | — |

---

## 8. Do-nots
- Do not edit `/app/frontend/src/**`.
- Do not write "use X as fallback" notes in the handover again — re-capture instead.
- Do not declare screens valid without viewing the PNG (use `view_file` on a downscaled JPG).
- Do not start storyboards/TTS before external validation is green.
- Do not start EM module before user reviews the final MM videos.
- Never overwrite `.env` files; use `search_replace` for single keys.

## 9. Environment
Installed: `playwright` (chromium), `fpdf2`, `pymupdf`, `fonttools`, `pillow`. To add: `imagehash` (gate). For §6 later: `ffmpeg`, `elevenlabs`, Noto Sans + Noto Sans Devanagari fonts.
