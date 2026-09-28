#!/usr/bin/env python3
# CR-390: Screen Reference pipeline — Playwright screenshot runner
# Usage: python3 runner.py --module MM --url https://... --email ... --password ... [--real-name "The Palm House"] [--only 12,13]
# Rules:
#   - Never run before G-journey sub-gate is approved (journey_approved: true in manifest)
#   - DOM-swaps real restaurant name -> persona business_name (OD-390-02)
#   - Read-only capture: pre_actions may open forms/dialogs but must never Save/Delete/Confirm
#   - Saves PNGs to /app/memory/evidence/CR-390/<MODULE>/

import argparse
import json
import sys
from pathlib import Path

BASE_DIR = Path(__file__).parent
EVIDENCE_DIR = Path("/app/memory/evidence/CR-390")
PERSONA = json.loads((BASE_DIR / "persona.json").read_text(encoding="utf-8"))
FICTIONAL_NAME = PERSONA["business_name"]  # OD-390-02
VIEWPORT = {"width": 1440, "height": 900}


def load_manifest(module_code):
    """CR-390: Load and validate the module manifest."""
    manifests = list((BASE_DIR / "manifests").glob(f"{module_code}_*.json"))
    if not manifests:
        sys.exit(f"[CR-390] ERROR: No manifest found for module '{module_code}' in {BASE_DIR / 'manifests'}/")
    manifest = json.loads(manifests[0].read_text(encoding="utf-8"))
    if not manifest.get("journey_approved"):
        sys.exit(
            f"[CR-390] BLOCKED: journey_approved=false for module '{module_code}'.\n"
            f"  Sub-gate G-journey not approved yet. Set journey_approved=true + journey_approved_date after owner GO."
        )
    if not manifest.get("journey"):
        sys.exit(f"[CR-390] ERROR: manifest 'journey' array is empty for '{module_code}'.")
    return manifest


def swap_restaurant_name(page, real_name, fictional_name):
    """CR-390: DOM-swap every text node containing the real restaurant name -> persona (OD-390-02)."""
    page.evaluate(
        """([real, fake]) => {
            const re = new RegExp(real.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'gi');
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            let n;
            while ((n = walker.nextNode())) {
                if (re.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(re, fake);
            }
            document.querySelectorAll('input, textarea').forEach(el => {
                if (re.test(el.value)) el.value = el.value.replace(re, fake);
            });
        }""",
        [real_name, fictional_name],
    )


def scrub_toasts(page):
    """CR-390: remove transient error/success toasts (slow preprod API) before capture."""
    page.evaluate("""() => {
        document.querySelectorAll('li[role="status"], [data-sonner-toast], [data-radix-toast-viewport] li').forEach(el => el.remove());
    }""")


def _loc(page, action):
    loc = page.locator(action["selector"])
    if "nth" in action:
        loc = loc.nth(action["nth"])
    return loc.first if "nth" not in action else loc


def execute_action(page, action):
    """CR-390: Execute one pre/post action. Every action is soft-fail (warn + continue)."""
    t = action.get("type", "")
    try:
        if t == "click":
            _loc(page, action).click(timeout=6000)
            page.wait_for_timeout(action.get("wait_after", 500))
        elif t == "hover":
            _loc(page, action).hover(timeout=6000)
            page.wait_for_timeout(action.get("wait_after", 400))
        elif t == "type":
            _loc(page, action).fill(action["value"], timeout=6000)
            page.wait_for_timeout(action.get("wait_after", 400))
        elif t == "select":
            _loc(page, action).select_option(action["value"], timeout=6000)
            page.wait_for_timeout(action.get("wait_after", 800))
        elif t == "press":
            page.keyboard.press(action["key"])
            page.wait_for_timeout(action.get("wait_after", 300))
        elif t == "wait":
            page.wait_for_timeout(action.get("ms", 1000))
        elif t == "wait_for":
            try:
                page.wait_for_selector(action["selector"], timeout=action.get("timeout", 10000))
            except Exception:
                if not action.get("reload"):
                    raise
                print("  [INFO] wait_for timed out — reloading once (slow preprod API)")
                page.reload(wait_until="networkidle", timeout=60000)
                page.wait_for_selector(action["selector"], timeout=action.get("timeout", 10000))
        elif t == "wait_hidden":
            page.wait_for_selector(action["selector"], state="hidden", timeout=action.get("timeout", 60000))
        elif t == "scroll":
            page.evaluate(f"window.scrollTo(0, {action.get('y', 0)})")
            page.wait_for_timeout(300)
        elif t == "scroll_into_view":
            _loc(page, action).scroll_into_view_if_needed(timeout=6000)
            page.wait_for_timeout(300)
        elif t == "scroll_container":
            # scroll an overflow container by dy px
            _loc(page, action).evaluate(f"el => el.scrollBy(0, {action.get('dy', 400)})")
            page.wait_for_timeout(400)
        elif t == "drag_hold":
            # press on a drag handle and move it — leaves mouse DOWN so the lifted state is captured;
            # pair with a post_action {"type": "mouse_up"}
            box = _loc(page, action).bounding_box(timeout=6000)
            if not box:
                raise RuntimeError("handle not visible")
            cx, cy = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
            page.mouse.move(cx, cy)
            page.mouse.down()
            page.mouse.move(cx, cy + 6, steps=3)
            page.wait_for_timeout(150)
            page.mouse.move(cx + action.get("dx", 0), cy + action.get("dy", 120), steps=20)
            page.wait_for_timeout(action.get("wait_after", 500))
        elif t == "mouse_up":
            page.mouse.up()
            page.wait_for_timeout(400)
        elif t == "eval":
            page.evaluate(action["js"])
            page.wait_for_timeout(action.get("wait_after", 300))
        else:
            print(f"  [WARN] unknown action type '{t}'")
    except Exception as e:  # noqa: BLE001
        print(f"  [WARN] {t} '{action.get('selector', action.get('key', ''))}' failed: {str(e).splitlines()[0]}")


