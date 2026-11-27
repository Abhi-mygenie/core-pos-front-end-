# Code-trace evidence — Accept (web/scan YTC) omits printer details
Captured: 2026-11-19 | Credentials used alias: poki@macha.com (masked) | No live orders created.

## A. ACCEPT (pop-up) path — NO printer_agent
1. `components/dashboard/ScanOrderPopOut.jsx:277` handleAcceptClick → `onAccept(entry || order)`
2. `pages/DashboardPage.jsx:1926` `onAccept={handleConfirmOrder}`
3. `pages/DashboardPage.jsx:1364-1377` handleConfirmOrder:
       await confirmOrder(order.orderId, permissions?.[0] || 'Manager', defaultOrderStatus);
   deps = [getOrderDataForEntry, permissions, defaultOrderStatus]  ← printerAgents NOT referenced
4. `api/services/orderService.js:70-74` confirmOrder:
       const payload = toAPI.updateOrderStatus(orderId, roleName, orderStatus);
       api.put(API_ENDPOINTS.CONFIRM_ORDER, payload);
5. `api/transforms/orderTransform.js:1842-1846` updateOrderStatus:
       ({ order_id, role_name, order_status })      ← NO printer_agent, NO print_kot, NO cart
6. Endpoint `api/constants.js:43` CONFIRM_ORDER =
       '/api/v2/vendoremployee/order/waiter-dinein-order-status-update'  (status-update route)

RESULT: accept payload = {order_id, role_name, order_status}. Printer details never sent.

## B. PLACE ORDER path — DOES send printer_agent (reference gating)
`api/transforms/orderTransform.js:1099-1102,1122,1165`
    const printerAgentForKot = printAllKOT
      ? selectAgentsForKot(printerAgents, cartStationsToSet(unplacedItems)) : [];
    const printerAgentForPlace = [...printerAgentForKot, ...selectAgentsForBill(printerAgents)];
    print_kot: printAllKOT ? 'Yes' : 'No',
    printer_agent: printerAgentForPlace,

## C. UPDATE ORDER path — DOES send printer_agent (same gating)
`api/transforms/orderTransform.js:1238-1240,1253,1296`
    const printerAgentForUpdate = printAllKOT
      ? selectAgentsForKot(printerAgents, cartStationsToSet(newItems)) : [];
    print_kot: printAllKOT ? 'Yes' : 'No',
    printer_agent: printerAgentForUpdate,

## D. The gating (identical for place & update)
printAllKOT flag → KOT agents via selectAgentsForKot(printerAgents, cartStationsToSet(items));
BILL agents appended unconditionally via selectAgentsForBill(printerAgents) (CR-130 / OD-3).
printerAgents source = useRestaurant().printerAgents (profileTransform) — available in DashboardPage
(already used at :1714,:1733,:1764 for cancel-item / cancel-order / KOT print) but NOT wired into confirm.

## E. Current design note
CR-545/547 added a SEPARATE manual "KOT" button in the pop-up (onPrintKOT → handleScanPrintKOT →
printOrder(..., printerAgents)) which DOES carry printer_agent. The Accept action itself does not.
