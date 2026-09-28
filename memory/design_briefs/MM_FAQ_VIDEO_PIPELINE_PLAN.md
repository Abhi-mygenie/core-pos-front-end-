# MyGenie POS — FAQ Video Pipeline Plan (CR-390 Phase 2b)

> **CURRENT progression (later 2026-09-28):** Owner “begin step 2”. Recovery Gate 3 plan DRAFT WRITTEN in `../plans/CR-390_IMPLEMENTATION_PLAN.md` + all-70/data annex `../plans/CR-390_MM_RECOVERY_EVIDENCE_SPEC.md`; **Gate 3 OPEN / OWNER REVIEW, no Gate 4 GO**. Handover: `../handover/SESSION_HANDOVER_2026_09_28_CR390_STEP2_GATE3_REVIEW.md`. OD-390-23/24 LOCKED FOR PLANNING via 1a/2a; OD-390-25 OPEN for walkthrough only (no discovery/access); locked menu/video choices unchanged. The older notices/details below are historical, not current stage dispatch. No original scripts, captures, integrations or videos generated; all-70 external/owner acceptance remains required before storyboard/translation/TTS/video.

> **CURRENT GATE NOTICE — 2026-09-28:** Recovery Step 1 complete; **OD-390-16…22 LOCKED FOR PLANNING**. Sources: Palm House Normal, Kunafa Mahal Aggregator, Palm House Premium only for switching/comparison; no Party setup. See `../impact/CR-390_MM_FAQ_COVERAGE_GATE2_2026_09_28.md` §7. **Await separate Step 2 instruction; Gate 3 NOT STARTED; no new Gate 4 GO.** Original 34-blocked/36-partial baseline not repaired or accepted. Historical fallback/error-masking/public-path/cost/checkpoint guidance below is not an approved implementation plan. All-70 owner-confirmed external acceptance remains mandatory before ANY storyboard/video.
**Status:** VIDEO PLAN ONLY — not implemented. Recovery Step 1 and planning decisions recorded; Step 2 / Gate 3 NOT STARTED. No script changes, captures, data changes or generated outputs in this decision update. OD-390-15 remains locked; prior “Step 1 NOT STARTED” passages below describe the earlier decision-only session, not current status.
**Scope:** 70 Menu Management FAQs × 2 languages (English, Hindi) → 140 MP4s + web UI to preview/download.

## OD-390-15 — Video-first assets; optional annotated reference PDF (LOCKED 2026-09-28)

**Owner choice:** (a) video-first, with a separate annotated PDF retained as an optional reference.
**Owner instruction (verbatim):** "a update docs and decsion do not start step 1"

- Source PNGs contain the actual application UI, with existing privacy/persona safeguards. Do not bake explanatory paragraphs, functionality lists, controls lists or narration boxes into these source images. Native UI labels remain visible.
- Keep explanations, narration, FAQ-to-screen mappings and later storyboard directions in separate text/JSON documents. Do not delete the explanatory content simply because it is not burned into the image.
- Final videos use source PNGs, never annotated PDF pages. Previously approved zoom/highlights, voiceover, same-language subtitles and branded intro/outro remain unchanged.
- Required preparation pack: clean source PNGs, separate FAQ scripts, inventory/mappings and validation evidence. An annotated PDF is an optional, separate reference companion; its regeneration is not a prerequisite for video preparation or external validation. If included, it must reflect the validated assets rather than reuse the invalid old PDF as current evidence.
- This amendment applies to the MM FAQ video pack. It does not cancel the broader nine-module PDF scope or change the frozen reference-PDF layout.
- The forthcoming Step 1 must assess coverage by FAQ action/scene, not by a fixed screenshot count or how many controls a PDF page describes. No coverage matrix, narration rewrite, new capture list or verification implementation is produced by this decision update.
- **Execution hold:** Step 1 (coverage / impact-analysis amendment) is NOT STARTED. No captures, script changes, preprod mutations, PDF/ZIP regeneration, storyboards, TTS or video rendering are authorized by this decision. Gate 4 GO for repair implementation is still required after the amended plan is approved.
- External validation must be green for all 70 FAQs, explicitly confirmed by the owner, before any storyboard/video generation. The historical implementation details below remain subject to the forthcoming coverage and safety review; fallback mappings are not newly approved by this decision.

