# Batch D (Dashboard, Order Entry & Order Cards): Gate 2 Impact Analysis Summary · 2026-11-15

Gate 2: **CLOSED 2026-11-15** (owner GO R1; owner Q&A R1-R6 logged in `change_requests/BATCH_D_OWNER_DECISIONS_2026_11_14.md`).
Probes: preprod, CAFE 103 (owner-approved, credentials session-only). Evidence: `evidence/BATCH-D-IA/probes_2026_11_15/`. Backend brief: `backend_briefs/BACKEND_BRIEF_BATCH-D_2026_11_15.md`.
Mockup: `mockups/CR-521_CURRENT_VS_PROPOSED_2026_11_15.html` · design decision `design/CR-521_ORANGE_SHADE_DECISION_2026_11_15.md`.

## Items
| Item | Title | Risk | Backend | Files (Gate 3 estimate) | Gate 3 status |
|---|---|---|---|---|---|
| BUG-667 | Long restaurant name: wrap to 2 lines (sidebar bottom + PMS headers) | LOW | No | Sidebar.jsx, FrontDeskPage.jsx, ReservationsPage.jsx, RoomStatusPage.jsx | READY |
| BUG-669 | Add-ons / variations at ₹0 | MEDIUM | No (probe: BE accepts 0) | AddonManagementPanel.jsx, ProductForm.jsx (+ optional VariationExpandPanel.jsx) | Add-on part READY. Variation part waits for the owner's repro steps |
| BUG-673 | Enter re-adds the default item after search | MEDIUM (R5 file) | No | OrderEntry.jsx (L119-121, L636-654, L761-803, L2075-2095) | READY |
| CR-525 | After print: Collect Bill (setting `order_edit_access` ON) | MED-HIGH | **Yes, BD-01..04 (release blocker)** | TableCard.jsx, OrderCard.jsx, DashboardPage.jsx (L1835 onBillClick) | Plan can start. **Release waits for BD-01** (OD-525-E) |
| CR-521 | Printed card bg → orange `#FFEDD5`, green border kept | LOW | Depends on BD-01 (colour reset after edit) | colors.js L18 (+ optional companion tweaks in both cards) | After CR-525, same agent. Release with CR-525 |
| CR-523 | Link customer without Update/Complete | MEDIUM (R5 file) | Optional BD-05..08 (remove = BD-06) | OrderEntry.jsx (L3149-3163, L2919), CartPanel.jsx | Save/change READY. Remove waits for BD-06 |

## Key probe results
- P1 (BUG-669): `add-addon` price 0 → 201. `add-food` + `foods/{id}` variation 0 → 200. The add-on block is the FE only (`AddonManagementPanel` L48 `!addForm.price`).
- P2 (CR-525/521): `bill_print` stays `Yes` after items are added post-print → backend reset required.
- P3 (CR-523): customer-only `update-place-order` (empty cart) works and can change the customer. An empty name doesn't unlink. `order_edit_count` +1 per call. The backend creates the customer record.

## Owner decisions (summary)
667: both places. 669: empty = blocked with a message, 0 allowed, no auto-fill. 673: empty search = no highlight; a mouse add clears the search and refocuses. 525: existing lock setting, every stage after print, rooms/prepaid/delivery excluded, wait for the backend. 521: `#FFEDD5`. 523: blocked when locked, no auto-reprint, customer only, remove allowed (backend). CR-376-FU-C stays P3 (not in Batch D).

## Sequencing / conflicts
- **Cards:** CR-525 → CR-521, one agent (TableCard/OrderCard also carry BUG-583/628/557, CR-512 at 5A).
- **OrderEntry.jsx:** BUG-673 → CR-523, one agent. They overlap with BUG-656 (L2919 customer lock, 5A), CR-512, BUG-662, Batch A CR-492/493/515 (Gate 3). Re-anchor at HEAD.
- **Menu:** BUG-669 vs BUG-608 (5A) on the same price inputs. Keep BUG-392/394/608 behaviour.
- **Sidebar.jsx:** BUG-570 / CR-435 (5A), different block.
- Batch C CR-528 (edits after bill print) is related to CR-525 / BD-01. Cross-check at Gate 3.

## Open (non-blocking for Gate 2 close)
1. BUG-669 variation ₹0: owner to report where it fails (Normal edit / Aggregator / Bulk Editor). The Aggregator endpoint was not probed.
2. BD-09: 2 probe customers on CAFE 103 (51320, 51321). The owner asked the team to delete them.
3. Side finding (BUG-673 doc): the Enter path opens the customization popup on a locked order (no `isEditLocked` pre-check). Report only.
4. Registry priority mismatch: CR_REGISTRY/BUG_TRACKER rows list BUG-667/669 and CR-521/525 as P1. The owner intake set P0 (registry.json P0). Synced to P0 here.

## Next
Gate 3 plan GO from the owner (per item or batch). Backend: send the brief to Gyan. CR-525/CR-521 release after the BD-01 reply.
