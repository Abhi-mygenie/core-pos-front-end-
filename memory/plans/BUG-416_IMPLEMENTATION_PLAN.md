# Implementation Plan — BUG-416
## Night Audit + Revenue Dashboard: Add Sidebar and Back Button

**Date:** 2026-09-15
**Agent:** PLANNING (ALPHA v0.7)
**Gate:** 3 — Implementation Plan
**IA doc:** `impact/BUG-416_IMPACT_ANALYSIS.md`
**Entry verification:** Both pages confirmed shell-less (no Sidebar import, no useNavigate). Outer wrappers at NightAuditPage:L110 and RevenueDashboardPage:L151 match plan exactly.

---

## Scope Lock

**Files WILL change:**
- `src/pages/pms/NightAuditPage.jsx` — 4 edit sites
- `src/pages/pms/RevenueDashboardPage.jsx` — 4 edit sites

**Files WILL NOT touch:**
- `App.js` — routes already defined
- Any service, transform, API, or other component

---

## Reference Pattern

From `InHouseGuestsPage.jsx` (the exact model):
```javascript
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';

// inside component:
const navigate = useNavigate();
const [isSidebarExpanded, setIsSidebarExpanded] = useState(
  () => localStorage.getItem('mygenie_sidebar_expanded') !== 'false'
);

// outer wrapper:
<div className="flex h-screen bg-[#F7F7F7]">
  <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={v => {
    setIsSidebarExpanded(v);
    localStorage.setItem('mygenie_sidebar_expanded', String(v));
  }} />
  <main className="flex-1 overflow-auto">
    ...
  </main>
</div>
```

---

## FILE 1 — `src/pages/pms/NightAuditPage.jsx`

### N-E1 — Add imports

**Find (exact):**
```javascript
import { useRestaurant } from '../../contexts/RestaurantContext';
import { useAuth } from '../../contexts/AuthContext';
```

**Replace with:**
```javascript
import { useNavigate } from 'react-router-dom'; // BUG-416
import { ArrowLeft } from 'lucide-react'; // BUG-416 (ArrowLeft added alongside existing lucide imports below)
import Sidebar from '../../components/layout/Sidebar'; // BUG-416
import { useRestaurant } from '../../contexts/RestaurantContext';
import { useAuth } from '../../contexts/AuthContext';
```

**Note:** `ArrowLeft` will also be appended to the existing lucide import destructure at line 3 (`import { Calendar, Download, FileText, ChevronDown, ChevronRight, AlertTriangle, Clock } from 'lucide-react'`). Two-part change: add `ArrowLeft` to existing lucide import AND add the 3 new import lines.

**Revised E1 — single clean approach:**

**Find (exact):**
```javascript
import { Calendar, Download, FileText, ChevronDown, ChevronRight, AlertTriangle, Clock } from 'lucide-react';
```
**Replace with:**
```javascript
import { Calendar, Download, FileText, ChevronDown, ChevronRight, AlertTriangle, Clock, ArrowLeft } from 'lucide-react'; // BUG-416: ArrowLeft added
import { useNavigate } from 'react-router-dom'; // BUG-416
import Sidebar from '../../components/layout/Sidebar'; // BUG-416
```

---

### N-E2 — Add sidebar state + navigate inside component

**Find (exact):**
```javascript
export default function NightAuditPage() { // CR-363
  const { restaurant } = useRestaurant();
  const { user } = useAuth();
  const [date, setDate] = useState(localDate(0));
```

**Replace with:**
```javascript
export default function NightAuditPage() { // CR-363
  const navigate = useNavigate(); // BUG-416
  const [isSidebarExpanded, setIsSidebarExpanded] = useState( // BUG-416
    () => localStorage.getItem('mygenie_sidebar_expanded') !== 'false'
  );
  const { restaurant } = useRestaurant();
  const { user } = useAuth();
  const [date, setDate] = useState(localDate(0));
```

---

### N-E3 — Replace outer wrapper with flex shell + Sidebar

**Find (exact):**
```jsx
  return (
    <div className="min-h-screen bg-[#F7F7F7] px-4 py-5" style={{ fontFamily: "'Poppins','Inter',sans-serif" }}>
      <div className="max-w-6xl mx-auto">
```

**Replace with:**
```jsx
  return (
    <div className="flex h-screen bg-[#F7F7F7]" data-testid="night-audit-page"> {/* BUG-416 */}
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={v => {
        setIsSidebarExpanded(v);
        localStorage.setItem('mygenie_sidebar_expanded', String(v));
      }} />
      <main className="flex-1 overflow-auto">
      <div className="px-4 py-5" style={{ fontFamily: "'Poppins','Inter',sans-serif" }}>
      <div className="max-w-6xl mx-auto">
```

---

### N-E4 — Add Back button to page header + close new wrappers

**Find (exact):**
```jsx
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-bold text-[#1A1A1A]">Night Audit Report</h1>
            <p className="text-xs text-[#888] mt-0.5">End-of-day hotel financial &amp; room reconciliation</p>
          </div>
```

