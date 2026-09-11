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

user_problem_statement: |
  QA Testing for MyGenie POS preprod environment (pos_7_0)
  Execute 5 batches of QA tests covering:
  - BATCH QA-1: BUG-390, CR-373, BUG-392, CR-374 (18 tests)
  - BATCH QA-2: BUG-391 (4 tests)
  - BATCH QA-3: BUG-394 (13 tests)
  - BATCH QA-4: BUG-395 (3 tests)
  - BATCH QA-5: CR-377 (7 tests)
  Total: 45 tests

frontend:
  - task: "Authentication - Login Flow"
    implemented: true
    working: false
    file: "preprod environment"
    stuck_count: 1
    priority: "high"
    needs_retesting: true
    status_history:
      - working: false
        agent: "testing"
        comment: |
          BLOCKER: Cannot login to preprod environment with provided credentials.
          Attempted login with:
          - Email: owner@cafe103.com
          - Password: Qplazm@10
          - Role: Restaurant
          
          Error received: "Error: 0 - Credentials does not match"
          
          This blocks ALL testing as no access to the application is possible.
          Screenshots captured: dashboard_cafe103.png shows login error.
          
          Possible causes:
          1. Credentials in test_credentials.md are incorrect for preprod
          2. Test accounts not seeded in preprod database
          3. Authentication service issue on preprod
          4. Password or email mismatch

  - task: "BATCH QA-1 - BUG-390 Image Upload Label"
    implemented: true
    working: "NA"
    file: "Menu Management"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "testing"
        comment: |
          NOT TESTED - Blocked by authentication failure.
          Tests planned:
          - T1: Normal menu Add Item - Item Image section visible
          - T2: Aggregator menu Add Item - Item Image section visible
          - T3: Label shows 'Item Image' not 'Zomato Image'

  - task: "BATCH QA-1 - CR-373 Swiggy Toggle"
    implemented: true
    working: "NA"
    file: "Menu Management"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "testing"
        comment: |
          NOT TESTED - Blocked by authentication failure.
          Tests planned:
          - T4: Aggregator - Swiggy toggle visible
          - T5: Aggregator - 'Use same as Item Image' pre-selected
          - T6: Normal menu - NO Swiggy toggle visible
          - T7: Click 'Upload different image' - upload section appears
          - T8: Click 'Use same as Item Image' - upload section hides

  - task: "BATCH QA-1 - BUG-392 Scroll Wheel on Number Inputs"
    implemented: true
    working: "NA"
    file: "Menu Management"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "testing"
        comment: |
          NOT TESTED - Blocked by authentication failure.
          Tests planned:
          - T9: Edit item - Price field scroll blocked
          - T10: Bulk Edit - Price cell scroll blocked
          - T11: Edit item - Tax field scroll blocked

  - task: "BATCH QA-1 - CR-374 BulkEditor Filter Strip"
    implemented: true
    working: "NA"
    file: "Menu Management"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "testing"
        comment: |
          NOT TESTED - Blocked by authentication failure.
          Tests planned:
          - T12: Bulk Edit - Filter strip visible
          - T13: Click Active pill - filters applied
          - T14: Click Inactive pill - filters applied
          - T15: Category filter - filters applied
          - T16: Multiple filters (Active + Veg) applied
          - T17: Clear Filters - all rows visible
          - T18: Switch to Aggregator - filters reset

  - task: "BATCH QA-2 - BUG-391 Aggregator GST Enforcement"
    implemented: true
    working: "NA"
    file: "Menu Management"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "testing"
        comment: |
          NOT TESTED - Blocked by authentication failure.
          Tests planned:
          - T1: Aggregator Add Item - Tax fields read-only (GST 5% mandatory)
          - T2: Aggregator Add Item - Payload contains tax_type:GST and tax:5
          - T3: Aggregator Edit Item - Tax section read-only
          - T4: Normal menu - Tax IS editable (regression check)

  - task: "BATCH QA-3 - BUG-394 Number Input Guards"
    implemented: true
    working: "NA"
    file: "Menu Management"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "testing"
        comment: |
          NOT TESTED - Blocked by authentication failure.
          Tests planned: V1-V11 (input validation tests) + R1-R2 (regression checks)
          Total: 13 tests covering minus character blocking, letter blocking, 
          decimal acceptance, clear on focus, keyboard arrow functionality

  - task: "BATCH QA-4 - BUG-395 Delivery Address Fields"
    implemented: true
    working: "NA"
    file: "Order Management"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "testing"
        comment: |
          NOT TESTED - Blocked by authentication failure.
          Tests planned (using hogwarts account):
          - TC-A1: Delivery address - deliveryCustHouse and Floor populated
          - TC-A2: Delivery address - deliveryCustCity and State populated
          - TC-A3: Delivery address - existing fields present (regression)

  - task: "BATCH QA-5 - CR-377 Sales Report"
    implemented: true
    working: "NA"
    file: "Sales Report"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "testing"
        comment: |
          NOT TESTED - Blocked by authentication failure.
          Tests planned:
          - V1: Sales Report - Network request contains from and to dates
          - V2: Page heading shows 'Sales Report' not 'Daily Summary'
          - V3: 6 KPI cards visible (including P&L card)
          - V13: Original KPI cards still present
          - V14: Zero sections hidden (Galla, Expense, Purchase)
          - V15: No JavaScript errors in console

metadata:
  created_by: "testing_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: true
  test_date: "2026-09-11"
  environment: "preprod"
  preprod_url: "https://preprod.mygenie.online"

test_plan:
  current_focus:
    - "Authentication - Login Flow"
  stuck_tasks:
    - "Authentication - Login Flow"
  test_all: false
  test_priority: "blocker_first"
  notes: |
    All 45 tests blocked by authentication failure.
    Must resolve login credentials before any testing can proceed.

agent_communication:
  - agent: "testing"
    message: |
      ⚠️ CRITICAL BLOCKER IDENTIFIED ⚠️
      
      QA Testing Status: 0/45 tests completed
      
      BLOCKER:
      Cannot authenticate to preprod environment (https://preprod.mygenie.online)
      
      Credentials attempted:
      - Account: cafe103
      - Email: owner@cafe103.com
      - Password: Qplazm@10
      - Role: Restaurant
      
      Error: "Credentials does not match"
      
      Impact:
      - ALL 5 batches of QA tests are blocked
      - 0 out of 45 tests could be executed
      - Cannot verify any bug fixes or new features
      
      Screenshots captured:
      - .screenshots/dashboard_cafe103.png (shows login error)
      
      Required Actions:
      1. Verify credentials in /app/memory/test_credentials.md are correct for preprod
      2. Confirm test accounts (cafe103, hogwarts) exist in preprod database
      3. Check if preprod authentication service is functioning correctly
      4. Provide working credentials or seed test accounts in preprod
      
      Alternative approaches:
      - Test on local/staging environment if preprod is not ready
      - Provide alternative test account credentials
      - Grant access to preprod database to verify account existence
      
      Once authentication is resolved, all 45 tests can be executed systematically.
