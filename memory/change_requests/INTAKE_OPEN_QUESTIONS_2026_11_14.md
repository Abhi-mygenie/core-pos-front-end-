## CR-361
   | OD-361-01 | Should staff be able to override the room type (assign an "executive" booking to a "suite" room = upgrade)? | a) No — same type only · b) Yes with reason te
   | OD-361-02 | Who is authoritative when tape chart and status board disagree until backend fixes soft-allocation? | a) Tape chart (LR) · b) Board |
   | OD-361-03 | Show unassigned count badge on Front Desk (S1) as a nudge? | yes / no |
   | OD-361-04 | Auto-assign suggestion (first free room of type) — one-click? | yes / no (v2) |
## CR-367
   | OD-367-01 | Consent: capture opt-in at New Booking? OTA guests — rely on OTA consent? | opt-in field / assume |
   | OD-367-03 | Which triggers are on by default? | confirmation only / all |
   | OD-367-04 | Include self check-in link (requires S5 backend) or plain instructions in v1? | plain / wait for S5 |
   | OD-367-06 | Phone normalisation rule (10-digit → +91) — reuse BUG-092 decision? | yes / configurable country code |
## CR-375
   | OD-375-01 | Prefer Path A (backend extends `/delete-bulk`) or Path B (FE sequential loop using `deleteFood`)? | Path A — cleaner, atomic. Path B is a workaround with un
   | OD-375-02 | Should a warning be added on the delete confirm dialog for Aggregator items (e.g., "This will also remove the item from Swiggy/Zomato platforms")? | YES — A
## CR-381
   | **OD-381-01** | Route placement: standalone `/pms/laundry` page OR sub-tab inside CR-365 HK page `/pms/housekeeping`? | a) Standalone page (own sidebar child) · b) Sub-
   | **OD-381-02** | Process action permission: all staff or manager/owner only? | all POS users / owner+manager only |
   | **OD-381-03** | Should `process` action require selecting specific queue items, or always process all pending in one tap? | a) Select items (granular) · b) Process all 
## CR-376-FU-C
   | Open owner questions | OQ-C1: Per-restaurant default (same all stations) OR per-station server-side? OQ-C2: Local override trumps server default, or vice versa? OQ-C3: 
## BUG-469
   - OD-469-01: Is the employee ID stored per-agent or globally?
   - OD-469-02: Does the first agent's employee ID also reset, or only the second?
   - OD-469-03: Which localStorage key is being reset?
## BUG-474
   - OD-474-01: What Printer Agent version is installed? What version is it trying to update to?
   - OD-474-02: What error message appears during update?
   - OD-474-03: How many machines are affected?
## BUG-475
   - OD-475-01: Is this a restaurant-level setting (auto_settle_prepaid)? Was it recently changed?
   - OD-475-02: Which type of prepaid orders — aggregator (Swiggy/Zomato) or QR/online payment?
   - OD-475-03: Are the orders visible in the Audit/All Orders report after they disappear from dashboard?
   - OD-475-04: Is this a new behaviour or has it always happened?
## BUG-476
   - OD-476-01: What PA version was this on? Was Direct Print ever working before?
   - OD-476-02: Does the PA show any error in its logs?
   - OD-476-03: What printer model/protocol — USB, network, or Bluetooth?
   - OD-476-04: Was this on the same machine or a new setup?
## BUG-479
   - OD-479-01: Which PA version was this introduced in?
   - OD-479-02: Does the PA show an error or just return empty?
   - OD-479-03: Is the PA using a different API base URL for CRM after the update?
## CR-391
   - OD-391-01: Is veg/non-veg split for display only, or does it affect GST calculation?
   - OD-391-02: Which screen — Folio, PmsCheckoutDrawer, or Front Desk Bill tab?
   - OD-391-03: Is this required for specific restaurant types (e.g. Jain properties)?
   - OD-391-04: Does the backend already tag items as veg/non-veg, or does FE need to derive this?
