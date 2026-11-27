# BACKEND_CONTRACT_REVIEW — BA-01/02/03/04/24 — 2026-11-16

## Status: ACCEPTED WITH FLAGS — 5 OUT-OF-CONTRACT ADDITIONS REQUIRE EXPLANATION

**Locked contracts:**
- `contracts/BATCH-A_BUG-670_API_CONTRACT_2026_11_15.md` (BA-01)
- `contracts/BATCH-A_BUG-674_API_CONTRACT_2026_11_15.md` (BA-02/03/04/24)

**Contract rules (owner R19/R20, 2026-11-15):** Names LOCKED. No renames. Additive only. Errors use HTTP 403/422 with `{ "error_code": "CODE", "message": "text" }`. Sign-off table must be filled before FE implements.

**Handoff doc:** `BUG-670_BUG-674_CANCELLATION_NOTES_FRONTEND_HANDOFF.md`

---

## PART A: What matched — ACCEPTED (5/5 BA items)

All 5 contracted items (BA-01, BA-02, BA-03, BA-04, BA-24) match the locked contract. Field names, types, locations, behaviours — all correct. No objection.

---

## PART B: What was NOT in the contract — EXPLANATION REQUIRED

The handoff contains 5 items that were never discussed, negotiated, or locked in the API contract. Per our contract rules, backend must not add behaviours or constraints without prior agreement.

**For each flag below, backend must answer: WHY was this added, and should the contract be amended to include it?**

---

### FLAG 1: Error response pattern for overlong `cancel_item_note`

**Contract says (BA-01):** `cancel_item_note`, string, max 255 chars, `""` allowed. No error specification for overlong input.

**Contract rule #5 says:** Errors use HTTP 422 with `{ "error_code": "CODE", "message": "text" }`.

**Handoff says:** "An overlong note is rejected before cancellation and may return `success: false` with a `message` in an HTTP 200 response."

**Problem:** HTTP 200 with `success: false` is NOT the contracted error pattern. Rule #5 says validation errors should be 422. Returning 200 with a failure body means FE can't rely on HTTP status codes — it must parse the body of every 200 to check if it's actually an error.

**Questions:**
1. Why was 200 + `success: false` chosen instead of 422 as per contract rule #5?
2. Is this a Laravel framework default, or a deliberate choice?
3. Will this be changed to 422 `{ "error_code": "CANCEL_NOTE_TOO_LONG", "message": "..." }`, or should FE plan for 200-body-check permanently?

---

### FLAG 2: Null vs empty string distinction on `cancel_item_note`

**Contract says (BA-01):** `cancel_item_note`, string, `""` allowed.

**Handoff says:** "Older clients may omit the key. An omitted note is returned as `null`; an explicit empty note is stored and returned as `""`."

**Problem:** The contract didn't specify a `null` vs `""` distinction. FE now needs to handle two empty states differently. This is a semantic addition.

**Questions:**
1. Is this a deliberate design (old clients → null, new clients → empty), or just how Laravel stores it (nullable column)?
2. Should FE treat `null` and `""` identically (both = "no note"), or is there a business reason to distinguish them?

---

### FLAG 3: Report GET routes return 405

**Contract says (BA-02):** Three endpoints return cancel fields. No method restriction specified.

**Handoff says:** "Both report GET requests returned HTTP 405 with POST as the only supported method. Keep using POST until the V1 and V2 route files and any route cache on preprod are updated."

**Problem:** The contract doesn't mention a method restriction. If GET is supposed to work but doesn't, that's a deployment issue. If GET is intentionally unsupported, the contract should say "POST only".

**Questions:**
1. Is GET supposed to work on these endpoints? If yes, when will the route cache be updated?
2. If GET is intentionally unsupported, can the contract be amended to state "POST only" so FE doesn't attempt GET in the future?

---

### FLAG 4: `order_details[]` array structure in combined report

**Contract says (BA-02):** Line-level fields `cancel_reason` and `cancel_item_note` returned on the combined report endpoint.

**Handoff says:** "Its new `order_details` array contains cancelled POS lines only and is empty when there are none."

**Problem:** The contract specified the field names but NOT the array structure. The fact that `order_details[]` is a NEW array (not existing), contains only cancelled lines, and is empty (not absent) when there are no cancellations — these are structural decisions that should have been in the contract.

**Questions:**
1. Is `order_details` a new array added by this delivery, or did it already exist in the response?
2. When there are no cancelled lines, does the array come as `[]` or is the key absent?
3. Does each `order_details` entry contain only `cancel_reason` + `cancel_item_note`, or are there other fields (food_name, qty, etc.)?

---

### FLAG 5: Quantity split note behaviour

**Contract says (BA-01):** `cancel_item_note` stored per cancelled line.

**Handoff says:** "A quantity split stores the note on the new cancelled row, not on the remaining active row."

**Problem:** The contract says "per cancelled line" but doesn't specify the quantity-split scenario. This is a useful clarification, but it's a behaviour rule that should be in the contract so both sides know the expectation.

**Question:**
1. Can this be added to the BA-01 contract as a behaviour note? No code change needed — just documentation parity.

---

## PART C: Sign-off table — STILL BLANK

The contract files require backend to fill the sign-off table before FE implements:

| ID | Contract file | Sign-off status |
|---|---|---|
| BA-01 | `BATCH-A_BUG-670_API_CONTRACT_2026_11_15.md` §4 | ❌ BLANK |
| BA-02 | `BATCH-A_BUG-674_API_CONTRACT_2026_11_15.md` §5 | ❌ BLANK |
| BA-03 | same §5 | ❌ BLANK |
| BA-04 | same §5 | ❌ BLANK |
| BA-24 | same §5 | ❌ BLANK |

**The handoff document serves as implicit sign-off, but per contract rule #6, the sign-off table must be filled explicitly.** Please confirm: should FE treat the handoff document as formal sign-off and fill the tables ourselves, or will backend fill them?

---

## PART D: What FE needs to proceed

1. **Answers to Flags 1-5** (or acknowledgment that these should be added to contract)
2. **Sign-off tables filled** (or confirmation that handoff = sign-off)
3. Once received → FE proceeds with BUG-670 B1 + BUG-674 B2/B3/B4/B7

---

**Sent by:** FE Planning Agent
**Contract authority:** Owner (R19/R20 rules)
**Next:** Backend answers → Owner amends contract if needed → FE Gate 4 GO
