# BUG-448 — Front Desk (Beta) Bill: Credit/TAB Checkout stays disabled (TAB name/phone not prefilled) — INTAKE 2026-09-22
Source: CR-385 P4 QA Session A (`test_reports/iteration_23.json`, QA severity **MAJOR**, origin **P4** — M6 host prop mapping). Sandbox: r1 stay "QA P4 A", room-only bill ₹35,670.
## Symptom
Select the **Credit/TAB** tile → press **Checkout** → nothing happens (no `order-bill-payment` POST, no error). **Cash** on the same bill posts 200 immediately.
## RCA (code-traced)
`CollectPaymentPanel.jsx` L422–423 prefill the TAB block from `customer?.name` / `customer?.phone`; L3308 disables Checkout for TAB while `!tabName.trim() || phone.length !== 10`. The host `FolioCheckoutPanel` passes `buildCustomer(order)` copied from the drawer = `{ customerName, phone, email }` — **no `name` key** and the folio `user.phone` is often empty → TAB name empty → **Checkout disabled** (the QA clicked a disabled button). Same latent behaviour in the legacy drawer (`PmsCheckoutDrawer.jsx` L268), where staff type the TAB name/phone by hand. **D47-c** requires Front Desk Credit=TAB to bill "the guest's TAB using the name + phone already on the booking" — the host must prefill them from the LR row.
## Fix (Phase 4.5, host-side only — no panel edit, R15)
`FolioCheckoutPanel.jsx`: `customer={{ ...buildCustomer(order), name: row.guestName || order.customerName, phone: (row.phone || order.phone || '').replace(/\D/g, '').slice(-10) }}` (`// CR-385 BUG-448`). Unit test: stub asserts `customer.name === row.guestName` and 10-digit `customer.phone`; live re-test: TAB → Checkout enabled → POST 200 (`payment_mode: TAB`), toast, row gone. Deviation vs D47-c (block visible but prefilled, not hidden) → note only (hiding it would need a panel edit).
## Routing
Phase 4.5 (§0-bis) — waits for owner "Phase 4.5 GO". Not a money defect (no wrong figures; Cash path correct).
