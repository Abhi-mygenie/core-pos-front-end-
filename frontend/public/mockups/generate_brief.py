from fpdf import FPDF
import os

def clean(s):
    return (s.replace('\u2014','-').replace('\u2013','-')
             .replace('\u2019',"'").replace('\u2018',"'")
             .replace('\u201c','"').replace('\u201d','"')
             .replace('\u2022','*').replace('\u20b9','Rs.')
             .replace('\xd7','x').replace('\u2026','...'))

class PDF(FPDF):
    def header(self):
        self.set_fill_color(26, 26, 46)
        self.rect(0, 0, 210, 18, 'F')
        self.set_font('Helvetica', 'B', 11)
        self.set_text_color(255, 255, 255)
        self.set_y(5)
        self.cell(0, 8, clean('MyGenie POS  |  Round 4 Ad Screens  |  Screenshot Brief for Team'), align='C')
        self.set_text_color(0, 0, 0)
        self.ln(14)

    def footer(self):
        self.set_y(-12)
        self.set_font('Helvetica', '', 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 8, f'Page {self.page_no()}  |  MyGenie POS Team', align='C')

    def section_title(self, title, color=(26, 26, 46)):
        self.set_fill_color(*color)
        self.set_font('Helvetica', 'B', 10)
        self.set_text_color(255, 255, 255)
        self.set_x(10)
        self.cell(190, 8, clean(f'  {title}'), fill=True)
        self.ln(10)
        self.set_text_color(0, 0, 0)

    def screen_header(self, code, title, priority, device, canvas):
        self.set_fill_color(29, 170, 75)
        self.set_font('Helvetica', 'B', 9)
        self.set_text_color(255, 255, 255)
        self.set_x(10)
        self.cell(16, 7, clean(code), fill=True, align='C')
        self.set_fill_color(240, 240, 240)
        self.set_font('Helvetica', 'B', 10)
        self.set_text_color(20, 20, 20)
        self.cell(130, 7, clean(f'  {title}'), fill=True)
        p_color = (220, 100, 0) if priority == '1' else (80, 80, 180)
        self.set_fill_color(*p_color)
        self.set_font('Helvetica', 'B', 8)
        self.set_text_color(255, 255, 255)
        self.cell(22, 7, f'P{priority}', fill=True, align='C')
        self.set_fill_color(240, 240, 240)
        self.cell(22, 7, '', fill=True)
        self.ln(7)
        self.set_font('Helvetica', '', 8)
        self.set_text_color(90, 90, 90)
        self.set_x(10)
        self.cell(190, 5, clean(f'  Device: {device}   |   Canvas: {canvas}'))
        self.ln(6)
        self.set_text_color(0, 0, 0)

    def row(self, label, value, indent=14):
        self.set_x(indent)
        self.set_font('Helvetica', 'B', 8)
        self.set_text_color(60, 60, 60)
        self.cell(36, 5, clean(label))
        self.set_font('Helvetica', '', 8)
        self.set_text_color(20, 20, 20)
        self.multi_cell(150, 5, clean(value))

    def note(self, text, warn=False):
        self.set_x(14)
        c = (200, 80, 0) if warn else (0, 100, 60)
        self.set_font('Helvetica', 'BI', 8)
        self.set_text_color(*c)
        self.multi_cell(182, 5, clean(text))
        self.set_text_color(0, 0, 0)

    def divider(self):
        self.ln(2)
        self.set_draw_color(220, 220, 220)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(5)


pdf = PDF()
pdf.set_auto_page_break(auto=True, margin=16)
pdf.add_page()

# --- OVERVIEW ---
pdf.section_title('Overview')
pdf.set_font('Helvetica', '', 9)
pdf.set_x(10)
pdf.multi_cell(190, 5, clean(
    'This brief tells your team exactly which screen to open and what state to put it in before '
    'taking the screenshot. Numbers, restaurant name and outlet name should be real data from your '
    'live account -- whatever is there is fine. Two PNG files per screen: clean version + highlight '
    'version (_hl). Total: 20 PNG files.'))
pdf.ln(3)

items = [
    ('File naming:', 'R4_<CODE>_<short-name>.png   and   R4_<CODE>_<short-name>_hl.png'),
    ('Highlight style:', 'Soft coral/red rounded outline on highlighted area. Rest of screen slightly dimmed (~28%). No arrows or added text.'),
    ('Status bar:', 'Evening time (8:45-9:00 PM range)  |  5G  |  Full battery  |  No notifications'),
    ('Format:', 'PNG, full resolution, no device frame, no rounded corners on the PNG canvas'),
]
for lbl, val in items:
    pdf.row(lbl, val, indent=10)
    pdf.ln(1)
