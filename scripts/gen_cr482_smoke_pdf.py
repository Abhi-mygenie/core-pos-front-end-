#!/usr/bin/env python3
"""Generate CR-482 Smoke Test PDF - Owner-facing, plain language."""

from fpdf import FPDF
from datetime import datetime

class SmokeTestPDF(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 11)
        self.set_text_color(40, 40, 40)
        self.cell(0, 8, 'CR-482 Keyboard Shortcuts - Owner Smoke Test', align='C', new_x="LMARGIN", new_y="NEXT")
        self.set_font('Helvetica', '', 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 5, f'Generated {datetime.now().strftime("%d %b %Y")}  |  Phases P0 - P24  |  Shortcuts ON unless noted', align='C', new_x="LMARGIN", new_y="NEXT")
        self.line(10, self.get_y()+1, 200, self.get_y()+1)
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 7)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f'Page {self.page_no()}/{{nb}}', align='C')

    def section_title(self, title):
        self.set_font('Helvetica', 'B', 11)
        self.set_fill_color(34, 120, 69)  # MyGenie green
        self.set_text_color(255, 255, 255)
        self.cell(0, 8, f'  {title}', fill=True, new_x="LMARGIN", new_y="NEXT")
        self.set_text_color(40, 40, 40)
        self.ln(2)

    def phase_header(self, phase, shortcut, description):
        self.set_font('Helvetica', 'B', 10)
        self.set_fill_color(240, 253, 244)
        self.set_text_color(34, 120, 69)
        label = f'{phase}  |  Key: {shortcut}  |  {description}'
        self.cell(0, 7, f'  {label}', fill=True, new_x="LMARGIN", new_y="NEXT")
        self.set_text_color(40, 40, 40)
        self.ln(1)

    def test_row(self, num, steps, expected):
        self.set_font('Helvetica', '', 8)
        x = self.get_x()
        y = self.get_y()

        # Checkbox
        self.rect(x+1, y+1, 4, 4)
        self.set_x(x + 7)

        # Number
        self.set_font('Helvetica', 'B', 8)
        self.cell(8, 6, f'{num}.')

        # Steps + Expected
        self.set_font('Helvetica', '', 8)
        col_w = 85
        x_steps = self.get_x()
        self.multi_cell(col_w, 4.5, steps, new_x="RIGHT", new_y="TOP")
        bottom_steps = self.get_y()

        self.set_xy(x_steps + col_w + 2, y)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(80, 80, 80)
        self.multi_cell(col_w, 4.5, expected, new_x="LMARGIN", new_y="NEXT")
        bottom_expected = self.get_y()
        self.set_text_color(40, 40, 40)

        self.set_y(max(bottom_steps, bottom_expected) + 1)
        if self.get_y() > 265:
            self.add_page()

    def info_block(self, text):
        self.set_font('Helvetica', '', 8)
        self.set_fill_color(255, 251, 235)
        self.multi_cell(0, 4.5, text, fill=True, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)


pdf = SmokeTestPDF()
pdf.alias_nb_pages()
pdf.set_auto_page_break(auto=True, margin=20)
pdf.add_page()

# === PREREQUISITES ===
pdf.section_title('Prerequisites')
pdf.info_block(
    'How to enable shortcuts:\n'
    '  1. Login to POS > Settings > Status Configuration > UI Elements\n'
    '  2. Toggle "Keyboard Shortcuts" ON > Save\n'
    '  (Or: browser console > localStorage.setItem("mygenie_keyboard_shortcuts_enabled", "true") > refresh)\n\n'
    'Mac users: Hold fn + F-key for all function key shortcuts (F2, F4, F7, F8, F9).\n\n'
    'Test outlets: cafe103 (427 items, customizable items, no weight items)\n'
    '              Kashi Sweets (weight items: Gopal Bhog, Ghee Patisha)\n\n'
    'Rule: Shortcuts OFF = zero change to current behaviour. Every test has an OFF check.'
)

