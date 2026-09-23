"""CR-385 Phase 5 Session A A5 FOCUSED re-test (iteration 32).

Objective (per review_request): A single Playwright script with ONE login that
executes S1 SETUP (P5 QA Bill booking + check-in with ₹500 advance + ₹500 at
check-in), A3b PAID READ-CHECK, and A5 BILL / CASH SETTLE UI assertions
(geometry, sgst+cgst, D88, balance equality, orders/transferred sections,
POST /order-bill-payment body), then S6 console sweep and S7 cleanup in finally.

Owner rules: QA_TGK only, never touch r1/coke/order 1232674, only r4 or r5.
"""
import asyncio, os, re, json, random, time, traceback
from datetime import datetime, timedelta
from playwright.async_api import async_playwright

RESULTS = {
    "per_row_results": [],
    "captured_requests": [],
    "console_errors": [],
    "created": {},
    "figures": {},
    "cleanup_end_state": {},
}

def add_row(row, status, severity, detail):
    RESULTS["per_row_results"].append({"row": row, "status": status, "severity": severity, "detail": detail})
    print(f"[{status}] {row}: {detail[:400]}")

def digits_only(s):
    return re.sub(r"[^0-9]", "", s or "")

def parse_creds():
    text = open("/app/memory/test_credentials.md").read()
    section = text.split("## QA_TGK")[1].split("##")[0]
    m_e = re.search(r"email\s*`([^`]+)`", section)
    m_p = re.search(r"password\s*`([^`]+)`", section)
    return m_e.group(1), m_p.group(1)

FORBIDDEN_A5 = ["amount_after_tax", "rate_per_night", "room_price", "new_room_price"]

def scan_body_keys(body_str):
    """Return (all keys seen at top-level for JSON or all form-field names for multipart,
    subset that are A5-forbidden, payment_mode value, payment_amount value)."""
    keys = []
    pm = None; pa = None
    try:
        obj = json.loads(body_str)
        keys = list(obj.keys())
        pm = obj.get("payment_mode"); pa = obj.get("payment_amount")
    except Exception:
        # multipart form-data - extract names
        names = re.findall(r'name="([^"]+)"', body_str)
        keys = list(dict.fromkeys(names))
        m_pm = re.search(r'name="payment_mode"\r?\n\r?\n([^\r\n-]*)', body_str)
        if m_pm: pm = m_pm.group(1).strip()
        m_pa = re.search(r'name="payment_amount"\r?\n\r?\n([^\r\n-]*)', body_str)
        if m_pa: pa = m_pa.group(1).strip()
    forbidden = [k for k in keys if k in FORBIDDEN_A5]
    return keys, forbidden, pm, pa

