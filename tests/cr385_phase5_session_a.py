"""CR-385 Phase 5 Session A re-run #2 (iteration 31) — frontend only, live preprod."""
import asyncio, os, re, json, random, sys, time, traceback
from datetime import datetime, timedelta
from playwright.async_api import async_playwright

RESULTS = {
    "per_row_results": [],
    "captured_requests": [],
    "responses": [],
    "console_errors": [],
    "created_row_ids": {"suite_row_id": None, "tomorrow_row_id": None},
    "room_used": None,
    "table_id": None,
    "figures": {},
    "cleanup_end_state": {},
}

def add_row(row, status, severity, detail):
    RESULTS["per_row_results"].append({"row": row, "status": status, "severity": severity, "detail": detail})
    print(f"[{status}] {row}: {detail[:220]}")

def digits_only(s):
    return re.sub(r"[^0-9]", "", s or "")

def parse_creds():
    text = open("/app/memory/test_credentials.md").read()
    section = text.split("## QA_TGK")[1].split("##")[0]
    m_email = re.search(r"email\s*`([^`]+)`", section)
    m_pw = re.search(r"password\s*`([^`]+)`", section)
    return m_email.group(1), m_pw.group(1)

FORBIDDEN_KEYS = ["rate_per_night", "room_price", "amount_after_tax", "order_amount", "new_room_price"]

def check_forbidden(body_str, allow_zero_set=None):
    """Return list of forbidden keys present in body_str (JSON or multipart). If allow_zero_set is provided, keys with value 0/'0' are considered OK."""
    allow_zero_set = allow_zero_set or set()
    found = []
    keys_seen = []
    try:
        obj = json.loads(body_str)
        for k in FORBIDDEN_KEYS + ["gst_tax"]:
            if k in obj:
                keys_seen.append(f"{k}={obj[k]}")
                if k in allow_zero_set and str(obj[k]) in ("0", "0.0"):
                    continue
                if k in FORBIDDEN_KEYS:
                    found.append(f"{k}={obj[k]}")
    except Exception:
        # multipart or form; regex
        for k in FORBIDDEN_KEYS + ["gst_tax"]:
            m = re.search(rf'name="{k}"\r?\n\r?\n([^\r\n-]*)', body_str)
            if not m:
                m = re.search(rf'"{k}"\s*:\s*"?([^,"}}]+)', body_str)
            if m:
                v = m.group(1).strip()
                keys_seen.append(f"{k}={v}")
                if k in allow_zero_set and v in ("0", "0.0", '"0"'):
                    continue
                if k in FORBIDDEN_KEYS:
                    found.append(f"{k}={v}")
    return found, keys_seen