pdf.ln(4)

# --- P1 ---
pdf.section_title('PRIORITY 1 -- Due Nov 30  (2 screens = 4 files)', color=(180, 60, 0))

pdf.screen_header('TB1', 'Billing Screen on Tablet', '1', 'iPad / tablet -- landscape orientation', '2048 x 1536 px')
pdf.row('Operation:', 'Open any active order in the order-entry / billing screen.')
pdf.row('Setup:', 'Add a few menu items to the cart so the order panel shows items + grand total.')
pdf.row('Important:', 'Do NOT collect the bill -- stay on this screen showing the pending order.')
pdf.row('Clean PNG:', 'The screen exactly as it appears with the cart filled.')
pdf.row('_hl PNG:', 'Coral outline around the grand total amount + Collect Bill button. Rest dimmed.')
pdf.row('File names:', 'R4_TB1_billing-tablet.png   and   R4_TB1_billing-tablet_hl.png')
pdf.divider()

pdf.screen_header('DT1', 'Dashboard / Daily Report on Desktop', '1', 'Desktop browser -- fullscreen', '1920 x 1080 px')
pdf.row('Operation:', 'Open the Dashboard Report (main summary page) showing net sales KPIs.')
pdf.row('Must show:', 'Net sales total (large KPI figure), channel mix (POS/Swiggy/Zomato bars), payment mix %, cancellations count.')
pdf.row('Tip:', 'If today has no data, navigate to a past date that has real transactions.')
pdf.row('Clean PNG:', 'Full dashboard page with all KPI cards visible.')
pdf.row('_hl PNG:', 'Coral outline around the main Net Sales figure only. Rest dimmed.')
pdf.row('File names:', 'R4_DT1_dashboard-desktop.png   and   R4_DT1_dashboard-desktop_hl.png')
pdf.ln(4)

# --- P2 ---
pdf.section_title('PRIORITY 2 -- Due Dec 3  (7 screens + ML1 tablet = 14 files)')

pdf.screen_header('DT2', 'Orders Page on Desktop', '2', 'Desktop browser -- fullscreen', '1920 x 1080 px')
pdf.row('Operation:', 'Open the Orders page that shows channel breakdown -- POS, Swiggy, Zomato counts + order list.')
pdf.row('Must show:', 'Channel count tiles/badges at the top (POS count, Swiggy count, Zomato count) and a list of recent orders with channel pills.')
pdf.row('Tip:', 'Pick a date that had Swiggy/Zomato orders so all 3 channels appear.')
pdf.row('Clean PNG:', 'Full page with channel tiles + orders table.')
pdf.row('_hl PNG:', 'Coral outline around the 3 channel count tiles at the top. Rest dimmed.')
pdf.row('File names:', 'R4_DT2_orders-desktop.png   and   R4_DT2_orders-desktop_hl.png')
pdf.divider()

pdf.screen_header('DT3', 'Profit & Loss Report on Desktop', '2', 'Desktop browser -- fullscreen', '1920 x 1080 px')
pdf.row('Operation:', 'Open the Profit & Loss Report. Use a date range (MTD or past week) with real sales/expense data.')
pdf.row('Must show:', '4 KPI cards (Total Sales, Paid Revenue, Total Expenses, Net P&L), Revenue vs Expenses chart, date-wise breakdown table.')
pdf.row('Clean PNG:', 'Full P&L page with all cards and chart visible.')
pdf.row('_hl PNG:', 'Coral outline around the Net P&L KPI card (top right). Rest dimmed.')
pdf.row('File names:', 'R4_DT3_pl-desktop.png   and   R4_DT3_pl-desktop_hl.png')
pdf.divider()

pdf.screen_header('ML1', 'Outlets / Multi-Location Page  (2 versions needed)', '2',
                  'Version A: Desktop browser  |  Version B: iPad landscape',
                  'A: 1920 x 1080  |  B: 2048 x 1536')
