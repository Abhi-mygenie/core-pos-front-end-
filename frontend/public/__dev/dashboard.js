/* eslint-disable */
// MyGenie POS — Control Dashboard v1.1 (Dev only)
// Adds: click-to-expand row details + cross-tab linking + collapsible status groups
// Reads /public/__dev/data/*.json — no backend, no /src import.

const { useState, useEffect, useMemo, useCallback, useRef } = React;

// ============================================================================
// CONSTANTS & HELPERS
// ============================================================================
const SEV_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, RESOLVED: 4, OK: 4 };

const ARTIFACT_LABELS = {
  art1_intake: "Intake",
  art2_impact_analysis: "Impact Analysis",
  art3_implementation_plan: "Implementation Plan",
  art4_code_gate: "Pre-Implementation Code Gate",
  art5_impl_summary_qa: "Impl Summary + QA Report",
  art6_owner_smoke_signoff: "Owner Smoke Sign-off",
};

// Heuristic keywords per artifact for doc-path matching
const ARTIFACT_DOC_KEYWORDS = {
  art1_intake: ["INTAKE", "DISCOVERY", "REGISTRATION"],
  art2_impact_analysis: ["IMPACT", "INVESTIGATION"],
  art3_implementation_plan: ["PLAN", "PLANNING"],
  art4_code_gate: ["CODE_GATE", "PRE_IMPLEMENTATION", "_GATE_"],
  art5_impl_summary_qa: ["IMPLEMENTATION_SUMMARY", "IMPL_SUMMARY", "QA_REPORT", "QA_HANDOFF", "IMPLEMENTATION_REPORT"],
  art6_owner_smoke_signoff: ["SMOKE_SIGNOFF", "SMOKE_PASS", "OWNER_VERIFIED", "_SMOKE_"],
};

function classNames(...xs) { return xs.filter(Boolean).join(" "); }

function normalizeId(id) {
  return String(id || "").trim().toUpperCase();
}

function parseDocPaths(s) {
  if (!s) return [];
  return s.split(";").map(p => p.trim()).filter(p => p && p !== "(none)" && !p.toLowerCase().includes("none"));
}

function matchDocsToArtifact(docs, artifactKey) {
  const kw = ARTIFACT_DOC_KEYWORDS[artifactKey] || [];
  return docs.filter(d => kw.some(k => d.toUpperCase().includes(k)));
}

function unmatchedDocs(docs) {
  const allKw = Object.values(ARTIFACT_DOC_KEYWORDS).flat();
  return docs.filter(d => !allKw.some(k => d.toUpperCase().includes(k)));
}

function downloadCSV(filename, headers, rows) {
  const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function loadJSON(path) {
  const r = await fetch(path, { cache: "no-store" });
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.json();
}

// Build a unified cross-tab index keyed by normalized ID
function buildCrossRefIndex(closure, bugs, crs) {
  const idx = {};
  const ensure = (id) => { const k = normalizeId(id); idx[k] ||= {}; return idx[k]; };

  (closure?.items || []).forEach(r => { ensure(r.item_id).closure = r; });

  (bugs?.active_recent_bugs || []).forEach(b => { ensure(b.id).bugs = { ...b, _section: b._section || "Active / Recent" }; });
  (bugs?.pos_2_0_closed_consolidated_2026_05_18 || []).forEach(b => { ensure(b.id).bugs = { ...b, _section: "POS 2.0 — Closed (2026-05-18)" }; });
  (bugs?.pos_final_1_0_closed_consolidated_2026_05_12 || []).forEach(b => { ensure(b.id).bugs = { ...b, _section: "pos_final_1.0 — Closed (2026-05-12)" }; });
  (bugs?.older_closed_or_partial || []).forEach(b => { ensure(b.id).bugs = { ...b, _section: "Older — Closed / Partial" }; });
  (bugs?.true_intake_or_blocked || []).forEach(b => { ensure(b.id).bugs = { ...b, _section: "True Intake / Blocked" }; });
  (bugs?.intake_only_bugs || []).forEach(b => { if (!idx[normalizeId(b.id)]?.bugs) ensure(b.id).bugs = { ...b, _section: "Intake Only" }; });
  (bugs?.production_hotfixes || []).forEach(b => { ensure(b.id).bugs = { ...b, _section: "Production Hotfix" }; });

  for (const [sprintKey, sprint] of Object.entries(crs?.sprints || {})) {
    (sprint.crs || []).forEach(c => { ensure(c.id).crs = { ...c, sprint_key: sprintKey, sprint_status: sprint.status }; });
  }
  return idx;
}

// Detect hotspot file overlap between a CR's `files` string and the dep flags list
function detectHotspot(filesStr, depFlags) {
  if (!filesStr || !depFlags?.length) return null;
  const f = String(filesStr);
  return depFlags.find(d => f.includes(String(d.file).replace(/\.jsx?$/, "")));
}

// Generic grouping helper: returns array of { key, label, rows }
function groupRows(rows, keyFn, labelFn, sortFn) {
  const map = new Map();
  rows.forEach(r => {
    const k = keyFn(r);
    if (!map.has(k)) map.set(k, { key: k, label: labelFn ? labelFn(k, r) : k, rows: [] });
    map.get(k).rows.push(r);
  });
  const arr = [...map.values()];
  if (sortFn) arr.sort(sortFn);
  return arr;
}

// ============================================================================
// REUSABLE UI PRIMITIVES
// ============================================================================
function Pill({ children, kind = "OK", className = "" }) {
  return <span className={classNames("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide", `pill-${kind}`, className)}>{children}</span>;
}

function StatusPill({ status }) {
  const norm = (status || "").toUpperCase();
  let cls = "status-NOT_STARTED";
  if (/CLOSED|SHIPPED|VERIFIED|IMPLEMENTED|SUBSUMED/.test(norm)) cls = "status-CLOSED";
  else if (/BLOCKED/.test(norm)) cls = "status-BLOCKED";
  else if (/PARTIAL/.test(norm)) cls = "status-PARTIAL";
  else if (/PENDING|INTAKE|INVESTIGATION/.test(norm)) cls = "status-INTAKE";
  else if (/NOT.?STARTED|PARKED/.test(norm)) cls = "status-NOT_STARTED";
  return <span className={classNames("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", cls)}>{status || "—"}</span>;
}

function ArtifactDot({ state, title: titleProp }) {
  const s = (state || "MISSING").toUpperCase().replace("N/A", "NA");
  const title = titleProp || ({ PRESENT: "Present", MISSING: "Missing", PARTIAL: "Partial / combined doc", NA: "Not applicable" }[s] || s);
  return <span title={title} className={classNames("inline-block w-2.5 h-2.5 rounded-full", `dot-${s}`)} />;
}

function DotStrip({ row }) {
  return (
    <div className="flex gap-1 items-center">
      {Object.keys(ARTIFACT_LABELS).map(k => (
        <ArtifactDot key={k} state={row[k]} title={`${ARTIFACT_LABELS[k]}: ${row[k] || "MISSING"}`} />
      ))}
    </div>
  );
}

function Stat({ label, value, color = "text-slate-200", sublabel }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
      <div className="text-xs text-slate-400 uppercase tracking-wider">{label}</div>
      <div className={classNames("text-2xl font-bold mt-1", color)}>{value}</div>
      {sublabel && <div className="text-[10px] text-slate-500 mt-0.5">{sublabel}</div>}
    </div>
  );
}

