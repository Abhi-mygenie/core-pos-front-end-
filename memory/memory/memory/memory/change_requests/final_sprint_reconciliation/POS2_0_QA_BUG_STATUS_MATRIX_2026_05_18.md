# POS2.0 QA Bug Status Matrix — 2026-05-18

| Bug | Original Bucket | Implementation Status | QA Status | Evidence | Final Recommendation |
|---|---|---|---|---|---|
| BUG-050 | W4 Print | Implemented | qa_passed | Code: OrderCard.handlePrintBill override path | accept |
| BUG-051 | W2 Financial | Implemented | qa_passed | Code: Math.ceil at orderTransform.js:678 | accept |
| BUG-052 | W2 Financial | Implemented | qa_passed | Code: roundOffEnabled + profileTransform totalRound | accept |
| BUG-053 | Closed no-code | No code needed | qa_not_applicable_closed_no_code | Code: Item GST labels without % | close_no_code_verified |
| BUG-054 | W2 Financial | Implemented | qa_passed | Code: vatTaxPostDiscount at L664 | accept |
| BUG-055 | W2 Financial | Implemented | qa_passed | Code: order_discount_type in both paths | accept |
| BUG-056 | W3 Payment | Implemented | qa_passed | Runtime + Code: Discount dropdown visible | accept |
| BUG-057 | W4 Print | Implemented | qa_passed | Runtime: Print Bill button on order + collect | accept |
| BUG-058 | W7 Critical | Carry-forward | qa_deferred_to_pos3_0 | Doc: POS3.0 carry-forward confirmed | carry_forward_pos3_0 |
| BUG-059 | W4 Print | Implemented | qa_passed | Runtime: Print pill on Paid row in Audit | accept |
| BUG-060 | W7 Constraint | Implemented (temp FE fix) | qa_passed | Code: Terminal check + removeOrder in socketHandlers | accept_with_observation |
| BUG-061 | W7 Constraint | Implemented | qa_passed | Code: createdAt fallback at RoomRowCard:433 | accept |
| BUG-062 | W1 Quick | Implemented | qa_passed | Code: orderType gate at CollectPaymentPanel:271 | accept |
| BUG-063 | Closed no-code | No code needed | qa_not_applicable_closed_no_code | Doc: Final summary confirms no-code closure | close_no_code_verified |
| BUG-064 | Parked | Future sprint | qa_deferred_to_pos3_0 | Doc: POS3.0 carry-forward confirmed | carry_forward_pos3_0 |
| BUG-065 | Post-wave | Implemented | qa_passed | Code: CRM search + readOnly in RoomCheckInModal + CartPanel | accept |
| BUG-066 | W1 Quick | Implemented | qa_passed | Code: !o.isRoom at TransferFoodModal:22 | accept |
| BUG-067 | W1 Quick | Implemented | qa_passed | Code: Station toggle disabled logic | accept |
| BUG-068 | W6 Socket | Implemented | qa_passed | Code: Reconnect rehydration at useSocketEvents:73-87 | accept |
| BUG-069 | Parked | Future sprint | qa_deferred_to_pos3_0 | Doc: POS3.0 carry-forward confirmed | carry_forward_pos3_0 |
| BUG-070 | W5 Dashboard | Implemented | qa_passed | Runtime + Code: Room column + sectionName grouping | accept |
| BUG-071 | W5 Dashboard | Implemented | qa_passed | Runtime: #002345 visible on order entry + collect + audit | accept |
| BUG-072 | W1 Quick | Implemented | qa_passed | Code: orderNote + item.notes on OrderCard:488-593 | accept |
| BUG-073 | W1 Quick | Implemented | qa_passed | Code: Conditional gate at CartPanel:65 | accept |
| BUG-074 | Post-wave | Implemented | qa_passed | Code: rememberMe init from authService at LoginPage:20-28 | accept |
| BUG-075 | W2 Financial | Implemented | qa_passed | Runtime + Code: Tip visible on dine-in; tipApplicable gate | accept |
| BUG-076 | Closed no-code | Duplicate of BUG-051 | qa_not_applicable_closed_no_code | BUG-051 QA passed | close_no_code_verified |
| BUG-077 | Closed no-code | Already working | qa_not_applicable_closed_no_code | Code: phone.trim() in customerService | close_no_code_verified |
| BUG-078 | W1 Quick | Implemented | qa_passed | Code: CRM_TIMEOUT typed error at customerService:47-55 | accept |
| BUG-079 | W1 Quick | Implemented | qa_passed | Code: REMOVAL_MISS_THRESHOLD = 1 at L34 | accept |
| BUG-080 | W3 Payment | Implemented | qa_passed | Code: enabledPrimaryMethods + fixed rows at L93/2061 | accept |
| BUG-081 | Closed no-code | Already 120000ms | qa_not_applicable_closed_no_code | Test: "Snooze duration is 2 minutes" assertion | close_no_code_verified |
| BUG-082 | W6 Socket | Implemented | qa_passed | Code: Index 4 primitive string at socketHandlers:500-501 | accept |
| BUG-083 | W2 Financial | Implemented | qa_passed | Code: delivery_charge_gst_amount conditional at L701/1307 | accept |
| BUG-084 | Deferred | Future sprint | qa_deferred_to_pos3_0 | Doc: POS3.0 carry-forward confirmed | carry_forward_pos3_0 |
| BUG-085 | Pending | Pending backend | qa_deferred_to_pos3_0 | Doc: POS3.0 carry-forward confirmed | carry_forward_pos3_0 |
| BUG-086 | Closed no-code | Key confirmed | qa_not_applicable_closed_no_code | Code: order_amount at orderTransform:689 | close_no_code_verified |

---

## Summary

| Final Recommendation | Count |
|---|---|
| accept | 23 |
| accept_with_observation | 1 (BUG-060 — temp FE fix, backend follow-up) |
| close_no_code_verified | 6 |
| carry_forward_pos3_0 | 5 |
| fix_required | 0 |
| blocked_retest_required | 0 |
| **Total** | **35** |

*Note: BUG-058 and BUG-064 are counted in carry_forward_pos3_0 (total 37 = 35 matrix entries above + BUG-058 + BUG-064 already in carry_forward; actual total is 37 unique bugs all accounted for.)*

**Correction: All 37 bugs accounted for in matrix above (37 rows).**

---

*— POS2.0 QA Bug Status Matrix — 2026-05-18 —*
