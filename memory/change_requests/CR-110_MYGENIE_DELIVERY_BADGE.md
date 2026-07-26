# CR-110 — MyGenie Brand Badge for Own Delivery Orders

**ID:** CR-110
**Type:** CR (Feature)
**Created:** 2026-07-26
**Priority:** P2 — MEDIUM (visual consistency; own orders have no badge currently)
**Risk:** LOW (additive UI, no logic change)
**Module:** Dashboard — TableCard + OrderCard
**Duplicate Check:** DISTINCT. Related: CR-106 S/Z badge (same pattern).
**Source:** OWNER-REPORTED (this session)
**Confidence:** CONFIRMED — no MyGenie badge exists for own delivery orders
**Code Reality:** NONE

## Description

Owner requested: "in our delivery order we can have icon like Swiggy and Zomato for MyGenie."

Currently:
- Swiggy orders → orange "S" circle badge
- Zomato orders → red "Z" circle badge
- Own/POS delivery orders → generic bike icon, no brand badge

**Proposed:** Add a MyGenie-branded badge (e.g., green "M" circle matching MyGenie brand color, or the MyGenie bell icon) on own delivery orders in both TableCard and OrderCard, so staff can instantly distinguish:
- "S" = Swiggy (orange #FC8019)
- "Z" = Zomato (red #E23744)
- "M" = MyGenie (green #2E8B57 or MyGenie brand green)

## Open Questions — RESOLVED

| # | Question | Decision | Date |
|---|----------|----------|------|
| OQ-1 | Badge design: "M" letter circle or MyGenie bell logo mini-icon? | **MyGenie mascot icon** (green genie from `GENIE_LOGO_URL`). Mini circular `<img>` badge. | 2026-07-26 |
| OQ-2 | Badge color: MyGenie brand green (#2E8B57 / #4CAF50) or another color? | **N/A** — using actual logo image, not colored letter. | 2026-07-26 |
| OQ-3 | Should Web/Scan orders also get a distinct badge (e.g., "W" blue)? | **Deferred.** Only MyGenie own delivery for now. | 2026-07-26 |

## Blast Radius

SMALL — 2 files (`TableCard.jsx`, `OrderCard.jsx`), ~15 lines each. Same pattern as existing S/Z badge.
