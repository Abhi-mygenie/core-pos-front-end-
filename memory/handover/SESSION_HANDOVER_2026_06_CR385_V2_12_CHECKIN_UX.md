# CR-385 — v2.12 Check-In UX-priority feedback (D21–D27) handover

## Role, gate, approval
PLANNING, Gate 2.6 OPEN. Checkout v2.9 settled/untouched. **Check-In review still OPEN; final owner sign-off NOT received. Booking BLOCKED until explicit Check-In closure + Booking authorization (D20).** Multi-room stays Phase 2 concept.

Owner set **user experience as the priority**, then accepted the UX-first recommendations: **"f1 ok … f4 ok, ok with recommendations for gaps, please update docs and decisions."** Via ask_human owner chose: implement F1–F4 into the mockup as **v2.12** now (not docs-only), and for **F1 reuse the existing check-in document/ID mandatory logic — thumbnail + lightbox is display only, no new rule invented.**

Accepting D21–D27 and any v2.12 QA PASS is **NOT** Check-In closure. D20 protocol (DESIGN_DECISIONS §H) still governs.

## What changed (v2.11 → v2.12)
Only executable file: `frontend/public/cr385-frontdesk-mockup.html`, Check-In section + its CSS/helpers. See DESIGN_DECISIONS §I D21–D27.

- **D21 (F4 + G1):** LEFT booking facts compacted to **4 dense rows** (Guest · Booking · Stay · Guests), empty fields hidden, CRM ✓ badge, special-requests chip only when present, **checkout time "out 11:00"** and a **Late arrival chip** when actual < booked.
- **D22 (F1 + G2 + G7):** per-guest ID front/back now render as **inline thumbnails**; tap opens a **lightbox** (Retake/Remove/Close). Mandatory logic **reuses existing code** (front required when property toggle ON, CRM doc exempts; **back optional for all types** — the "Aadhaar back mandatory" idea is dropped). On-file CRM docs show **source/date/validity** metadata (sample).
- **D23 (F2):** **"Show higher categories (upgrade)"** toggle in the room picker; picking a higher category reveals **Paid / Complimentary**. Paid adds a **"Room upgrade" bill line** (delta/night × nights) with live GST/balance; Complimentary requires **reason + manager authorization**, no charge. No auto-upgrade, no downgrade. Sample rate ladder Deluxe 2200 / Executive 3300 / Suite 4500.
- **D24 (F3):** Method dropdown → **Cash / Card / UPI pills**; disabled at ₹0; non-zero requires explicit pick (no Cash default); **Card/UPI require Txn/UTR**, Cash optional note. Method set mirrors existing advance flow; "Other"/Credit intentionally not added.
- **D25 (G3):** advance/prepaid labelled with source ("Advance · Direct" / "Advance · OTA (…)").
- **D26 (G4):** OOO shown as a **count** in the availability line.
- **D27 (G5/G6):** deferred — early check-in fee → later CR; welcome-slip → CR-364-PRINT.

Everything MOCKED: no files/uploads/auth/network/financial changes. Checkout renderer/CSS/submit, New Booking + other expansions, `src/`, backend, `.env`, registry gates unchanged.

## Review links (read base URL from frontend/.env each session)
- Single room: `/cr385-frontdesk-mockup.html?checkin=a2` — V. Rao, 2 adults, Deluxe, charge 2200, tax 110, advance 500 (Direct), balance 1810.
- Prepaid / CRM on file: `?checkin=a5` — additional adult still needs name + front; primary shows on-file thumbnail with CRM metadata.
- Late multi-night: `?checkin=a1` — Late arrival chip.
- Multi-room concept: `?checkin=a2&concept=multi` (Phase 2, non-submittable).
- Checkout regression: `?bill=107` total 0; `?bill=103` = 2677.

## Key data-testids added in v2.12
`checkin-crm-badge`, `checkin-arrival-chip`, `checkin-payment-methods`, `checkin-pay-cash|card|upi`, `checkin-method-hint`, `checkin-upgrade-toggle`, `checkin-upgrade-panel`, `checkin-upgrade-paid`, `checkin-upgrade-comp`, `checkin-upgrade-reason`, `checkin-upgrade-mgr`, `checkin-upgrade-charge`, `checkin-upgrade-note`, `checkin-id-lightbox`, `checkin-id-lightbox-image`, `ci-lightbox-caption|retake|remove|close`, `checkin-id-meta-front|back-N`. Retained: `checkin-readonly-summary`, `checkin-guest-name/phone/email/booking-details/rooms-booked/booked-stay/actual-arrival/guest-count/billing-to/special-requests`, `checkin-id-front|back-N`, `checkin-already-paid`, `checkin-availability-count`, etc.

## Verification
Frontend-only mockup QA — see `/app/test_reports/iteration_*.json` for this pass. Panel renders fully (no fatal JS). Confirm: 4-row facts + checkout time + late chip; ID thumbnail→lightbox capture/retake/remove; upgrade toggle → paid bill line + live total, complimentary → reason+manager gating; pills disabled at ₹0, Card/UPI require Txn/UTR; G3 source label; G4 OOO count; a2/a5/a1 states; checkout 103/107 regression. NOT production QA or owner Check-In sign-off.

## Next-agent path
Same D20 walkthrough (DESIGN_DECISIONS §H) now on **v2.12**. Collect feedback area-by-area, propose→approve→edit→verify, then ask the explicit closure question:
> "Do you explicitly close this Check-In design and authorize us to start the Booking design review?"
Only an unambiguous statement (e.g. "Check-In design closed — proceed to Booking") closes it; record quote/date/version. Then Booking → remaining expansion queue. Gate 2.6/Q6/BQ-385-07/IA Rev 3.2/Gate 3 spike/Gate 4 GO and parked backlog unchanged.
