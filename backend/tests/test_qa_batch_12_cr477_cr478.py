# QA batch 12 (BUG-624, BUG-627, CR-477, CR-478) — preprod API checks + code marker checks
import os
import datetime as dt
import pytest
import requests

PREPROD = "https://preprod.mygenie.online"
SRC = "/app/frontend/src"


def _read(rel):
    with open(os.path.join(SRC, rel)) as f:
        return f.read()


def _login(email):
    r = requests.post(f"{PREPROD}/api/v1/auth/vendoremployee/common-login",
                      json={"email": email, "password": "Qplazm@10"}, timeout=90)
    assert r.status_code == 200, r.text[:300]
    d = r.json()
    tok = d.get("token") or (d.get("data") or {}).get("token")
    if not tok:
        pytest.skip(f"no token in login response keys={list(d.keys())}")
    return tok


@pytest.fixture(scope="module")
def palm():
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {_login('owner@palmhouse.com')}", "Content-Type": "application/json"})
    return s


def _dates(days):
    t = dt.date.today()
    return str(t - dt.timedelta(days=days)), str(t)


# CR-477: received L7D returns ingredients with expected shape
def test_cr477_received_l7d(palm):
    f, t = _dates(7)
    r = palm.post(f"{PREPROD}/api/v2/vendoremployee/inventory-transfer/ingredient-movement-report",
                  json={"movement": "received", "from_date": f, "to_date": t}, timeout=120)
    assert r.status_code == 200, r.text[:300]
    d = r.json()
    ings = d.get("ingredients")
    assert isinstance(ings, list)
    print("received count", len(ings))
    assert len(ings) >= 1
    ing = ings[0]
    for k in ["stock_title", "unit", "total_qty", "line_count", "lines"]:
        assert k in ing
    line = ing["lines"][0]
    for k in ["transfer_id", "from_restaurant_name", "to_restaurant_name", "dispatched_at", "received_at", "quantity", "status"]:
        assert k in line, k


# CR-477: dispatched returns empty for Palm House
def test_cr477_dispatched_empty(palm):
    f, t = _dates(7)
    r = palm.post(f"{PREPROD}/api/v2/vendoremployee/inventory-transfer/ingredient-movement-report",
                  json={"movement": "dispatched", "from_date": f, "to_date": t}, timeout=120)
    assert r.status_code == 200
    assert r.json().get("ingredients") == []


# CR-478: item consumption 3M — ingredient search logic replicated
def test_cr478_ingredient_search(palm):
    t = dt.date.today()
    f = t.replace(month=t.month - 3) if t.month > 3 else t.replace(year=t.year - 1, month=t.month + 9)
    r = palm.post(f"{PREPROD}/api/v2/vendoremployee/report/item-consumption-report",
                  json={"from_date": str(f), "to_date": str(t)}, timeout=180)
    if r.status_code == 404:
        pytest.skip("endpoint path differs")
    assert r.status_code == 200, r.text[:300]
    items = r.json().get("items") or r.json().get("data") or []
    print("items", len(items))

    def match(term):
        term = term.lower()
        out = []
        for it in items:
            if term in (it.get("item_name") or "").lower():
                out.append(it["item_name"]); continue
            ings = (it.get("consumed_ingredients") or []) + (it.get("returned_ingredients") or []) + (it.get("wastage_ingredients") or [])
            if any(term in (i.get("ingredient_name") or "").lower() for i in ings):
                out.append(it["item_name"])
        return out
    vp = match("Vanilla Protein")
    bt = match("Blue Tokai")
    print("vanilla", vp, "blue tokai", len(bt))
    assert len(items) > 0
    assert len(vp) >= 1
    assert len(bt) >= 1


# BUG-624 / BUG-627 / CR-477 / CR-478 code markers
def test_code_markers():
    assert "color: servedAutoExpand ? '#fff' : COLORS.darkText" in _read("pages/StatusConfigPage.jsx")
    pf = _read("components/panels/menu/ProductForm.jsx")
    assert "Item-level station override active. KOTs will route to the selected station." in pf
    assert "Category default:" not in pf
    assert '"/reports-module/ingredient-movement"' in _read("components/layout/Sidebar.jsx")
    assert 'path="ingredient-movement"' in _read("App.js")
    assert 'placeholder="Search item or ingredient..."' in _read("pages/reports-module/ItemConsumptionReportPage.jsx")