# === P0 ===
pdf.phase_header('P0', 'None', 'Foundation + Toggle (no visible shortcut)')
pdf.test_row('0.1', 'Go to Settings > Status Config > UI Elements. Find "Keyboard Shortcuts" toggle between Weight Entry Prompt and Auto-expand Served Items.', 'Toggle is visible and saves correctly.')
pdf.test_row('0.2', 'Toggle OFF. Open any table.', 'No auto-focus on search. No orange rings anywhere. Behaves exactly like before.')
pdf.test_row('0.3', 'Toggle ON. Open any table.', 'Cursor blinks in the search box automatically (P1 test).')

# === P1 ===
pdf.phase_header('P1', 'None (auto)', 'Search auto-focus + Tab trap')
pdf.test_row('1.1', 'Shortcuts ON. Click any table to open order screen.', 'Cursor is blinking in the item search box without clicking.')
pdf.test_row('1.2', 'Open a walk-in order (Add button).', 'Same: cursor in search automatically.')
pdf.test_row('1.3', 'Press Tab repeatedly until you reach the last element.', 'Tab wraps back to the first element inside the order screen. Does NOT jump to dashboard behind.')
pdf.test_row('1.4', 'Shortcuts OFF. Open any table.', 'No auto-focus. You must tap/click the search box manually.')

# === P2 ===
pdf.phase_header('P2', 'Type letters/digits', 'Orange ring on matching item')
pdf.test_row('2.1', 'Shortcuts ON. Type an item code (e.g. "1").', 'Item with code exactly "1" gets an orange ring, even if "10" or "101" appear first.')
pdf.test_row('2.2', 'Type a name fragment (e.g. "amer").', 'First matching item (Americano) has the orange ring.')
pdf.test_row('2.3', 'Clear the search box.', 'Ring moves to the first item in the grid.')

# === P3 ===
pdf.phase_header('P3', 'Arrow keys', 'Move ring around item grid')
pdf.test_row('3.1', 'With items visible, press Down arrow.', 'Orange ring moves to the item below.')
pdf.test_row('3.2', 'Press Right arrow.', 'Ring moves to the next item on the right.')
pdf.test_row('3.3', 'Press Up and Left to navigate back.', 'Ring moves accordingly. At grid edges: stays, no crash.')
pdf.test_row('3.4', 'On a long menu, arrow down past the visible area.', 'Grid scrolls to keep the ringed item visible.')
pdf.test_row('3.5', 'Mouse click on any item.', 'Still adds to cart normally (unchanged).')

# === P4 ===
pdf.phase_header('P4', 'Enter', 'Add ringed item to cart')
pdf.test_row('4.1', 'Type an item name, see the orange ring on it. Press Enter.', 'Item added to cart (qty 1). Search clears. Cursor stays in search.')
pdf.test_row('4.2', 'Press Enter again (same item).', 'Qty goes to 2 (merge).')
pdf.test_row('4.3', 'Search for something with no results. Press Enter.', 'Nothing happens. No error.')
pdf.test_row('4.4', 'Shortcuts OFF. Press Enter in search.', 'Nothing happens (no item added).')

# === P5 ===
pdf.phase_header('P5', 'Enter / Ctrl+Enter / Esc', 'Customization popup keyboard')
pdf.test_row('5.1', 'Search for a customizable item (e.g. "Allfredo Pasta"). Press Enter.', 'Customization popup opens. Cursor moves into the popup.')
pdf.test_row('5.2', 'Use Tab to reach variant options. Press Enter/Space to select a variant.', 'Variant selected (same as clicking it).')
pdf.test_row('5.3', 'Press Ctrl+Enter.', 'Item added to cart with selected variant. Popup closes. Cursor back in search.')
pdf.test_row('5.4', 'Reopen the popup. Press Esc.', 'Popup closes. Nothing added. Cursor back in search.')
pdf.test_row('5.5', 'With popup open, press + or type in search.', 'Nothing happens outside the popup. Shortcuts are paused while popup is open.')
pdf.test_row('5.6', 'Required variant not selected. Press Ctrl+Enter.', 'Same validation as clicking the button (toast/error shown, not added).')

