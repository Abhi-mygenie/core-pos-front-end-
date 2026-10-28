# CR-446 — WhatsApp / Email Report Subscription Module

**ID:** CR-446  **Type:** CR  **Registered:** 2026-10-22  **Sprint:** oct_cr_batch  
**Severity:** P2  **Risk:** HIGH  **Status:** GATE_1_INTAKE_COMPLETE  
**TT source:** TT-014

## Description
New module where restaurant users can choose which automated reports they want delivered via WhatsApp or Email. Each WhatsApp report type is charged individually (pricing TBD by owner after intake). Email delivery may be free. Owner will provide the list of available report options after intake.

## Owner input (verbatim)
"we need to make a module where user can choose which whatsapp report he needs and i will give options after intake and each report will be charged some money, same for email also email might be free"

## Evidence
- Source: OWNER-REPORTED via TT-014
- Confidence: CONFIRMED (full spec TBD after intake)
- Screenshot: not provided

## Duplicate check
DISTINCT. No WhatsApp report subscription/billing module exists in registry. CR-431 (e-Invoice download link in report) is unrelated. BUG-572 (whatsappMessage flag in profileTransform) maps a feature flag but has no subscription UI.

## Code Reality
NONE — no report subscription module exists.

## Blast radius
LARGE — new module: subscription settings page + billing/payment integration per report type + backend APIs for subscription + WhatsApp delivery. ~6–10 files.

## Open decisions (owner to answer — spec not yet defined)
- OD-446-01: Which report types will be available via WhatsApp? (Owner said "will give options after intake")
- OD-446-02: Pricing model — per-report per-month flat fee, or per-delivery (per send)?
- OD-446-03: Payment method for the subscription — Razorpay, wallet, manual invoice?
- OD-446-04: Who manages the subscription — restaurant owner only, or any admin?
- OD-446-05: Email reports — are these the same report types as WhatsApp, or different?
- OD-446-06: WhatsApp delivery — via existing WhatsApp integration (whatsapp_message flag) or new provider?

## Note
Gate 2 GO should only proceed after owner provides the report options list (OD-446-01). This is a LARGE scope item — phased delivery likely required.
