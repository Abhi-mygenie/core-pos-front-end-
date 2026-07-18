# SESSION HANDOVER — 2026-07-08 (BUG-168 print-path investigation + owner clarification)

**Session role sequence:** DEPLOYMENT → INVESTIGATION (BUG-168 print) → BUG FIX (BUG-168 v2 L1808) → INVESTIGATION (all 7 print paths + regression source) → **owner clarification received — investigation direction was WRONG**
**Closed by:** owner instruction to write handover and stop.

---

## 1. What actually shipped this session (code)

**One file changed:** `frontend/src/api/transforms/orderTransform.js` L1808-1826

**Fix (BUG-168 v2) applied:** replaced the prior 2026-07-08 patch (`+ (parseFloat(item.total_add_on_price) || 0)` — a no-op because backend doesn't emit that field) with:
```js
const addonPerUnit = (item.add_ons || []).reduce(
  (s, a) => s + ((parseFloat(a.price) || 0) * (parseFloat(a.quantity) || 1)),
  0
);
const lineTotal = (price * qty) + (addonPerUnit * qty);
```
Mirrors `CollectPaymentPanel.getItemLinePrice:212-224` verbatim.

**Verified working for pure-addon items via 2 live smokes:**
- Order #002384 (id 940279): pre=69, post=**219** ✅ matches backend `order_sub_total_amount=219`.
- Order #002386 (id 940281): live print payload emitted `order_item_total=292` ✅ matches backend `order_sub_total_amount=292`.

## 2. ⚠️ CRITICAL CLARIFICATION FROM OWNER (2026-07-08 late session)

**My investigation model was INVERTED. Correct it before continuing.**

I assumed:
- B3 / B4 / B5 (auto-print at Collect Bill using live-UI paymentData overrides) → **correct**
- B1 / B2 / B6 / B7 (dashboard/reports/card/order-entry "Print Bill" button — pure backend data) → **broken (fallback branch)**

**Owner says the opposite is true in production:**
- **Auto-print at Collect Bill (`auto bill`) → prints DIFFERENT / WRONG values**
- **Manual "Bill Print" from order screen or from card (dashboard/OrderCard/TableCard) → prints CORRECT values**

And critically: for the WRONG path (Collect Bill auto-print), owner points out that **all data comes from backend** — so the fix should NOT need FE math changes. My BUG-168 v2 fix was aimed at the fallback branch (where I thought the bug lived); the actual bug lives in a DIFFERENT path.

## 3. What to re-investigate next session (INVESTIGATION role)

**Question to answer:**
> For the SAME order, why does the payload emitted by
> - **Path X (Collect Bill auto-print)** = WRONG (per owner)
>
> differ from the payload emitted by
> - **Path Y (order-screen / card "Bill Print" button)** = CORRECT (per owner)
>
> — even though both eventually call `buildBillPrintPayload` and the source of truth is the same backend order?

**Concrete steps:**
1. **Capture BOTH payloads side-by-side for the same order:**
   - Ask owner to place one test order with addons + variations (e.g., pattern of #000334).
   - Then: print via **Collect Bill auto-print** → capture Network → `/order-temp-store` request body → save.
   - Then (do NOT collect again): print via **Order Card "Bill Print" button (B6)** or Order-Entry header "Re-Print" (B2) → capture same → save.
   - Diff the two JSON payloads at every field.
2. **Trace the divergent code path.** Focus on `overrides` shape:
   - Auto-print (B3/B4/B5) passes full `paymentData` overrides (`orderItemTotal`, `orderSubtotal`, `paymentAmount`, `gstTax`, `vatTax`, `serviceChargeAmount`, `discountAmount`, `tip`, `deliveryCharge`).
   - Manual print (B2/B6/B7) passes only `scGstPct` / `delGstPct` — everything else falls through to `order.subtotalAmount` (backend-hydrated).
   - Under owner's report, the OVERRIDE branch is producing wrong values and the fallback is producing right values. Reverse of my assumption.
3. **Where does `paymentData` come from in Collect Bill auto-print?**
   - Trace `OrderEntry.jsx:1377 / 1415 / 1487 / 1782 / 1886 / 2180` — how `paymentData` is populated.
   - Suspect: `paymentData.itemTotal` comes from live-UI computation (`CollectPaymentPanel.getItemLinePrice`, `itemTotal` reducer). Owner says that computation is somehow WRONG for their case — check whether it reads from `cart[]` items with stale/incorrect `price/addOns/variation` shape.
   - Alt suspect: `paymentData.itemTotal` might be OK but a DIFFERENT override field (e.g., `orderSubtotal` or `paymentAmount`) is wrong and dominates the printed footer.
4. **Verify manual "Bill Print" is truly right for #000334.** The receipt owner shared for #000334 shows Item Total 360 vs backend 368 (off by ₹8 variation upcharge). Need clarification: was that receipt printed via Collect Bill auto-print or via Bill Print button? Answer determines whether variation-upcharge miss is a fallback-branch bug (path B2/B6/B7) or override-branch bug (path B3/B4/B5).

## 4. What NOT to do next session

- Do NOT apply any more fixes at `orderTransform.js:1808` (the current BUG-168 v2 fix stays for now — it's confirmed working for the ADDON case on B2/B6/B7 paths).
- Do NOT extend the fix to variation upcharge yet — the variation-upcharge miss was identified but owner is asking us to first reconfirm which path is truly wrong.
- Do NOT close BUG-168 in registry yet — bumping to `IMPLEMENTED (v2) — OWNER DISPUTES SCOPE — AWAITING PATH-DIVERGENCE INVESTIGATION`.

## 5. State of registry & docs at session close

| Doc | Update at close |
|---|---|
| `registry.json` BUG-168 | Status downgraded to `IMPLEMENTED (v2) — OWNER DISPUTES SCOPE — INVESTIGATION REOPENED`; added `owner_clarification` field describing path-divergence issue. |
| `BUG_TRACKER.md` BUG-168 row | Same downgrade + owner clarification note. |
| `FILE_OWNERSHIP.md` | L1808-1826 entry stays (fix is in place); no removal. |
| BUG-169 (subtotal double-SC) | Filed as intake candidate — see §6 below, NOT yet in registry. |
| BUG-170 (variation upcharge miss in fallback loop) | Filed as intake candidate — see §6 below, NOT yet in registry. |

## 6. Intake candidates opened (owner to approve before working on them)

**BUG-169 (candidate) — "Double-SC in `finalOrderSubtotal` fallback (uses `subtotalBeforeTax` which already contains SC)"**
- Discovered during smoke on order #002386.
- File: `orderTransform.js:1932`.
- Symptom: `order_subtotal` field on printed payload = item_total + SC × 2 (350.40 for #002386 instead of 321.20).
- Suggested fix: drop `order.subtotalBeforeTax` from the itemBase fallback chain OR skip adding SC when subtotalBeforeTax is used.
- Note: this is fallback-branch — owner's "auto-print vs manual print" divergence may reframe whether this is the true bug or a red herring.

**BUG-170 (candidate) — "Variation upcharge (`item.variation[].values[].optionPrice`) missing from fallback subtotal loop"**
- Discovered on order #000334 receipt.
- File: `orderTransform.js:1808-1826`.
- Symptom: item_total off by variation upcharge × qty (₹8 for #000334 Samosa).
- Suggested fix: extend the addon-reduce with a variation-reduce over `item.variation[].values[].optionPrice`.
- Note: same caveat — pending owner's path-divergence investigation.

**BUG-171 (candidate) — "Receipt Total ≠ Item Total + CGST + SGST + VAT" (order #000334)**
- Symptom: 360 + 9 + 9 + 57.20 = 435.20, but receipt prints Total: 445 (₹9.80 gap).
- Possibly a printer-template concern or an extra rounding rule; not necessarily FE.
- Deferred.

## 7. Evidence + artifacts trail

```
/app/memory/evidence/BUG-168/
├── order_940279.json                  ← live GET for #002384 (curl 2026-07-08)
├── order_940281.json                  ← live GET for #002386 (curl 2026-07-08)
├── order_940284.json                  ← live GET for #000334 (curl 2026-07-08)
├── simulate_all_print_paths.py        ← 7-caller simulator (re-runnable)
└── INVESTIGATION_REPORT.md            ← full RCA (needs update per owner clarification)

/app/memory/handover/
├── BUG_168_V2_BUG_FIX_REPORT_2026-07-08.md  ← fix report (still valid for addon case)
└── SESSION_HANDOVER_2026_07_08_BUG168_PRINT_INVESTIGATION.md  ← THIS FILE
```

## 8. Environment at session close

- Frontend supervisor: **RUNNING** on port 3000 (webpack compiled clean; 0 new lint warnings from my edit)
- Preprod backend: `https://preprod.mygenie.online` — reachable, tokens valid at close time
- Test credentials (still valid, see `/app/memory/control/test_credentials.md` — not updated this session because no NEW credentials created):
  - `owner@18march.com` / Qplazm@10 → 18March tenant
  - `Manager@hogwarts.com` / Qplazm@10 → Hogwarts tenant (rest 618)
- Manager role calls need `?role_name=Manager` query param on `/pos/employee-orders-list` — undocumented; captured here for next session.

## 9. Alpha v0.7 EXIT GATE self-check for this session

- [x] Handover doc created (this file).
- [x] Registry drift avoided — BUG-168 status set to disputed rather than closed.
- [x] No code left in a broken state — fix is applied, verified for its correct scope (addon case), and defensible.
- [x] Owner clarification captured verbatim in §2 (do not paraphrase further).
- [x] Next-session ask is a single crisp question (§3 heading).
- [x] Frozen hotspot rule respected — only the one line block was changed; every downstream doc names the exact line range.

---

**HANDOVER LINE FOR NEXT AGENT:**
Alpha v0.7 SESSION HANDOVER. Read §2 first — owner reversed the direction of the print-path investigation. Do NOT extend the BUG-168 fix or work on BUG-170/BUG-171 candidates until §3's path-divergence question is answered (need owner to place a test order and share BOTH Collect-Bill auto-print and Bill-Print-button payloads side-by-side).
