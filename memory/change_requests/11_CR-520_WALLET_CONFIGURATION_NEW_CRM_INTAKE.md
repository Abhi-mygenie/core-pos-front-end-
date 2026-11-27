# CR-520 — Wallet Configuration in New CRM

**Registered:** 2026-11-12
**Type:** CR
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE

---

## 1. Description

The transition to the New CRM has broken the existing wallet module. Wallet configuration (top-up settings, wallet balance management, redemption rules) is no longer accessible or functioning because it was part of the old CRM integration which is no longer active.

**Current behaviour:** Old wallet module is not working with New CRM. Wallet configuration and operations are unavailable or broken.

**Expected behaviour:** Wallet configuration and all wallet operations (configure wallet, view/edit customer wallet balances, top-up rules, redemption settings) are fully accessible through the New CRM integration.

---

## 2. Classification

- **Type:** CR
- **Severity:** P1 — High (wallet operations unavailable; affects customer loyalty and payments)
- **Risk:** CRITICAL — touches CRM integration, payment flow (wallet as payment method), customer data
- **Area:** CRM / Customer Intelligence
- **Fast Lane:** NOT eligible (CRM integration, financial, customer data)

---

## 3. Duplicate Check

- Searched: "wallet crm", "crm wallet", "wallet configuration" in registry.json
- CR-425 (Wallet Recharge — GATE_1_INTAKE) — RELATED (same wallet feature area)
- **Result: RELATED CR-425** (CR-425 is about wallet recharge UI; CR-520 is about full wallet config in New CRM)

---

## 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** CONFIRMED (owner stated old module not functioning due to New CRM transition)

---

## 5. Blast Radius

- CRM service layer — wallet config API endpoints
- Wallet UI components (wherever they currently live)
- `CollectPaymentPanel.jsx` (R5) — if wallet is a payment method
- Backend/CRM: New CRM API endpoints for wallet management (significant dependency)
- **Estimated scope:** LARGE (backend dependency, multiple UI components)

---

## 6. Open Questions

- OD-520-01: Which CRM API endpoints support wallet config in the New CRM? (needs backend/CRM team input)
- OD-520-02: What wallet operations are needed? (a) View balance only (b) Top-up (c) Full config (limits/rules/redemption)
- OD-520-03: Is the wallet accessible from the POS UI, the CRM portal, or both?

---

## 7. Code Reality

- **Status:** PARTIAL — old wallet module exists but broken with New CRM

---

## 8. Related

- CR-425 (Wallet Recharge — GATE_1_INTAKE, RELATED)
- CR-427 (Move Loyalty/Coupon/E-Invoice config from CRM to POS)
- CRM integration layer