# === P6 ===
pdf.phase_header('P6', 'Enter / Esc in weight popup', 'Weight item keyboard')
pdf.test_row('6.1', 'Search for a weight item (e.g. "Gopal Bhog" on Kashi Sweets). Press Enter.', 'Weight popup opens. Cursor in weight box. Value "1000" is highlighted/selected.')
pdf.test_row('6.2', 'Type "500" and press Enter.', 'Line added: 500 gm at correct price (not 1000500). Search cleared, cursor in search.')
pdf.test_row('6.3', 'Reopen. Press Esc.', 'Popup closes. Nothing added. Cursor back in search.')
pdf.test_row('6.4', 'Leave weight box empty or type 0. Press Enter.', 'Error shown: "Enter a valid weight". Popup stays open.')
pdf.test_row('6.5', 'Mouse: click weight item, select 250gm pill, click Add.', 'Still works normally (unchanged). 250gm line added.')
pdf.test_row('6.6', 'Shortcuts OFF. Click weight item. Type in the weight box.', 'Weight box text is selected on focus (typing replaces, not appends). Works for everyone.')

# === P7 ===
pdf.phase_header('P7', 'Enter / Esc in price popup', 'Dynamic price item (Rs.1 items)')
pdf.test_row('7.1', 'Search for a Rs.1 priced item (e.g. "test1"). Press Enter.', 'Price popup opens. Cursor in price field.')
pdf.test_row('7.2', 'Type "120". Press Enter.', 'Item added at Rs.120. Popup closes. Cursor in search.')
pdf.test_row('7.3', 'Reopen. Press Esc.', 'Closes. Nothing added.')
pdf.test_row('7.4', 'Leave empty or type 0. Press Enter.', '"Please enter a valid price greater than 0" error. Popup stays.')

# === P8 ===
pdf.phase_header('P8', '+ / - keys', 'Change quantity of last added item')
pdf.test_row('8.1', 'Add an item (e.g. Americano). Press + twice.', 'Qty goes to 3.')
pdf.test_row('8.2', 'Press - once.', 'Qty goes to 2.')
pdf.test_row('8.3', 'Press - repeatedly.', 'Stops at 1. Never removes the item.')
pdf.test_row('8.4', 'Numpad + and numpad - also work.', 'Same behaviour as regular +/-.')
pdf.test_row('8.5', 'Type "ab" in search. Then press -.', '"ab-" typed in search. Qty unchanged (correct: +/- only work from empty search).')
pdf.test_row('8.6', 'Add a second item. Press +.', 'Second (most recent) item qty changes, not the first.')
pdf.test_row('8.7', 'Open a table with only placed/sent items. Press +.', 'Nothing happens. No character typed in search.')
pdf.test_row('8.8', 'Mouse qty buttons (+/-) on cart items.', 'Still work normally (unchanged).')

# === P9 ===
pdf.phase_header('P9', 'Shift+Tab / Arrows / Enter', 'Category list navigation')
pdf.test_row('9.1', 'From search, press Shift+Tab.', 'Orange ring lands on the active category (e.g. "All").')
pdf.test_row('9.2', 'Press Down arrow twice.', 'Ring moves down through categories.')
pdf.test_row('9.3', 'Press Enter.', 'Category selected (grid filters). Cursor jumps back to search. Ring on first item in filtered grid.')
pdf.test_row('9.4', 'Press Space on a category.', 'Same as Enter: category selected, cursor back to search.')
pdf.test_row('9.5', 'Mouse click on a category.', 'Still works (unchanged). Grid filters normally.')

# === P10 ===
pdf.phase_header('P10', 'Ctrl+Down / Arrows / +/- / Delete / Esc', 'Cart row navigation')
pdf.test_row('10.1', 'Add 3 items. Press Ctrl+Down.', 'Orange ring appears on the newest (bottom) item in the cart.')
pdf.test_row('10.2', 'Press Up arrow.', 'Ring moves to the previous cart row.')
pdf.test_row('10.3', 'Press Down arrow.', 'Ring moves to the next cart row.')
pdf.test_row('10.4', 'Press + twice on a cart row.', 'That row qty goes up by 2.')
pdf.test_row('10.5', 'Press - until qty 1.', 'Stops at 1. Does not remove.')
pdf.test_row('10.6', 'Press Delete on an unplaced row.', 'Row removed. Ring moves to next row (or search if last).')
pdf.test_row('10.7', 'Press Esc.', 'Cursor returns to search. Cart stays intact.')
pdf.test_row('10.8', 'Open a table with placed (sent) items. Ctrl+Down. Press -.', 'Cannot go below the sent qty. Delete does nothing on sent rows.')
pdf.test_row('10.9', 'Press + on a sent row.', 'Qty increases (for update). "Update Order" button appears.')

