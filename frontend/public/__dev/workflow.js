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

  // ── Gate status helpers ──
  getItemGateStatus(item) {
    const s = (item.status || '').toUpperCase();
    const gates = {
      intake:  'none',
      plan:    'none',
      gate4:   'none',
      code:    'none',
      qa:      'none',
      smoke:   'none'
    };

    // Intake — anything registered or beyond
    if (item.art1_intake === 'PRESENT' || /REGISTERED|INTAKE|PLAN|IMPLEMENT|CLOSED|VERIFIED|QA|GATE|BACKEND|PARTIAL|OWNER|INVESTIGATION/.test(s)) gates.intake = 'done';

    // Plan — has impact/plan or status implies planned
    if (item.art2_impact === 'PRESENT' || item.art3_plan === 'PRESENT' || /GATE.3|GATE.4|IMPLEMENT|CLOSED|VERIFIED|QA.*PASS|PLANNING.*COMPLETE/.test(s)) gates.plan = 'done';
    else if (/PLANNING|INVESTIGATION/.test(s) && !/COMPLETE/.test(s)) gates.plan = 'active';
    else if (/INTAKE|REGISTERED/.test(s)) gates.plan = 'waiting';

    // Gate 4
    const approval = this.getApproval(item.id);
    if (approval?.verdict === 'GO' || /GATE.4.*GO|IMPLEMENT|CLOSED|VERIFIED|QA.*PASS/.test(s)) gates.gate4 = 'done';
    else if (approval?.verdict === 'NO') gates.gate4 = 'rejected';
    else if (/GATE.3.*COMPLETE|PLANNING.*COMPLETE/.test(s)) gates.gate4 = 'waiting';

    // Code
    if (item.art5_impl_summary_qa === 'PRESENT' || /IMPLEMENT|CLOSED|VERIFIED|QA.*PASS/.test(s)) gates.code = 'done';
    else if (/GATE.4.*GO/.test(s)) gates.code = 'active';

    // QA
    if (/QA.*PASS|CLOSED.*VERIFIED|OWNER.*VERIFIED/.test(s)) gates.qa = 'done';
    else if (/IMPLEMENT/.test(s) && !/CLOSED/.test(s)) gates.qa = 'waiting';

    // Smoke
    const smoke = this.getSmokeResult(item.id);
    if (smoke?.verdict === 'PASS' || item.art6_owner_smoke === 'PRESENT' || /CLOSED.*OWNER.*VERIFIED|OWNER.*VERIFIED/.test(s)) gates.smoke = 'done';
    else if (smoke?.verdict === 'FAIL') gates.smoke = 'rejected';
    else if (/QA.*PASS/.test(s)) gates.smoke = 'waiting';

    // Blocked items — show intake done, rest blocked
    if (/BACKEND.BLOCKED|CRM.BLOCKED/.test(s)) {
      gates.intake = 'done';
      gates.plan = gates.plan === 'done' ? 'done' : 'none';
      if (gates.plan !== 'done') gates.plan = 'none';
    }

    return gates;
  },

  // ── Stage eligibility ──
  getEligibleStage(item) {
    const s = (item.status || '').toUpperCase();
    
    // Closed / shipped / verified — not eligible for any stage
    if (/CLOSED|VERIFIED|SHIPPED|SUBSUMED/.test(s) && !/NOT/.test(s)) return null;
    
    // Blocked items — not eligible
    if (/BACKEND.BLOCKED|CRM.BLOCKED/.test(s)) return null;
    
    // Owner scope needed — not eligible
    if (/OWNER.*SCOPE/.test(s)) return null;
    
    // Deferred / parked — not eligible
    if (/DEFERRED|PARKED/.test(s) && !/RESIDUAL/.test(s)) return null;

    // QA passed → smoke
    if (/QA.*PASS/.test(s)) return 'smoke';
    
    // Implemented (not closed) → qa
    if (/IMPLEMENT/.test(s) && !/CLOSED/.test(s)) return 'qa';
    
    // Gate 4 GO → implementation
    if (/GATE.4.*GO/.test(s)) return 'implementation';
    
    // Gate 3 complete / Planning complete → gate4
    if (/GATE.3.*COMPLETE|PLANNING.*COMPLETE/.test(s)) return 'gate4';

    // Registered / intake / partial → planning
    if (/REGISTERED|INTAKE|PARTIAL|NOT.STARTED/.test(s)) return 'planning';
    
    // Investigation complete → planning (needs plan after investigation)
    if (/INVESTIGATION.*COMPLETE/.test(s)) return 'planning';

    return 'planning'; // default fallback
  }
};
