# MyGenie POS — Intake Batch 2026-11-12
# 33 Items (32 intake docs — item 17 reuses existing CR-493 doc)
# Branch: nov_cr_batch | Registry total after: 1,090 items

#    ID        P   Type Area                           Title
--------------------------------------------------------------------------------------------------------------
1    CR-514    P1  CR   Payments / Credit              Transaction ID / Reference field on payment types
2    CR-515    P0  CR   Permissions                    Order Beta: staff rights for reprint + collect pay-later
3    BUG-674   P0  BUG  Order Entry                    Order-level cancel dialog — missing notes field
4    CR-516    P0  CR   PMS / Rooms                    Separate Check-In button on dashboard
5    CR-517    P1  CR   Payments / Credit              Advance payment for bulk / scheduled orders
6    CR-518    P1  CR   Order Entry                    Walk-In separate tab (like Takeaway / Delivery)
7    CR-519    P1  CR   Inventory                      Update stock without recording a purchase
8    BUG-667   P1  BUG  Other                          Sidebar restaurant name overflows to dashboard
9    BUG-668   P0  BUG  Printing                       UPI ID not reflecting until printer agent refresh
11   CR-520    P1  CR   CRM                            Wallet configuration in New CRM
12   BUG-669   P1  BUG  Order Entry                    Add-on creation forces a price — should be optional
14   CR-521    P1  CR   Order Entry                    Color effect after bill print — make more attractive
15   CR-522    P0  CR   Payments / Credit              Reconcile amount range — customizable per restaurant
16   CR-523    P0  CR   Order Entry                    Link customer to order after placing, without updating
17   CR-493    P0  CR   Order Entry                    Cancellation notes — mandatory [EXISTING, priority upgraded P0]
18   CR-524    P0  CR   Reports                        Cancellation report — punch time + duration columns
19   BUG-670   P0  BUG  Order Entry                    Item-cancel: missing notes field (dialog + report column)
20   CR-525    P1  CR   Order Entry                    After bill print — replace KOT/Bill with Collect Bill
21   CR-526    P0  CR   Payments / Credit              Credit Management — remove / void unpaid order
22   CR-527    P0  CR   Payments / Credit              Credit Management — filter: same phone, different names
23   CR-528    P1  CR   Reports                        Report for order edits / cancels after bill print
24   CR-529    P0  CR   Permissions                    PIN/OTP + role guard for cancel, discount, complementary
25   BUG-671   P0  BUG  Payments / Credit              Cannot mark partial-payment orders as unpaid
26   BUG-672   P0  BUG  Payments / Credit              Prepaid order — cannot move to credit
27   BUG-673   P0  BUG  Order Entry                    Keyboard nav: short-code auto-selects wrong item
28   CR-530    P1  CR   Inventory                      Recipe — create new ingredients inline
29   CR-531    P1  CR   Inventory                      Recipe — ingredients list show category
30   CR-532    P0  CR   Reports                        Order Beta — GST audit tab / view
31   BUG-675   P1  BUG  Reports                        BUG-629 fix not working — definition pending still showing
32   BUG-676   P1  BUG  Aggregator / Sockets           Scan order edit — no ringer, no popup for new items added
33   CR-533    P1  CR   Aggregator / Sockets           Scan order popup — minimize to YTC tab
34   CR-534    P2  CR   Aggregator / Sockets           Scan order popup — missing customer name, phone, info

## Duplicates NOT in this list (priority upgrades applied to existing items):
  Item 10 — CR-492 (Complementary role-based, P1→P0, existing doc preserved)

## Notes for intake agent on target branch:
  1. Check each ID against target branch registry.json before registering.
  2. If ID already exists: skip registration, apply priority upgrade only.
  3. If ID missing: register using the intake doc in this zip.
  4. CR-493 (item 17) is EXISTING — only upgrade priority to P0 if not already P0.
  5. All new items use sprint_key: nov_cr_batch.