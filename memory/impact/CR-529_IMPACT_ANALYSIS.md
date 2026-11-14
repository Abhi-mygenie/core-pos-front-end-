# CR-529 — OTP for All PIN Actions (Phase 2) — Impact Analysis (Gate 2) — 2026-11-14

Code Reality: NONE. Risk: CRITICAL. Phase 2 per owner — depends fully on CR-494 (PIN flow + hook points).
Analysis: reuses every CR-494 hook point; only the verify step changes (OTP send + verify instead of PIN). No separate FE surface.
Open: OD-529-A — OTP channel (SMS / WhatsApp / email) and who receives it (owner phone?). OPEN, not needed until CR-494 ships.
Backend asks: OTP send + verify endpoints (phase 2).