**Replace with:**
```jsx
        {/* Header */} {/* BUG-416: back button added */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} data-testid="night-audit-back-btn"
              className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#555] transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-[#1A1A1A]">Night Audit Report</h1>
              <p className="text-xs text-[#888] mt-0.5">End-of-day hotel financial &amp; room reconciliation</p>
            </div>
          </div>
```

**Also: close the two new wrappers at the end of the return.**

At the very end of the return, find the existing closing:
```jsx
      </div>
    </div>
  );
}
```
Replace with:
```jsx
      </div>
      </div>
      </main>
    </div>
  );
}
```

---

## FILE 2 — `src/pages/pms/RevenueDashboardPage.jsx`

### R-E1 — Add imports

**Find (exact):**
```javascript
import { Download, FileText, TrendingUp, TrendingDown } from 'lucide-react';
```

**Replace with:**
```javascript
import { Download, FileText, TrendingUp, TrendingDown, ArrowLeft } from 'lucide-react'; // BUG-416: ArrowLeft added
import { useNavigate } from 'react-router-dom'; // BUG-416
import Sidebar from '../../components/layout/Sidebar'; // BUG-416
```

---

### R-E2 — Add sidebar state + navigate inside component

**Find (exact):**
```javascript
export default function RevenueDashboardPage() { // CR-366
  const { restaurant } = useRestaurant();
  const { user } = useAuth();
  const [preset, setPreset] = useState('7d');
```

**Replace with:**
```javascript
export default function RevenueDashboardPage() { // CR-366
  const navigate = useNavigate(); // BUG-416
  const [isSidebarExpanded, setIsSidebarExpanded] = useState( // BUG-416
    () => localStorage.getItem('mygenie_sidebar_expanded') !== 'false'
  );
  const { restaurant } = useRestaurant();
  const { user } = useAuth();
  const [preset, setPreset] = useState('7d');
```

---

### R-E3 — Replace outer wrapper with flex shell + Sidebar

**Find (exact):**
```jsx
  return (
    <div className="min-h-screen bg-[#F7F7F7] px-4 py-5" style={{ fontFamily: "'Poppins','Inter',sans-serif" }}>
      <div className="max-w-6xl mx-auto space-y-4">
```

**Replace with:**
```jsx
  return (
    <div className="flex h-screen bg-[#F7F7F7]" data-testid="revenue-dashboard-page"> {/* BUG-416 */}
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={v => {
        setIsSidebarExpanded(v);
        localStorage.setItem('mygenie_sidebar_expanded', String(v));
      }} />
      <main className="flex-1 overflow-auto">
      <div className="px-4 py-5" style={{ fontFamily: "'Poppins','Inter',sans-serif" }}>
      <div className="max-w-6xl mx-auto space-y-4">
```

---

### R-E4 — Add Back button to page header + close new wrappers

**Find (exact):**
```jsx
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#1A1A1A]">Revenue Dashboard</h1>
            <p className="text-xs text-[#888] mt-0.5">Hotel financial performance &amp; occupancy analytics</p>
          </div>
```

**Replace with:**
```jsx
        {/* Header */} {/* BUG-416: back button added */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} data-testid="revenue-dashboard-back-btn"
              className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#555] transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-[#1A1A1A]">Revenue Dashboard</h1>
              <p className="text-xs text-[#888] mt-0.5">Hotel financial performance &amp; occupancy analytics</p>
            </div>
          </div>
```

**Close new wrappers at end of return** — same as NightAuditPage:

Find closing:
```jsx
      </div>
    </div>
  );
}
```
Replace with:
```jsx
      </div>
      </div>
      </main>
    </div>
  );
}
```

---

## Verification Matrix

| # | File | Test | Expected | How |
|---|---|---|---|---|
| V1 | NightAuditPage | Navigate to /pms/night-audit | Sidebar visible on left | Browser |
| V2 | NightAuditPage | Click back button | Returns to previous page | Browser |
| V3 | RevenueDashboardPage | Navigate to /pms/revenue | Sidebar visible on left | Browser |
| V4 | RevenueDashboardPage | Click back button | Returns to previous page | Browser |
| V5 | Both | Sidebar expand/collapse | Persists in localStorage | Browser |
| V6 | Both | Existing charts/tables/exports | Unchanged, still functional | Browser |

---

## Risk Register

| Risk | Mitigation |
|---|---|
| Closing div mismatch — extra/missing `</div>` | Implementation agent must count wrappers carefully. Compile check will catch JSX structure errors immediately. |
| Page content overflowing | `<main className="flex-1 overflow-auto">` + inner `px-4 py-5` preserves original spacing |

---

## Post-Code Registry Checklist

- [ ] registry.json: BUG-416 → GATE_5A_IMPLEMENTED, gate: 5
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: NightAuditPage.jsx + RevenueDashboardPage.jsx — BUG-416
- [ ] Code markers: `// BUG-416` in all 8 edit sites
- [ ] webpack: 0 new warnings

*Plan written 2026-09-15 · PLANNING agent (ALPHA v0.7)*
