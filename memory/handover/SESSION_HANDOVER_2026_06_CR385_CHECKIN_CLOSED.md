# CR-385 — Check-In design CLOSED (v2.14) handover

## Status
- **Check-In design = CLOSED / LOCKED by owner (2026-06)** at mockup `frontend/public/cr385-frontdesk-mockup.html` **v2.14** (Check-In section). Owner verbatim: "…after that close the design for check in update docs and decision with all details." Recorded in DESIGN_DECISIONS **§J D31**.
- Treat Check-In like Checkout v2.9 — **do not edit without a new explicit owner request.**
- **Booking design = READY to begin next.** Owner closed Check-In but did NOT in that message explicitly authorize starting Booking. Per D20 §8–9, **ask for a Booking go-ahead before editing the New Booking screen.**
- Still PLANNING/design. This is screen-level closure only — NOT Hard Gate 2.6 closure, Gate 3 spike, Gate 4 GO, or production-code permission.
- **Multi-room check-in: ON HOLD by owner (2026-06)** — stays Phase 2 concept-only; do not design until owner resumes. Full open-items list + Phase-2 decisions in DESIGN_DECISIONS **§K**.

## What the closed Check-In (v2.14) contains
Checkout-mirrored two-column layout (details in §J / D21–D31):
- LEFT (scrolls): Completion Badge strip (IDs x/y · room state · Balance ₹N · green "Ready to check in" when fully ready) → compact 2-col booking facts (checkout time + late-arrival chip) → room assignment + paid/complimentary upgrades → collapsible per-guest ID cards (user toggle, auto-collapse when complete).
- RIGHT (short, NO internal scroll, Confirm always visible): room bill (SGST + CGST separate) → collect + Cash/Card/UPI pills (checkout style, Txn/UTR for Card/UPI) → remaining + readiness + Confirm.
- ID mandatory rules reuse existing check-in logic (front required, back optional, CRM doc exempts). Thumbnail + lightbox display only. Advance source label + OOO count. Multi-room = Phase 2 concept only. Deferred: early-check-in fee (later CR), welcome-slip (CR-364-PRINT).

## Verification (all PASS, frontend-only mockup QA)
iteration_4 (v2.12 F1–F4/G1–G7), iteration_6 (v2.14 layout/collapse/upgrade-live/lightbox/pills), iteration_7 (RIGHT no-scroll: right .ci-pane-body scrollHeight==clientHeight 392 across a2/a5/a1 + paid upgrade; Confirm bottom 733.5<800; SGST/CGST separate; badge), iteration_8 ("Ready to check in" pill green, appears only when ready, hidden in blocked modes). Checkout `?bill=107` ₹0 / `?bill=103` ₹2,677 regression unchanged; no JS errors; 1920×800 + 390×844 clean. Checkout v2.9, New Booking + other expansions, frontend/src, backend, .env, registry gates untouched.

## Review links (base URL from frontend/.env)
`?checkin=a2` (single), `?checkin=a5` (prepaid/CRM on file), `?checkin=a1` (late + special requests), `?checkin=a2&concept=multi` (Phase 2 concept), checkout regression `?bill=107` / `?bill=103`.

## Next-agent path
1. Confirm with the owner: proceed to the **New Booking** design review? (D20 §8–9.)
2. On go-ahead: set Booking = active; follow review → proposal → owner approval → mockup edit → verify → owner freeze, editing only the New Booking screen. Keep Check-In v2.14 and Checkout v2.9 LOCKED.
3. Remaining after full expansion design review: Hard Gate 2.6 closure, Q6 mechanism, BQ-385-07 brief, IA Rev 3.2 consolidation, Gate 3 spike/plan (separate owner approval). Parked backlog unchanged.
