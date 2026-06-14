// CR-046: Workflow queue manager — batch operations, approvals, smoke results
// Stores data in localStorage (dashboard is static — no backend write endpoint)
// Agent reads exported JSON via workflow_queue.json or manual copy

const WF_STORAGE_KEY = '__dev_workflow_queue';

const WorkflowManager = {
  // ── Load / Save ──
  load() {
    try {
      const raw = localStorage.getItem(WF_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { batches: [], approvals: [], smoke_results: [] };
  },

  save(data) {
    localStorage.setItem(WF_STORAGE_KEY, JSON.stringify(data));
  },

  // ── Batch Operations ──
  createBatch(stage, sprint, items, ownerNotes) {
    const data = this.load();
    const batchId = 'BATCH-' + new Date().toISOString().slice(0,10) + '-' + String(data.batches.length + 1).padStart(3, '0');
    const batch = {
      batch_id: batchId,
      stage: stage,
      sprint: sprint,
      items: items,
      status: 'QUEUED',
      created_at: new Date().toISOString(),
      owner_notes: ownerNotes || ''
    };
    data.batches.push(batch);
    this.save(data);
    return batch;
  },

  getBatches(status) {
    const data = this.load();
    if (!status) return data.batches;
    return data.batches.filter(b => b.status === status);
  },

  updateBatchStatus(batchId, status) {
    const data = this.load();
    const batch = data.batches.find(b => b.batch_id === batchId);
    if (batch) { batch.status = status; this.save(data); }
  },

  cancelBatch(batchId) {
    const data = this.load();
    data.batches = data.batches.filter(b => b.batch_id !== batchId);
    this.save(data);
  },

  // ── Gate 4 Approvals ──
  addApproval(itemId, verdict, notes) {
    const data = this.load();
    data.approvals.push({
      item_id: itemId,
      gate: 'gate_4',
      verdict: verdict,
      notes: notes || '',
      at: new Date().toISOString()
    });
    this.save(data);
  },

  getApproval(itemId) {
    const data = this.load();
    return data.approvals.filter(a => a.item_id === itemId).pop();
  },

  // ── Smoke Results ──
  addSmokeResult(itemId, verdict, notes) {
    const data = this.load();
    data.smoke_results.push({
      item_id: itemId,
      verdict: verdict,
      notes: notes || '',
      at: new Date().toISOString()
    });
    this.save(data);
  },

  getSmokeResult(itemId) {
    const data = this.load();
    return data.smoke_results.filter(s => s.item_id === itemId).pop();
  },

  // ── Export for agent consumption ──
  exportAsJSON() {
    const data = this.load();
    data.exported_at = new Date().toISOString();
    return JSON.stringify(data, null, 2);
  },

  // ── Clear completed (sprint closure) ──
  clearCompleted() {
    const data = this.load();
    data.batches = data.batches.filter(b => b.status === 'QUEUED' || b.status === 'IN_PROGRESS');
    this.save(data);
  },

  // ── Ejections ──
  addEjection(batchId, itemId, reason) {
    const data = this.load();
    if (!data.ejections) data.ejections = [];
    data.ejections.push({
      batch_id: batchId,
      item_id: itemId,
      reason: reason,
      at: new Date().toISOString()
    });
    this.save(data);
  },

  getEjections() {
    const data = this.load();
    return data.ejections || [];
  },

  clearEjections() {
    const data = this.load();
    data.ejections = [];
    this.save(data);
  },

  // ── Gate status helpers (7 gates: Intake → Impact → Plan → Gate4 → Code → QA → Smoke) ──
  getItemGateStatus(item) {
    const s = (item.status || '').toUpperCase();
    const gates = {
      intake:  'none',
      impact:  'none',
      plan:    'none',
      gate4:   'none',
      code:    'none',
      qa:      'none',
      smoke:   'none'
    };

    // Gate 1: Intake
    if (item.art1_intake === 'PRESENT' || /REGISTERED|INTAKE|PLAN|IMPLEMENT|CLOSED|VERIFIED|QA|GATE|BACKEND|PARTIAL|OWNER|INVESTIGATION|IMPACT/.test(s)) gates.intake = 'done';

    // Gate 2: Impact Analysis
    if (item.art2_impact === 'PRESENT' || /IMPACT.*COMPLETE|GATE.3|GATE.4|IMPLEMENT|CLOSED|VERIFIED|QA.*PASS|PLANNING.*COMPLETE/.test(s)) gates.impact = 'done';
    else if (/INVESTIGATION|IMPACT.*PROGRESS/.test(s)) gates.impact = 'active';
    else if (/INTAKE|REGISTERED/.test(s)) gates.impact = 'waiting';

    // Gate 3: Implementation Plan
    if (item.art3_plan === 'PRESENT' || /GATE.3.*COMPLETE|GATE.4|IMPLEMENT|CLOSED|VERIFIED|QA.*PASS|PLANNING.*COMPLETE/.test(s)) gates.plan = 'done';
    else if (gates.impact === 'done' && !/GATE.3|GATE.4|IMPLEMENT|CLOSED/.test(s)) gates.plan = 'waiting';

    // Gate 4: Owner Approval
    const approval = this.getApproval(item.id);
    if (approval?.verdict === 'GO' || /GATE.4.*GO|IMPLEMENT|CLOSED|VERIFIED|QA.*PASS/.test(s)) gates.gate4 = 'done';
    else if (approval?.verdict === 'NO') gates.gate4 = 'rejected';
    else if (/GATE.3.*COMPLETE|PLANNING.*COMPLETE/.test(s)) gates.gate4 = 'waiting';

    // Gate 5a: Code
    if (item.art5_impl_summary_qa === 'PRESENT' || /IMPLEMENT|CLOSED|VERIFIED|QA.*PASS/.test(s)) gates.code = 'done';
    else if (/GATE.4.*GO/.test(s)) gates.code = 'active';

    // Gate 5b: QA
    if (/QA.*PASS|CLOSED.*VERIFIED|OWNER.*VERIFIED/.test(s)) gates.qa = 'done';
    else if (/IMPLEMENT/.test(s) && !/CLOSED/.test(s)) gates.qa = 'waiting';

    // Gate 6: Smoke
    const smoke = this.getSmokeResult(item.id);
    if (smoke?.verdict === 'PASS' || item.art6_owner_smoke === 'PRESENT' || /CLOSED.*OWNER.*VERIFIED|OWNER.*VERIFIED/.test(s)) gates.smoke = 'done';
    else if (smoke?.verdict === 'FAIL') gates.smoke = 'rejected';
    else if (/QA.*PASS/.test(s)) gates.smoke = 'waiting';

    // Blocked items
    if (/BACKEND.BLOCKED|CRM.BLOCKED/.test(s)) {
      gates.intake = 'done';
    }

    return gates;
  },

  // ── Stage eligibility (7 stages) ──
  getEligibleStage(item) {
    const s = (item.status || '').toUpperCase();
    
    // Not eligible
    if (/CLOSED|VERIFIED|SHIPPED|SUBSUMED/.test(s) && !/NOT/.test(s)) return null;
    if (/BACKEND.BLOCKED|CRM.BLOCKED/.test(s)) return null;
    if (/OWNER.*SCOPE/.test(s)) return null;
    if (/DEFERRED|PARKED/.test(s) && !/RESIDUAL/.test(s)) return null;

    // QA passed → smoke
    if (/QA.*PASS/.test(s)) return 'smoke';
    // Implemented → qa
    if (/IMPLEMENT/.test(s) && !/CLOSED/.test(s)) return 'qa';
    // Gate 4 GO → implementation
    if (/GATE.4.*GO/.test(s)) return 'implementation';
    // Gate 3 / Planning complete → gate4
    if (/GATE.3.*COMPLETE|PLANNING.*COMPLETE/.test(s)) return 'gate4';
    // Impact complete → implementation_plan (Gate 3)
    if (/IMPACT.*COMPLETE|GATE.2.*COMPLETE/.test(s)) return 'implementation_plan';
    // Intake / registered / partial / investigation → impact_analysis (Gate 2)
    if (/REGISTERED|INTAKE|PARTIAL|NOT.STARTED|INVESTIGATION.*COMPLETE/.test(s)) return 'impact_analysis';

    return 'impact_analysis';
  }
};