def login(page, url, email, password):
    """CR-390: Authenticate on the POS login screen (employee -> /dashboard, admin -> /restaurant-picker)."""
    print(f"  Navigating to {url} as {email} ...")
    page.goto(url, wait_until="domcontentloaded", timeout=60000)
    page.evaluate("() => { localStorage.clear(); sessionStorage.clear(); }")
    page.context.clear_cookies()
    page.goto(url, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_selector("[data-testid='login-email']", timeout=20000)
    page.fill("[data-testid='login-email']", email)
    page.fill("[data-testid='login-password']", password)
    page.click("button[type='submit'], button:has-text('LOG IN'), button:has-text('Login')")
    try:
        page.wait_for_url("**/dashboard**", timeout=20000)
    except Exception:
        if "restaurant-picker" in page.url:
            print("  Restaurant picker reached — selecting first restaurant.")
            page.click("[data-testid*='restaurant']", timeout=8000)
            page.wait_for_url("**/dashboard**", timeout=20000)
        else:
            print(f"  [WARN] Dashboard not reached, current url: {page.url}")
    page.wait_for_timeout(1500)
    print("  Login complete.")


def main():
    """CR-390: Main runner entry point."""
    parser = argparse.ArgumentParser(description="CR-390: MyGenie Screen Reference PDF pipeline — screenshot runner")
    parser.add_argument("--module", required=True, help="Module code (MM, EM, IM, DC, CM, DR, IN-Basic, IN-Advanced, PMS)")
    parser.add_argument("--url", required=True, help="App URL")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--real-name", default="The Palm House", help="Real restaurant name to DOM-swap")
    parser.add_argument("--only", default="", help="Comma list of screen numbers to (re)capture, e.g. 12,13")
    args = parser.parse_args()
    only = {int(x) for x in args.only.split(",") if x.strip()}

    print(f"\n[CR-390] Runner starting for module: {args.module}")
    manifest = load_manifest(args.module)
    print(f"  Module: {manifest['module_name']}  ·  approved {manifest.get('journey_approved_date')}")

    out_dir = EVIDENCE_DIR / args.module
    out_dir.mkdir(parents=True, exist_ok=True)

    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport=VIEWPORT, device_scale_factor=2)
        page = context.new_page()
        login(page, args.url, args.email, args.password)
        current_email, current_real_name = args.email, args.real_name

        counter = 1
        for route_entry in manifest["journey"]:
            route = route_entry["route"]
            states = route_entry.get("states", [])
            wanted = [s for i, s in enumerate(states) if not only or (counter + i) in only]
            if not wanted:
                counter += len(states)
                continue
            print(f"\n  [{route_entry.get('section', '')}] {route} ({len(states)} state(s))")
            login_as = route_entry.get("login_as")
            if login_as and login_as["email"] != current_email:
                print(f"  Switching account -> {login_as['email']}")
                login(page, args.url, login_as["email"], args.password)
                current_email, current_real_name = login_as["email"], login_as.get("real_name", args.real_name)
            elif not login_as and current_email != args.email:
                login(page, args.url, args.email, args.password)
                current_email, current_real_name = args.email, args.real_name
            for state in states:
                if only and counter not in only:
                    counter += 1
                    continue
                if state.get("fresh_route", True) or state is states[0]:
                    page.goto(args.url.rstrip("/") + route, wait_until="domcontentloaded", timeout=60000)
                    page.wait_for_timeout(state.get("settle_ms", 1800))
                for action in state.get("pre_actions", []):
                    execute_action(page, action)
                scrub_toasts(page)
                swap_restaurant_name(page, current_real_name, FICTIONAL_NAME)
                page.wait_for_timeout(250)
                filename = f"{counter:02d}_{state['slug']}.png"
                page.screenshot(path=str(out_dir / filename), full_page=False)
                print(f"    [{counter:02d}] {state['slug']} -> {filename}")
                for action in state.get("post_actions", []):
                    execute_action(page, action)
                counter += 1
        browser.close()

    print(f"\n[CR-390] Done. Screenshots in {out_dir}/")
    print(f"  Next: python3 assemble.py --module {args.module} --layout side")


if __name__ == "__main__":
    main()
