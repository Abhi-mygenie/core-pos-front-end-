# Implementation Plan — BUG-572
## WhatsApp icon: add restaurant feature gate

**Role:** PLANNING (Gate 3) · **Date:** 2026-10-16
**Based on:** `impact/BUG-572_IMPACT_ANALYSIS_2026_10_16.md` (GATE_2_CLOSED)
**Code Reality:** PARTIAL · Risk: LOW · 2 files

---

## Scope Lock
**WILL change:** `profileTransform.js` (shared with CR-431) · `OrderCard.jsx:L137` (R5)
**WILL NOT touch:** buttons, layout, any other logic

---

## Step 0 — Entry Verification
```bash
sed -n '137p' src/components/cards/OrderCard.jsx
# Expected: const showWhatsAppPayment = ![3, 6, 10].includes(fOrderStatus);

grep -c "whatsappMessage" src/api/transforms/profileTransform.js
# Expected: 0

grep -c "BUG-572" src/components/cards/OrderCard.jsx
# Expected: 0
```

---

## Edit E-1 — `profileTransform.js`: add `whatsappMessage` field
**SHARED EDIT with CR-431** — apply both `whatsappMessage` + `eInvoice` in one search_replace.
See CR-431 plan for the combined edit string.

---

## Edit E-2 — `OrderCard.jsx:L137`: add restaurant gate

```jsx
// BEFORE:
  const showWhatsAppPayment = ![3, 6, 10].includes(fOrderStatus);

// AFTER:
  const showWhatsAppPayment = restaurant?.settings?.whatsappMessage && ![3, 6, 10].includes(fOrderStatus); // BUG-572: gate behind restaurant feature flag
```

---

## Execution
Execute in **Session 2** (together with CR-430 + BUG-574, all OrderCard.jsx R5 changes in one session).
E-1 (profileTransform) executes in **Session 1** alongside CR-431.

---

## Verification Matrix
| # | Check | Expected |
|---|---|---|
| V1 | `restaurant.settings.whatsappMessage` false → icon hidden | No WhatsApp button |
| V2 | `restaurant.settings.whatsappMessage` true → icon visible | WhatsApp button shows |
| V3 | fOs=3 (cancelled) with whatsappMessage:true → still hidden | Existing fOs gate still fires |
| V4 | Compile clean | 0 new warnings |

## Post-Code Checklist
```
- [ ] registry.json: BUG-572 → GATE_5A_IMPLEMENTED
- [ ] BUG_TRACKER.md updated
- [ ] FILE_OWNERSHIP.md: OrderCard.jsx + profileTransform.js
- [ ] Code markers: BUG-572 at L137 + profileTransform
- [ ] Compile: clean
```