async def main():
    email, password = parse_creds()
    url = open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()

    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path="/usr/bin/google-chrome", headless=True, args=["--no-sandbox","--disable-dev-shm-usage"])
        ctx = await browser.new_context(viewport={"width":1366,"height":768})
        page = await ctx.new_page()

        IGNORE_CONSOLE = ("socket","firebase","messaging","Payment Debug")
        def _console(msg):
            if msg.type == "error":
                t = msg.text
                if not any(k.lower() in t.lower() for k in IGNORE_CONSOLE):
                    RESULTS["console_errors"].append(t[:400])
        page.on("console", _console)

        WATCH_URLS = ("direct-reservation","user-group-check-in","bill-payment","order-bill-payment")
        async def _on_request(req):
            if req.method in ("POST","PUT","PATCH"):
                body = ""
                try:
                    body = req.post_data or ""
                except: pass
                RESULTS["captured_requests"].append({"url": req.url, "method": req.method, "body": body[:8000]})
        page.on("request", _on_request)
        async def _on_response(resp):
            u = resp.url
            if any(k in u for k in WATCH_URLS):
                try:
                    txt = await resp.text()
                except Exception:
                    txt = ""
                RESULTS["responses"].append({"url": u, "status": resp.status, "body": txt[:500]})
        page.on("response", lambda r: asyncio.create_task(_on_response(r)))

        try:
            # ===== A0 LOGIN =====
            await page.goto(url + "/", wait_until="domcontentloaded", timeout=60000)
            await page.wait_for_selector("input[type='email'], input[name='email'], input[type='text']", timeout=30000)
            # Find email/password inputs
            email_input = await page.query_selector("input[type='email']") or await page.query_selector("input[name='email']") or (await page.query_selector_all("input"))[0]
            pw_input = await page.query_selector("input[type='password']")
            await email_input.fill(email)
            await pw_input.fill(password)
            # submit
            submit = await page.query_selector("button[type='submit']") or await page.query_selector("button")
            await submit.click()
            # wait for /loading or app
            try:
                await page.wait_for_url("**/loading**", timeout=30000)
            except: pass
            # Wait until we leave /loading
            end = time.time() + 90
            while time.time() < end:
                if "/loading" not in page.url and page.url != url + "/":
                    break
                await page.wait_for_timeout(500)
            if "/loading" in page.url:
                add_row("A0 LOGIN","FAIL","BLOCKER","/loading never finished within 90s")
                return
            add_row("A0 LOGIN","PASS","NOTE", f"logged in; url={page.url}")

            # ===== A1 NAVIGATE =====
            await page.goto(url + "/pms/front-desk-v2", wait_until="domcontentloaded", timeout=60000)
            await page.wait_for_selector("[data-testid='fd-page']", timeout=30000)
            await page.wait_for_selector("[data-testid='fd-header-date']", timeout=30000)
            # wait until date is not '—'
            biz_date_text = ""
            for _ in range(30):
                biz_date_text = (await page.locator("[data-testid='fd-header-date']").inner_text()).strip()
                if biz_date_text and biz_date_text != "—":
                    break
                await page.wait_for_timeout(500)
            RESULTS["figures"]["business_date_text"] = biz_date_text
            # business date server side is 2026-09-23
            biz_date = "2026-09-23"
            await page.click("[data-testid='fd-tab-arrivals']")
            await page.wait_for_timeout(1500)
            await page.click("[data-testid='fd-new-booking-btn']")
            await page.wait_for_selector("[data-testid='booking-form']", timeout=15000)
            add_row("A1 NAVIGATE","PASS","NOTE", f"business date header='{biz_date_text}'; booking-form opened")

            # ===== A2 NEW BOOKING =====
            phone1 = "9" + "".join(random.choices("0123456789", k=9))
            await page.fill("[data-testid='booking-guest-name']", "P5 QA Suite")
            await page.fill("[data-testid='booking-guest-phone']", phone1)
            checkout_date = (datetime.strptime(biz_date,"%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d")
            await page.fill("[data-testid='booking-checkin']", biz_date)
            await page.fill("[data-testid='booking-checkout']", checkout_date)
            await page.fill("[data-testid='booking-adults']", "1")
            await page.wait_for_selector("[data-testid='booking-rate-grid']", timeout=15000)
            # wait for cell
            got_cells = False
            for _ in range(30):
                cells = await page.query_selector_all("[data-testid^='booking-cell-']")
                if cells:
                    got_cells = True
                    break
                await page.wait_for_timeout(1000)
            if not got_cells:
                grid_text = await page.locator("[data-testid='booking-rate-grid']").inner_text()
                add_row("A2 NEW BOOKING","FAIL","BLOCKER", f"no booking-cell-* after 30s. grid text: {grid_text[:300]}")
                return
            # find suite cell
            suite_cell = None
            for c in await page.query_selector_all("[data-testid^='booking-cell-']"):
                tid = await c.get_attribute("data-testid") or ""
                if "suite" in tid.lower():
                    suite_cell = c; break
            if not suite_cell:
                add_row("A2 NEW BOOKING","FAIL","MAJOR","No suite cell found in grid")
                return
            await suite_cell.click()
            await page.wait_for_timeout(500)
            # advance toggle ON
            await page.click("[data-testid='booking-advance-toggle']")
            await page.wait_for_timeout(300)
            await page.fill("[data-testid='booking-advance-amount']", "500")
            await page.click("[data-testid='booking-pay-card']")
            await page.wait_for_timeout(200)
            await page.fill("[data-testid='booking-pay-ref']", "P5QA1")
            await page.click("[data-testid='booking-save-btn']")
            await page.wait_for_selector("[data-testid='booking-confirmation']", timeout=45000)
            # collect figures
            async def gettxt(sel):
                try:
                    return (await page.locator(sel).inner_text()).strip()
                except: return ""
            sgst = await gettxt("[data-testid='booking-bill-sgst']")
            cgst = await gettxt("[data-testid='booking-bill-cgst']")
            adv = await gettxt("[data-testid='booking-bill-advance']")
            bal = await gettxt("[data-testid='booking-bill-balance']")
            total = await gettxt("[data-testid='booking-bill-total']")
            RESULTS["figures"]["booking_confirmation"] = {"sgst":sgst,"cgst":cgst,"advance":adv,"balance":bal,"total":total}
            two_tax = bool(sgst) and bool(cgst)
            await page.click("[data-testid='booking-done-btn']")
            await page.wait_for_timeout(1500)
            # arrivals today
            await page.click("[data-testid='fd-chip-arrivals-today']")
            await page.wait_for_timeout(2000)
            # find row with P5 QA Suite
            suite_row_id = None
            rows = await page.query_selector_all("[data-testid^='fd-row-']")
            for r in rows:
                txt = (await r.inner_text()) or ""
                if "P5 QA Suite" in txt:
                    tid = await r.get_attribute("data-testid") or ""
                    m = re.match(r"fd-row-([^-]+)", tid)
                    if m:
                        suite_row_id = m.group(1); break
            if not suite_row_id:
                # try scanning any element
                els = await page.query_selector_all("[data-testid*='fd-row-']")
                for e in els:
                    tid = await e.get_attribute("data-testid") or ""
                    txt = await e.inner_text()
                    if "P5 QA Suite" in txt:
                        m = re.match(r"fd-row-([^-]+)", tid)
                        if m: suite_row_id = m.group(1); break
            RESULTS["created_row_ids"]["suite_row_id"] = suite_row_id
            # Check direct-reservation captured
            dr_reqs = [r for r in RESULTS["captured_requests"] if "direct-reservation" in r["url"]]
            forbidden_found = []; keys_seen = []
            if dr_reqs:
                forbidden_found, keys_seen = check_forbidden(dr_reqs[-1]["body"])
            a2_ok = two_tax and suite_row_id and dr_reqs and not forbidden_found
            add_row("A2 NEW BOOKING", "PASS" if a2_ok else "FAIL",
                    "NOTE" if a2_ok else "MAJOR",
                    f"suite_row_id={suite_row_id}; two_tax={two_tax}; total={total} adv={adv} bal={bal}; direct-reservation captured={bool(dr_reqs)}; forbidden={forbidden_found}; keys_seen={keys_seen}")

            # ===== A3 CHECK-IN =====
            if suite_row_id:
                # click checkin btn
                btn = await page.query_selector(f"[data-testid='fd-row-{suite_row_id}-checkin-btn']")
                if not btn:
                    btn = await page.query_selector(f"[data-testid='fd-row-{suite_row_id}-exp-checkin-btn']")
                if btn:
                    await btn.click()
                    await page.wait_for_selector("[data-testid='checkin-form']", timeout=15000)
                    # room select
                    sel = page.locator("[data-testid='checkin-room-select']")
                    options = await sel.locator("option").all_text_contents()
                    chosen_room = None
                    for want in ("r4","r5"):
                        for opt in options:
                            low = opt.strip().lower()
                            if low.startswith(want) and "upgrade" not in low and not low.startswith("r1"):
                                chosen_room = opt; break
                        if chosen_room: break
                    if chosen_room:
                        await sel.select_option(label=chosen_room)
                        await page.wait_for_timeout(500)
                        RESULTS["room_used"] = chosen_room
                        RESULTS["table_id"] = 8525 if chosen_room.lower().startswith("r4") else 8527
                    paid_txt = await gettxt("[data-testid='checkin-bill-paid']")
                    # measure checkin-bill overflow
                    metrics = await page.evaluate("""() => {
                      const el = document.querySelector("[data-testid='checkin-bill']");
                      if (!el) return null;
                      return {sh: el.scrollHeight, ch: el.clientHeight};
                    }""")
                    RESULTS["figures"]["checkin_bill"] = metrics
                    bill_no_scroll = metrics and metrics["sh"] <= metrics["ch"]
                    await page.fill("[data-testid='checkin-collect-amount']", "500")
                    await page.click("[data-testid='checkin-pay-card']")
                    await page.wait_for_timeout(300)
                    await page.fill("[data-testid='checkin-pay-ref']", "P5QA2")
                    await page.click("[data-testid='checkin-confirm-btn']")
                    # toast
                    toast_ok = False
                    try:
                        await page.wait_for_selector("text=Checked in", timeout=20000)
                        toast_ok = True
                    except: pass
                    await page.wait_for_timeout(2000)
                    # inhouse verify
                    await page.click("[data-testid='fd-tab-inhouse']")
                    await page.wait_for_timeout(1500)
                    try:
                        await page.click("[data-testid='fd-chip-inhouse-all']")
                    except: pass
                    await page.wait_for_timeout(1500)
                    paid_cell = ""
                    try:
                        paid_cell = await gettxt(f"[data-testid='fd-row-{suite_row_id}-paid']")
                    except: pass
                    ug = [r for r in RESULTS["captured_requests"] if "user-group-check-in" in r["url"]]
                    forbidden_ci, keys_ci = ([],[])
                    if ug:
                        forbidden_ci, keys_ci = check_forbidden(ug[-1]["body"], allow_zero_set={"room_price","order_amount","gst_tax"})
                    a3_ok = toast_ok and bill_no_scroll and ("1,000" in paid_cell or "1000" in digits_only(paid_cell)) and ug and not forbidden_ci
                    add_row("A3 CHECK-IN","PASS" if a3_ok else "FAIL",
                            "NOTE" if a3_ok else "MAJOR",
                            f"room={chosen_room} tableId={RESULTS['table_id']}; paid_shown={paid_txt}; bill overflow ok={bill_no_scroll} ({metrics}); paid_cell='{paid_cell}'; toast={toast_ok}; user-group-check-in captured={bool(ug)}; forbidden={forbidden_ci}; keys={keys_ci}")
                else:
                    add_row("A3 CHECK-IN","FAIL","MAJOR", "check-in button not found on suite row")
            else:
                add_row("A3 CHECK-IN","NOT-RUN","BLOCKER","No suite row id from A2")

            # ===== A4 TOMORROW booking + guard + toggle cycle =====
            await page.click("[data-testid='fd-tab-arrivals']")
            await page.wait_for_timeout(1500)
            await page.click("[data-testid='fd-new-booking-btn']")
            await page.wait_for_selector("[data-testid='booking-form']", timeout=15000)
            phone2 = "9" + "".join(random.choices("0123456789", k=9))
            tomorrow = (datetime.strptime(biz_date,"%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d")
            day_after = (datetime.strptime(biz_date,"%Y-%m-%d") + timedelta(days=2)).strftime("%Y-%m-%d")
            await page.fill("[data-testid='booking-guest-name']", "P5 QA Tomorrow")
            await page.fill("[data-testid='booking-guest-phone']", phone2)
            await page.fill("[data-testid='booking-checkin']", tomorrow)
            await page.fill("[data-testid='booking-checkout']", day_after)
            await page.fill("[data-testid='booking-adults']", "1")
            await page.wait_for_timeout(2000)
            got_c2 = False
            for _ in range(30):
                cells = await page.query_selector_all("[data-testid^='booking-cell-']")
                if cells: got_c2=True; break
                await page.wait_for_timeout(1000)
            tomorrow_row_id = None
            if got_c2:
                suite_c = None
                for c in await page.query_selector_all("[data-testid^='booking-cell-']"):
                    tid = await c.get_attribute("data-testid") or ""
                    if "suite" in tid.lower():
                        suite_c = c; break
                if suite_c:
                    await suite_c.click()
                    await page.wait_for_timeout(500)
                    await page.click("[data-testid='booking-save-btn']")
                    try:
                        await page.wait_for_selector("[data-testid='booking-confirmation']", timeout=45000)
                        await page.click("[data-testid='booking-done-btn']")
                    except Exception as e:
                        add_row("A4 TOMORROW booking","FAIL","MAJOR", f"no confirmation: {e}")
                    await page.wait_for_timeout(1500)
                    await page.click("[data-testid='fd-chip-arrivals-tomorrow']")
                    await page.wait_for_timeout(2500)
                    rows = await page.query_selector_all("[data-testid^='fd-row-']")
                    for r in rows:
                        txt = (await r.inner_text()) or ""
                        if "P5 QA Tomorrow" in txt:
                            tid = await r.get_attribute("data-testid") or ""
                            m = re.match(r"fd-row-([^-]+)", tid)
                            if m: tomorrow_row_id = m.group(1); break
            RESULTS["created_row_ids"]["tomorrow_row_id"] = tomorrow_row_id

            btn_disabled_before = None; tooltip_ok = None
            if tomorrow_row_id:
                bb = page.locator(f"[data-testid='fd-row-{tomorrow_row_id}-checkin-btn']")
                try:
                    btn_disabled_before = await bb.is_disabled()
                except: btn_disabled_before = None
                try:
                    await bb.hover(force=True)
                    await page.wait_for_timeout(800)
                    tt = await page.query_selector("[data-testid='checkin-early-tooltip']")
                    if tt:
                        ttxt = await tt.inner_text()
                        tooltip_ok = "Arrives" in ttxt
                except: pass

            # Rules toggle
            await page.goto(url + "/pms/channel-manager", wait_until="domcontentloaded", timeout=60000)
            await page.wait_for_timeout(2000)
            await page.click("[data-testid='channel-manager-tab-4']")
            await page.wait_for_selector("[data-testid='frontdesk-rules-card']", timeout=15000)
            # verify radio still calendar
            radio_calendar_checked1 = await page.evaluate("""() => {
              const r = document.querySelector("[data-testid='radio-extend-rate-mode-calendar']");
              if (!r) return null;
              const inp = r.querySelector('input[type=radio]') || r;
              return inp.checked === true || r.getAttribute('data-state') === 'checked';
            }""")
            # Toggle ON
            tog = page.locator("[data-testid='toggle-allow-early-checkin']")
            state_before = await tog.get_attribute("aria-checked")
            if state_before != "true":
                await tog.click()
                await page.wait_for_timeout(500)
            await page.click("[data-testid='frontdesk-rules-save-btn']")
            await page.wait_for_timeout(2500)
            radio_calendar_checked2 = await page.evaluate("""() => {
              const r = document.querySelector("[data-testid='radio-extend-rate-mode-calendar']");
              if (!r) return null;
              const inp = r.querySelector('input[type=radio]') || r;
              return inp.checked === true || r.getAttribute('data-state') === 'checked';
            }""")

            # back to arrivals tomorrow
            await page.goto(url + "/pms/front-desk-v2?tab=arrivals", wait_until="domcontentloaded", timeout=60000)
            await page.wait_for_selector("[data-testid='fd-page']", timeout=20000)
            await page.click("[data-testid='fd-chip-arrivals-tomorrow']")
            await page.wait_for_timeout(3000)
            btn_enabled_after = None
            if tomorrow_row_id:
                bb = page.locator(f"[data-testid='fd-row-{tomorrow_row_id}-checkin-btn']")
                try:
                    btn_enabled_after = not await bb.is_disabled()
                except: pass

            # Toggle OFF
            await page.goto(url + "/pms/channel-manager", wait_until="domcontentloaded", timeout=60000)
            await page.wait_for_timeout(1500)
            await page.click("[data-testid='channel-manager-tab-4']")
            await page.wait_for_selector("[data-testid='toggle-allow-early-checkin']", timeout=15000)
            tog = page.locator("[data-testid='toggle-allow-early-checkin']")
            if await tog.get_attribute("aria-checked") == "true":
                await tog.click(); await page.wait_for_timeout(400)
            await page.click("[data-testid='frontdesk-rules-save-btn']")
            await page.wait_for_timeout(2500)
            await page.reload(wait_until="domcontentloaded")
            await page.wait_for_timeout(1500)
            await page.click("[data-testid='channel-manager-tab-4']")
            await page.wait_for_selector("[data-testid='toggle-allow-early-checkin']", timeout=15000)
            state_after_reload = await page.locator("[data-testid='toggle-allow-early-checkin']").get_attribute("aria-checked")

            # arrivals tomorrow button disabled again
            await page.goto(url + "/pms/front-desk-v2?tab=arrivals", wait_until="domcontentloaded", timeout=60000)
            await page.wait_for_selector("[data-testid='fd-page']", timeout=20000)
            await page.click("[data-testid='fd-chip-arrivals-tomorrow']")
            await page.wait_for_timeout(3000)
            btn_disabled_final = None
            if tomorrow_row_id:
                bb = page.locator(f"[data-testid='fd-row-{tomorrow_row_id}-checkin-btn']")
                try: btn_disabled_final = await bb.is_disabled()
                except: pass

            a4_ok = (tomorrow_row_id is not None and btn_disabled_before is True and tooltip_ok is True and
                     btn_enabled_after is True and state_after_reload == "false" and btn_disabled_final is True and
                     radio_calendar_checked2 is True)
            add_row("A4 TOMORROW+guard+toggle","PASS" if a4_ok else "FAIL",
                    "NOTE" if a4_ok else "MAJOR",
                    f"tomorrow_row_id={tomorrow_row_id}; disabled_before={btn_disabled_before}; tooltip_Arrives={tooltip_ok}; enabled_after_ON={btn_enabled_after}; toggle_off_readback={state_after_reload}; disabled_after_OFF={btn_disabled_final}; radio_calendar_after_save={radio_calendar_checked2}")

            # ===== A5 BILL / CASH SETTLE (suite row) =====
            if suite_row_id:
                await page.click("[data-testid='fd-tab-inhouse']")
                await page.wait_for_timeout(1500)
                try: await page.click("[data-testid='fd-chip-inhouse-all']")
                except: pass
                await page.wait_for_timeout(1500)
                bill_btn = await page.query_selector(f"[data-testid='fd-row-{suite_row_id}-bill-btn']")
                if bill_btn:
                    await bill_btn.click()
                    await page.wait_for_selector(f"[data-testid='bill-panel-{suite_row_id}']", timeout=15000)
                    await page.wait_for_selector("[data-testid='bill-right']", timeout=15000)
                    # wait for bill-panel-loading gone
                    for _ in range(20):
                        lo = await page.query_selector("[data-testid='bill-panel-loading']")
                        if not lo: break
                        await page.wait_for_timeout(500)
                    # geometry
                    geom = await page.evaluate("""() => {
                      const el = document.querySelector("[data-testid='bill-right'] .frontdesk-bill");
                      if (!el) return null;
                      const r = el.getBoundingClientRect();
                      return {w:r.width,h:r.height};
                    }""")
                    sgst_v = await page.query_selector("[data-testid='bill-room-sgst']")
                    cgst_v = await page.query_selector("[data-testid='bill-room-cgst']")
                    # D88 - forbidden testids
                    d88 = await page.evaluate("""() => {
                      const ids=['checkout-room-booking-toggle','checkout-transferred-toggle','checkout-room-service-toggle','payment-split-btn'];
                      const out={};
                      ids.forEach(i => {
                        const e = document.querySelector(`[data-testid='${i}']`);
                        if (!e) out[i]='absent';
                        else {
                          const st = window.getComputedStyle(e);
                          out[i] = (st.display==='none' || st.visibility==='hidden') ? 'hidden' : 'visible';
                        }
                      });
                      return out;
                    }""")
                    # balance equality
                    stack_bal_txt = ""; right_bal_txt = ""; row_bal_txt = ""
                    for _ in range(20):
                        stack_bal_txt = await gettxt("[data-testid='bill-stack-room-balance']")
                        right_bal_txt = await gettxt("[data-testid='bill-room-balance']")
                        row_bal_txt = await gettxt(f"[data-testid='fd-row-{suite_row_id}-balance']")
                        if all(x and "…" not in x for x in [stack_bal_txt, right_bal_txt, row_bal_txt]):
                            break
                        await page.wait_for_timeout(500)
                    ds, dr, drr = digits_only(stack_bal_txt), digits_only(right_bal_txt), digits_only(row_bal_txt)
                    bal_equal = ds == dr == drr and ds != ""
                    geom_ok = geom and abs(geom["w"]-440) <= 2 and abs(geom["h"]-560) <= 2
                    d88_ok = all(v in ("absent","hidden") for v in d88.values())

                    # pay cash
                    await page.click("[data-testid='payment-cash-btn']")
                    await page.wait_for_timeout(500)
                    await page.fill("[data-testid='cash-received-input']", ds or "0")
                    await page.click("[data-testid='complete-payment-btn']")
                    toast_co = False
                    try:
                        await page.wait_for_selector("text=Checked out", timeout=25000)
                        toast_co = True
                    except: pass
                    await page.wait_for_timeout(2500)
                    # row gone
                    row_gone = not bool(await page.query_selector(f"[data-testid='fd-row-{suite_row_id}-bill-btn']"))
                    # rooms tab
                    hk_badge = False
                    try:
                        await page.click("[data-testid='fd-tab-rooms']")
                        await page.wait_for_timeout(2000)
                        if RESULTS["table_id"]:
                            b = await page.query_selector(f"[data-testid='fd-room-tile-badge-{RESULTS['table_id']}']")
                            hk_badge = bool(b)
                    except: pass
                    # bill-payment forbidden keys
                    bp = [r for r in RESULTS["captured_requests"] if "bill-payment" in r["url"] or "order-bill-payment" in r["url"]]
                    forbidden_bp, keys_bp = ([],[])
                    if bp:
                        forbidden_bp, keys_bp = check_forbidden(bp[-1]["body"])
                    a5_ok = geom_ok and sgst_v and cgst_v and d88_ok and bal_equal and toast_co and row_gone and bp and not forbidden_bp
                    add_row("A5 BILL/CASH SETTLE","PASS" if a5_ok else "FAIL",
                            "NOTE" if a5_ok else "MAJOR",
                            f"geom={geom} ok={geom_ok}; sgst&cgst={bool(sgst_v) and bool(cgst_v)}; D88={d88}; bal stack={stack_bal_txt} right={right_bal_txt} row={row_bal_txt} equal={bal_equal}; toast_checked_out={toast_co}; row_gone={row_gone}; hk_badge={hk_badge}; bill-payment captured={bool(bp)}; forbidden={forbidden_bp}; keys={keys_bp}")
                else:
                    add_row("A5 BILL/CASH SETTLE","FAIL","MAJOR", "bill-btn not found on suite row")
            else:
                add_row("A5 BILL/CASH SETTLE","NOT-RUN","BLOCKER","no suite_row_id")

            # ===== A6 CONSOLE =====
            add_row("A6 CONSOLE SWEEP","PASS" if not RESULTS["console_errors"] else "FAIL",
                    "NOTE" if not RESULTS["console_errors"] else "MAJOR",
                    f"non-ignored console errors count={len(RESULTS['console_errors'])}: {RESULTS['console_errors'][:5]}")

        except Exception as e:
            traceback.print_exc()
            add_row("EXECUTION","FAIL","BLOCKER", f"Exception: {e}")
        finally:
            # ===== A7 CLEANUP =====
            try:
                # Inhouse P5 QA rows
                await page.goto(url + "/pms/front-desk-v2", wait_until="domcontentloaded", timeout=60000)
                await page.wait_for_selector("[data-testid='fd-page']", timeout=20000)
                await page.click("[data-testid='fd-tab-inhouse']"); await page.wait_for_timeout(1500)
                try: await page.click("[data-testid='fd-chip-inhouse-all']")
                except: pass
                await page.wait_for_timeout(2000)
                for attempt in range(6):
                    ids = []
                    rows = await page.query_selector_all("[data-testid^='fd-row-']")
                    for r in rows:
                        txt = (await r.inner_text()) or ""
                        if "P5 QA" in txt and "coke" not in txt.lower():
                            tid = await r.get_attribute("data-testid") or ""
                            m = re.match(r"fd-row-([^-]+)", tid)
                            if m: ids.append(m.group(1))
                    ids = list(dict.fromkeys(ids))
                    if not ids: break
                    for rid in ids:
                        try:
                            btn = await page.query_selector(f"[data-testid='fd-row-{rid}-bill-btn']")
                            if not btn: continue
                            await btn.click()
                            await page.wait_for_selector(f"[data-testid='bill-panel-{rid}']", timeout=10000)
                            await page.wait_for_timeout(1500)
                            bal_txt = await (page.locator("[data-testid='bill-stack-room-balance']").inner_text())
                            ds = digits_only(bal_txt) or "0"
                            await page.click("[data-testid='payment-cash-btn']"); await page.wait_for_timeout(300)
                            await page.fill("[data-testid='cash-received-input']", ds)
                            await page.click("[data-testid='complete-payment-btn']")
                            await page.wait_for_timeout(3000)
                        except Exception as ex:
                            print("cleanup inhouse err:", ex)
                # Arrivals P5 QA cancel
                await page.click("[data-testid='fd-tab-arrivals']"); await page.wait_for_timeout(1500)
                for chip in ["fd-chip-arrivals-late","fd-chip-arrivals-today","fd-chip-arrivals-tomorrow","fd-chip-arrivals-upcoming"]:
                    try:
                        await page.click(f"[data-testid='{chip}']")
                        await page.wait_for_timeout(1800)
                    except: continue
                    for attempt in range(6):
                        ids=[]
                        rows = await page.query_selector_all("[data-testid^='fd-row-']")
                        for r in rows:
                            txt = (await r.inner_text()) or ""
                            if "P5 QA" in txt:
                                tid = await r.get_attribute("data-testid") or ""
                                m = re.match(r"fd-row-([^-]+)", tid)
                                if m: ids.append(m.group(1))
                        ids=list(dict.fromkeys(ids))
                        if not ids: break
                        for rid in ids:
                            try:
                                cbtn = await page.query_selector(f"[data-testid='fd-row-{rid}-cancel-btn']")
                                if not cbtn: continue
                                await cbtn.click()
                                await page.wait_for_selector("[data-testid='cancel-reason-select']", timeout=8000)
                                sel = page.locator("[data-testid='cancel-reason-select']")
                                # try native select first
                                try:
                                    opts = await sel.locator("option").all_text_contents()
                                    opts = [o for o in opts if o.strip()]
                                    if opts:
                                        await sel.select_option(label=opts[0])
                                except:
                                    await sel.click()
                                    await page.wait_for_timeout(500)
                                    opt = await page.query_selector("[role='option']")
                                    if opt: await opt.click(force=True)
                                await page.click("[data-testid='cancel-booking-confirm-btn']")
                                await page.wait_for_timeout(2500)
                            except Exception as ex:
                                print("cancel err:",ex)
                # rules
                await page.goto(url + "/pms/channel-manager", wait_until="domcontentloaded", timeout=60000)
                await page.wait_for_timeout(1500)
                await page.click("[data-testid='channel-manager-tab-4']")
                await page.wait_for_selector("[data-testid='toggle-allow-early-checkin']", timeout=15000)
                tog = page.locator("[data-testid='toggle-allow-early-checkin']")
                state = await tog.get_attribute("aria-checked")
                changed=False
                if state == "true":
                    await tog.click(); changed=True; await page.wait_for_timeout(400)
                # ensure calendar radio checked
                cal_state = await page.evaluate("""() => {
                  const r = document.querySelector("[data-testid='radio-extend-rate-mode-calendar']");
                  if (!r) return null;
                  const inp = r.querySelector('input[type=radio]') || r;
                  return inp.checked === true || r.getAttribute('data-state') === 'checked';
                }""")
                if not cal_state:
                    try:
                        await page.click("[data-testid='radio-extend-rate-mode-calendar']"); changed=True
                    except: pass
                if changed:
                    await page.click("[data-testid='frontdesk-rules-save-btn']"); await page.wait_for_timeout(2000)
                final_state = await page.locator("[data-testid='toggle-allow-early-checkin']").get_attribute("aria-checked")
                final_cal = await page.evaluate("""() => {
                  const r = document.querySelector("[data-testid='radio-extend-rate-mode-calendar']");
                  if (!r) return null;
                  const inp = r.querySelector('input[type=radio]') || r;
                  return inp.checked === true || r.getAttribute('data-state') === 'checked';
                }""")
                # verify end state
                await page.goto(url + "/pms/front-desk-v2", wait_until="domcontentloaded", timeout=60000)
                await page.wait_for_selector("[data-testid='fd-page']", timeout=20000)
                await page.click("[data-testid='fd-tab-inhouse']"); await page.wait_for_timeout(1500)
                try: await page.click("[data-testid='fd-chip-inhouse-all']")
                except: pass
                await page.wait_for_timeout(1500)
                inhouse_remaining=0
                for r in await page.query_selector_all("[data-testid^='fd-row-']"):
                    txt = (await r.inner_text()) or ""
                    if "P5 QA" in txt: inhouse_remaining+=1
                arr_remaining=0
                await page.click("[data-testid='fd-tab-arrivals']"); await page.wait_for_timeout(1500)
                for chip in ["fd-chip-arrivals-late","fd-chip-arrivals-today","fd-chip-arrivals-tomorrow","fd-chip-arrivals-upcoming"]:
                    try:
                        await page.click(f"[data-testid='{chip}']"); await page.wait_for_timeout(1500)
                        for r in await page.query_selector_all("[data-testid^='fd-row-']"):
                            txt = (await r.inner_text()) or ""
                            if "P5 QA" in txt: arr_remaining+=1
                    except: pass
                RESULTS["cleanup_end_state"] = {
                    "p5_qa_rows_remaining_inhouse": inhouse_remaining,
                    "p5_qa_rows_remaining_arrivals": arr_remaining,
                    "toggle_allow_early_checkin": final_state,
                    "radio_extend_rate_mode_calendar": final_cal,
                }
                add_row("A7 CLEANUP","PASS" if inhouse_remaining==0 and arr_remaining==0 and final_state=="false" and final_cal else "FAIL",
                        "NOTE","end_state="+json.dumps(RESULTS["cleanup_end_state"]))
            except Exception as e:
                traceback.print_exc()
                add_row("A7 CLEANUP","FAIL","MAJOR", f"cleanup exception: {e}")

            await browser.close()

    with open("/app/test_reports/session_a_raw.json","w") as f:
        json.dump(RESULTS, f, indent=2, default=str)
    print("\n=== DONE ===")
    print(json.dumps(RESULTS["per_row_results"], indent=2))

if __name__ == "__main__":
    asyncio.run(main())