# === P11 ===
pdf.phase_header('P11', 'F2 (Mac: fn+F2)', 'Jump to search from anywhere')
pdf.test_row('11.1', 'Click somewhere in the cart area or item grid. Press F2.', 'Cursor jumps to search box. Any existing text is selected.')
pdf.test_row('11.2', 'Open a popup (e.g. customization). Press F2.', 'Nothing happens. F2 is blocked while popups are open.')
pdf.test_row('11.3', 'Shortcuts OFF. Press F2.', 'Nothing happens (or browser default F2 action).')

# === P12 ===
pdf.phase_header('P12', 'F8 (Mac: fn+F8)', 'Place / Update Order')
pdf.test_row('12.1', 'New table, add 1 item. Press F8.', 'Order placed (same as clicking Place Order). Only 1 API call even if pressed fast.')
pdf.test_row('12.2', 'Busy table, add 1 new item. Press F8.', '"Update Order" fires. KOT prints for new item only.')
pdf.test_row('12.3', 'Press F8 3 times quickly.', 'Only 1 call fires (no duplicate orders).')
pdf.test_row('12.4', 'No new items in cart. Press F8.', 'Nothing happens (button disabled/absent).')
pdf.test_row('12.5', 'Focus in customer name input. Press F8.', 'Nothing happens (blocked in text inputs other than search).')

# === P13 ===
pdf.phase_header('P13', 'F7 (Mac: fn+F7)', 'Reprint KOT')
pdf.test_row('13.1', 'Open a placed order. Press F7.', 'KOT reprint fires. No Chrome "Caret Browsing" dialog appears.')
pdf.test_row('13.2', 'Multi-station order: press F7.', 'Station Picker opens. Tab/Space to toggle stations. Enter to confirm. Esc to cancel.')
pdf.test_row('13.3', 'No placed order / button absent. Press F7.', 'Nothing happens.')
pdf.test_row('13.4', 'While Station Picker is open, press + or F2.', 'Nothing happens. Shortcuts paused while picker is open.')

# === P14 ===
pdf.phase_header('P14', 'F4 (Mac: fn+F4)', 'Print Bill')
pdf.test_row('14.1', 'Open a placed order with print permission. Press F4.', 'Bill print fires. After print dialog closes, cursor returns to search.')
pdf.test_row('14.2', 'New table, no placed items. Press F4.', 'Nothing happens (no print button visible).')
pdf.test_row('14.3', 'User without print permission. Press F4.', 'Nothing happens (button absent).')

# === P15 ===
pdf.phase_header('P15', 'F9 (Mac: fn+F9)', 'Collect Bill')
pdf.test_row('15.1', 'Open a served order. Press F9.', 'Collect Bill panel opens.')
pdf.test_row('15.2', 'Not served / unplaced items. Press F9.', 'Nothing happens (button disabled).')
pdf.test_row('15.3', 'With Collect Bill panel open, press F2 / F8 / arrows / +/-.', 'All shortcuts are disabled while payment panel is open. Mouse payment flow works normally.')

