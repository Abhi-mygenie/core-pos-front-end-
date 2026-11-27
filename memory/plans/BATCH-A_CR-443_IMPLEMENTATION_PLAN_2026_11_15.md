# BATCH-A · CR-443 (+CR-496) (Leakage alerts) — Implementation Plan (Gate 3) — SKELETON — 2026-11-15

> Status: **GATE_3_SKELETON — NOT FROZEN**. Fill once Gyan replies to **BA-19..BA-22**.
> Risk: HIGH (FCM, permissions, localStorage). Mockup: M9 `#m9`.
> Decisions (locked): 7 events (cancel before serve, cancel after serve, unpaid, payment method changed, discount above ₹X, complimentary given, cancel after bill print) · content: order, item, table/room, who, reason · via existing Firebase token · a right decides who can receive · per-device switch on NEW sidebar link "Notifications" under Settings · phase 2: read tick + tap opens order.

## 1. Code reality — HEAD `b5d7a42` 2026-11-15 (Code Reality: NONE for these alerts)
NotificationContext.jsx handles FCM by `data.type` + sound · `components/layout/NotificationBanner.jsx` (type from title; TYPE_CONFIG colours) · `LoginPage.jsx` L54–83 → `authTransform.js` L52 `fcm_token` · `Sidebar.jsx`. Known: BUG-454 one token per employee.

## 2. Conflict pre-check
TBD when filling (Sidebar.jsx, NotificationContext, NotificationBanner).

## 3. Shared files (Batch A)
| File | Other Batch A CRs | Order |
|---|---|---|
| Sidebar.jsx / NotificationBanner.jsx / NotificationContext.jsx | none | last in Batch A (listens to events from all) |

## 4. Exact edits
TBD.

## 5. BLOCKED edits
| # | Needs | What will change |
|---|---|---|
| G5-B1 | **BA-19** | Event types → banner TYPE_CONFIG entries |
| G5-B2 | **BA-20** | Delivery confirmation (no FE change expected) |
| G5-B3 | **BA-21** | Receive-alerts right key → gate + Notifications link (M9) |
| G5-B4 | **BA-22** | Discount ₹X key (display only) |
| G5-B5 | — | Per-device switch = new localStorage key (owner approval needed per Alpha matrix) |

## 6–10
TBD after reply.

## 11. Mockup links
M9 → G5-B1/B3/B5.
