# CR-383 — Daily Report: Room food orders excluded from Running Orders card

**ID:** CR-383  
**Registered:** 2026-09-15  
**Status:** GATE 1 — INTAKE COMPLETE  
**Type:** CR — Design gap  
**Priority:** P2  
**Risk:** LOW  
**Sprint:** pos_pms_1  

---

## What the issue is (plain English)

The "Running Orders" amber card on the Daily Report shows ₹0 on days where room food orders are actively open. In the probe (Sept 3), `running_order = ₹0` but `orderRoom = ₹16,888` — nearly ₹17k of room food orders were outstanding and not counted.

Room food orders appear separately in the "Room Orders → Pending checkout" sub-card lower on the page, so the data is not lost — just not in the top Running card.

## Root cause

The backend deliberately separates the two buckets:
- `running_order` = table/dine-in/QSR/delivery/takeaway open orders only
- `orderRoom` = food orders attached to room reservations (separate field)

This is a backend data classification decision. The FE faithfully reads both but only feeds `running_order` into the Running card.

## Code reality: NONE — no existing FE code combines them

## Duplicate check: DISTINCT

## Blast radius: SMALL (1-2 files)

## Open Decision

| OD | Question | Options |
|---|---|---|
| **OD-383-01** | Should the top "Running Orders" card total include room food orders as well? | **A)** YES — combine `running_order + orderRoom` in the Running card (one number, all active revenue) · **B)** NO — keep separate (room food stays only in the Room section below) |

**Gate 2 blocked on OD-383-01.**

*Intake written 2026-09-15 · INTAKE agent (ALPHA v0.7)*
