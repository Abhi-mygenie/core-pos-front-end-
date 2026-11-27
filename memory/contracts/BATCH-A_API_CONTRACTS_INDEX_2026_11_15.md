# Batch A — FE ↔ Backend API Contracts — Index & Rules — 2026-11-15

> **SUPERSEDED 2026-11-15 (owner R21)** — rules, status and contract links now live in `backend_briefs/BACKEND_BRIEF_BATCH-A_2026_11_15.html` §0. The 8 contract files in this folder remain the locked source. Kept for history; not updated.

Owner R19 (2026-11-15): one contract per CR. Field names are **drafted by FE and LOCKED**.
**Owner R20 (2026-11-15): ALL 8 CONTRACTS APPROVED, including `cancel_source` and all new names. Status: APPROVED, ready to send to Gyan and Parth.**

## Contract rules (apply to every file in this folder)
1. **Names are fixed.** Backend implements endpoints, field names, types and enum values exactly as written. Backend may only answer: ✅ OK · ⏱ ETA · ❌ not feasible (with reason).
2. **No renames.** If a backend reply or handover file renames, retypes, drops or adds a field, or changes an enum, the reply is **REJECTED, not merged**. It goes back to the owner. Only the owner can change a contract (new version, new date).
3. `EXISTING` = already in the API today (from code or a probe); listed for completeness, no change. `NEW` = backend to add. `BEHAVIOUR` = rule change, no new field.
3a. **Existing keys are never renamed** (owner 2026-11-15). If backend already has a key for something marked NEW, it gives the exact existing name and FE uses it as is. A new key is added only when none exists, and then exactly as written here.
4. Additive only: existing requests and responses keep working (owner rule).
5. Errors use HTTP 403 (right or PIN) or 422 (validation), with JSON `{ "error_code": "<CODE>", "message": "<text>" }`. Codes are listed per contract.
6. Sign-off: backend fills the sign-off table at the bottom of each contract; FE checks it against the contract before Gate 4.

## Contracts
| CR | File | Backend IDs | Backend owner |
|---|---|---|---|
| BUG-674 | `BATCH-A_BUG-674_API_CONTRACT_2026_11_15.md` | BA-02, BA-03, BA-04, BA-24 | Gyan |
| BUG-670 | `BATCH-A_BUG-670_API_CONTRACT_2026_11_15.md` | BA-01 | Gyan |
| CR-493 | `BATCH-A_CR-493_API_CONTRACT_2026_11_15.md` | BA-05, BA-06, BA-23 | Gyan |
| CR-492 | `BATCH-A_CR-492_API_CONTRACT_2026_11_15.md` | BA-07, BA-08 | Gyan |
| CR-515 | `BATCH-A_CR-515_API_CONTRACT_2026_11_15.md` | BA-09 | Gyan |
| CR-494 | `BATCH-A_CR-494_API_CONTRACT_2026_11_15.md` | BA-11..BA-15 | Gyan |
| CR-495 | `BATCH-A_CR-495_API_CONTRACT_2026_11_15.md` | B-495-1..7 | Parth (cc Gyan) |
| CR-443 | `BATCH-A_CR-443_API_CONTRACT_2026_11_15.md` | BA-19..BA-22 | Gyan |

No contract: CR-372-B (no backend). P1, not in Batch A P0: CR-445 (BA-17/18), CR-529 (BA-16), BA-10.

## Shared values used across contracts
- Base paths as in `frontend/src/api/constants.js` (e.g. `/api/v2/vendoremployee/...`).
- Yes/No flags follow the existing API style: string `"Yes"` / `"No"`.
- Money: number, ₹, 2 decimals, **incl. tax** where a threshold is compared (OD-494-A).
- Business day = existing restaurant schedule / day-closure (backend confirms in reply).
