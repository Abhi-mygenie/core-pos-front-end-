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
    // Derive gate progress from item fields
    const s = (item.status || '').toUpperCase();
    const gates = {
      intake:  'none',
      plan:    'none',
      gate4:   'none',
      code:    'none',
      qa:      'none',
      smoke:   'none'
    };

    // Intake
    if (item.art1_intake === 'PRESENT' || /REGISTERED|INTAKE|PLAN|IMPLEMENT|CLOSED|VERIFIED|QA|GATE/.test(s)) gates.intake = 'done';

    // Plan
    if (item.art2_impact === 'PRESENT' || item.art3_plan === 'PRESENT' || /PLAN|GATE.3|GATE.4|IMPLEMENT|CLOSED|VERIFIED|QA/.test(s)) gates.plan = 'done';
    else if (/PLANNING|INVESTIGATION/.test(s)) gates.plan = 'active';

    // Gate 4
    const approval = this.getApproval(item.id);
    if (approval?.verdict === 'GO' || /GATE.4.*GO|IMPLEMENT|CLOSED|VERIFIED|QA/.test(s)) gates.gate4 = 'done';
    else if (/GATE.3.*COMPLETE/.test(s)) gates.gate4 = 'waiting';
    else if (approval?.verdict === 'NO') gates.gate4 = 'rejected';

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

    return gates;
  },

  // ── Stage eligibility ──
  getEligibleStage(item) {
    const s = (item.status || '').toUpperCase();
    if (/CLOSED|VERIFIED|SHIPPED|SUBSUMED/.test(s)) return null;
    if (/REGISTERED|INTAKE/.test(s) && !/IMPLEMENT/.test(s) && !/GATE/.test(s)) return 'planning';
    if (/GATE.3.*COMPLETE/.test(s)) return 'gate4';
    if (/GATE.4.*GO/.test(s)) return 'implementation';
    if (/IMPLEMENT/.test(s) && !/CLOSED/.test(s)) return 'qa';
    if (/QA.*PASS/.test(s)) return 'smoke';
    return 'planning'; // default
  }
};