async def main():
    email, password = parse_creds()
    url = open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()

    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path="/usr/bin/google-chrome", headless=True,
                                          args=["--no-sandbox","--disable-dev-shm-usage"])
        ctx = await browser.new_context(viewport={"width":1366,"height":768})
        page = await ctx.new_page()

        IGNORE = ("socket","firebase","messaging","Payment Debug")
        def _con(msg):
            if msg.type == "error":
                t = msg.text
                if not any(k.lower() in t.lower() for k in IGNORE):
                    RESULTS["console_errors"].append(t[:400])
        page.on("console", _con)

        def _on_req(req):
            if req.method in ("POST","PUT","PATCH"):
                try: body = req.post_data or ""
                except: body = ""
                RESULTS["captured_requests"].append({"url": req.url, "method": req.method, "body": body[:12000]})
        page.on("request", _on_req)

        async def gettxt(sel):
            try: return (await page.locator(sel).inner_text()).strip()
            except: return ""

        suite_row_id = None
        table_id = None
        chosen_room = None

        try:
            # ---------- S0 LOGIN ----------
            await page.goto(url + "/", wait_until="domcontentloaded", timeout=60000)
            await page.wait_for_selector("input[type='password']", timeout=30000)
            email_input = await page.query_selector("input[type='email']") or (await page.query_selector_all("input"))[0]
            pw_input = await page.query_selector("input[type='password']")
            await email_input.fill(email)
            await pw_input.fill(password)
            submit = await page.query_selector("button[type='submit']") or await page.query_selector("button")
            await submit.click()
            try: await page.wait_for_url("**/loading**", timeout=30000)
            except: pass
            end = time.time() + 90
            while time.time() < end:
                if "/loading" not in page.url and page.url != url + "/":
                    break
                await page.wait_for_timeout(500)
            if "/loading" in page.url:
                add_row("S0 LOGIN","FAIL","BLOCKER","/loading did not finish in 90s")
                return
            add_row("S0 LOGIN","PASS","NOTE",f"url={page.url}")

            # ---------- S1 SETUP: BOOKING ----------
            await page.goto(url + "/pms/front-desk-v2", wait_until="domcontentloaded", timeout=60000)
            await page.wait_for_selector("[data-testid='fd-page']", timeout=30000)
            biz_date_text = ""
            for _ in range(30):
                biz_date_text = (await page.locator("[data-testid='fd-header-date']").inner_text()).strip()
                if biz_date_text and biz_date_text != "—": break
                await page.wait_for_timeout(500)
            biz_date = "2026-09-23"
            RESULTS["figures"]["business_date"] = biz_date_text
            await page.click("[data-testid='fd-tab-arrivals']")
            await page.wait_for_timeout(1500)
            await page.click("[data-testid='fd-new-booking-btn']")
            await page.wait_for_selector("[data-testid='booking-form']", timeout=15000)
            phone = "9" + "".join(random.choices("0123456789", k=9))
            await page.fill("[data-testid='booking-guest-name']", "P5 QA Bill")
            await page.fill("[data-testid='booking-guest-phone']", phone)
            checkout = (datetime.strptime(biz_date,"%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d")
            await page.fill("[data-testid='booking-checkin']", biz_date)
            await page.fill("[data-testid='booking-checkout']", checkout)
            await page.fill("[data-testid='booking-adults']", "1")
            got = False
            for _ in range(40):
                cells = await page.query_selector_all("[data-testid^='booking-cell-']")
                if cells: got = True; break
                await page.wait_for_timeout(1000)
            if not got:
                add_row("S1 BOOKING","FAIL","BLOCKER","no booking-cell-* rendered"); return
            suite_cell = None
            for c in await page.query_selector_all("[data-testid^='booking-cell-']"):
                tid = await c.get_attribute("data-testid") or ""
                if "suite" in tid.lower(): suite_cell = c; break
            if not suite_cell:
                add_row("S1 BOOKING","FAIL","BLOCKER","no suite cell"); return
            await suite_cell.click()
            await page.wait_for_timeout(400)
            await page.click("[data-testid='booking-advance-toggle']")
            await page.wait_for_timeout(300)
            await page.fill("[data-testid='booking-advance-amount']", "500")
            await page.click("[data-testid='booking-pay-card']")
            await page.wait_for_timeout(200)
            await page.fill("[data-testid='booking-pay-ref']", "P5QA3")
            await page.click("[data-testid='booking-save-btn']")
            await page.wait_for_selector("[data-testid='booking-confirmation']", timeout=45000)
            await page.click("[data-testid='booking-done-btn']")
            await page.wait_for_timeout(1500)
            await page.click("[data-testid='fd-chip-arrivals-today']")
            await page.wait_for_timeout(2000)
            rows = await page.query_selector_all("[data-testid^='fd-row-']")
            for r in rows:
                txt = (await r.inner_text()) or ""
                if "P5 QA Bill" in txt:
                    tid = await r.get_attribute("data-testid") or ""
                    m = re.match(r"fd-row-([^-]+)", tid)
                    if m: suite_row_id = m.group(1); break
            RESULTS["created"]["row_id"] = suite_row_id
            add_row("S1 BOOKING","PASS" if suite_row_id else "FAIL","NOTE" if suite_row_id else "BLOCKER",
                    f"row_id={suite_row_id}")
            if not suite_row_id: return

            # ---------- S1 SETUP: CHECK-IN ----------
            btn = await page.query_selector(f"[data-testid='fd-row-{suite_row_id}-checkin-btn']") \
                  or await page.query_selector(f"[data-testid='fd-row-{suite_row_id}-exp-checkin-btn']")
            if not btn:
                add_row("S1 CHECK-IN","FAIL","BLOCKER","no checkin-btn"); return
            await btn.click()
            await page.wait_for_selector("[data-testid='checkin-form']", timeout=15000)
            sel = page.locator("[data-testid='checkin-room-select']")
            options = await sel.locator("option").all_text_contents()
            for want in ("r4","r5"):
                for opt in options:
                    low = opt.strip().lower()
                    if low.startswith(want) and "upgrade" not in low and not low.startswith("r1"):
                        chosen_room = opt; break
                if chosen_room: break
            if not chosen_room:
                add_row("S1 CHECK-IN","FAIL","BLOCKER",f"no r4/r5 option; options={options}"); return
            await sel.select_option(label=chosen_room)
            await page.wait_for_timeout(400)
            table_id = 8525 if chosen_room.lower().startswith("r4") else 8527
            await page.fill("[data-testid='checkin-collect-amount']", "500")
            await page.click("[data-testid='checkin-pay-card']")
            await page.wait_for_timeout(200)
            await page.fill("[data-testid='checkin-pay-ref']", "P5QA4")
            await page.click("[data-testid='checkin-confirm-btn']")
            toast_ci = False
            try:
                await page.wait_for_selector("text=Checked in", timeout=20000); toast_ci = True
            except: pass
            RESULTS["created"]["room"] = chosen_room
            RESULTS["created"]["table_id"] = table_id
            add_row("S1 CHECK-IN","PASS" if toast_ci else "FAIL","NOTE" if toast_ci else "MAJOR",
                    f"room={chosen_room} table_id={table_id} toast={toast_ci}")
            await page.wait_for_timeout(2500)

            # ---------- A3b PAID READ-CHECK ----------
            await page.click("[data-testid='fd-tab-inhouse']")
            await page.wait_for_timeout(1500)
            try: await page.click("[data-testid='fd-chip-inhouse-all']")
            except: pass
            await page.wait_for_timeout(2000)
            row_locator = page.locator(f"[data-testid='fd-row-{suite_row_id}']").first
            collapsed_text = ""
            try: collapsed_text = await row_locator.inner_text()
            except: pass
            badge_paid_so_far = "Paid so far" in collapsed_text
            badge_1000 = "1,000" in collapsed_text or "1000" in digits_only(collapsed_text)
            # Expand by clicking the row body (avoid the bill button)
            try:
                await row_locator.click(position={"x": 20, "y": 20})
            except:
                try: await row_locator.click()
                except: pass
            await page.wait_for_timeout(1500)
            exp_paid = await gettxt(f"[data-testid='fd-row-{suite_row_id}-paid']")
            exp_total = await gettxt(f"[data-testid='fd-row-{suite_row_id}-total']")
            exp_due = await gettxt(f"[data-testid='fd-row-{suite_row_id}-due']")
            RESULTS["figures"]["a3b"] = {
                "collapsed_row_text_snippet": collapsed_text[:400],
                "badge_paid_so_far": badge_paid_so_far,
                "badge_1000": badge_1000,
                "expanded_paid": exp_paid,
                "expanded_total": exp_total,
                "expanded_due": exp_due,
            }
            paid_digits_ok = "1000" in digits_only(exp_paid)
            a3b_ok = badge_paid_so_far and badge_1000 and paid_digits_ok and exp_total and exp_due
            add_row("A3b PAID READ-CHECK", "PASS" if a3b_ok else "FAIL",
                    "NOTE" if a3b_ok else "MAJOR",
                    f"badge 'Paid so far'={badge_paid_so_far}, '1,000'={badge_1000}; paid='{exp_paid}' total='{exp_total}' due='{exp_due}'")
            # try to collapse via close if present
            try:
                cl = await page.query_selector(f"[data-testid='fd-row-{suite_row_id}-close']")
                if cl: await cl.click()
            except: pass
            await page.wait_for_timeout(500)

            # ---------- A5 BILL / CASH SETTLE ----------
            bill_btn = await page.query_selector(f"[data-testid='fd-row-{suite_row_id}-bill-btn']")
            if not bill_btn:
                # if expansion collapsed away the button, expand row again
                try: await row_locator.click(position={"x":20,"y":20})
                except: pass
                await page.wait_for_timeout(800)
                bill_btn = await page.query_selector(f"[data-testid='fd-row-{suite_row_id}-bill-btn']")
            if not bill_btn:
                add_row("A5 BILL/CASH SETTLE","FAIL","BLOCKER","bill-btn not found"); 
                raise Exception("no bill-btn")
            await bill_btn.click()
            await page.wait_for_selector(f"[data-testid='bill-panel-{suite_row_id}']", timeout=20000)
            await page.wait_for_selector("[data-testid='bill-right']", timeout=20000)
            # wait bill-panel-loading gone (up to 20s)
            for _ in range(40):
                lo = await page.query_selector("[data-testid='bill-panel-loading']")
                if not lo: break
                await page.wait_for_timeout(500)

            # (a) geometry
            geom = await page.evaluate("""() => {
              const el = document.querySelector("[data-testid='bill-right'] .frontdesk-bill");
              if (!el) return null;
              const r = el.getBoundingClientRect();
              return {w: r.width, h: r.height};
            }""")
            geom_ok = bool(geom) and abs(geom["w"]-440) <= 2 and abs(geom["h"]-560) <= 2

            # (b) sgst+cgst present with ₹, toggle open/close works
            sgst_txt = await gettxt("[data-testid='bill-room-sgst']")
            cgst_txt = await gettxt("[data-testid='bill-room-cgst']")
            has_rupee_sgst = "₹" in sgst_txt
            has_rupee_cgst = "₹" in cgst_txt
            toggle_states = []
            try:
                tog = page.locator("[data-testid='bill-room-toggle']")
                if await tog.count() > 0:
                    # initial
                    sgst_visible1 = await page.is_visible("[data-testid='bill-room-sgst']")
                    await tog.first.click(force=True)
                    await page.wait_for_timeout(500)
                    sgst_visible2 = await page.is_visible("[data-testid='bill-room-sgst']")
                    await tog.first.click(force=True)
                    await page.wait_for_timeout(500)
                    sgst_visible3 = await page.is_visible("[data-testid='bill-room-sgst']")
                    toggle_states = [sgst_visible1, sgst_visible2, sgst_visible3]
            except Exception as e:
                toggle_states = [f"err:{e}"]

            # (c) D88 - each absent or display:none
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
            d88_ok = all(v in ("absent","hidden") for v in d88.values())

            # (d) money equality with up to 15s wait for '…' to resolve
            stack_txt = right_txt = row_txt = ""
            for _ in range(30):
                stack_txt = await gettxt("[data-testid='bill-stack-room-balance']")
                right_txt = await gettxt("[data-testid='bill-room-balance']")
                row_txt = await gettxt(f"[data-testid='fd-row-{suite_row_id}-balance']")
                if all(x and "…" not in x for x in [stack_txt, right_txt, row_txt]):
                    break
                await page.wait_for_timeout(500)
            ds, dr, drr = digits_only(stack_txt), digits_only(right_txt), digits_only(row_txt)
            bal_equal = ds != "" and ds == dr == drr

            # (e) orders/transferred sections
            orders_empty = bool(await page.query_selector("[data-testid='bill-orders-empty']"))
            orders_section_txt = ""
            try:
                el = await page.query_selector("text=ROOM ORDERS")
                if el: orders_section_txt = "ROOM ORDERS present"
            except: pass
            transferred_empty = bool(await page.query_selector("[data-testid='bill-transferred-empty']"))
            transferred_section_txt = ""
            try:
                el = await page.query_selector("text=TRANSFERRED")
                if el: transferred_section_txt = "TRANSFERRED present"
            except: pass
            orders_ok = orders_empty or bool(orders_section_txt)
            transferred_ok = transferred_empty or bool(transferred_section_txt)

            RESULTS["figures"]["a5"] = {
                "geom": geom, "geom_ok": geom_ok,
                "sgst": sgst_txt, "cgst": cgst_txt,
                "sgst_has_rupee": has_rupee_sgst, "cgst_has_rupee": has_rupee_cgst,
                "toggle_visibility_sequence": toggle_states,
                "d88": d88,
                "balance_stack": stack_txt, "balance_right": right_txt, "balance_row": row_txt,
                "bal_equal": bal_equal,
                "orders_empty": orders_empty, "orders_section": orders_section_txt,
                "transferred_empty": transferred_empty, "transferred_section": transferred_section_txt,
            }
            add_row("A5 UI ASSERTIONS",
                    "PASS" if (geom_ok and has_rupee_sgst and has_rupee_cgst and d88_ok and bal_equal and orders_ok and transferred_ok) else "FAIL",
                    "NOTE" if (geom_ok and has_rupee_sgst and has_rupee_cgst and d88_ok and bal_equal and orders_ok and transferred_ok) else "MAJOR",
                    f"geom={geom} ok={geom_ok}; sgst='{sgst_txt}' cgst='{cgst_txt}'; D88={d88} ok={d88_ok}; bal stack='{stack_txt}' right='{right_txt}' row='{row_txt}' equal={bal_equal}; orders_empty={orders_empty} orders_section='{orders_section_txt}'; transferred_empty={transferred_empty} transferred_section='{transferred_section_txt}'; toggle_seq={toggle_states}")

            # settle cash
            await page.click("[data-testid='payment-cash-btn']")
            await page.wait_for_timeout(500)
            await page.fill("[data-testid='cash-received-input']", ds or "0")
            await page.click("[data-testid='complete-payment-btn']")
            toast_co_text = ""
            try:
                await page.wait_for_selector("text=Checked out", timeout=30000)
                el = await page.query_selector("text=Checked out")
                if el: toast_co_text = (await el.inner_text())[:200]
            except: pass
            await page.wait_for_timeout(2500)
            # row disappeared from inhouse (re-check after refresh)
            try: await page.click("[data-testid='fd-refresh-btn']")
            except: pass
            await page.wait_for_timeout(2000)
            row_gone = not bool(await page.query_selector(f"[data-testid='fd-row-{suite_row_id}-bill-btn']"))
            # rooms tab HK badge
            hk_badge_text = ""
            try:
                await page.click("[data-testid='fd-tab-rooms']")
                await page.wait_for_timeout(2500)
                b = await page.query_selector(f"[data-testid='fd-room-tile-badge-{table_id}']")
                if b: hk_badge_text = (await b.inner_text()).strip()
            except: pass
            # bill-payment body scan
            bp = [r for r in RESULTS["captured_requests"] if "order-bill-payment" in r["url"]]
            keys_seen = []; forbidden_bp = []; pm = None; pa = None
            if bp:
                keys_seen, forbidden_bp, pm, pa = scan_body_keys(bp[-1]["body"])
            pm_ok = (str(pm).lower() == "cash")
            pa_ok = digits_only(str(pa)) == ds
            settle_ok = bool(toast_co_text) and row_gone and bp and not forbidden_bp and pm_ok and pa_ok
            RESULTS["figures"]["a5_settle"] = {
                "toast": toast_co_text, "row_gone": row_gone, "hk_badge": hk_badge_text,
                "bill_payment_captured": bool(bp),
                "bill_payment_keys_seen": keys_seen,
                "bill_payment_forbidden_present": forbidden_bp,
                "payment_mode": pm, "payment_amount": pa, "expected_amount_digits": ds,
            }
            add_row("A5 CASH SETTLE + POST", "PASS" if settle_ok else "FAIL",
                    "NOTE" if settle_ok else "MAJOR",
                    f"toast='{toast_co_text}'; row_gone={row_gone}; hk_badge='{hk_badge_text}'; keys={keys_seen}; forbidden={forbidden_bp}; payment_mode={pm}; payment_amount={pa}; expected={ds}")

            # ---------- S6 CONSOLE ----------
            add_row("S6 CONSOLE","PASS" if not RESULTS["console_errors"] else "FAIL",
                    "NOTE" if not RESULTS["console_errors"] else "MAJOR",
                    f"count={len(RESULTS['console_errors'])}: {RESULTS['console_errors'][:5]}")
        except Exception as e:
            traceback.print_exc()
            add_row("EXECUTION","FAIL","BLOCKER",f"Exception: {e}")
        finally:
            # ---------- S7 CLEANUP ----------
            try:
                await page.goto(url + "/pms/front-desk-v2", wait_until="domcontentloaded", timeout=60000)
                await page.wait_for_selector("[data-testid='fd-page']", timeout=20000)
                await page.click("[data-testid='fd-tab-inhouse']"); await page.wait_for_timeout(1500)
                try: await page.click("[data-testid='fd-chip-inhouse-all']")
                except: pass
                await page.wait_for_timeout(2000)
                for _ in range(6):
                    ids=[]
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
                            b = await page.query_selector(f"[data-testid='fd-row-{rid}-bill-btn']")
                            if not b: continue
                            await b.click()
                            await page.wait_for_selector(f"[data-testid='bill-panel-{rid}']", timeout=10000)
                            await page.wait_for_timeout(1500)
                            bal = await gettxt("[data-testid='bill-stack-room-balance']")
                            ds = digits_only(bal) or "0"
                            await page.click("[data-testid='payment-cash-btn']"); await page.wait_for_timeout(300)
                            await page.fill("[data-testid='cash-received-input']", ds)
                            await page.click("[data-testid='complete-payment-btn']")
                            await page.wait_for_timeout(3500)
                        except Exception as ex: print("cleanup inhouse err:", ex)
                await page.click("[data-testid='fd-tab-arrivals']"); await page.wait_for_timeout(1500)
                for chip in ["fd-chip-arrivals-late","fd-chip-arrivals-today","fd-chip-arrivals-tomorrow","fd-chip-arrivals-upcoming"]:
                    try: await page.click(f"[data-testid='{chip}']"); await page.wait_for_timeout(1800)
                    except: continue
                    for _ in range(6):
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
                                cb = await page.query_selector(f"[data-testid='fd-row-{rid}-cancel-btn']")
                                if not cb: continue
                                await cb.click()
                                await page.wait_for_selector("[data-testid='cancel-reason-select']", timeout=8000)
                                s = page.locator("[data-testid='cancel-reason-select']")
                                try:
                                    opts = await s.locator("option").all_values() if hasattr(s.locator("option"), "all_values") else []
                                except: opts = []
                                try:
                                    await s.select_option(value="411")
                                except:
                                    try:
                                        opts_t = await s.locator("option").all_text_contents()
                                        opts_t = [o for o in opts_t if o.strip()]
                                        if opts_t: await s.select_option(label=opts_t[0])
                                    except: pass
                                await page.click("[data-testid='cancel-booking-confirm-btn']")
                                await page.wait_for_timeout(2500)
                            except Exception as ex: print("cancel err:", ex)
                # end-state count
                await page.click("[data-testid='fd-tab-inhouse']"); await page.wait_for_timeout(1500)
                try: await page.click("[data-testid='fd-chip-inhouse-all']")
                except: pass
                await page.wait_for_timeout(1500)
                inh=0
                for r in await page.query_selector_all("[data-testid^='fd-row-']"):
                    if "P5 QA" in ((await r.inner_text()) or ""): inh+=1
                arr=0
                await page.click("[data-testid='fd-tab-arrivals']"); await page.wait_for_timeout(1500)
                for chip in ["fd-chip-arrivals-late","fd-chip-arrivals-today","fd-chip-arrivals-tomorrow","fd-chip-arrivals-upcoming"]:
                    try:
                        await page.click(f"[data-testid='{chip}']"); await page.wait_for_timeout(1500)
                        for r in await page.query_selector_all("[data-testid^='fd-row-']"):
                            if "P5 QA" in ((await r.inner_text()) or ""): arr+=1
                    except: pass
                RESULTS["cleanup_end_state"] = {"p5_qa_inhouse": inh, "p5_qa_arrivals": arr}
                add_row("S7 CLEANUP", "PASS" if inh==0 and arr==0 else "FAIL",
                        "NOTE" if inh==0 and arr==0 else "MAJOR",
                        f"end_state={RESULTS['cleanup_end_state']}")
            except Exception as e:
                traceback.print_exc()
                add_row("S7 CLEANUP","FAIL","MAJOR",f"cleanup exception: {e}")
            await browser.close()

    with open("/app/test_reports/a5_focused_raw.json","w") as f:
        json.dump(RESULTS, f, indent=2, default=str)
    print("\n=== DONE ===")
    print(json.dumps(RESULTS["per_row_results"], indent=2))

if __name__ == "__main__":
    asyncio.run(main())
