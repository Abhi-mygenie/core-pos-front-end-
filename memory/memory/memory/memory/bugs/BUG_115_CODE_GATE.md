# BUG-115 — Pre-Implementation Code Gate (Gate 4)

**Bug:** BUG-115 — Audit Report cancelled order tab filter parity with Order Ledger
**Date:** 2026-06-07
**Agent:** E1 (Emergent)
**Sprint:** POS 4.0
**Owner GO:** 2026-06-07 (verbatim: "go")

---

## Scope Lock

**WILL change:** `src/pages/AllOrdersReportPage.jsx` — L70, L84, L107
**Will NOT change:** All other files

## Exact Diffs

### L70 (paid tab exclusion):
```diff
-    if (o.paymentMethod === 'Cancel') return false;
+    if (o.paymentMethod === 'Cancel' || o.paymentMethod?.toLowerCase() === 'cancelled') return false;
```

### L84 (cancelled tab filter):
```diff
-  cancelled: (o) => o.paymentMethod === 'Cancel',
+  cancelled: (o) => o.paymentMethod === 'Cancel' || o.paymentMethod?.toLowerCase() === 'cancelled',
```

### L107 (running tab exclusion):
```diff
-    if (o.paymentMethod === 'Cancel') return false;
+    if (o.paymentMethod === 'Cancel' || o.paymentMethod?.toLowerCase() === 'cancelled') return false;
```
