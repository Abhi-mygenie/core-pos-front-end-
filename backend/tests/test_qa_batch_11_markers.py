# QA batch (11 items: BUG-354/573/598/599/600/601/618, CR-429/430/449/475) — code marker & guard regression checks
import os
import re
import subprocess
import pytest

SRC = "/app/frontend/src"


def _grep_count(marker):
    out = subprocess.run(
        ["grep", "-rn", "--include=*.js", "--include=*.jsx", marker, SRC],
        capture_output=True, text=True,
    ).stdout
    lines = [l for l in out.splitlines() if "__tests__" not in l and ".bak" not in l]
    return len(lines)


def _read(rel):
    with open(os.path.join(SRC, rel)) as f:
        return f.read()


@pytest.mark.parametrize("marker,minimum", [
    ("BUG-354", 3), ("CR-429", 11), ("CR-430", 10), ("BUG-573", 1),
    ("BUG-600", 5), ("CR-449", 27), ("CR-475", 10), ("BUG-598", 9),
    ("BUG-599", 15), ("BUG-601", 10),
])
def test_markers_present(marker, minimum):
    assert _grep_count(marker) >= minimum


# BUG-354: status badge map has 7 entries incl TAB/prepaid/postpaid
def test_bug354_status_map():
    src = _read("pages/reports-module/OrderReportBetaPage.jsx")
    block = re.search(r"const getStatusBadge = \(pt\) => \{(.*?)\};\s*return", src, re.S).group(1)
    for k in ["Cash:", "Unpaid:", "Cancel:", "Partial:", "TAB:", "prepaid:", "postpaid:"]:
        assert k in block


# BUG-618: null guard for variation group in getItemLinePrice (labelled BUG-NEW in code)
def test_bug618_null_guard():
    src = _read("components/order-entry/CollectPaymentPanel.jsx")
    assert "if (!group) return s;" in src


# BUG-598: authService stores assign_food_menu in sessionStorage
def test_bug598_session_store():
    assert "sessionStorage.setItem('assign_food_menu'" in _read("api/services/authService.js")
    assert "sessionStorage.getItem('assign_food_menu')" in _read("contexts/AuthContext.jsx")


# CR-430: served auto-expand toggle testid
def test_cr430_toggle():
    src = _read("pages/StatusConfigPage.jsx")
    assert "mygenie_served_auto_expand" in src and 'data-testid="served-auto-expand-toggle"' in src
