# BUG-417 — F&B Not Posting to Room Folio + Advance Shows ₹0
**ID:** BUG-417
**Date:** 2026-09-16
**Source:** OWNER-REPORTED (screenshots + live observation)
**Confidence:** REPORTED (unverified — needs live probe)

## Description
Two related symptoms on the Guest Folio page for order #000054 (aoi, r4):
1. **F&B not posting**: "No F&B orders posted to this room" — food transferred/posted to this room does not appear in `F&B Posted to Room` section
2. **Advance shows ₹0**: Folio shows `Advance Paid: ₹0` despite advance being collected at check-in (per owner)

## Classification
- **Type:** BUG
- **Severity:** P1 — HIGH (core room billing flow; F&B revenue not reflected in folio)
- **Risk:** HIGH (room billing, payment display)
- **Duplicate check:** RELATED to CR-163 (Move Food Items — transfers), INV-ROOM-001. DISTINCT symptom — folio API `associated_order_list` empty for this order.
- **Fast Lane:** NO

## Evidence
- Screenshot: ss1 (owner-provided, 2026-09-16) — folio for order 1232392 showing Advance ₹0, F&B ₹0
- Steps to reproduce: Open `/pms/folio/1232392` on live server → observe Advance Paid ₹0, F&B section empty
- Source: OWNER-REPORTED | Confidence: REPORTED

## Code Reality
GuestFolioPage.jsx reads `raw.associated_order_list` (folioTransform line 90) and `ri.advance_payment` (line 71) as pass-through. No FE logic gap identified — if backend returns empty, folio shows empty.

## Blast Radius
- Primary suspect: Backend API `POST /get-single-order-new` returning empty `associated_order_list`
- FE files potentially in scope: `GuestFolioPage.jsx`, `folioTransform.js`
- Estimated scope: SMALL (1–2 files) if FE gap found; BACKEND_BUG if API returns wrong data

## Owner Decisions Needed
- OD-417-01: Was any food actually transferred/posted to room r4 (order 1232392) on the live server? Please confirm.
- OD-417-02: Was advance actually collected at check-in for aoi? If yes, was it entered in the check-in form?

## Next
Gate 2 — Impact Analysis (after owner confirms OD-417-01/02)