function RowExpander({ open }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className={classNames("transition-transform inline-block text-slate-500", open && "rotate-90")}>
      <path d="M4 2 L8 6 L4 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ============================================================================
// CR-046: WORKFLOW UI COMPONENTS (Phase 2)
// ============================================================================

// Gate Progress Bar — shows ✅⬜🟡🔴 per gate
function GateProgressBar({ item }) {
  const gates = WorkflowManager.getItemGateStatus(item);
  const gateList = [
    { key: 'intake', label: 'Intake' },
    { key: 'plan',   label: 'Plan' },
    { key: 'gate4',  label: 'Gate 4' },
    { key: 'code',   label: 'Code' },
    { key: 'qa',     label: 'QA' },
    { key: 'smoke',  label: 'Smoke' },
  ];
  const statusIcon = { done: '✅', active: '🔵', waiting: '🟡', rejected: '🔴', none: '⬜' };
  const statusColor = { done: 'text-emerald-400', active: 'text-blue-400', waiting: 'text-amber-400', rejected: 'text-red-400', none: 'text-slate-600' };
  return (
    <div className="flex items-center gap-0.5 text-[10px]">
      {gateList.map((g, i) => (
        <React.Fragment key={g.key}>
          {i > 0 && <span className="text-slate-700 mx-0.5">→</span>}
          <span className={statusColor[gates[g.key]]} title={`${g.label}: ${gates[g.key]}`}>
            {statusIcon[gates[g.key]]}<span className="hidden lg:inline ml-0.5">{g.label}</span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

// Stage Filter Dropdown
function StageFilter({ value, onChange }) {
  return (
    <select data-testid="stage-filter" value={value} onChange={e => onChange(e.target.value)}
      className="bg-slate-900 border border-amber-600/50 rounded px-3 py-1.5 text-sm text-amber-300 font-medium">
      <option value="ALL">All Stages</option>
      <option value="planning">Ready for: Planning</option>
      <option value="gate4">Ready for: Gate 4 Approval</option>
      <option value="implementation">Ready for: Implementation</option>
      <option value="qa">Ready for: QA</option>
      <option value="smoke">Ready for: Smoke Test</option>
    </select>
  );
}

// Batch Action Bar — appears when items selected
function BatchActionBar({ selectedCount, selectedItems, stage, sprint, onBatchCreate, onClearSelection }) {
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  if (selectedCount === 0) return null;
  
  const stageLabels = { planning: 'Planning', gate4: 'Gate 4 Approval', implementation: 'Implementation', qa: 'QA', smoke: 'Smoke Test' };
  
  return (
    <div className="sticky bottom-0 z-20 bg-slate-800/95 backdrop-blur border-t border-amber-500/30 px-4 py-3 flex flex-wrap items-center gap-3" data-testid="batch-action-bar">
      <span className="text-sm text-amber-300 font-semibold">{selectedCount} item{selectedCount > 1 ? 's' : ''} selected</span>
      {stage && stage !== 'ALL' && (
        <button data-testid="batch-send-btn"
          onClick={() => { onBatchCreate(stage, notes); setNotes(''); setShowNotes(false); }}
          className="bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded px-4 py-1.5 transition">
          Send to {stageLabels[stage] || stage}
        </button>
      )}
      {!stage || stage === 'ALL' ? (
        <span className="text-xs text-slate-400">Select a stage filter first to enable batch actions</span>
      ) : null}
      <button onClick={() => setShowNotes(!showNotes)} className="text-xs text-slate-400 hover:text-slate-200 underline">
        {showNotes ? 'hide notes' : '+ add notes'}
      </button>
      {showNotes && (
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Owner notes for this batch..."
          className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 flex-1 min-w-[200px]" />
      )}
      <button onClick={onClearSelection} className="text-xs text-slate-500 hover:text-red-400 ml-auto">Clear selection</button>
    </div>
  );
}

// Gate 4 Approval Buttons — per-item inline
function Gate4Buttons({ itemId, onApprove }) {
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const existing = WorkflowManager.getApproval(itemId);
  
  if (existing) {
    return (
      <span className={classNames("text-xs font-semibold px-2 py-0.5 rounded",
        existing.verdict === 'GO' ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300")}>
        Gate 4: {existing.verdict} {existing.notes && `— ${existing.notes}`}
      </span>
    );
  }
  
  return (
    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
      <button data-testid={`gate4-go-${itemId}`}
        onClick={() => { WorkflowManager.addApproval(itemId, 'GO', ''); onApprove(); }}
        className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold rounded px-2 py-0.5 transition">
        ✅ GO
      </button>
      <button onClick={() => setShowFeedback(!showFeedback)}
        className="bg-red-700 hover:bg-red-600 text-white text-[11px] font-semibold rounded px-2 py-0.5 transition">
        ❌ NO
      </button>
      {showFeedback && (
        <div className="flex items-center gap-1">
          <input value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Reason..."
            className="bg-slate-900 border border-slate-600 rounded px-2 py-0.5 text-xs text-slate-200 w-40" />
          <button onClick={() => { WorkflowManager.addApproval(itemId, 'NO', feedback); setShowFeedback(false); onApprove(); }}
            className="text-red-400 text-xs underline">Submit</button>
        </div>
      )}
    </div>
  );
}

// Smoke Test Buttons — per-item inline
function SmokeButtons({ itemId, onResult }) {
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const existing = WorkflowManager.getSmokeResult(itemId);
  
  if (existing) {
    return (
      <span className={classNames("text-xs font-semibold px-2 py-0.5 rounded",
        existing.verdict === 'PASS' ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300")}>
        Smoke: {existing.verdict} {existing.notes && `— ${existing.notes}`}
      </span>
    );
  }
  
  return (
    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
      <button data-testid={`smoke-pass-${itemId}`}
        onClick={() => { WorkflowManager.addSmokeResult(itemId, 'PASS', ''); onResult(); }}
        className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold rounded px-2 py-0.5 transition">
        ✅ PASS
      </button>
      <button onClick={() => setShowFeedback(!showFeedback)}
        className="bg-red-700 hover:bg-red-600 text-white text-[11px] font-semibold rounded px-2 py-0.5 transition">
        ❌ FAIL
      </button>
      {showFeedback && (
        <div className="flex items-center gap-1">
          <input value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="What failed..."
            className="bg-slate-900 border border-slate-600 rounded px-2 py-0.5 text-xs text-slate-200 w-40" />
          <button onClick={() => { WorkflowManager.addSmokeResult(itemId, 'FAIL', feedback); setShowFeedback(false); onResult(); }}
            className="text-red-400 text-xs underline">Submit</button>
        </div>
      )}
    </div>
  );
}

// Queue Panel — shows active batches
function QueuePanel() {
  const [q, setQ] = useState(() => WorkflowManager.load());
  const refresh = () => setQ(WorkflowManager.load());
  const batches = q.batches || [];
  const active = batches.filter(b => b.status === 'QUEUED' || b.status === 'IN_PROGRESS');
  const completed = batches.filter(b => b.status === 'DONE' || b.status === 'FAILED');
  
  const handleExport = () => {
    const json = WorkflowManager.exportAsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'workflow_queue_export.json'; a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-amber-300">Workflow Queue</h3>
        <div className="flex gap-2">
          <button onClick={handleExport} className="text-xs text-slate-400 hover:text-amber-300 border border-slate-700 rounded px-2 py-1">Export JSON</button>
          <button onClick={refresh} className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 rounded px-2 py-1">Refresh</button>
        </div>
      </div>
      
      {active.length === 0 && completed.length === 0 && (
        <div className="text-center text-slate-500 text-sm py-8">No batches yet. Select items and send to a stage.</div>
      )}
      
      {active.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Active ({active.length})</div>
          {active.map(b => (
            <div key={b.batch_id} className="border border-amber-500/30 bg-slate-900/50 rounded-lg p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="font-mono text-amber-300">{b.batch_id}</span>
                <span className="text-slate-400">{b.stage.toUpperCase()}</span>
              </div>
              <div className="text-slate-300">Items: {b.items.join(', ')}</div>
              {b.owner_notes && <div className="text-slate-500 italic">{b.owner_notes}</div>}
              <div className="flex justify-between items-center">
                <span className={b.status === 'QUEUED' ? 'text-amber-400' : 'text-blue-400'}>{b.status}</span>
                <button onClick={() => { WorkflowManager.cancelBatch(b.batch_id); refresh(); }}
                  className="text-red-400 hover:text-red-300 text-[10px]">Cancel</button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {completed.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Completed ({completed.length})</div>
          {completed.map(b => (
            <div key={b.batch_id} className="border border-slate-700/50 bg-slate-900/30 rounded-lg p-3 text-xs space-y-1 opacity-70">
              <div className="flex justify-between">
                <span className="font-mono text-slate-400">{b.batch_id}</span>
                <span className={b.status === 'DONE' ? 'text-emerald-400' : 'text-red-400'}>{b.status}</span>
              </div>
              <div className="text-slate-500">Items: {b.items.join(', ')} | Stage: {b.stage}</div>
            </div>
          ))}
        </div>
      )}
      
      <div className="border-t border-slate-800 pt-3">
        <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Recent Approvals</div>
        {(q.approvals || []).slice(-5).reverse().map((a, i) => (
          <div key={i} className="text-xs text-slate-500 py-0.5">
            <span className="font-mono text-slate-300">{a.item_id}</span> — Gate 4:
            <span className={a.verdict === 'GO' ? ' text-emerald-400' : ' text-red-400'}> {a.verdict}</span>
            {a.notes && <span className="text-slate-600"> ({a.notes})</span>}
          </div>
        ))}
        {(q.approvals || []).length === 0 && <div className="text-xs text-slate-600">No approvals yet</div>}
      </div>
      
      <div className="border-t border-slate-800 pt-3">
        <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Recent Smoke Results</div>
        {(q.smoke_results || []).slice(-5).reverse().map((s, i) => (
          <div key={i} className="text-xs text-slate-500 py-0.5">
            <span className="font-mono text-slate-300">{s.item_id}</span> — Smoke:
            <span className={s.verdict === 'PASS' ? ' text-emerald-400' : ' text-red-400'}> {s.verdict}</span>
            {s.notes && <span className="text-slate-600"> ({s.notes})</span>}
          </div>
        ))}
        {(q.smoke_results || []).length === 0 && <div className="text-xs text-slate-600">No smoke results yet</div>}
      </div>
    </div>
  );
}

// CR-046 Phase 3: Smoke Test Card — guided verification for owner
function SmokeTestCard({ item, onResult }) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const existing = WorkflowManager.getSmokeResult(item.id);
  const s = (item.status || '').toUpperCase();
  const isSmokeable = /QA.*PASS|IMPLEMENTED/.test(s) && !/CLOSED|VERIFIED/.test(s);
  
  if (!isSmokeable && !existing) return null;

  const title = item.title || item.id;
  const files = item.files || '(no files listed)';

  return (
    <div className={classNames("rounded-lg border overflow-hidden transition-all",
      existing?.verdict === 'PASS' ? "border-emerald-500/40 bg-emerald-950/20" :
      existing?.verdict === 'FAIL' ? "border-red-500/40 bg-red-950/20" :
      "border-amber-500/40 bg-amber-950/10")}>
      
      <button onClick={() => setOpen(!open)} className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-slate-800/30 transition">
        <div className="flex items-center gap-3">
          <span className="text-lg">{existing?.verdict === 'PASS' ? '✅' : existing?.verdict === 'FAIL' ? '❌' : '🔍'}</span>
          <div>
            <div className="font-mono text-sm text-slate-200">{item.id}</div>
            <div className="text-xs text-slate-400 truncate max-w-[400px]">{title}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {existing && (
            <span className={classNames("text-xs font-semibold px-2 py-0.5 rounded",
              existing.verdict === 'PASS' ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300")}>
              {existing.verdict} {existing.at && `(${new Date(existing.at).toLocaleDateString()})`}
            </span>
          )}
          <svg width="12" height="12" viewBox="0 0 12 12" className={classNames("transition-transform text-slate-500", open && "rotate-90")}>
            <path d="M4 2 L8 6 L4 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-800/50 animate-expand">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">What was done</div>
            <div className="text-xs text-slate-300">{item.status}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Files changed</div>
            <div className="text-xs text-slate-400 font-mono">{files}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Verification steps</div>
            <ol className="text-xs text-slate-300 space-y-1 list-decimal list-inside">
              <li>Login to preprod as test account</li>
              <li>Navigate to the affected area ({item.area || 'see files above'})</li>
              <li>Verify the fix/feature works as described in status</li>
              <li>Check no regressions in adjacent functionality</li>
            </ol>
          </div>
          {item.notes && (
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Notes</div>
              <div className="text-xs text-slate-400 italic">{item.notes}</div>
            </div>
          )}
          
          {existing?.notes && (
            <div className="rounded bg-slate-800/50 px-3 py-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Owner feedback</div>
              <div className="text-xs text-slate-300">{existing.notes}</div>
            </div>
          )}

          {!existing && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/30">
              <button onClick={() => { WorkflowManager.addSmokeResult(item.id, 'PASS', ''); onResult(); }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded px-4 py-1.5 transition">
                ✅ PASS
              </button>
              <div className="flex items-center gap-1 flex-1">
                <input value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="What failed or needs rework..."
                  className="bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 flex-1" />
                <button onClick={() => { WorkflowManager.addSmokeResult(item.id, 'FAIL', feedback); setFeedback(''); onResult(); }}
                  className="bg-red-700 hover:bg-red-600 text-white text-xs font-semibold rounded px-4 py-1.5 transition">
                  ❌ FAIL
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// CR-046 Phase 3: Batch History Panel — kept until sprint closure
function BatchHistoryPanel() {
  const [q, setQ] = useState(() => WorkflowManager.load());
  const refresh = () => setQ(WorkflowManager.load());
  const batches = (q.batches || []).slice().reverse();
  const approvals = (q.approvals || []).slice().reverse();
  const smokes = (q.smoke_results || []).slice().reverse();
  const totalActions = batches.length + approvals.length + smokes.length;

  if (totalActions === 0) return null;

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
          Workflow History ({totalActions} actions)
        </h3>
        <div className="flex gap-2">
          <button onClick={() => { WorkflowManager.clearCompleted(); refresh(); }}
            className="text-[10px] text-slate-500 hover:text-red-400 border border-slate-700 rounded px-2 py-0.5">
            Clear completed
          </button>
          <button onClick={refresh}
            className="text-[10px] text-slate-500 hover:text-slate-300 border border-slate-700 rounded px-2 py-0.5">
            Refresh
          </button>
        </div>
      </div>

      <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1">
        {batches.map(b => (
          <div key={b.batch_id} className="flex items-center gap-2 text-[11px] py-1 border-b border-slate-800/40">
            <span className={classNames("w-2 h-2 rounded-full flex-shrink-0",
              b.status === 'DONE' ? 'bg-emerald-500' : b.status === 'FAILED' ? 'bg-red-500' : b.status === 'QUEUED' ? 'bg-amber-500' : 'bg-blue-500')} />
            <span className="font-mono text-slate-400 w-24 flex-shrink-0">{b.batch_id.split('-').slice(-1)[0]}</span>
            <span className="text-slate-300">{b.stage}</span>
            <span className="text-slate-500">{b.items.join(', ')}</span>
            <span className="ml-auto text-slate-600 text-[10px]">{new Date(b.created_at).toLocaleString()}</span>
          </div>
        ))}
        {approvals.map((a, i) => (
          <div key={`a-${i}`} className="flex items-center gap-2 text-[11px] py-1 border-b border-slate-800/40">
            <span className={classNames("w-2 h-2 rounded-full flex-shrink-0", a.verdict === 'GO' ? 'bg-emerald-500' : 'bg-red-500')} />
            <span className="font-mono text-slate-400 w-24 flex-shrink-0">Gate 4</span>
            <span className="text-slate-300">{a.item_id}</span>
            <span className={a.verdict === 'GO' ? 'text-emerald-400' : 'text-red-400'}>{a.verdict}</span>
            {a.notes && <span className="text-slate-600 truncate">{a.notes}</span>}
            <span className="ml-auto text-slate-600 text-[10px]">{new Date(a.at).toLocaleString()}</span>
          </div>
        ))}
        {smokes.map((s, i) => (
          <div key={`s-${i}`} className="flex items-center gap-2 text-[11px] py-1 border-b border-slate-800/40">
            <span className={classNames("w-2 h-2 rounded-full flex-shrink-0", s.verdict === 'PASS' ? 'bg-emerald-500' : 'bg-red-500')} />
            <span className="font-mono text-slate-400 w-24 flex-shrink-0">Smoke</span>
            <span className="text-slate-300">{s.item_id}</span>
            <span className={s.verdict === 'PASS' ? 'text-emerald-400' : 'text-red-400'}>{s.verdict}</span>
            {s.notes && <span className="text-slate-600 truncate">{s.notes}</span>}
            <span className="ml-auto text-slate-600 text-[10px]">{new Date(s.at).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// CR-046 Phase 3: Ejection Notification Banner
function EjectionBanner({ ejections, onDismiss }) {
  if (!ejections || ejections.length === 0) return null;
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-950/20 px-4 py-3 flex items-start gap-3">
      <span className="text-red-400 text-lg flex-shrink-0">⚠</span>
      <div className="flex-1">
        <div className="text-xs text-red-300 font-semibold uppercase tracking-wider mb-1">Items Ejected from Batch</div>
        {ejections.map((e, i) => (
          <div key={i} className="text-xs text-slate-300 py-0.5">
            <span className="font-mono text-red-300">{e.item_id}</span> — {e.reason}
          </div>
        ))}
      </div>
      <button onClick={onDismiss} className="text-slate-500 hover:text-slate-300 text-xs">dismiss</button>
    </div>
  );
}


function DocPathItem({ path }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(path);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  const short = path.split("/").pop();
  return (
    <div className="flex items-center gap-2 group">
      <code className="text-xs text-slate-400 font-mono truncate flex-1" title={path}>{short}</code>
      <button onClick={copy} className="text-[10px] px-1.5 py-0.5 rounded border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200">
        {copied ? "✓ copied" : "copy"}
      </button>
    </div>
  );
}

function ArtifactRow({ artifactKey, state, docs }) {
  const matched = matchDocsToArtifact(docs, artifactKey);
  const s = (state || "MISSING").toUpperCase().replace("N/A", "NA");
  const stateColor = { PRESENT: "text-emerald-400", PARTIAL: "text-amber-400", MISSING: "text-red-400", NA: "text-slate-500" }[s];
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-slate-800/40 last:border-b-0">
      <ArtifactDot state={state} title={s} />
      <div className="text-sm text-slate-300 w-56 shrink-0">{ARTIFACT_LABELS[artifactKey]}</div>
      <div className={classNames("text-xs uppercase tracking-wider w-20 shrink-0", stateColor)}>{s}</div>
      <div className="flex-1 min-w-0">
        {matched.length === 0 ? (
          <span className="text-xs text-slate-600 italic">{s === "PRESENT" ? "(doc present — path attribution unclear)" : "—"}</span>
        ) : (
          <div className="space-y-1">{matched.map((d, i) => <DocPathItem key={i} path={d} />)}</div>
        )}
      </div>
    </div>
  );
}

function HotspotBanner({ hotspot }) {
  return (
    <div className="flex items-center gap-2 rounded border border-amber-700/60 bg-amber-950/30 px-3 py-2 text-xs">
      <span className="text-amber-300">⚠</span>
      <span className="text-amber-200">Hotspot — <code className="text-amber-300">{hotspot.file}</code> touched by <em>{hotspot.sprints}</em></span>
      <Pill kind={hotspot.risk === "HIGH" ? "CRITICAL" : hotspot.risk === "MEDIUM" ? "MEDIUM" : "LOW"} className="ml-auto">{hotspot.risk}</Pill>
    </div>
  );
}

function ClosureMiniSummary({ row }) {
  if (!row) return null;
  return (
    <div className="rounded border border-slate-700/60 bg-slate-900/60 p-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-slate-500 uppercase tracking-wider">Closure debt</span>
        <Pill kind={row.severity}>{row.severity}</Pill>
        <DotStrip row={row} />
        <span className="text-xs font-mono text-slate-400">{row.missing_count}/6 missing</span>
        <span className="text-xs text-slate-500">· {row.estimated_doc_effort_hrs}h to close</span>
      </div>
      {row.recommended_action && (
        <div className="text-xs text-slate-400 mt-2"><span className="text-slate-500">Action:</span> {row.recommended_action}</div>
      )}
    </div>
  );
}

function CrossRefStrip({ id, xref, currentTab, onJump }) {
  const refs = xref[normalizeId(id)] || {};
  const others = [];
  if (currentTab !== "closure" && refs.closure) others.push({ tab: "closure", label: "Closure Debt", row: refs.closure, status: `${refs.closure.severity} · ${refs.closure.missing_count}/6 missing` });
  if (currentTab !== "bugs" && refs.bugs) others.push({ tab: "bugs", label: "Bug Tracker", row: refs.bugs, status: refs.bugs.status });
  if (currentTab !== "crs" && refs.crs) others.push({ tab: "crs", label: "CR Registry", row: refs.crs, status: refs.crs.status });
  if (others.length === 0) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap pt-3 mt-3 border-t border-slate-800">
      <span className="text-xs text-slate-500 uppercase tracking-wider">🔗 Cross-references:</span>
      {others.map(o => (
        <button
          key={o.tab}
          data-testid={`crossref-${id}-${o.tab}`}
          onClick={() => onJump(o.tab, id)}
          className="text-xs px-2 py-1 rounded border border-slate-700 hover:border-emerald-700 hover:text-emerald-200 text-slate-300 transition">
          → {id} in <strong>{o.label}</strong> <span className="text-slate-500">({o.status})</span>
        </button>
      ))}
    </div>
  );
}

function DetailPanel({ children, colSpan, testId }) {
  return (
    <tr data-testid={testId}>
      <td colSpan={colSpan} className="bg-slate-900/40 border-b border-slate-800 p-0">
        <div className="px-6 py-4 space-y-3 animate-expand">{children}</div>
      </td>
    </tr>
  );
}

function GroupHeader({ label, count, collapsed, onToggle, mix, testId }) {
  return (
    <tr onClick={onToggle} data-testid={testId} className="bg-slate-900 cursor-pointer hover:bg-slate-800/80 select-none">
      <td colSpan={20} className="px-3 py-2">
        <div className="flex items-center gap-3">
          <RowExpander open={!collapsed} />
          <span className="font-semibold text-sm text-slate-200">{label}</span>
          <span className="text-xs text-slate-500 font-mono">({count} {count === 1 ? "row" : "rows"})</span>
          {mix && <div className="flex gap-1 ml-2">{mix}</div>}
        </div>
      </td>
    </tr>
  );
}

function CollapseAllBar({ visible, onCollapse, expandedCount }) {
  if (!visible) return null;
  return (
    <button
      onClick={onCollapse}
      className="text-xs px-2 py-1 rounded border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200">
      Collapse all ({expandedCount})
    </button>
  );
}

function GroupControls({ groupBy, options, onChange, groupsCount, onExpandAll, onCollapseAll }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 uppercase tracking-wider">Group:</span>
      <select
        value={groupBy}
        onChange={e => onChange(e.target.value)}
        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs">
        <option value="none">None</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {groupBy !== "none" && (
        <>
          <button onClick={onExpandAll} className="text-xs px-2 py-1 rounded border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200">Expand all ({groupsCount})</button>
          <button onClick={onCollapseAll} className="text-xs px-2 py-1 rounded border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200">Collapse all</button>
        </>
      )}
    </div>
  );
}

// Reusable: render a flat list OR grouped list of rows with row-detail expansion
function ExpandableTable({ rows, groups, columnsCount, renderHead, renderRow, renderDetail, expanded, toggleRow, collapsedGroups, toggleGroup, rowKeyFn }) {
  return (
    <div className="overflow-x-auto border border-slate-800 rounded-lg">
      <table className="min-w-full text-sm">
        {renderHead()}
        <tbody className="divide-y table-border">
          {groups ? (
            groups.flatMap((g, gi) => {
              const collapsed = collapsedGroups[g.key] === true; // default expanded
              const head = <GroupHeader key={`gh-${g.key}`} label={g.label} count={g.rows.length} collapsed={collapsed} onToggle={() => toggleGroup(g.key)} mix={g.mix} testId={`group-${gi}`} />;
              if (collapsed) return [head];
              const children = g.rows.flatMap((r, ri) => {
                const key = rowKeyFn(r);
                const isOpen = !!expanded[key];
                const nodes = [renderRow(r, ri, isOpen, () => toggleRow(key))];
                if (isOpen) nodes.push(<DetailPanel key={`d-${key}`} colSpan={columnsCount} testId={`detail-${key}`}>{renderDetail(r)}</DetailPanel>);
                return nodes;
              });
              return [head, ...children];
            })
          ) : (
            rows.flatMap((r, ri) => {
              const key = rowKeyFn(r);
              const isOpen = !!expanded[key];
              const nodes = [renderRow(r, ri, isOpen, () => toggleRow(key))];
              if (isOpen) nodes.push(<DetailPanel key={`d-${key}`} colSpan={columnsCount} testId={`detail-${key}`}>{renderDetail(r)}</DetailPanel>);
              return nodes;
            })
          )}
        </tbody>
      </table>
      {(rows?.length === 0 || groups?.length === 0) && <div className="text-center text-slate-500 py-12">No rows match.</div>}
    </div>
  );
}

// Render artifact references grouped by type
function ArtifactRefsSection({ refs }) {
  if (!refs || refs.length === 0) return null;
  const grouped = {};
  refs.forEach(r => { (grouped[r.type] ||= []).push(r); });
  const order = ['intake', 'impact', 'plan', 'code_gate', 'impl_summary', 'qa_report', 'smoke_signoff'];
  const present = order.filter(k => grouped[k]);
  return (
    <div className="rounded border border-slate-700/60 bg-slate-900/60 p-3" data-testid="artifact-refs-section">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">📎 Artifact References</span>
        <span className="text-xs font-mono text-emerald-400">({present.length}/7)</span>
      </div>
      <div className="space-y-1.5">
        {order.map(k => {
          const items = grouped[k] || [];
          if (items.length === 0) {
            return (
              <div key={k} className="flex items-center gap-3 text-xs">
                <span className="dot-MISSING inline-block w-2 h-2 rounded-full" />
                <span className="text-slate-500 w-44 shrink-0">{ARTIFACT_LABELS_FOR_REFS[k]}</span>
                <span className="text-slate-600 italic">(missing)</span>
              </div>
            );
          }
          const isWaived = items.every(r => r.waived);
          const isPremature = isWaived && items.some(r => r.waived_premature);
          const isSubsumed = items.some(r => r.subsumed_owner_attested);
          const dotClass = isWaived ? "dot-WAIVED" : (isSubsumed ? "dot-WAIVED" : "dot-PRESENT");
          const labelExtra = isWaived
            ? <span className="ml-2 text-amber-400 text-[10px] font-semibold uppercase tracking-wider">waived{isPremature ? " · premature" : ""}</span>
            : (isSubsumed ? <span className="ml-2 text-amber-400 text-[10px] font-semibold uppercase tracking-wider">subsumed · owner-attested</span> : null);
          const tooltip = isPremature
            ? "WAIVED — premature (Code Gate granted before implementation; owner exception for active CRs)"
            : (isWaived
              ? "WAIVED — owner exception (pre-rule)"
              : (isSubsumed ? "SUBSUMED — owner attestation (subsuming CR unidentified; code grep waived)" : "Artifact present"));
          return (
            <div key={k} className="flex items-start gap-3 text-xs">
              <span className={`${dotClass} inline-block w-2.5 h-2.5 rounded-full mt-1.5`} title={tooltip} />
              <span className="text-slate-300 w-44 shrink-0">{items[0].label}{labelExtra}</span>
              <div className="flex-1 min-w-0 space-y-1">
                {items.map((r, i) => <DocPathItem key={i} path={r.path} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ARTIFACT_LABELS_FOR_REFS = {
  intake: "Intake",
  impact: "Impact Analysis",
  plan: "Implementation Plan",
  code_gate: "Code Gate",
  impl_summary: "Implementation Summary",
  qa_report: "QA Report",
  smoke_signoff: "Owner Smoke Sign-off",
};

// ============================================================================
// CLOSURE DEBT TAB
// ============================================================================
function ClosureDebtTab({ data, xref, onJump, search, setSearch, expanded, setExpanded, groupBy, setGroupBy, collapsedGroups, setCollapsedGroups }) {
  // Active debt = QA-driven set only (POS 4.0 excluded, QA-satisfied excluded — see generator debt_model)
  const items = (data.items || []).filter(r => r.active_debt);
  const [severity, setSeverity] = useState("ALL");
  const [sprint, setSprint] = useState("ALL");

  // If search was seeded, reset filters so the seeded row is visible
  useEffect(() => {
    if (search) { setSeverity("ALL"); setSprint("ALL"); }
  }, [search]);

  const filtered = useMemo(() => {
    let list = items.filter(r => {
      if (severity !== "ALL" && r.severity !== severity) return false;
      if (sprint !== "ALL" && r.sprint !== sprint) return false;
      if (search && !JSON.stringify(r).toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    list = [...list].sort((a, b) =>
      (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9) ||
      (parseInt(b.missing_count) - parseInt(a.missing_count)) ||
      (a.item_id || "").localeCompare(b.item_id || "")
    );
    return list;
  }, [items, severity, sprint, search]);

  const sprints = useMemo(() => [...new Set(items.map(r => r.sprint))].sort(), [items]);
  const sevCounts = useMemo(() => {
    const c = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, RESOLVED: 0 };
    items.forEach(r => { c[r.severity] = (c[r.severity] || 0) + 1; });
    return c;
  }, [items]);
  const activeDebt = data.active_count ?? (sevCounts.CRITICAL + sevCounts.HIGH + sevCounts.MEDIUM + sevCounts.LOW);
  const totalTracked = items.length;
  const totalEffort = useMemo(() => filtered.reduce((s, r) => s + (parseFloat(r.estimated_doc_effort_hrs) || 0), 0), [filtered]);

  const groupOptions = [
    { value: "severity", label: "Severity" },
    { value: "sprint", label: "Sprint" },
    { value: "missing", label: "Missing count" },
    { value: "status", label: "Registry status" },
  ];

  const groups = useMemo(() => {
    if (groupBy === "none") return null;
    const keyFn = {
      severity: r => r.severity,
      sprint: r => r.sprint,
      missing: r => `${r.missing_count}/6 missing`,
      status: r => r.registry_status,
    }[groupBy];
    const sortFn = groupBy === "severity"
      ? (a, b) => (SEV_ORDER[a.key] ?? 9) - (SEV_ORDER[b.key] ?? 9)
      : groupBy === "missing"
        ? (a, b) => parseInt(b.key) - parseInt(a.key)
        : (a, b) => a.key.localeCompare(b.key);
    const g = groupRows(filtered, keyFn, null, sortFn);
    g.forEach(grp => {
      const cmix = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, RESOLVED: 0 };
      grp.rows.forEach(r => { cmix[r.severity] = (cmix[r.severity] || 0) + 1; });
      grp.mix = Object.entries(cmix).filter(([, n]) => n > 0).map(([k, n]) => <Pill key={k} kind={k}>{k.charAt(0)}·{n}</Pill>);
    });
    return g;
  }, [filtered, groupBy]);

  const expandedCount = Object.values(expanded).filter(Boolean).length;
  const csvHeaders = ["sprint", "item_id", "title", "registry_status", "missing_count", "severity", "art1_intake", "art2_impact_analysis", "art3_implementation_plan", "art4_code_gate", "art5_impl_summary_qa", "art6_owner_smoke_signoff", "estimated_doc_effort_hrs", "owner_verified_in_prose", "tracked_in_open_gaps", "recommended_action", "notes"];

  return (
    <div className="space-y-5">
      {/* Headline: active vs archived (history) */}
      <div className="rounded-lg border border-slate-700/60 bg-gradient-to-r from-slate-900 to-slate-900/40 p-4 flex flex-wrap items-baseline gap-x-8 gap-y-2" data-testid="closure-headline">
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-400">Active debt</span>
          <span className="ml-2 text-3xl font-bold text-amber-300" data-testid="closure-active-count">{activeDebt}</span>
          <span className="ml-2 text-sm text-slate-500">QA backfill items (POS4-QA-001)</span>
        </div>
        <div data-testid="closure-debt-model" className="text-xs text-slate-400 self-center">
          <span className="text-slate-500">QA-driven · </span>
          <span className="text-emerald-400">{data.qa_satisfied_count ?? 0} QA-satisfied</span>
          <span className="text-slate-500"> · </span>
          <span className="text-sky-400">{data.pos4_excluded_count ?? 0} POS 4.0 excluded</span>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-400">Archived (fully closed)</span>
          <span className="ml-2 text-2xl font-semibold text-emerald-400">{data.archived_count || 0}</span>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-400">All-time tracked</span>
          <span className="ml-2 text-2xl font-semibold text-slate-300">{data.tracked_total || totalTracked}</span>
        </div>
        <div className="ml-auto text-xs text-slate-500 italic">Items reaching 7/7 are auto-archived from the active register. CSV preserves full history.</div>
      </div>

      {/* Top stats — clickable severity cards (active only — archived rows not in items[]) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <button data-testid="closure-stat-all" onClick={() => setSeverity("ALL")}
          className={classNames("rounded-lg border p-3 text-left transition", severity === "ALL" ? "border-amber-500 bg-slate-800" : "border-slate-800 bg-slate-900 hover:border-slate-700")}>
          <div className="text-xs text-slate-400 uppercase tracking-wider">All Active</div>
          <div className="text-2xl font-bold mt-1 text-amber-300">{activeDebt}</div>
        </button>
        {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map(k => (
          <button key={k} data-testid={`closure-stat-${k.toLowerCase()}`} onClick={() => setSeverity(s => s === k ? "ALL" : k)}
            className={classNames("rounded-lg border p-3 text-left transition", severity === k ? "border-slate-500 bg-slate-800" : "border-slate-800 bg-slate-900 hover:border-slate-700")}>
            <div className="text-xs text-slate-400 uppercase tracking-wider">{k}</div>
            <div className={classNames("text-2xl font-bold mt-1", { CRITICAL: "text-red-400", HIGH: "text-orange-400", MEDIUM: "text-amber-300", LOW: "text-cyan-300" }[k])}>{sevCounts[k] || 0}</div>
          </button>
        ))}
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Filtered effort</div>
          <div className="text-2xl font-bold mt-1 text-slate-200">{totalEffort.toFixed(1)}<span className="text-sm text-slate-400 ml-1">hrs</span></div>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-3 items-center">
        <select data-testid="closure-sprint-filter" value={sprint} onChange={e => setSprint(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm">
          <option value="ALL">All Sprints</option>{sprints.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select data-testid="closure-severity-filter" value={severity} onChange={e => setSeverity(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm">
          <option value="ALL">All Severities</option>
          {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input data-testid="closure-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title / id / files / notes…"
          className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm flex-1 min-w-[260px]" />
        <GroupControls groupBy={groupBy} options={groupOptions} onChange={setGroupBy} groupsCount={groups?.length || 0}
          onExpandAll={() => setCollapsedGroups(Object.fromEntries((groups || []).map(g => [g.key, false])))}
          onCollapseAll={() => setCollapsedGroups(Object.fromEntries((groups || []).map(g => [g.key, true])))} />
        <CollapseAllBar visible={expandedCount > 0} expandedCount={expandedCount} onCollapse={() => setExpanded({})} />
        <button data-testid="closure-export-csv" onClick={() => downloadCSV(`closure_debt_${Date.now()}.csv`, csvHeaders, filtered)}
          className="bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium rounded px-3 py-1.5">Export CSV ({filtered.length})</button>
      </div>

      <ExpandableTable
        rows={filtered} groups={groups} columnsCount={10}
        rowKeyFn={r => r.item_id}
        expanded={expanded}
        toggleRow={k => setExpanded(prev => ({ ...prev, [k]: !prev[k] }))}
        collapsedGroups={collapsedGroups}
        toggleGroup={k => setCollapsedGroups(prev => ({ ...prev, [k]: prev[k] === true ? false : true }))}
        renderHead={() => (
          <thead className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-2 py-2 w-6"></th>
              <th className="px-3 py-2 text-left">Sprint</th>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-center" title="Intake · Impact · Plan · Code Gate · Impl/QA · Owner Smoke">Artifacts (6)</th>
              <th className="px-3 py-2 text-center">Missing</th>
              <th className="px-3 py-2 text-left">Severity</th>
              <th className="px-3 py-2 text-right">Effort</th>
              <th className="px-3 py-2 text-left">Recommended</th>
            </tr>
          </thead>
        )}
        renderRow={(r, i, isOpen, onToggle) => (
          <tr key={`r-${r.item_id}-${i}`} className="row-hover cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40" tabIndex={0}
            onClick={onToggle} onKeyDown={e => e.key === "Enter" && onToggle()}>
            <td className="px-2 py-2 text-center"><RowExpander open={isOpen} /></td>
            <td className="px-3 py-2 text-slate-400 whitespace-nowrap">{r.sprint}</td>
            <td className="px-3 py-2 font-mono text-slate-200 whitespace-nowrap">{r.item_id}</td>
            <td className="px-3 py-2 text-slate-300">{r.title}</td>
            <td className="px-3 py-2"><StatusPill status={r.registry_status} /></td>
            <td className="px-3 py-2"><div className="flex justify-center"><DotStrip row={r} /></div></td>
            <td className="px-3 py-2 text-center font-mono text-slate-300">{r.missing_count}/6</td>
            <td className="px-3 py-2"><Pill kind={r.severity}>{r.severity}</Pill></td>
            <td className="px-3 py-2 text-right text-slate-400 font-mono">{r.estimated_doc_effort_hrs}h</td>
            <td className="px-3 py-2 text-xs text-slate-400 max-w-md truncate" title={r.recommended_action}>{r.recommended_action}</td>
          </tr>
        )}
        renderDetail={r => {
          const docs = parseDocPaths(r.existing_docs_path);
          const extra = unmatchedDocs(docs);
          return (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-lg text-slate-100">{r.item_id}</span>
                <span className="text-slate-300">{r.title}</span>
                <Pill kind={r.severity}>{r.severity}</Pill>
                <span className="text-xs font-mono text-slate-400">{r.missing_count}/6 missing</span>
                <span className="text-xs text-slate-500">{r.estimated_doc_effort_hrs}h to close</span>
              </div>
              <div className="grid md:grid-cols-2 gap-3 text-xs">
                <div><span className="text-slate-500">Sprint:</span> <span className="text-slate-300">{r.sprint}</span></div>
                <div><span className="text-slate-500">Files:</span> <span className="text-slate-300 font-mono">{r.files_touched || "—"}</span></div>
                <div><span className="text-slate-500">Owner verified in prose:</span> {r.owner_verified_in_prose === "TRUE" ? "✅ yes" : "—"}</div>
                <div><span className="text-slate-500">Tracked in open gaps:</span> {r.tracked_in_open_gaps === "TRUE" ? "✅ yes" : "—"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Artifacts (6)</div>
                <div className="rounded border border-slate-800 bg-slate-950/40 px-3">
                  {Object.keys(ARTIFACT_LABELS).map(k => <ArtifactRow key={k} artifactKey={k} state={r[k]} docs={docs} />)}
                </div>
                {extra.length > 0 && (
                  <div className="mt-2 text-xs">
                    <div className="text-slate-500 uppercase tracking-wider mb-1">Combined / other docs</div>
                    <div className="space-y-1">{extra.map((d, i) => <DocPathItem key={i} path={d} />)}</div>
                  </div>
                )}
              </div>
              {r.recommended_action && (
                <div className="text-xs"><span className="text-slate-500 uppercase tracking-wider block mb-1">Recommended action</span><span className="text-slate-300">{r.recommended_action}</span></div>
              )}
              {r.notes && (
                <div className="text-xs"><span className="text-slate-500 uppercase tracking-wider block mb-1">Notes</span><span className="text-slate-400">{r.notes}</span></div>
              )}
              <ArtifactRefsSection refs={r.artifact_refs} />
              <CrossRefStrip id={r.item_id} xref={xref} currentTab="closure" onJump={onJump} />
            </>
          );
        }}
      />

      <div className="text-xs text-slate-500 flex items-center gap-4 flex-wrap">
        Legend:
        <span className="flex items-center gap-1"><span className="dot-PRESENT inline-block w-2.5 h-2.5 rounded-full"></span> Present</span>
        <span className="flex items-center gap-1"><span className="dot-PARTIAL inline-block w-2.5 h-2.5 rounded-full"></span> Partial / combined doc</span>
        <span className="flex items-center gap-1"><span className="dot-MISSING inline-block w-2.5 h-2.5 rounded-full"></span> Missing</span>
        <span className="flex items-center gap-1"><span className="dot-NA inline-block w-2.5 h-2.5 rounded-full"></span> N/A</span>
        <span className="ml-auto">Artifact order: Intake · Impact · Plan · Code Gate · Impl/QA · Owner Smoke</span>
      </div>
    </div>
  );
}

// ============================================================================
// BUG TRACKER TAB
// ============================================================================
function BugTrackerTab({ data, xref, onJump, search, setSearch, expanded, setExpanded, groupBy, setGroupBy, collapsedGroups, setCollapsedGroups }) {
  const allBugs = useMemo(() => [
    ...(data.active_recent_bugs || []).map(b => ({ ...b, _section: b._section || "Active / Recent" })),
    ...(data.pos_2_0_closed_consolidated_2026_05_18 || []).map(b => ({ ...b, _section: "POS 2.0 — Closed (2026-05-18)", sprint: b.sprint || "POS 2.0" })),
    ...(data.pos_final_1_0_closed_consolidated_2026_05_12 || []).map(b => ({ ...b, _section: "pos_final_1.0 — Closed (2026-05-12)", sprint: b.sprint || "pos_final_1.0" })),
    ...(data.older_closed_or_partial || []).map(b => ({ ...b, _section: "Older — Closed / Partial", sprint: b.sprint || "Older" })),
    ...(data.true_intake_or_blocked || []).map(b => ({ ...b, _section: "True Intake / Blocked", sprint: b.sprint || "Backlog" })),
    ...(data.intake_only_bugs || []).filter(b => !(data.true_intake_or_blocked || []).some(t => t.id === b.id)).map(b => ({ ...b, _section: "Intake Only", sprint: b.sprint || "Backlog" })),
    ...(data.production_hotfixes || []).map(b => ({ ...b, _section: "Production Hotfix", sprint: "PROD Hotfix", priority: b.priority || "" }))
  ], [data]);

  const [status, setStatus] = useState("ALL");
  const [section, setSection] = useState("ALL");
  const [hideClosed, setHideClosed] = useState(true);

  useEffect(() => { if (search) { setStatus("ALL"); setSection("ALL"); setHideClosed(false); } }, [search]);

  const isClosedStatus = (s) => /CLOSED|SHIPPED|VERIFIED|IMPLEMENTED|CARRY.?FORWARD|NO CODE NEEDED|DEFERRED|SUBSUMED/i.test(s || "");

  const filtered = useMemo(() => allBugs.filter(b => {
    if (hideClosed && isClosedStatus(b.status)) return false;
    if (status !== "ALL" && !(b.status || "").includes(status)) return false;
    if (section !== "ALL" && b._section !== section) return false;
    if (search && !JSON.stringify(b).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [allBugs, status, section, search, hideClosed]);

  const sections = [...new Set(allBugs.map(b => b._section))];
  const statuses = [...new Set(allBugs.map(b => b.status))].sort();

  const groupOptions = [
    { value: "status", label: "Status" },
    { value: "section", label: "Section" },
    { value: "sprint", label: "Sprint" },
    { value: "priority", label: "Priority" },
  ];

  const groups = useMemo(() => {
    if (groupBy === "none") return null;
    const keyFn = { status: b => b.status || "—", section: b => b._section, sprint: b => b.sprint || "—", priority: b => b.priority || "—" }[groupBy];
    return groupRows(filtered, keyFn, null, (a, b) => a.key.localeCompare(b.key));
  }, [filtered, groupBy]);

  const expandedCount = Object.values(expanded).filter(Boolean).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Total tracked" value={data.summary?.total_tracked || "—"} />
        <Stat label="Closed / Verified" value={data.summary?.closed_verified || 0} color="text-emerald-400" />
        <Stat label="Open Intake" value={data.summary?.open_intake || 0} color="text-blue-400" />
        <Stat label="Backend-Blocked" value={data.summary?.backend_blocked || 0} color="text-red-400" />
        <Stat label="CRM-Blocked" value={data.summary?.crm_blocked || 0} color="text-orange-400" />
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select data-testid="bug-section-filter" value={section} onChange={e => setSection(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm">
          <option value="ALL">All Sections</option>{sections.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select data-testid="bug-status-filter" value={status} onChange={e => setStatus(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm">
          <option value="ALL">All Statuses</option>{statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input data-testid="bug-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title / id / blocker…"
          className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm flex-1 min-w-[260px]" />
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none px-2 py-1.5 rounded border border-slate-700 hover:border-slate-500" data-testid="bug-hide-closed-label">
          <input type="checkbox" data-testid="bug-hide-closed" checked={hideClosed} onChange={e => setHideClosed(e.target.checked)} className="accent-emerald-500" />
          Hide closed
        </label>
        <GroupControls groupBy={groupBy} options={groupOptions} onChange={setGroupBy} groupsCount={groups?.length || 0}
          onExpandAll={() => setCollapsedGroups(Object.fromEntries((groups || []).map(g => [g.key, false])))}
          onCollapseAll={() => setCollapsedGroups(Object.fromEntries((groups || []).map(g => [g.key, true])))} />
        <CollapseAllBar visible={expandedCount > 0} expandedCount={expandedCount} onCollapse={() => setExpanded({})} />
        <button data-testid="bug-export-csv" onClick={() => downloadCSV(`bug_tracker_${Date.now()}.csv`, ["_section", "id", "title", "priority", "status", "sprint", "blocker", "date", "notes"], filtered)}
          className="bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium rounded px-3 py-1.5">Export CSV ({filtered.length})</button>
      </div>

      <ExpandableTable
        rows={filtered} groups={groups} columnsCount={8}
        rowKeyFn={r => `${r._section}-${r.id}`}
        expanded={expanded}
        toggleRow={k => setExpanded(prev => ({ ...prev, [k]: !prev[k] }))}
        collapsedGroups={collapsedGroups}
        toggleGroup={k => setCollapsedGroups(prev => ({ ...prev, [k]: prev[k] === true ? false : true }))}
        renderHead={() => (
          <thead className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-2 py-2 w-6"></th>
              <th className="px-3 py-2 text-left">Section</th>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Priority</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Sprint</th>
              <th className="px-3 py-2 text-left">Blocker / Notes</th>
            </tr>
          </thead>
        )}
        renderRow={(b, i, isOpen, onToggle) => (
          <tr key={`r-${b._section}-${b.id}-${i}`} className="row-hover cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40" tabIndex={0}
            onClick={onToggle} onKeyDown={e => e.key === "Enter" && onToggle()}>
            <td className="px-2 py-2 text-center"><RowExpander open={isOpen} /></td>
            <td className="px-3 py-2 text-slate-500 text-xs whitespace-nowrap">{b._section}</td>
            <td className="px-3 py-2 font-mono text-slate-200 whitespace-nowrap">{b.id}</td>
            <td className="px-3 py-2 text-slate-300">{b.title}</td>
            <td className="px-3 py-2 text-slate-400">{b.priority || "—"}</td>
            <td className="px-3 py-2"><StatusPill status={b.status} />{b.subsumed_meta?.owner_attested && <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30" title={`SUBSUMED — owner attested ${b.subsumed_meta.attested_date}; subsuming CR unidentified, code grep waived. See ${b.subsumed_meta.attestation_doc}`}>subsumed</span>}</td>
            <td className="px-3 py-2 text-slate-400 text-xs whitespace-nowrap">{b.sprint || "—"}</td>
            <td className="px-3 py-2 text-slate-400 text-xs">{b.blocker || b.notes || "—"}</td>
          </tr>
        )}
        renderDetail={b => {
          const closureMatch = xref[normalizeId(b.id)]?.closure;
          return (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-lg text-slate-100">{b.id}</span>
                <span className="text-slate-300">{b.title}</span>
                {b.priority && <Pill kind="MEDIUM">{b.priority}</Pill>}
                <StatusPill status={b.status} />
                {b.subsumed_meta?.owner_attested && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">subsumed · owner-attested</span>
                )}
              </div>
              {b.subsumed_meta?.owner_attested && (
                <div className="rounded border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs space-y-1">
                  <div className="text-amber-300 font-semibold uppercase tracking-wider text-[10px]">Subsumption attestation</div>
                  <div className="text-slate-300">Owner attested on <span className="text-slate-100 font-mono">{b.subsumed_meta.attested_date}</span> that this defect no longer reproduces in production.</div>
                  <div className="text-slate-400">Subsuming CR: <span className="text-amber-300 font-mono text-[11px]">{b.subsumed_meta.subsuming_cr}</span></div>
                  {b.subsumed_meta.attestation_doc && (
                    <div className="text-slate-500">Registry: <span className="text-slate-400 font-mono text-[11px]">{b.subsumed_meta.attestation_doc}</span></div>
                  )}
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-3 text-xs">
                <div><span className="text-slate-500">Section:</span> <span className="text-slate-300">{b._section}</span></div>
                <div><span className="text-slate-500">Sprint:</span> <span className="text-slate-300">{b.sprint || "—"}</span></div>
                {b.date && <div><span className="text-slate-500">Date:</span> <span className="text-slate-300">{b.date}</span></div>}
              </div>
              {b.blocker && <div className="text-xs"><span className="text-slate-500 uppercase tracking-wider block mb-1">Blocker</span><span className="text-slate-300">{b.blocker}</span></div>}
              {b.notes && <div className="text-xs"><span className="text-slate-500 uppercase tracking-wider block mb-1">Notes</span><span className="text-slate-400">{b.notes}</span></div>}
              {closureMatch && <ClosureMiniSummary row={closureMatch} />}
              <ArtifactRefsSection refs={b.artifact_refs} />
              <CrossRefStrip id={b.id} xref={xref} currentTab="bugs" onJump={onJump} />
            </>
          );
        }}
      />
    </div>
  );
}

// ============================================================================
// CR REGISTRY TAB
// ============================================================================
function CRRegistryTab({ data, xref, onJump, search, setSearch, expanded, setExpanded, groupBy, setGroupBy, collapsedGroups, setCollapsedGroups }) {
  const flatten = useMemo(() => {
    const out = [];
    for (const [key, sprint] of Object.entries(data.sprints || {})) {
      (sprint.crs || []).forEach(cr => out.push({ sprint_key: key, sprint_label: key.toUpperCase().replace(/_/g, " "), sprint_status: sprint.status, sprint_started: sprint.started_date, sprint_closed: sprint.closed_date, ...cr }));
    }
    return out;
  }, [data]);

  const [sprintFilter, setSprintFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [hideClosed, setHideClosed] = useState(true);

  useEffect(() => { if (search) { setSprintFilter("ALL"); setStatusFilter("ALL"); setHideClosed(false); } }, [search]);

  const isClosedStatus = (s) => /CLOSED|SHIPPED|VERIFIED|IMPLEMENTED|CARRY.?FORWARD|NO CODE NEEDED|DEFERRED|SUBSUMED/i.test(s || "");

  const filtered = useMemo(() => flatten.filter(c => {
    if (hideClosed && isClosedStatus(c.status)) return false;
    if (sprintFilter !== "ALL" && c.sprint_key !== sprintFilter) return false;
    if (statusFilter !== "ALL" && !(c.status || "").includes(statusFilter)) return false;
    if (search && !JSON.stringify(c).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [flatten, sprintFilter, statusFilter, search, hideClosed]);

  const sprintKeys = Object.keys(data.sprints || {});
  const statuses = [...new Set(flatten.map(c => c.status))].sort();
  const depFlags = data.cross_sprint_dependency_flags || [];

  // Category-based stats (v2.7)
  const categoryCounts = useMemo(() => {
    const c = { NOT_STARTED: 0, IN_PROGRESS: 0, BLOCKED: 0, SHIPPED: 0, SUBSUMED: 0, PARKED: 0 };
    flatten.forEach(cr => { c[cr.category || "IN_PROGRESS"] = (c[cr.category || "IN_PROGRESS"] || 0) + 1; });
    return c;
  }, [flatten]);
  const activeCount = categoryCounts.NOT_STARTED + categoryCounts.IN_PROGRESS + categoryCounts.BLOCKED;
  const shippedCount = categoryCounts.SHIPPED;
  const trackedTotal = flatten.length;
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // CR-046 Phase 2: Multi-select + stage filter + workflow
  const [selectedCRs, setSelectedCRs] = useState(new Set());
  const [stageFilter, setStageFilter] = useState("ALL");
  const [wfVersion, setWfVersion] = useState(0); // trigger re-render on workflow changes
  const [ejections, setEjections] = useState([]); // Phase 3: ejection notifications

  const stageFiltered = useMemo(() => {
    if (stageFilter === "ALL") return filtered;
    return filtered.filter(c => WorkflowManager.getEligibleStage(c) === stageFilter);
  }, [filtered, stageFilter, wfVersion]);

  const toggleCR = (id) => setSelectedCRs(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleAllCRs = () => {
    if (selectedCRs.size === stageFiltered.length) setSelectedCRs(new Set());
    else setSelectedCRs(new Set(stageFiltered.map(c => c.id)));
  };
  const handleCRBatchCreate = (stage, notes) => {
    const items = [...selectedCRs];
    const sprint = stageFiltered.find(c => selectedCRs.has(c.id))?.sprint_key || 'pos_5_0';
    WorkflowManager.createBatch(stage, sprint, items, notes);
    setSelectedCRs(new Set());
    setWfVersion(v => v + 1);
  };

  const groupOptions = [
    { value: "status", label: "Status" },
    { value: "sprint", label: "Sprint" },
    { value: "priority", label: "Priority" },
  ];

  const groups = useMemo(() => {
    if (groupBy === "none") return null;
    const keyFn = { status: c => c.status || "—", sprint: c => c.sprint_label, priority: c => c.priority || "—" }[groupBy];
    return groupRows(filtered, keyFn, null, (a, b) => a.key.localeCompare(b.key));
  }, [filtered, groupBy]);

  const expandedCount = Object.values(expanded).filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* CR headline: active vs shipped vs total */}
      <div className="rounded-lg border border-slate-700/60 bg-gradient-to-r from-slate-900 to-slate-900/40 p-4 flex flex-wrap items-baseline gap-x-8 gap-y-2" data-testid="cr-headline">
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-400">Active CRs</span>
          <span className="ml-2 text-3xl font-bold text-amber-300" data-testid="cr-active-count">{activeCount}</span>
          <span className="ml-2 text-sm text-slate-500">in flight</span>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-400">Shipped</span>
          <span className="ml-2 text-2xl font-semibold text-emerald-400">{shippedCount}</span>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-400">All-time registered</span>
          <span className="ml-2 text-2xl font-semibold text-slate-300">{trackedTotal}</span>
        </div>
        <div className="ml-auto text-xs text-slate-500 italic">Active = NOT_STARTED + IN_PROGRESS + BLOCKED. Click a card to filter.</div>
      </div>

      {/* CR-046 Phase 3: Ejection notifications */}
      <EjectionBanner ejections={ejections} onDismiss={() => setEjections([])} />

      {/* Category stat cards (clickable filters) */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
        <button data-testid="cr-stat-all" onClick={() => setCategoryFilter("ALL")}
          className={classNames("rounded-lg border p-3 text-left transition", categoryFilter === "ALL" ? "border-amber-500 bg-slate-800" : "border-slate-800 bg-slate-900 hover:border-slate-700")}>
          <div className="text-xs text-slate-400 uppercase tracking-wider">All</div>
          <div className="text-2xl font-bold mt-1 text-slate-200">{trackedTotal}</div>
        </button>
        {[
          ["NOT_STARTED", "text-slate-300"],
          ["IN_PROGRESS", "text-amber-300"],
          ["BLOCKED", "text-red-400"],
          ["SHIPPED", "text-emerald-400"],
          ["SUBSUMED", "text-cyan-300"],
          ["PARKED", "text-slate-500"],
        ].map(([k, color]) => (
          <button key={k} data-testid={`cr-stat-${k.toLowerCase()}`} onClick={() => setCategoryFilter(c => c === k ? "ALL" : k)}
            className={classNames("rounded-lg border p-3 text-left transition", categoryFilter === k ? "border-slate-500 bg-slate-800" : "border-slate-800 bg-slate-900 hover:border-slate-700")}>
            <div className="text-xs text-slate-400 uppercase tracking-wider">{k.replace("_", " ")}</div>
            <div className={classNames("text-2xl font-bold mt-1", color)}>{categoryCounts[k] || 0}</div>
          </button>
        ))}
      </div>

      {/* Sprint summary (kept) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {sprintKeys.map(k => (
          <Stat key={k} label={k.replace(/_/g, " ")} value={data.sprints[k].crs?.length || 0} sublabel={data.sprints[k].status} />
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select data-testid="cr-sprint-filter" value={sprintFilter} onChange={e => setSprintFilter(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm">
          <option value="ALL">All Sprints</option>{sprintKeys.map(k => <option key={k} value={k}>{k.replace(/_/g, " ").toUpperCase()}</option>)}
        </select>
        <select data-testid="cr-status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm">
          <option value="ALL">All Statuses</option>{statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input data-testid="cr-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title / id / files / notes…"
          className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm flex-1 min-w-[260px]" />
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none px-2 py-1.5 rounded border border-slate-700 hover:border-slate-500" data-testid="cr-hide-closed-label">
          <input type="checkbox" data-testid="cr-hide-closed" checked={hideClosed} onChange={e => setHideClosed(e.target.checked)} className="accent-emerald-500" />
          Hide closed
        </label>
        <GroupControls groupBy={groupBy} options={groupOptions} onChange={setGroupBy} groupsCount={groups?.length || 0}
          onExpandAll={() => setCollapsedGroups(Object.fromEntries((groups || []).map(g => [g.key, false])))}
          onCollapseAll={() => setCollapsedGroups(Object.fromEntries((groups || []).map(g => [g.key, true])))} />
        <CollapseAllBar visible={expandedCount > 0} expandedCount={expandedCount} onCollapse={() => setExpanded({})} />
        <button data-testid="cr-export-csv" onClick={() => downloadCSV(`cr_registry_${Date.now()}.csv`, ["sprint_label", "id", "title", "priority", "status", "files", "notes"], filtered)}
          className="bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium rounded px-3 py-1.5">Export CSV ({filtered.length})</button>
        <StageFilter value={stageFilter} onChange={setStageFilter} />
      </div>

      <ExpandableTable
        rows={stageFiltered} groups={groups} columnsCount={10}
        rowKeyFn={r => `${r.sprint_key}-${r.id}`}
        expanded={expanded}
        toggleRow={k => setExpanded(prev => ({ ...prev, [k]: !prev[k] }))}
        collapsedGroups={collapsedGroups}
        toggleGroup={k => setCollapsedGroups(prev => ({ ...prev, [k]: prev[k] === true ? false : true }))}
        renderHead={() => (
          <thead className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-1 py-2 w-6"><input type="checkbox" checked={selectedCRs.size > 0 && selectedCRs.size === stageFiltered.length} onChange={toggleAllCRs} className="accent-amber-500" /></th>
              <th className="px-2 py-2 w-6"></th>
              <th className="px-3 py-2 text-left">Sprint</th>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Priority</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Gates</th>
              <th className="px-3 py-2 text-left">Actions</th>
              <th className="px-3 py-2 text-left">Notes</th>
            </tr>
          </thead>
        )}
        renderRow={(c, i, isOpen, onToggle) => {
          const eligible = WorkflowManager.getEligibleStage(c);
          return (
          <tr key={`r-${c.sprint_key}-${c.id}-${i}`} className="row-hover cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40" tabIndex={0}
            onClick={onToggle} onKeyDown={e => e.key === "Enter" && onToggle()}>
            <td className="px-1 py-2 text-center" onClick={e => e.stopPropagation()}>
              <input type="checkbox" checked={selectedCRs.has(c.id)} onChange={() => toggleCR(c.id)} className="accent-amber-500" />
            </td>
            <td className="px-2 py-2 text-center"><RowExpander open={isOpen} /></td>
            <td className="px-3 py-2 text-slate-500 text-xs whitespace-nowrap">{c.sprint_label}</td>
            <td className="px-3 py-2 font-mono text-slate-200 whitespace-nowrap">{c.id}</td>
            <td className="px-3 py-2 text-slate-300">{c.title}</td>
            <td className="px-3 py-2 text-slate-400">{c.priority || "—"}</td>
            <td className="px-3 py-2"><StatusPill status={c.status} /></td>
            <td className="px-3 py-2"><GateProgressBar item={c} /></td>
            <td className="px-3 py-2">
              {eligible === 'gate4' && <Gate4Buttons itemId={c.id} onApprove={() => setWfVersion(v => v+1)} />}
              {eligible === 'smoke' && <SmokeButtons itemId={c.id} onResult={() => setWfVersion(v => v+1)} />}
              {eligible && eligible !== 'gate4' && eligible !== 'smoke' && <span className="text-[10px] text-slate-500">→ {eligible}</span>}
            </td>
            <td className="px-3 py-2 text-slate-400 text-xs">{c.notes || "—"}</td>
          </tr>
          );
        }}
        renderDetail={c => {
          const hotspot = detectHotspot(c.files, depFlags);
          const closureMatch = xref[normalizeId(c.id)]?.closure;
          const sprintBanner = c.sprint_status === "ACTIVE" ? `ACTIVE since ${c.sprint_started || "—"}`
            : c.sprint_status === "CLOSED" ? `CLOSED ${c.sprint_closed || ""}`.trim() : c.sprint_status;
          return (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-lg text-slate-100">{c.id}</span>
                <span className="text-slate-300">{c.title}</span>
                {c.priority && <Pill kind="MEDIUM">{c.priority}</Pill>}
                <StatusPill status={c.status} />
                {c.subsumed_meta?.owner_attested && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">subsumed · owner-attested</span>
                )}
              </div>
              {c.subsumed_meta?.owner_attested && (
                <div className="rounded border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs space-y-1">
                  <div className="text-amber-300 font-semibold uppercase tracking-wider text-[10px]">Subsumption attestation</div>
                  <div className="text-slate-300">Owner attested on <span className="text-slate-100 font-mono">{c.subsumed_meta.attested_date}</span> that this CR's scope was absorbed by other CRs.</div>
                  <div className="text-slate-400">Subsuming CR: <span className="text-amber-300 font-mono text-[11px]">{c.subsumed_meta.subsuming_cr}</span></div>
                  {c.subsumed_meta.attestation_doc && (
                    <div className="text-slate-500">Registry: <span className="text-slate-400 font-mono text-[11px]">{c.subsumed_meta.attestation_doc}</span></div>
                  )}
                </div>
              )}
              {c.refs_quality === "over-matched-by-scanner" && (
                <div className="rounded border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs space-y-1">
                  <div className="text-rose-300 font-semibold uppercase tracking-wider text-[10px]">⚠ artifact refs caveat</div>
                  <div className="text-slate-300">{c.refs_quality_note || "Scanner over-matched these refs from tangential docs. They are NOT verified implementation evidence for this CR."}</div>
                </div>
              )}
              <div className="text-xs flex items-center gap-2"><span className="text-slate-500 uppercase tracking-wider">Sprint:</span><span className="text-slate-300">{c.sprint_label}</span><span className="text-slate-500">·</span><span className="text-slate-400">{sprintBanner}</span></div>
              {hotspot && <HotspotBanner hotspot={hotspot} />}
              {c.files && <div className="text-xs"><span className="text-slate-500 uppercase tracking-wider block mb-1">Files Touched</span><span className="text-slate-300 font-mono break-words">{c.files}</span></div>}
              {c.notes && <div className="text-xs"><span className="text-slate-500 uppercase tracking-wider block mb-1">Notes</span><span className="text-slate-400">{c.notes}</span></div>}
              {closureMatch && <ClosureMiniSummary row={closureMatch} />}
              <ArtifactRefsSection refs={c.artifact_refs} />
              <CrossRefStrip id={c.id} xref={xref} currentTab="crs" onJump={onJump} />
            </>
          );
        }}
      />

      {depFlags.length > 0 && (
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-4">
          <div className="text-xs uppercase tracking-wider text-amber-400 font-semibold mb-2">⚠ Cross-Sprint Dependency Flags</div>
          <ul className="text-sm text-amber-200 space-y-1">
            {depFlags.map((f, i) => (
              <li key={i}><code className="text-amber-300">{f.file}</code> — touched by <em>{f.sprints}</em> · risk: <Pill kind={f.risk === "HIGH" ? "CRITICAL" : f.risk === "MEDIUM" ? "MEDIUM" : "LOW"}>{f.risk}</Pill></li>
            ))}
          </ul>
        </div>
      )}

      {/* CR-046 Phase 3: Smoke Test Cards — expandable guided verification */}
      {stageFiltered.some(c => /QA.*PASS|IMPLEMENTED/i.test(c.status || '') && !/CLOSED|VERIFIED/i.test(c.status || '')) && (
        <div className="space-y-2">
          <div className="text-xs text-amber-300 uppercase tracking-wider font-semibold">Smoke Tests Ready</div>
          {stageFiltered.filter(c => /QA.*PASS|IMPLEMENTED/i.test(c.status || '') && !/CLOSED|VERIFIED/i.test(c.status || '')).map(c => (
            <SmokeTestCard key={c.id} item={c} onResult={() => setWfVersion(v => v+1)} />
          ))}
        </div>
      )}

      {/* CR-046 Phase 3: Batch History */}
      <BatchHistoryPanel />

      {/* CR-046: Queue Panel */}
      <QueuePanel />

      {/* CR-046: Batch Action Bar (sticky bottom) */}
      <BatchActionBar
        selectedCount={selectedCRs.size}
        selectedItems={[...selectedCRs]}
        stage={stageFilter}
        sprint="pos_5_0"
        onBatchCreate={handleCRBatchCreate}
        onClearSelection={() => setSelectedCRs(new Set())}
      />
    </div>
  );
}

// ============================================================================
// DISABLED PAGE
// ============================================================================
function DisabledPage({ reason }) {
  return (
    <div className="flex items-center justify-center min-h-screen px-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-semibold mb-2 text-slate-200">Dev Dashboard Not Enabled</h1>
        <p className="text-sm text-slate-400 leading-relaxed">This dashboard is only available in pre-production environments.</p>
        <p className="text-xs text-slate-500 mt-4 font-mono">{reason}</p>
      </div>
    </div>
  );
}

// ============================================================================
// APP
// ============================================================================
function App() {
  const [config, setConfig] = useState(null);
  const [closureDebt, setClosureDebt] = useState(null);
  const [bugTracker, setBugTracker] = useState(null);
  const [crRegistry, setCRRegistry] = useState(null);
  const [tab, setTab] = useState("closure");
  const [err, setErr] = useState(null);

  // Per-tab state — lifted for cross-tab nav
  const [searchSeeds, setSearchSeeds] = useState({ closure: "", bugs: "", crs: "" });
  const [expandedByTab, setExpandedByTab] = useState({ closure: {}, bugs: {}, crs: {} });
  const [groupByTab, setGroupByTab] = useState({ closure: "sprint", bugs: "sprint", crs: "sprint" });
  const [collapsedGroupsByTab, setCollapsedGroupsByTab] = useState({ closure: {}, bugs: {}, crs: {} });

  useEffect(() => {
    (async () => {
      try {
        const cfg = await loadJSON("./data/config.json").catch(() => ({ enabled: false, reason: "config.json missing" }));
        setConfig(cfg);
        if (!cfg.enabled) return;
        const [cd, bt, cr] = await Promise.all([
          loadJSON("./data/closure_debt.json"),
          loadJSON("./data/bug_tracker.json"),
          loadJSON("./data/cr_registry.json"),
        ]);
        setClosureDebt(cd); setBugTracker(bt); setCRRegistry(cr);
      } catch (e) { setErr(e.message); }
    })();
  }, []);

  // Esc collapses all rows in current tab
  useEffect(() => {
    const onKey = e => {
      if (e.key === "Escape") {
        setExpandedByTab(prev => ({ ...prev, [tab]: {} }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab]);

  const xref = useMemo(() => buildCrossRefIndex(closureDebt, bugTracker, crRegistry), [closureDebt, bugTracker, crRegistry]);

  // Cross-tab jump handler: switch tab, seed search, mark target row as expanded
  const onJump = useCallback((destTab, id) => {
    const norm = normalizeId(id);
    setTab(destTab);
    setSearchSeeds(prev => ({ ...prev, [destTab]: id }));
    // Find the row key in destination tab and pre-expand it
    setExpandedByTab(prev => {
      const newExpanded = { ...prev[destTab] };
      if (destTab === "closure") {
        const r = (closureDebt?.items || []).find(x => normalizeId(x.item_id) === norm);
        if (r) newExpanded[r.item_id] = true;
      } else if (destTab === "bugs") {
        const all = [
          ...(bugTracker?.active_recent_bugs || []).map(b => ({ ...b, _section: "Active / Recent" })),
          ...(bugTracker?.intake_only_bugs || []).map(b => ({ ...b, _section: "Intake Only" })),
          ...(bugTracker?.production_hotfixes || []).map(b => ({ ...b, _section: "Production Hotfix" })),
        ];
        const r = all.find(x => normalizeId(x.id) === norm);
        if (r) newExpanded[`${r._section}-${r.id}`] = true;
      } else if (destTab === "crs") {
        for (const [sprintKey, sprint] of Object.entries(crRegistry?.sprints || {})) {
          const r = (sprint.crs || []).find(x => normalizeId(x.id) === norm);
          if (r) { newExpanded[`${sprintKey}-${r.id}`] = true; break; }
        }
      }
      return { ...prev, [destTab]: newExpanded };
    });
    // Reset group state for destination tab so the seeded row is visible
    setGroupByTab(prev => ({ ...prev, [destTab]: "none" }));
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
  }, [closureDebt, bugTracker, crRegistry]);

  const setSearchForTab = useCallback((t) => (v) => setSearchSeeds(prev => ({ ...prev, [t]: v })), []);
  const setExpandedForTab = useCallback((t) => (v) => setExpandedByTab(prev => ({ ...prev, [t]: typeof v === "function" ? v(prev[t]) : v })), []);
  const setGroupByForTab = useCallback((t) => (v) => setGroupByTab(prev => ({ ...prev, [t]: v })), []);
  const setCollapsedGroupsForTab = useCallback((t) => (v) => setCollapsedGroupsByTab(prev => ({ ...prev, [t]: typeof v === "function" ? v(prev[t]) : v })), []);

  if (!config) return <div className="flex items-center justify-center min-h-screen text-slate-400">Loading…</div>;
  if (!config.enabled) return <DisabledPage reason={config.reason || "REACT_APP_SHOW_DEV_DASHBOARD is not set"} />;
  if (err) return (
    <div className="flex items-center justify-center min-h-screen px-6">
      <div className="max-w-md bg-red-950/40 border border-red-900 rounded-xl p-8 text-center">
        <div className="text-3xl mb-3">⚠️</div>
        <h1 className="text-lg font-semibold text-red-200">Failed to load dashboard data</h1>
        <p className="text-xs text-red-300 mt-3 font-mono">{err}</p>
      </div>
    </div>
  );
  if (!closureDebt || !bugTracker || !crRegistry) return <div className="flex items-center justify-center min-h-screen text-slate-400">Loading data…</div>;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-100 tracking-tight" data-testid="dev-dashboard-title">MyGenie POS — Control Dashboard</h1>
            <p className="text-xs text-slate-500 mt-0.5">v1.1 · Read-only · Snapshot {closureDebt.generated_at} · Click any row to expand · Esc to collapse all</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-300 font-semibold uppercase tracking-wider bg-amber-950/40 border border-amber-900/60 rounded px-2 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>{(config.environment || "preprod").toUpperCase()}
            </span>
            <a href="/" className="text-xs text-slate-400 hover:text-slate-200">← Back to App</a>
          </div>
        </div>
        <div className="max-w-[1600px] mx-auto px-6">
          <nav className="flex gap-1" data-testid="dev-dashboard-tabs">
            <TabButton id="closure" current={tab} onClick={setTab}
              count={closureDebt.active_count ?? (closureDebt.items || []).filter(r => r.active_debt).length}>Closure Debt</TabButton>
            <TabButton id="bugs" current={tab} onClick={setTab}
              count={(() => {
                const all = [
                  ...(bugTracker.active_recent_bugs || []),
                  ...(bugTracker.pos_2_0_closed_consolidated_2026_05_18 || []),
                  ...(bugTracker.pos_final_1_0_closed_consolidated_2026_05_12 || []),
                  ...(bugTracker.older_closed_or_partial || []),
                  ...(bugTracker.true_intake_or_blocked || []),
                  ...(bugTracker.production_hotfixes || []),
                ];
                const closed = /CLOSED|SHIPPED|VERIFIED|IMPLEMENTED|CARRY.?FORWARD|NO CODE NEEDED|DEFERRED|SUBSUMED/i;
                const active = all.filter(b => !closed.test(b.status || "")).length;
                return `${active} / ${all.length}`;
              })()}>Bug Tracker</TabButton>
            <TabButton id="crs" current={tab} onClick={setTab}
              count={(() => {
                const flatten = Object.values(crRegistry.sprints || {}).flatMap(sp => sp.crs || []);
                const active = flatten.filter(c => ["NOT_STARTED", "IN_PROGRESS", "BLOCKED"].includes(c.category)).length;
                return `${active} / ${flatten.length}`;
              })()}>CR Registry</TabButton>
          </nav>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6">
        {tab === "closure" && <ClosureDebtTab data={closureDebt} xref={xref} onJump={onJump}
          search={searchSeeds.closure} setSearch={setSearchForTab("closure")}
          expanded={expandedByTab.closure} setExpanded={setExpandedForTab("closure")}
          groupBy={groupByTab.closure} setGroupBy={setGroupByForTab("closure")}
          collapsedGroups={collapsedGroupsByTab.closure} setCollapsedGroups={setCollapsedGroupsForTab("closure")} />}
        {tab === "bugs" && <BugTrackerTab data={bugTracker} xref={xref} onJump={onJump}
          search={searchSeeds.bugs} setSearch={setSearchForTab("bugs")}
          expanded={expandedByTab.bugs} setExpanded={setExpandedForTab("bugs")}
          groupBy={groupByTab.bugs} setGroupBy={setGroupByForTab("bugs")}
          collapsedGroups={collapsedGroupsByTab.bugs} setCollapsedGroups={setCollapsedGroupsForTab("bugs")} />}
        {tab === "crs" && <CRRegistryTab data={crRegistry} xref={xref} onJump={onJump}
          search={searchSeeds.crs} setSearch={setSearchForTab("crs")}
          expanded={expandedByTab.crs} setExpanded={setExpandedForTab("crs")}
          groupBy={groupByTab.crs} setGroupBy={setGroupByForTab("crs")}
          collapsedGroups={collapsedGroupsByTab.crs} setCollapsedGroups={setCollapsedGroupsForTab("crs")} />}
      </main>

      <footer className="border-t border-slate-800 mt-12">
        <div className="max-w-[1600px] mx-auto px-6 py-4 text-xs text-slate-500 flex flex-wrap gap-4 justify-between">
          <span>Source: <code>/app/memory/control/</code></span>
          <span>v1.1 · Hidden route · env-gated via <code>REACT_APP_SHOW_DEV_DASHBOARD</code></span>
          <span>Built: {config.generated_at || "—"}</span>
        </div>
      </footer>
    </div>
  );
}

function TabButton({ id, current, count, children, onClick }) {
  const active = current === id;
  return (
    <button data-testid={`dev-dashboard-tab-${id}`} onClick={() => onClick(id)}
      className={classNames("px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-center gap-2",
        active ? "border-emerald-400 text-slate-100" : "border-transparent text-slate-400 hover:text-slate-200")}>
      {children}
      <span className={classNames("text-xs px-1.5 py-0.5 rounded font-mono", active ? "bg-emerald-900/60 text-emerald-200" : "bg-slate-800 text-slate-400")}>{count}</span>
    </button>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