## CR-394
   - OD-394-01: Should backward GST be the default for all open items, or a toggle per item?
   - OD-394-02: Does the backend already support `tax_calc: 'Inclusive'` for custom items?
   - OD-394-03: Which screen — AddCustomItemModal or a different entry point?
## CR-399
   - OD-399-01: Does Swiggy/Zomato API support item-level cancellation callbacks from POS?
   - OD-399-02: Should cancellation notify the customer automatically, or only update POS records?
   - OD-399-03: Can the whole aggregator order be cancelled, or only individual items?
   - OD-399-04: Is there a backend endpoint already for this (`cancel-aggregator-item`?)?
## CR-403
   - OD-403-01: Windows only, or also Mac/Linux?
   - OD-403-02: Should the shortcut be created in a specific location (Desktop, Taskbar, Start Menu)?
## CR-404
   - OD-404-01: What does the desired add-on group structure look like? (e.g. “Sauces”, “Extras”, “Sizes”)
   - OD-404-02: Does the backend already support add-on groups/categories?
   - OD-404-03: Should groups be shown in Order Entry customer-facing view, kitchen-facing, or both?
   - OD-404-04: Is this a backend schema change (add-on groups table) or purely FE display grouping?
   - OD-404-05: What screens are affected — Menu Management, Bulk Editor, Order Entry, KOT?
## CR-436
   - **OD-436-01:** What is the backend field name for the stock-disable flag? (needed for orderTransform / productTransform mapping)
   - **OD-436-02:** Real-time disable via socket update, or only on next full product refresh?
   - **OD-436-03:** Visual treatment — greyed out with "Out of Stock" label, or completely hidden?
   - **OD-436-04:** Does this apply to ingredients/sub-recipes too, or only to top-level menu items?
## CR-437
   - **OD-437-02:** Which screens consume each new key?
   - **OD-437-03:** What is "Menu Master"? Is it a separate API endpoint or a field in the restaurant profile settings?
## CR-438
   - **OD-438-01:** Does the backend handle the IRN generation and IRP API call, or does the FE need to trigger it?
   - **OD-438-02:** At what point in the flow is e-invoice submitted? On collect bill? On bill print? On manual trigger?
   - **OD-438-03:** What is shown to the user after successful submission (IRN number, QR code on bill)?
   - **OD-438-04:** Error handling — what if IRP submission fails? Can cashier proceed without IRN?
## CR-439
   - **OD-439-01:** Is the default screen preference stored per-employee on the backend (persists across devices) or FE-only (localStorage per device)?
   - **OD-439-02:** Which screens are eligible as default options? (Dashboard, Reports, Order Entry, KDS, PMS, etc.)
   - **OD-439-03:** Where is the preference set — in User Profile settings, or in a first-time setup wizard?
   - **OD-439-04:** Does the backend already return a `default_screen` field on the employee profile?
## CR-441
   - **OD-441-01:** What is the expected/target prep time? Is it per order, per restaurant config, or per item category?
   - **OD-441-02:** Visual format — linear progress bar, circular timer, elapsed-time countdown, or colour-coded age chip?
   - **OD-441-03:** Data source — does the backend send `prep_start_time` or is it derived from `createdAt`?
   - **OD-441-04:** Applies only to Preparing column (status view), or also to Channel View order cards?
## BUG-594
   - **OD-594-01:** Which page/screen should the kitchen view toggle appear on? (StatusConfigPage / Settings drawer / Dashboard header)
   - **OD-594-02:** What is the localStorage key name for the kitchen view setting?