pdf.note('Requires a multi-outlet account with 2 or more restaurant locations.', warn=True)
pdf.row('Operation:', 'Open the Outlets / multi-location overview page showing each outlet\'s Net Sales, Net P&L, Orders, plus a combined all-outlets total card at the top.')
pdf.row('Version A:', 'Take screenshot at 1920 x 1080 on desktop browser.')
pdf.row('Version B:', 'Open the same page on iPad in landscape -- take screenshot at 2048 x 1536.')
pdf.row('_hl PNG:', 'Coral outline around the all-outlets combined total card (do for BOTH versions).')
pdf.row('File names:', 'R4_ML1_outlets-desktop.png / _hl.png   |   R4_ML1_outlets-tablet.png / _hl.png')
pdf.divider()

pdf.screen_header('DL1', 'Delivery Order with Rider -- Phone', '2', 'Phone -- portrait', '1080 x 1920 px')
pdf.row('Operation:', 'Open any delivery order that has a rider assigned and status "Out for Delivery" or "Dispatched".')
pdf.row('Must show:', 'Order header (order no. + Delivery type), Out for Delivery status badge, order items + total, Rider Assigned card with name + phone.')
pdf.row('Setup tip:', 'If no live delivery exists, create one, assign a rider, dispatch it, then screenshot.')
pdf.row('Privacy:', 'Mask real rider phone number if needed (e.g. 98XXXXXX21).')
pdf.row('Clean PNG:', 'Full screen showing order details + rider card.')
pdf.row('_hl PNG:', 'Coral outline around rider name + status badge. Rest dimmed.')
pdf.row('File names:', 'R4_DL1_delivery-rider.png   and   R4_DL1_delivery-rider_hl.png')
pdf.divider()

pdf.screen_header('TK1', 'Takeaway Order -- Ready for Pickup -- Phone', '2', 'Phone -- portrait', '1080 x 1920 px')
pdf.row('Operation:', 'Open any takeaway order that has been marked "Ready for Pickup" / "Food Ready".')
pdf.row('Must show:', 'Order header (Takeaway type), prominent Ready for Pickup status badge (green), order items, grand total.')
pdf.row('Setup tip:', 'Create a takeaway order, add a few items, mark it as Food Ready, then screenshot.')
pdf.row('Clean PNG:', 'Full screen with the Ready badge prominently visible.')
pdf.row('_hl PNG:', 'Coral outline around the Ready for Pickup badge only. Rest dimmed.')
pdf.row('File names:', 'R4_TK1_takeaway-ready.png   and   R4_TK1_takeaway-ready_hl.png')
pdf.divider()

pdf.screen_header('RP1', 'Reports Navigation List -- Phone', '2', 'Phone -- portrait', '1080 x 1920 px')
pdf.row('Operation:', 'Navigate to the reports/analytics section on the phone app -- the screen listing all report names.')
pdf.row('Must show:', 'At least 8 report names: Dashboard Report, Profit & Loss, Orders, Item Sales, Cancellations, Payments, Staff, Customers (+ others if visible).')
pdf.note('No specific data needed -- just navigate to the reports list screen.', warn=False)
pdf.row('Clean PNG:', 'Full reports list with all items visible.')
pdf.row('_hl PNG:', 'Coral outline around any 3 consecutive report names as a group. Rest dimmed.')
pdf.row('File names:', 'R4_RP1_reports-list.png   and   R4_RP1_reports-list_hl.png')
pdf.divider()

pdf.screen_header('LV1', 'Live / Running Tables View -- Phone', '2', 'Phone -- portrait', '1080 x 1920 px')
pdf.row('Operation:', 'Open the live operations or running-tables screen on the phone app showing all active orders right now.')
pdf.row('Must show:', 'Running tables count with live indicator (green dot), individual order cards with table name, items count, amount, status (Running/Preparing).')
pdf.row('Setup tip:', 'Take this during a busy service period when multiple tables are open. 3-4 running orders ideal.')
pdf.row('Clean PNG:', 'Full live view with running orders visible.')
pdf.row('_hl PNG:', 'Coral outline around the running tables count / live summary banner at the top. Rest dimmed.')
pdf.row('File names:', 'R4_LV1_live-ops.png   and   R4_LV1_live-ops_hl.png')

# --- PAGE 3: SUMMARY TABLE ---
pdf.add_page()
pdf.section_title('Quick Reference -- All 20 Files')

cols = [14, 20, 65, 46, 45]
hdrs = ['Code', 'Priority', 'What to capture', 'Device', 'Canvas']
pdf.set_fill_color(26, 26, 46)
pdf.set_font('Helvetica', 'B', 8)
pdf.set_text_color(255, 255, 255)
pdf.set_x(10)
for w, h in zip(cols, hdrs):
    pdf.cell(w, 7, h, fill=True, border=0)
