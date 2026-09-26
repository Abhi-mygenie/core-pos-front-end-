# CR-389 — Evidence pointer (2026-09-26)

| Evidence | Path | Note |
|---|---|---|
| PMS Screen Reference v2.0 (the model deliverable) | `frontend/public/MyGenie_PMS_Screen_Reference.pdf` | 38 pp · 36 screens · 5 sections · 16 Sep 2026 |
| PMS Screen Reference v1.0 | `frontend/public/MyGenie_PMS_Screen_Reference_v1_2026-09-05.pdf` | 14 pp · 13 screens · superseded |
| PMS static design mockups (not PDF source) | `frontend/public/pms/*.html` (13), `frontend/public/pms-mockup.html`, `frontend/public/cr358-p4-pms-mockup.html` | Tailwind CDN mockups |
| Method record | `memory/handover/SESSION_HANDOVER_2026_09_06_PMS_TRACK.md` §2 | "dummy data injected via DOM (`/app/pms_dummy_data.py`, `/app/generate_pms_pdf_v2.py`)" |
| Generator scripts | — | **ABSENT**: `ls /app/*.py` → none; `git log --all -- '*generate_pms_pdf*' '*pms_dummy_data*'` → no commits |
| Route inventory used for module list | `frontend/src/App.js` (`grep -o 'path="[^"]*"'`) | 2026-09-26 |

PDF v2.0 contents page (verbatim section headers): FRONT OFFICE (01–17) · BILLING (18–19) · ROOMS (20–22) · DISTRIBUTION (23–30) · REPORTS (31–36).