# === P16 ===
pdf.phase_header('P16', 'Esc', 'Smart exit from Order Entry')
pdf.test_row('16.1', 'Type text in search. Press Esc.', 'Search clears. Still in order screen. Cursor in search.')
pdf.test_row('16.2', 'Empty search, no items in cart. Press Esc.', 'Order screen closes. Back to dashboard.')
pdf.test_row('16.3', 'Add items (not placed). Press Esc.', 'Confirmation dialog: "Unsaved items will be lost. Leave?" with [Stay] and [Leave].')
pdf.test_row('16.4', 'On the confirm dialog, press Enter.', 'Stay is selected (green button, default). Dialog closes. Cart intact. Still in order screen.')
pdf.test_row('16.5', 'Press Esc again > confirm shows > press Esc.', 'Same as Stay. Dialog closes. Cart intact.')
pdf.test_row('16.6', 'Press Esc > confirm shows > Tab to Leave > Enter.', 'Order screen closes. Back to dashboard. Unsaved items discarded.')
pdf.test_row('16.7', 'Add items. Click the mouse Back button (top-left arrow).', 'Leaves immediately WITHOUT confirmation dialog. (This is by design.)')
pdf.test_row('16.8', 'Table with only placed items. Press Esc.', 'Closes directly. No confirm (placed items are saved on server).')

# === P17 ===
pdf.phase_header('P17', 'Esc in popups', 'Close popups with keyboard')
pdf.test_row('17.1', 'Open Customer modal (click customer button). Press Esc.', 'Modal closes. Nothing saved.')
pdf.test_row('17.2', 'Open Add Custom Item modal. Press Esc.', 'Modal closes.')
pdf.test_row('17.3', 'Open Order Notes modal. Press Esc.', 'Modal closes. Notes not saved.')
pdf.test_row('17.4', 'Open Item Notes modal (note icon on a cart item). Press Esc.', 'Modal closes.')
pdf.test_row('17.5', 'While any popup is open, press + or type characters.', 'Characters go into the popup field. No qty changes or OE shortcuts fire.')

# === P18 ===
pdf.phase_header('P18', 'Tab / Enter on Dashboard cards', 'Navigate and open table/order cards')
pdf.test_row('18.1', 'Shortcuts ON. On the dashboard, press Tab repeatedly.', 'Orange ring moves card to card. Engaged and aggregator cards are skipped.')
pdf.test_row('18.2', 'Tab to an available table card. Press Enter.', 'Order Entry opens for that table (dine-in). Cursor in search (P1).')
pdf.test_row('18.3', 'Tab to a busy (running order) card. Press Enter.', 'Running order loaded in Order Entry.')
pdf.test_row('18.4', 'Press Space on a focused card.', 'Same as Enter - opens the card.')
pdf.test_row('18.5', 'Mouse click on any card.', 'Still works normally (unchanged).')
pdf.test_row('18.6', 'Shortcuts OFF. Press Tab on dashboard.', 'No Tab stops on cards. No orange rings. Normal browser Tab behaviour.')

# === P19 ===
pdf.phase_header('P19', 'Type table label (letters/digits)', 'Type-to-jump to a table on Dashboard')
pdf.test_row('19.1', 'Shortcuts ON, on dashboard. Type "C1" (or any table label).', 'Green chip appears at bottom: "Table: C1". That card gets orange ring and scrolls into view.')
pdf.test_row('19.2', 'Type "10" then Backspace.', 'Buffer becomes "1". Chip updates to show match for "1".')
pdf.test_row('19.3', 'Wait 2 seconds after typing.', 'Chip disappears. Ring stays on the last focused card.')
pdf.test_row('19.4', 'Type a label that has multiple matches (e.g. "5" if Table 5 exists in multiple views).', 'Chip shows "Table: 5 - 1 of 2". Use arrows to cycle (P21).')
pdf.test_row('19.5', 'Type a label that does not exist (e.g. "Z99").', 'Red chip: "Z99 - not found".')
pdf.test_row('19.6', 'In Order View, type a free table label not shown.', 'Gray chip: "C1 - not in this view".')
pdf.test_row('19.7', 'Click into the header search bar, type letters.', 'No chip appears. Header search works normally (typing target skipped).')

# === P20 ===
pdf.phase_header('P20', 'Enter on highlighted card', 'Open the type-to-jump match')
pdf.test_row('20.1', 'Type a table label (chip shows match). Press Enter.', 'Order Entry opens for that table. Chip clears.')
pdf.test_row('20.2', 'Type a busy table label. Press Enter.', 'Running order opens. Same as clicking the card.')
pdf.test_row('20.3', 'Type a label with no match. Press Enter.', 'Nothing happens (no card to open).')

