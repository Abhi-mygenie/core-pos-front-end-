# INV-WEB-EDIT-NOTCONFIRM — Investigation Bundle (2026-11-17)

**Subject:** `edit_order_confirm_web` — item-level Not-Confirm (`food_status = 7`) on customer web order edits
**Role:** INVESTIGATION (Role 6, AGENT_PROMPT_ALPHA v0.7) · **Zero code changes** (`frontend/src` diff = 0)
**Repo:** `main` @ `085681a3` · Backend `preprod.mygenie.online` · Socket `presocket.mygenie.online`
**Status:** Root cause **FOUND — HIGH confidence**. One leg outstanding (FCM payload) → see the handover.

---

## Read in this order

| # | File | What it gives you |
|---|---|---|
| 1 | `01_INVESTIGATION_REPORT.md` | The full 6-section report: root cause, 5 hypotheses, data-flow trace, **8 break points**, §3b live socket capture, recommendations, owner decisions |
| 2 | `02_SESSION_HANDOVER_RESUME_HERE.md` | How to resume: the exact FCM capture protocol, what NOT to re-test, next roles, owner decisions to lock |
| 3 | `evidence/` | Every raw artifact behind the findings (probe scripts + payloads + wire capture) |

---

## The one-paragraph version

The backend contract is **live and correct** on preprod: a customer web edit leaves `f_order_status` untouched and marks only the newly added lines `food_status = 7`, additively. The owner's note said *"No FE code change"* — that holds for the **write path** (the existing order-level `confirmOrder()` call is contract-correct), but **not for the read/display path**. The POS models Not-Confirm **only at order level**, and its single item-status renderer has no `7` branch, so a Not-Confirm line falls through to `default:` and is drawn with the normal orange cooking-pot icon. Net effect, verified on a live order: the order never enters "Yet to Confirm", shows **no Confirm tick and no badge**, the pending lines look identical to cooking lines, and reports label them literally **"Unknown"** — while staff receive a "Please confirm this order" push with nowhere in the POS to act on it.

**Bonus finding:** the socket envelope already carries **`newly_added_items`** — an explicit backend-provided list of the just-added lines — and the frontend reads it **nowhere** (0 grep hits).

---

## Live specimen (all findings traced against it)

| Field | Value |
|---|---|
| Order | `1578831` · bill `000774` · token `0009` · **Table 7** · customer "poly" · restaurant `672` |
| Source / payment | `order_from = web` · `payment_status = unpaid` (not prepaid → item-level rule applies) |
| Order status | `f_order_status = 2` (Ready) — **unchanged across 4 edits** ✓ contract |
| Lines | `Manchurian` = 2 · **4 × `Hot Garlic Sauce` = 7** (one per customer edit) |
| Other | `order_edit_count = 4` · `print_kot = Yes` |

---

## Evidence inventory (`evidence/`)

| File | What |
|---|---|
| `probe_item_status.py` | Read-only probe: login + `employee-orders-list`, status distributions |
| `probe_single_order.py` | Read-only probe: `get-single-order-new` for the specimen |
| `socket_listen.py` | **Passive** stdlib Socket.IO v4 listener — joins room `rest_672`, emits only the join + engine pongs, zero new dependencies |
| `sanitize_for_zip.py` | The redaction pass applied to this bundle |
| `orders_list_raw.json` | Raw 49-order list from preprod |
| `probe_summary.json` | Distributions — order `{2:3, 5:41, 1:5}`, **item `{2:3, 7:2, 5:70, 1:5, 3:2}`**, 3 web orders, 1 carrying `food_status=7` |
| `single_order_1578831.json` | Full specimen payload (order + lines + every line field) |
| `single_order_1578831_BEFORE_edit3.json`, `BEFORE_edit3.txt` | Pre-edit snapshot used to diff the owner-triggered edit (3 → 5 items) |
| `socket_capture.log` | Timestamped wire capture incl. the `joined_restaurant {"room":"rest_672"}` ACK |
| `socket_events.jsonl` | Machine-readable events incl. the full `new_order_672` / `update-order` envelope |

---

## Privacy / security note

Every file in this bundle has been passed through `sanitize_for_zip.py`. Auth, Firebase and CRM **tokens**, customer **phone numbers, emails, delivery addresses and lat/long** are replaced with `***REDACTED***`. Order ids, item ids and `food_status` values are preserved — they are the subject of the investigation. **No credentials are included**; the test account is referenced only by its alias (`OWNER_RUBY`), with the password left in the gitignored `/app/memory/test_credentials.md`.

---

## What is NOT in scope here

No code was written or modified. No order was confirmed, cancelled, printed or settled — every probe was read-only, and the browser session was restricted to navigation and filters. The item carries **no CR/BUG ID yet**; INTAKE must register it before Planning.