**Next roles, only when authorized:** PLANNING (Step 1 coverage/impact review, then Step 2 permissions + implementation-plan amendment) → owner Gate 4 GO → IMPLEMENTATION (Step 3 repair/capture and Step 4 packaging) → QA → owner/external validation, facilitated if needed by SMOKE FACILITATOR.

**Next-agent handover:** `handover/SESSION_HANDOVER_2026_09_28_CR390_VIDEO_FIRST_AWAITING_STEP1.md` (relative to `memory/`). Present the complete scenario, then ask approval for Step 1 ONLY and wait. Here, the owner's next Step 1 means the Gate 2 coverage/impact-analysis amendment, **not** the historical "Step 1 — Storyboard generation" below. Step 1 NOT STARTED.

## User choices
| Decision | Choice |
|---|---|
| Voice | ElevenLabs primary (multilingual v2); Sarvam AI (Bulbul) as Hindi alternative — user provides both keys |
| Languages | English + Hindi (Hindi = spoken Hindi with English UI terms kept as-is, i.e. natural Hinglish for product nouns) |
| Storyboards | Generated in-pipeline by LLM (Emergent key), not external agent |
| Video style | Screenshot + zoom/highlight box + same-language subtitles + VO + branded intro/outro card |
| Runtime | Python scripts in `/app/frontend/scripts/faq-video/` + small FastAPI service + standalone web UI (NOT inside `/app/frontend/src`) |

## Pipeline (one FAQ, one language)
```
scripts.md ──► [1] Storyboard JSON ──► [2] Translate (hi) ──► [3] TTS per frame (mp3 + word timestamps)
                                                                   │
screens/*.png ──► [4] Frame render (zoom/highlight + subtitle burn-in) ◄─┘
                                   │
                [5] ffmpeg concat + intro/outro + audio ──► FAQ-XX_en.mp4 / FAQ-XX_hi.mp4
                                   │
                [6] manifest.json + ZIP ──► /downloads + web UI
```

## Folder layout
```
/app/frontend/scripts/faq-video/
  storyboard.py      # step 1: LLM → storyboards/FAQ-XX.json (validates screen files, durations)
  translate.py       # step 2: LLM → storyboards/FAQ-XX.hi.json (glossary-locked)
  tts.py             # step 3: ElevenLabs / Sarvam → audio/{lang}/FAQ-XX_fN.mp3 + timings
  render_frames.py   # step 4: Pillow → frames/{lang}/FAQ-XX_fN.png (zoom, highlight, subtitle)
  compose.py         # step 5: ffmpeg → out/{lang}/FAQ-XX.mp4
  package.py         # step 6: manifest + ZIP → /app/frontend/public/downloads/MM_FAQ_Videos_{lang}.zip
  run_all.py         # orchestrator, resumable, --faq 01-10 --lang en,hi
  glossary.json      # Hindi glossary: Quick Edit, Bulk Editor, Swiggy, Zomato, GST… stay in English/Latin
  regions.json       # per-screen callout → bounding box (x,y,w,h) for highlight/zoom
  server.py          # FastAPI (port 8001): list FAQs, status, trigger render, serve mp4
  ui/index.html      # standalone page: FAQ picker + language toggle + <video> preview + download
```

## Steps (each independently testable)

### Step 0 — Environment & keys
- Install: `ffmpeg`, `pip install elevenlabs requests pillow` (Sarvam via REST). Fonts: Noto Sans + Noto Sans Devanagari (subtitles).
- `.env` (backend): `ELEVENLABS_API_KEY`, `SARVAM_API_KEY`, `EMERGENT_LLM_KEY`, `ELEVEN_VOICE_EN`, `ELEVEN_VOICE_HI`.
- Call `integration_expert` for ElevenLabs + Sarvam + LLM before coding.
- **Test:** 1 line English + 1 line Hindi → mp3 from each provider; play/inspect duration.

### Step 1 — Storyboard generation (LLM)
- Input: `MM_FAQ_VIDEO_SCRIPTS_70.md` + handover mapping table + screen inventory.
- Output per FAQ: JSON `{faq, title, duration, frames:[{screen, callout, region_hint, narration, seconds}]}`.
- Hard validation: screen filename exists, fallbacks applied (03→02, 10→04, 42→43, 49→41, 50→38), frame count within 30s:3–4 / 45s:4–5 / 60s:5–6, seconds sum = duration, narration verbatim from script.
- **Test:** run on FAQ 01–05, eyeball JSON, run validator → 0 errors.