# === P21 ===
pdf.phase_header('P21', 'Arrow keys on Dashboard', 'Cycle matches or move between cards')
pdf.test_row('21.1', 'Type a label with 2+ matches. Press Right arrow.', 'Chip changes to "2 of 2". Second match card gets the ring.')
pdf.test_row('21.2', 'Press Left arrow.', 'Back to "1 of 2". First match card ringed again.')
pdf.test_row('21.3', 'Press Down/Up arrows.', 'Same cycling behaviour as Left/Right.')

# === P22 ===
pdf.phase_header('P22', 'Esc on Dashboard', 'Clear type-to-jump')
pdf.test_row('22.1', 'Type a table label (chip visible). Press Esc.', 'Chip disappears. Ring clears. Dashboard unchanged.')
pdf.test_row('22.2', 'No text typed. Press Esc.', 'Nothing happens (no buffer to clear).')

# === P23 ===
pdf.phase_header('P23', 'Alt+T (Mac: Option+T)', 'Open Takeaway from Dashboard')
pdf.test_row('23.1', 'Shortcuts ON, on dashboard. Press Alt+T.', 'Order Entry opens in Takeaway mode. Cursor in search.')
pdf.test_row('23.2', 'Takeaway feature disabled in restaurant settings. Press Alt+T.', 'Nothing happens.')
pdf.test_row('23.3', 'Type "T" then "1" (no Alt).', 'Table jump chip shows "T1", NOT Takeaway. Alt is required.')

# === P24 ===
pdf.phase_header('P24', 'Alt+D (Mac: Option+D)', 'Open Delivery from Dashboard')
pdf.test_row('24.1', 'Shortcuts ON, on dashboard. Press Alt+D.', 'Order Entry opens in Delivery mode. Browser address bar NOT focused.')
pdf.test_row('24.2', 'Delivery feature disabled. Press Alt+D.', 'Nothing happens.')
pdf.test_row('24.3', 'Type "D" (no Alt).', 'Table jump for label "D", NOT delivery mode.')

# === GLOBAL OFF REGRESSION ===
pdf.section_title('Global Regression: Shortcuts OFF')
pdf.info_block(
    'Toggle Keyboard Shortcuts OFF. Verify ALL of the following:\n'
    '  - No auto-focus on search when opening a table\n'
    '  - No orange rings on items, cart rows, or dashboard cards\n'
    '  - Enter in search does nothing\n'
    '  - +/- types normally in search (no qty change)\n'
    '  - Arrow keys move cursor in search (no grid nav)\n'
    '  - Ctrl+Down does nothing\n'
    '  - F2/F4/F7/F8/F9 do nothing (or browser defaults)\n'
    '  - Esc does NOT clear search or show confirm dialog\n'
    '  - Tab on dashboard does NOT stop on cards (no focus ring)\n'
    '  - Typing letters on dashboard does NOT show jump chip\n'
    '  - Alt+T and Alt+D do NOT open Takeaway/Delivery\n'
    '  - All mouse interactions work exactly as before\n'
    '  - Tab does NOT trap inside order screen'
)

# === SIGN-OFF ===
pdf.section_title('Sign-off')
pdf.set_font('Helvetica', '', 9)
pdf.ln(3)
pdf.cell(0, 6, 'Tested by: ________________________    Date: ____________    Outlet: ____________', new_x="LMARGIN", new_y="NEXT")
pdf.ln(3)
pdf.cell(0, 6, 'Result:   [ ] ALL PASS    [ ] PASS with notes    [ ] FAIL (see marked items)', new_x="LMARGIN", new_y="NEXT")
pdf.ln(3)
pdf.cell(0, 6, 'Notes: ________________________________________________________________________', new_x="LMARGIN", new_y="NEXT")
pdf.ln(2)
pdf.cell(0, 6, '       ________________________________________________________________________', new_x="LMARGIN", new_y="NEXT")

pdf.output('/app/memory/test_reports/CR-482_SMOKE_TEST_GUIDE_P0_P24.pdf')
print("PDF generated at /app/memory/test_reports/CR-482_SMOKE_TEST_GUIDE_P0_P24.pdf")
