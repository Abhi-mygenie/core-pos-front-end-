# HANDOVER — POS 4-Item Batch (CR-561, BUG-741, BUG-703, BUG-742) — 2026-11-20

**For:** next agent · **Stage reached:** Gate 3 complete (implementation plans written & pushed to `main`). **No application code has been changed yet.**
**Current gate:** all four at `GATE_3`. **Blocked on owner Gate-4 GO before any code is written.**

---

## Read these first
- Impact analyses: `memory/impact/{CR-561,BUG-741,BUG-703,BUG-742}_IMPACT_ANALYSIS.md`
- Implementation plans (exact edits + verification): `memory/plans/{CR-561,BUG-741,BUG-703,BUG-742}_IMPLEMENTATION_PLAN.md`
- Decisions + intake: `memory/change_requests/CR-561_*`, `BUG-741_*`, `BUG-742_*`
- Evidence (live read-only probes, PII masked): `memory/evidence/BUG-703/*`, `memory/evidence/BUG-742/*`
- Registry: `memory/control/registry.json` (all four at gate 3). **Code is source of truth — re-verify line numbers before editing.**
- Preprod login that works: `owner@thegoankitchen.com` / `Qplazm@10` (role "Owner"). `owner@thegoankicthen.com` is a typo and 401s.

---

## What each item is — in plain English

### BUG-703 — "Tapping an online-delivery order does nothing"
On the dashboard's column view, when you tap a Swiggy/Zomato (aggregator) order tile that's already accepted, it's supposed to pop open the order details. Right now **nothing happens** when you tap it. The pop-up and all its wiring already exist — the dashboard just forgot to hand the "open me" action down to the tiles in the current column layout (it was only wired into an older layout that's switched off). **Fix = pass that one action through three components.** Lowest-risk item.

### BUG-742 — "Hand-typed items don't print in the kitchen the first time"
When staff add a *custom item* (type a name + price themselves, not from the menu) and send the order, the **kitchen ticket doesn't print on the first send**. Reprinting works. Reason: the app forgets to tag the item with which kitchen it belongs to, so the printer router has nowhere to send it. The owner confirmed (and a live check proved) that **the backend already knows the kitchen** — it decides it from the item's category and sends it back as `station_name`. The app just isn't reading that field. **Fix = read one field (one line). No backend work.** It's low-effort but rated high-caution because it touches printing.

### BUG-741 — "The cancel pop-up is worded confusingly"
In the online-order pop-up there are two different "cancel" actions: one cancels a **single item**, one rejects the **whole order**. The single-item one is *worded* so it reads like it might cancel the entire order, which scares staff. The behaviour is correct and must stay the same — **we only change the wording/labels** so it clearly says "cancel this item". No logic, no backend.

### CR-561 — "Can't set the price of a ₹1 'ask-price-later' item from the accept pop-up or when editing a web order"
Some items come in priced at ₹1 as a "we'll set the real price at the counter" placeholder (APS). Today staff can only set the real price when first tapping the item in Order Entry — **not** from the online-order Accept pop-up, and **not** when they open an existing web order to edit it. The owner decided: (a) allow setting the price in **both** those places, (b) it's OK to accept the item still at ₹1, **but** the system must **force a real price before the final bill is printed**. This is the biggest/most careful item because that last part touches the billing screen (money).

---

## Order of work (decided)
**Track 1 — independent, do first (can run in parallel):** BUG-703, BUG-742.
**Track 2 — share the same file, do in order:** BUG-741 first, then CR-561 last (CR-561 also waits on open CR-547/552/558 touching `ScanOrderPopOut.jsx`).

## Decisions already locked
- BUG-742: severity **P1**, **full gate** (no shortcut), kitchen chosen **automatically** from category. Backend brief **withdrawn** (not needed).
- CR-561: price entry in **both** places; ₹1 accept allowed but **real price required before final bill**.
- BUG-741: keep per-item cancel behaviour; **wording only**.
- BUG-703: no decision needed.

## One dev-test still owed (BUG-742, not a blocker to planning)
When implementing, add a custom item on preprod and confirm the `add-single-product` response really contains `station_name`. Evidence says yes (products carry it); just confirm on the create call.

---

## GATE ASK — need owner Gate-4 GO to start coding
```
OWNER APPROVAL REQUIRED (Gate 4 — permission to implement)
Scope: CR-561, BUG-741, BUG-703, BUG-742 (plans on main, gate 3)
Risk: BUG-742 CRITICAL (printing, full gate); CR-561 HIGH (billing); BUG-703 MEDIUM; BUG-741 LOW
Proposed: implement Track 1 (BUG-703 + BUG-742) first, then Track 2 (BUG-741 -> CR-561)
No code will be written until the owner says GO.
```
**Question for the owner:** Do we have the GO to implement? And do you want it **all four together**, or **Track 1 first** (BUG-703 + BUG-742) and Track 2 after?
