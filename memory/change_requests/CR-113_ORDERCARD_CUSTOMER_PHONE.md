# CR-113 — OrderCard Customer+Phone Section for Aggregator

**ID:** CR-113
**Type:** CR (Enhancement)
**Created:** 2026-07-27
**Priority:** P3 — LOW
**Status:** DEFERRED — Owner confirmed 2026-07-27: NOT CRM, pure aggregator data
**Related:** CR-106

## Description
Design mockup Section 3 shows `Customer: SWIGGY · +919999999992` as a dedicated row between items and rider. OrderCard has no such section for aggregator. Data available: `order.customerName`, `order.phone`.

**Confirmed:** Customer data comes from **UrbanPiper API** (`customer_details.name`, `customer_details.phone`), NOT from MyGenie CRM. Data is platform-masked by Swiggy/Zomato (e.g., "Vansh" = masked name, "+919999999992" = virtual number).

## Blast Radius
SMALL — 1 file (`OrderCard.jsx`), ~10 lines.