### Step 2 — Hindi translation (LLM)
- Translate `title`, `narration`, `callout` only. Glossary-locked: UI labels, brand names, tax terms stay in English (e.g. "Quick Edit पर क्लिक करें").
- Register: conversational Hindi for restaurant owners, "आप" form, short sentences.
- **Test:** FAQ 01–05 Hindi JSON reviewed by user (this is the one human checkpoint before mass render).

### Step 3 — TTS
- ElevenLabs `eleven_multilingual_v2`, one call per frame → mp3. Use `/with-timestamps` endpoint for word timings → subtitle sync.
- Sarvam Bulbul as optional `--provider sarvam` for Hindi A/B.
- Frame duration = max(planned seconds, audio length + 0.4s pad) — audio never gets cut.
- Cache by hash(text+voice) so re-runs cost nothing.
- **Test:** FAQ 01 en + hi audio, total length ≈ 30s.

### Step 4 — Frame rendering (Pillow)
- Base: screenshot scaled to 1920×1080 canvas (16:9, letterbox with brand dark background).
- Highlight: `regions.json` maps `(screen, callout keyword)` → box; draw rounded amber stroke + dim rest 30%; if region present, Ken-Burns zoom 1.0→1.15 toward box across the frame (render 3 keyframes, ffmpeg zoompan).
- Subtitles: bottom band, ≤2 lines, chunked by word timestamps (en: Noto Sans, hi: Noto Sans Devanagari).
- Intro card (2.5s): MyGenie logo/wordmark + "Menu Management" + FAQ title (in that language). Outro card (2s): "MyGenie POS · mygenie.ai" (text confirmed with user).
- `regions.json` filled once for ~50 screens (manual, ~1–2 hrs, biggest single effort). Frames without region → gentle full-screen zoom only.
- **Test:** render FAQ 01 frames → PNGs look right, Devanagari renders (no boxes).

### Step 5 — Compose (ffmpeg)
- Per frame: image + zoompan + audio → segment; concat intro + segments + outro; 1080p, h264, aac, 30fps; `-movflags +faststart`.
- Output name: `FAQ-01_switch-normal-party_en.mp4`, `_hi.mp4`.
- **Test:** FAQ 01 en/hi play in browser; A/V in sync; size ~5–8 MB.

### Step 6 — Batch, package, UI
- `run_all.py --lang en,hi` resumable (skips done outputs), logs failures to `out/failures.json`. Run in background (140 videos ≈ 40–60 min; TTS cost ≈ 70×2×~90 words ≈ 13k chars/lang → within ElevenLabs Creator tier).
- `package.py` → `manifest.json` (faq, title_en, title_hi, duration, urls) + `MM_FAQ_Videos_en.zip`, `MM_FAQ_Videos_hi.zip` in `/app/frontend/public/downloads/`.
- **Web UI** (`ui/index.html`, served by FastAPI at `/api/faq-video/ui`): left list of 70 FAQs with EN/HI status dots; right: `<video>` preview, language toggle, Download button, "Re-render" button (calls `POST /api/faq-video/render/{faq}/{lang}`), storyboard table shown under video for QA.
- **Test:** testing_agent — list loads, pick FAQ 12 hi → video plays, download works, re-render queues.

## Human checkpoints (only 3)
1. After Step 2: approve Hindi tone on 5 FAQs + pick ElevenLabs vs Sarvam Hindi voice from a 2-sample A/B.
2. After Step 5: approve FAQ 01 en + hi final MP4 (style, subtitle size, intro/outro text).
3. After Step 6: full batch review in the web UI.

## Risks
- Screens with error toasts/"Request timed out": crop mask defined in `regions.json` per screen.
- Hindi TTS pronouncing English UI words oddly: glossary can add phonetic hints (e.g. "क्विक एडिट") per provider if needed.
- Long Hindi narration > planned seconds: frame stretches automatically (Step 3 rule); total may become 35–40s — acceptable.
- `/app/frontend/src` must not be touched: UI is a standalone HTML page, not a React route.

## Reuse for later modules (EM, IM, DC…)
Everything is manifest-driven: new module = new scripts.md + screens/ + regions.json. Zero code changes.
