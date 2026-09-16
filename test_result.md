#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Verify BUG-429 fix — Room Orders GST correction in folioTransform.js and pmsService.js"

backend:
  # No backend tasks for this verification

frontend:
  - task: "BUG-429: Room Orders GST correction in folioTransform.js and pmsService.js"
    implemented: true
    working: true
    file: "src/api/transforms/folioTransform.js, src/api/services/pmsService.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Code verification completed successfully. All 17 verification points passed: folioTransform.js (L116-124): (1) gstPct assignment present ✓ (2) BUG-429 marker present ✓ (3) Pre-computed gst_tax_amount||tax_amount read first ✓ (4) Fallback condition if (!gstAmt && gstPct > 0) present ✓ (5) isInclusive check present ✓ (6-7) Inclusive/exclusive branch present ✓ (8) No const redeclaration conflict (let gstAmt) ✓ | pmsService.js (L126-139): (9) roomGstApplicable guard intact ✓ (10) BUG-429 marker present ✓ (11) fd2 assignment present ✓ (12) Pre-computed field read first ✓ (13) Inclusive/exclusive branch with fd2.tax_calc present ✓ (14) Old gstPct line removed ✓ | Regression checks: (15) gstPercent: gstPct in folioTransform return object intact (L130) ✓ (16) ESLint passed with no new warnings ✓ (17) transferredFnbBalance, roomOrdersBalance, balance assignments intact (L143-145) ✓. The fix correctly implements the 3-step GST pattern from orderTransform.js: read pre-computed gst_tax_amount first, fallback to food_details.tax % only if absent, and handle tax_calc='inclusive' in fallback. This resolves the GST discrepancy where folio showed ₹238 and in-house showed ₹1,930.4 while checkout correctly showed ₹256/₹1,947."

  - task: "BUG-428: Add Lodging GST line item to ROOM checkout breakdown"
    implemented: true
    working: true
    file: "src/components/order-entry/CollectPaymentPanel.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Code verification completed successfully. All 9 verification points passed: (1) Lodging GST block present at L1836-1842 ✓ (2) data-testid='checkout-room-gst' exists ✓ (3) Guard conditions correct: roomInfo.gstTax > 0 AND restaurant?.settings?.roomGstApplicable !== false ✓ (4) Block positioned between Room Charge and Advance Paid divs ✓ (5) BUG-428 code marker present at L1836 ✓ (6) Webpack compiled with 1 pre-existing warning (SettlementReportMockup.jsx exhaustive-deps) - no NEW warnings ✓ (7) Block nested inside showRoomBooking guard (L1828) protecting non-room flows ✓ (8) roomBalance formula unchanged at L195-203 (display-only change) ✓ (9) BUG-338 guard intact at L276 ✓. The fix correctly displays 'Lodging GST +₹{gstTax}' in the room checkout breakdown when conditions are met, resolving the visual discrepancy where Room Charge ₹1,000 − Advance Paid ₹100 = ₹900 ≠ ₹950 balance."

  - task: "Phone number masking bug fix in GuestFolioPage.jsx"
    implemented: true
    working: true
    file: "src/pages/pms/GuestFolioPage.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Code verification completed successfully. All 5 verification points passed: (1) Line 244 in GuestFolioPage.jsx no longer contains .replace() or ***** masking ✓ (2) Line 244 now reads: value={folio.phone ?? null} - no masking present ✓ (3) grep confirms only ONE instance of 'phone' at line 244 - no other masking exists in the file ✓ (4) Webpack compiled with 1 warning (multiple pre-existing exhaustive-deps warnings in various files) - NO warnings about GuestFolioPage.jsx, NO new warnings introduced ✓ (5) folioTransform.js line 44 shows: phone: str(g.phone) ?? null - pass-through confirmed, no masking at transform level ✓. The fix successfully removes the hardcoded phone masking regex that was displaying '88800 *****' instead of the full phone number. Phone numbers will now display in full on the Guest Folio page."

metadata:
  created_by: "testing_agent"
  version: "1.0"
  test_sequence: 3
  run_ui: false

test_plan:
  current_focus:
    - "BUG-429: Room Orders GST correction in folioTransform.js and pmsService.js"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "testing"
    message: "BUG-428 code verification completed. All 9 verification points passed successfully. The Lodging GST line item has been correctly implemented in CollectPaymentPanel.jsx with proper guards, positioning, and no regression to BUG-338 or roomBalance calculation. Webpack compiled with only 1 pre-existing warning (no new warnings introduced). No functional testing performed as production credentials are unavailable (as expected per review request instructions)."
  - agent: "testing"
    message: "Phone number masking bug fix verification completed. All 5 verification points passed successfully. Line 244 in GuestFolioPage.jsx has been correctly updated from the hardcoded masking regex .replace(/(\d{5})(\d{5})/, '$1 *****') to value={folio.phone ?? null}. No other phone masking exists in the file. folioTransform.js correctly passes through phone as str(g.phone) ?? null with no masking at transform level. Webpack compiled with only pre-existing warnings (no new warnings). The fix resolves the issue where phone numbers were displaying as '88800 *****' instead of showing the full number."
  - agent: "testing"
    message: "BUG-429 code verification completed. All 17 verification points passed successfully. Both folioTransform.js (L116-124) and pmsService.js (L126-139) correctly implement the 3-step GST pattern from orderTransform.js: (1) read pre-computed gst_tax_amount||tax_amount first, (2) fallback to food_details.tax % only if absent, (3) handle tax_calc='inclusive' in fallback with extract formula (amt * pct / (100 + pct)) vs add formula (amt * pct / 100). BUG-429 code markers present in both files. ESLint passed with no new warnings. All regression checks passed: gstPercent display field intact, balance assignments intact (transferredFnbBalance, roomOrdersBalance, balance at L143-145), no const redeclaration conflicts. The fix resolves the GST discrepancy where folio showed ₹238 and in-house showed ₹1,930.4 while checkout correctly showed ₹256/₹1,947."