## CR-443
   - OD-443-01: Where does the employee dashboard live? (Profile page section / dedicated Settings tab / modal on employee profile)
   - OD-443-02: Scope of notification types — just the 3 listed (cancellation, unpaid, payment change) or more?
   - OD-443-03: Is preference stored FE-only (localStorage per device) or backend (per employee account)?
   - OD-443-04: Should this gate the FCM subscription topic (don't subscribe to topic if pref=off) or just suppress the UI alert?
## BUG-605
   - OD-605-01: Which specific buttons — all action buttons or specific ones (Make Unpaid / Change Payment / Reprint)?
   - OD-605-02: Does clicking produce a visible error, silent fail, or no response?
## CR-444
   - OD-444-01: Exact metrics/columns — gross sales, discount breakdown by type, cancellation breakdown by type, net revenue?
   - OD-444-02: Date range granularity — daily rows, hourly, summary only?
   - OD-444-03: Discount types to include — role-based, coupon, complimentary, manual, promotional?
   - OD-444-04: Cancellation types — full cancel, partial, void, or by reason?
   - OD-444-05: Backend endpoint — new dedicated endpoint or can be derived from existing ORDER_REPORT_BETA_COMBINED?
## CR-445
   - OD-445-01: Where exactly does the button appear — in payment method selector, or as a top-level action button alongside "Collect"?
   - OD-445-02: Complimentary tracking — where is the counter shown? Dashboard tile, report page, or both?
   - OD-445-03: Is the button shown only when a 100% complimentary discount is configured, or always with a gate?
   - OD-445-04: Can a single order be partially complimentary (some items) or always full order?
## CR-446
   - OD-446-01: Which report types will be available via WhatsApp? (Owner said "will give options after intake")
   - OD-446-02: Pricing model — per-report per-month flat fee, or per-delivery (per send)?
   - OD-446-03: Payment method for the subscription — Razorpay, wallet, manual invoice?
   - OD-446-04: Who manages the subscription — restaurant owner only, or any admin?
   - OD-446-05: Email reports — are these the same report types as WhatsApp, or different?
   - OD-446-06: WhatsApp delivery — via existing WhatsApp integration (whatsapp_message flag) or new provider?
## CR-447
   - OD-447-01: What changes on FE? New Razorpay key, new SDK version, new payment flow?
   - OD-447-02: Is this a parallel run (test + live) or hard cutover?
   - OD-447-03: Which restaurants are in scope for the enterprise model?
   - OD-447-04: Backend timeline — when will the enterprise account be ready for UAT?
## BUG-607
   - OD-607-01: What exactly is broken — GST not showing per item in cart, wrong amount, or not sent in order payload?
   - OD-607-02: Which tax type(s) affected — GST only, or VAT too?
   - OD-607-03: Is this broken for all items or only specific item types (custom items, addons, packed food)?
   - OD-607-04: "New POS" — is this a specific new OrderEntry flow/branch or the standard POS?
## CR-492
   - **OD-492-01:** When `complementary_food` permission is absent, should the complementary toggle be HIDDEN or DISABLED (greyed out with tooltip)?
   - **OD-492-02:** Does the `complementary_food` permission key come from the same `permissions[]` array in login response, or is it a separate restaurant setting?
   - **OD-492-03:** Should the gating apply to BOTH item-level comp (CR-104 flow) AND order-level comp (CR-058 flow)?
## CR-493
   - **OD-493-01:** Should the reason be mandatory for BOTH order-level and item-level cancellations, or only order-level?
   - **OD-493-02:** Should the reason dropdown also allow a free-text "Other" option with a notes field?
   - **OD-493-03:** Is this related to BUG-440 (empty reasons dropdown)? Should BUG-440 be fixed as a prerequisite?
## CR-494
   - **OD-494-01:** What is the default minimum amount threshold? (e.g., Rs 500, Rs 1000?)
   - **OD-494-02:** Is the PIN a restaurant-level PIN (shared) or per-manager individual PINs?
   - **OD-494-03:** Should the PIN verification happen against the backend API, or is it a locally-stored settings value?
   - **OD-494-04:** Does this apply to item-level cancellations too, or only full order cancellations?
   - **OD-494-05:** BACKEND DEPENDENCY — Does a PIN verification endpoint exist? Does the threshold setting exist in restaurant settings?
## CR-495
   - **OD-495-01:** Which meal plans qualify for complementary? Only "Breakfast" or also "Half Board" / "Full Board"?
   - **OD-495-02:** Should the check be based on the `mealPlan` field from local-reservations API, or a simpler boolean from settings?
   - **OD-495-03:** For walk-in rooms (no booking via channel manager), how is meal plan determined?
   - **OD-495-04:** DEPENDS ON CR-492 (complementary_food permission) — should both gates apply (permission AND meal plan)?
## CR-496
   - **OD-496-01:** Should this be a SOCKET notification (real-time in POS) or FCM push notification (also reaches mobile)?
   - **OD-496-02:** Who receives the notification — all managers, the owner only, or configurable per employee (ties to CR-443)?
   - **OD-496-03:** BACKEND DEPENDENCY — Does the backend currently differentiate "after-serve cancel" from "before-serve cancel" in the API/socket event?
## CR-497
   - **OD-497-01:** Should this be a new page in the sidebar, or a summary card on the existing dashboard?
   - **OD-497-02:** What KPIs are mandatory for the daily summary? (Revenue, orders, cancellations, comp, payment split — anything else?)
   - **OD-497-03:** Should the weekly summary be a separate view or a toggle on the same page?
   - **OD-497-04:** Should it support date selection (view summary for any past day/week)?
   - **OD-497-05:** BACKEND DEPENDENCY — Is there a dedicated summary API, or should the FE aggregate from existing endpoints?
## CR-498
   - **OD-498-01:** Should recipe corrections be logged with a reason (similar to stock audit adjustments)?
   - **OD-498-02:** Should there be a "before vs after" comparison view, or just allow direct editing?
   - **OD-498-03:** Should corrections trigger retroactive stock adjustments for past orders?
   - **OD-498-04:** BACKEND DEPENDENCY — Does the backend support recipe versioning or change tracking?
## CR-499
   - **OD-499-01:** Should the audit be MANDATORY after every recipe correction, or optional (offered as a prompt)?
   - **OD-499-02:** Should the audit compare against the corrected recipe only, or also show the impact of the old (incorrect) recipe?
   - **OD-499-03:** Should discrepancies result in automatic stock adjustments, or require manual approval?
   - **OD-499-04:** BACKEND DEPENDENCY — Can the backend provide order history with ingredient breakdown for a given period?
## CR-503
   - **OD-503-01:** Should "Collect" open the same CollectPaymentPanel used in order-taking, or a simplified payment dialog?
   - **OD-503-02:** After collection, should the order move to the "Settled" tab automatically?
## CR-504
   - **OD-504-01:** Is section data available in the order API response, or does it need a separate API call to fetch table→section mapping?
   - **OD-504-02:** Should this filter be available on ALL tabs or only "All Orders" and specific tabs?
## CR-505
   - **OD-505-01:** For a ₹500 order paid ₹300 Cash + ₹200 UPI: does the "Cash" filter show this order (since it has a cash component), or only orders fully paid by cash?
   - **OD-505-02:** How should the Payment filter interact with partial orders — show all orders that have ANY of the selected payment mode, or only orders where that mode i
## CR-506
   - **OD-506-01:** Should the room list be populated from the orders in the current date range, or from all configured rooms?
   - **OD-506-02:** Should this filter appear only when room-service orders exist, or always?
## CR-507
   - **OD-507-01:** Should these columns appear on ALL tabs or only specific ones?
   - **OD-507-02:** Column position — after Type? After Waiter? Before Amount?
## CR-508
   - **OD-508-01:** Should this metric appear in the top summary cards (alongside Total Orders, Paid Orders) or only in the Grand Total footer?
   - **OD-508-02:** Should it split into Pre-Serve vs Post-Serve cancelled revenue, or just one total?
## CR-509
   - **OD-509-01:** Does the `get-single-order-new` endpoint (referenced in OrderDetailSheet L2) return all the fields needed (variations, add-ons, payment breakdown)?
   - **OD-509-02:** Does the `order-logs-report` endpoint return per-order activity history, or is it a different report format?
   - **OD-509-03:** Should Order Details and Activity Logs be separate tabs within the sheet, or separate buttons in Actions?
## CR-510
   - **OD-510-01:** Does the `get-single-order-new` API return variation/addon details for aggregator orders?
   - **OD-510-02:** Is BUG-601 a prerequisite — if variation/addon data is lost during ingestion, this CR can't display it?
## CR-511
   - **OD-511-01:** Does the API return aggregator-specific financial fields (platform commission, packaging charges, etc.)?
   - **OD-511-02:** Should platform commissions be shown at all, or only the customer-facing breakdown?
   - **OD-511-03:** For Swiggy vs Zomato, are the financial field names different (requiring separate transforms)?
## CR-514
   - OD-514-01: Which payment methods should show the field? (a) UPI + Card + Bank Transfer only (b) all methods including Cash (c) configurable per restaurant
   - OD-514-02: Is mandatory/optional controlled per-restaurant in settings or hardcoded?
   - OD-514-03: Backend confirmation needed — will `transaction_ref` be stored and returned in order APIs?
## CR-515
   - OD-515-01: Should these be new permission keys or reuse existing `reprint` / `collect_payment` rights already in the system?
   - OD-515-02: If no permission, should buttons be (a) hidden or (b) visible but disabled?
   - OD-515-03: Does backend need to deliver new module IDs in the permissions/settings API?
## BUG-674
   - OD-674-01: Should the notes field be "Additional Notes (Optional)" matching item-cancel, or mandatory (see CR-493)?
   - OD-674-02: Does the backend order-cancel endpoint already accept/store a `notes`/`cancellation_note` field?
## CR-516
   - OD-516-01: Where should the button appear? (a) On each room card on the PMS dashboard (b) In the header/toolbar as a global "New Check-In" button (c) Quick-access butto
   - OD-516-02: Does this require a new booking to exist, or should it allow walk-in check-in without a prior booking?
## CR-517
   - OD-517-01: Is this a new order type (Bulk/Catering) or an enhancement to existing order types?
   - OD-517-02: Where does the scheduled date picker appear?
   - OD-517-03: Is the advance amount a fixed value or a percentage of the total?
   - OD-517-04: Backend dependency — does backend support advance payment for POS orders?
   - OD-517-05: Does this integrate with the existing Credit system or is it a separate flow?
## CR-518
   - OD-518-01: Should Walk-In be a completely new column type, or a filter chip within the existing dashboard?
   - OD-518-02: Does the backend order_type already distinguish Walk-In from Dine-In, or does this need a new order_type value?
   - OD-518-03: Which order types map to "Walk-In" vs "Dine-In" from the backend `order_type` field?
## CR-519
   - OD-519-01: Does backend already have a separate `add-stock` / `stock-adjustment` endpoint distinct from `add-purchase`?
   - OD-519-02: Where should this appear in the UI — (a) a new button on the existing "Receive Inventory" page (b) a separate "Stock Adjustment" page (c) a toggle on the exi
   - OD-519-03: Should adjusted quantities appear in the purchase report or a separate adjustment log?
## BUG-668
   - OQ-668-01: Is this a FE issue (not pushing update), a Printer Agent issue (not fetching on change), or backend (not broadcasting)?
## CR-520
   - OD-520-01: Which CRM API endpoints support wallet config in the New CRM? (needs backend/CRM team input)
   - OD-520-02: What wallet operations are needed? (a) View balance only (b) Top-up (c) Full config (limits/rules/redemption)
   - OD-520-03: Is the wallet accessible from the POS UI, the CRM portal, or both?
## CR-521
   - OD-521-01: What specific effect is desired? (a) Pulse/glow animation on the border (b) Full background colour flash (c) A brief checkmark overlay (d) Owner to describe 
## CR-522
   - OD-522-01: What is the input format? (a) A free-entry % field (b) A dropdown with preset options like 1%/2%/3%/5%/10%
   - OD-522-02: Does the backend already support a `reconcile_tolerance_pct` setting, or is it hardcoded there too?
## CR-523
   - OD-523-01: Does the backend have a dedicated "link customer to order" endpoint separate from "update order"?
   - OD-523-02: Should the customer link be saved immediately (silent API call) or queued until next order action?
## CR-524
   - OD-524-01: Does the backend cancellation API return `created_at` (punch time) and `cancelled_at` (cancellation time) for each cancelled item?
   - OD-524-02: Should "Cancellation Duration" be shown as (a) HH:MM:SS (b) minutes only (c) human-readable (e.g. "3 mins 20 secs")?
## CR-525
   - OD-525-01: Should both KOT and Bill be replaced, or only the Bill button changes to "Collect Bill"?
   - OD-525-02: If order is edited after bill print (CR-489 allows with permission), should KOT/Bill reappear?
   - OD-525-03: "Collect Bill" button — should it open the full CPP panel directly or trigger the existing collect-bill flow?
## CR-526
   - OD-526-01: Should "remove" be role-gated (manager/owner only)?
   - OD-526-02: Should removed orders appear in a separate "Removed" tab or disappear entirely?
   - OD-526-03: Does the backend have a "void" or "remove" credit endpoint?
## CR-527
   - OD-527-01: Should this be a (a) filter chip showing "same phone, multiple names" or (b) a grouped view by phone number?
   - OD-527-02: Does the credit API return `phone` for all entries, or only for entries where a customer was explicitly linked?
## CR-528
   - OD-528-01: Does the backend track/store edit/cancel events after bill print, or does this need to be built from scratch?
   - OD-528-02: Should this be a standalone report page or a tab within Order Beta / All Orders report?
   - OD-528-03: Date range, restaurant filter, and export (PDF/Excel) needed?
## CR-529
   - OD-529-01: Is this a fixed 4-digit manager PIN (like CR-494) or a dynamic OTP (SMS/email)?
   - OD-529-02: Which of the three actions (cancel/discount/complementary) should be gated — all three, or configurable per restaurant?
   - OD-529-03: Should CR-494 and CR-529 be merged or implemented as separate but coordinated features?
## CR-530
   - OD-530-01: Inline quick-add (name + unit only) or full ingredient creation form?
   - OD-530-02: After creating, should the new ingredient be automatically selected in the recipe row?
## CR-531
   - OD-531-01: Does the ingredient API response include a `category` field for each ingredient?
   - OD-531-02: Show category as (a) "(Category)" suffix in ingredient name (b) a small badge/chip (c) grouped by category in the dropdown?
## CR-532
   - OD-532-01: Should GST audit be a **new tab** in Order Beta or a **toggle/column group** within the existing table?
   - OD-532-02: Line-item level GST breakdown, or order-level totals only?
   - OD-532-03: Export to Excel/PDF needed for the GST audit view?
   - OD-532-04: Does the backend `ORDER_REPORT_BETA_COMBINED` API already return `cgst`, `sgst`, `total_gst` per order?
## BUG-675
   - OD-675-01: Is this a deployment issue (fix not deployed) or a code issue (wrong file/conditional path missed)?
   - OD-675-02: Is the text appearing on the live preprod URL or only on the owner's local device?
## BUG-676
   - OD-676-01: Should the edit-order ringer use the same confirm_order sound, or a distinct "order updated" tone?
   - OD-676-02: Should the pop-up show the full confirmation flow (accept/reject) or just an informational alert (dismiss only)?
   - OD-676-03: Does the backend socket event for edit-order carry a distinguishable `type` or `event_name` field to detect it?
## CR-533
   - OD-533-01: Where exactly is the YTC section on the dashboard — is it a tab in the "YTC" column or a chip/filter on the header?
   - OD-533-02: Should minimised orders have a visual distinction in the YTC list (e.g. a "New - Pending Review" badge)?
   - OD-533-03: Should snoozed orders (existing snooze feature) also appear in the YTC tab, or only explicitly minimised ones?
## CR-534
   - OD-534-01: Which fields should be **mandatory** in the pop-up vs **shown when available**?
   - OD-534-02: Is the order amount / item list available in the socket payload at the time the pop-up appears, or only after a full order fetch?
   - OD-534-03: Preferred layout — compact single row per field, or a structured card with sections (customer section + order section)?
TOTAL 214