pdf.ln(7)

rows_data = [
    ('TB1',  'P1 Nov 30', 'Active order in billing screen (items in cart, bill not collected)', 'Tablet landscape',  '2048 x 1536'),
    ('DT1',  'P1 Nov 30', 'Dashboard Report -- net sales, channel mix, payment mix',            'Desktop browser',   '1920 x 1080'),
    ('DT2',  'P2 Dec 3',  'Orders page -- channel count tiles + order list',                    'Desktop browser',   '1920 x 1080'),
    ('DT3',  'P2 Dec 3',  'Profit & Loss Report -- KPIs + chart + table',                       'Desktop browser',   '1920 x 1080'),
    ('ML1a', 'P2 Dec 3',  'Outlets overview -- 2+ locations + combined total',                  'Desktop browser',   '1920 x 1080'),
    ('ML1b', 'P2 Dec 3',  'Outlets overview -- same page on tablet',                            'iPad landscape',    '2048 x 1536'),
    ('DL1',  'P2 Dec 3',  'Delivery order -- rider assigned, Out for Delivery',                 'Phone portrait',    '1080 x 1920'),
    ('TK1',  'P2 Dec 3',  'Takeaway order -- Ready for Pickup badge visible',                   'Phone portrait',    '1080 x 1920'),
    ('RP1',  'P2 Dec 3',  'Reports navigation list (no data needed)',                           'Phone portrait',    '1080 x 1920'),
    ('LV1',  'P2 Dec 3',  'Live / running tables view with active orders',                      'Phone portrait',    '1080 x 1920'),
]

pdf.set_text_color(20, 20, 20)
for i, (code, pri, desc, dev, canvas) in enumerate(rows_data):
    bg = (248, 248, 252) if i % 2 == 0 else (255, 255, 255)
    pdf.set_fill_color(*bg)
    pdf.set_x(10)
    pdf.set_font('Helvetica', 'B', 8)
    pdf.cell(cols[0], 6, code, fill=True, border=0)
    p_color = (200, 80, 0) if 'P1' in pri else (70, 70, 180)
    pdf.set_text_color(*p_color)
    pdf.set_font('Helvetica', '', 7)
    pdf.cell(cols[1], 6, pri, fill=True, border=0)
    pdf.set_text_color(20, 20, 20)
    pdf.set_font('Helvetica', '', 8)
    pdf.cell(cols[2], 6, clean(desc), fill=True, border=0)
    pdf.cell(cols[3], 6, dev, fill=True, border=0)
    pdf.cell(cols[4], 6, canvas, fill=True, border=0)
    pdf.ln(6)

pdf.ln(5)
pdf.set_x(10)
pdf.set_font('Helvetica', 'I', 8)
pdf.set_text_color(100, 100, 100)
pdf.cell(190, 5, 'Each row = 2 PNG files: clean + _hl   =>   20 files total  (10 screens x 2 versions)')
pdf.ln(8)

# --- RULES ---
pdf.section_title('Rules for Every Screen')
rules = [
    ('Status bar:', 'Show evening time (8:45-9:00 PM)  |  5G signal  |  Full battery  |  No notification banners'),
    ('No real data:', 'Hide or mask real customer names, real phone numbers, or sensitive info if visible'),
    ('Clean screen:', 'No debug banners, no cursor, no browser URL bar, no OS taskbar/dock'),
    ('No device frame:', 'Screenshot the app screen only -- marketing team adds device frames separately'),
    ('Format:', 'PNG file, full resolution, no compression, no rounded corners on the PNG itself'),
    ('Highlight style:', 'Soft coral/red rounded rectangle outline around the highlighted area, rest of screen dimmed ~28%. No arrows, no callout text.'),
    ('File naming:', 'R4_<CODE>_<short-name>.png for clean  |  R4_<CODE>_<short-name>_hl.png for highlight'),
    ('Delivery:', 'Send in 2 folders: Priority_1_Nov30 and Priority_2_Dec3'),
]
for lbl, val in rules:
    pdf.row(lbl, val, indent=12)
    pdf.ln(1)

out = '/app/frontend/public/mockups/Round4_Screenshot_Brief.pdf'
pdf.output(out)
print(f"PDF saved: {out}")
print(f"Size: {os.path.getsize(out)/1024:.1f} KB")
