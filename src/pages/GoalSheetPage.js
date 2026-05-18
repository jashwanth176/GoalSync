import { api } from '../api.js';
import { currentUser, showToast } from '../main.js';

const THRUST_AREAS = ['Product Innovation','Energy Efficiency','Market Expansion','Customer Experience','Operational Excellence','Revenue Growth','Talent Development','Sustainability'];
const UOM_OPTIONS = [{v:'numeric',l:'Numeric'},{v:'percentage',l:'Percentage (%)'},{v:'timeline',l:'Timeline (Date)'},{v:'zero',l:'Zero-based'}];
const COLORS = ['#FDB913','#3b82f6','#22c55e','#ef4444','#a855f7','#f97316','#06b6d4','#ec4899'];

export async function renderGoalSheet(el) {
  const cycles = await api.admin.getCycles();
  const activeCycle = cycles.find(c => c.status === 'active') || cycles[0];
  if (!activeCycle) { el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-title">No Active Cycle</div></div>'; return; }

  let sheets = await api.goals.getSheets({ employeeId: currentUser.id, cycleId: activeCycle.id });
  let sheet = sheets[0];
  if (!sheet) {
    const { id } = await api.goals.createSheet(currentUser.id, activeCycle.id);
    sheet = await api.goals.getSheet(id);
  } else {
    sheet = await api.goals.getSheet(sheet.id);
  }

  const goals = sheet.goals || [];
  const isLocked = sheet.status === 'approved';
  const canEdit = sheet.status === 'draft' || sheet.status === 'returned';
  const totalW = goals.reduce((s,g) => s + g.weightage, 0);

  function renderWeightageBar() {
    if (!goals.length) return '<div class="weightage-bar"><div style="width:100%;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:var(--text-xs)">No goals yet</div></div>';
    return `<div class="weightage-bar">${goals.map((g,i) => `<div class="weightage-segment" style="width:${g.weightage}%;background:${COLORS[i%8]}" title="${g.title}: ${g.weightage}%">${g.weightage}%</div>`).join('')}${totalW < 100 ? `<div class="weightage-segment" style="width:${100-totalW}%;background:rgba(255,255,255,0.05);color:var(--text-muted)">${100-totalW}%</div>` : ''}</div>`;
  }

  function renderValidation() {
    const rules = [
      { pass: goals.length >= 1, text: `At least 1 goal (${goals.length} created)` },
      { pass: goals.length <= 8, text: `Maximum 8 goals (${goals.length}/8)` },
      { pass: goals.every(g => g.weightage >= 10), text: 'Each goal ≥ 10% weightage' },
      { pass: Math.abs(totalW - 100) < 0.01, text: `Total weightage = 100% (currently ${totalW}%)` },
    ];
    return rules.map(r => `<div class="validation-rule ${r.pass?'pass':'fail'}">${r.pass?'✓':'✗'} ${r.text}</div>`).join('');
  }

  el.innerHTML = `
    <div class="parallax-hero">
      <div class="flex-between">
        <div><h1>Goal Sheet</h1><p>${activeCycle.name} • ${sheet.status.toUpperCase()}</p></div>
        <span class="badge ${sheet.status==='approved'?'badge-success':sheet.status==='submitted'?'badge-info':sheet.status==='returned'?'badge-warning':'badge-neutral'}">${sheet.status}</span>
      </div>
    </div>
    ${sheet.managerComments ? `<div class="glass-card" style="padding:16px;margin-bottom:24px;border-left:3px solid var(--warning)"><strong>Manager Comments:</strong> ${sheet.managerComments}</div>` : ''}
    <div style="margin-bottom:24px">
      <div class="flex-between" style="margin-bottom:8px"><span style="font-size:var(--text-sm);font-weight:600">Weightage Distribution</span><span style="font-size:var(--text-sm);color:${Math.abs(totalW-100)<0.01?'var(--success)':'var(--danger)'}">${totalW}% / 100%</span></div>
      ${renderWeightageBar()}
    </div>
    <div class="grid grid-2" style="margin-bottom:24px">
      <div class="glass-card" style="padding:16px"><h4 style="margin-bottom:12px">Validation Rules</h4>${renderValidation()}</div>
      <div class="glass-card" style="padding:16px;display:flex;flex-direction:column;justify-content:space-between">
        <div><h4 style="margin-bottom:8px">Actions</h4><p style="font-size:var(--text-sm)">Goals: ${goals.length}/8 • Weightage: ${totalW}%</p></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
          ${canEdit ? `<button class="btn btn-primary" id="addGoalBtn" ${goals.length>=8?'disabled':''}>${goals.length>=8?'Max 8 Goals':'+ Add Goal'}</button>` : ''}
          ${canEdit && goals.length > 0 && Math.abs(totalW-100)<0.01 && goals.every(g=>g.weightage>=10) ? `<button class="btn btn-success" id="submitBtn">Submit for Approval</button>` : ''}
        </div>
      </div>
    </div>
    <div id="goalsList">${goals.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">🎯</div><div class="empty-state-title">No goals yet</div><p class="empty-state-text">Click "Add Goal" to create your first goal</p></div>' :
      goals.map((g,i) => `
        <div class="glass-card animate-fade-up stagger-${i+1}" style="padding:20px;margin-bottom:16px">
          <div class="flex-between" style="margin-bottom:12px">
            <div class="flex gap-sm" style="align-items:center">
              <div style="width:12px;height:12px;border-radius:50%;background:${COLORS[i%8]}"></div>
              <span class="badge badge-accent">${g.thrustArea}</span>
              <span class="badge badge-neutral">${g.uom}${g.uom==='numeric'||g.uom==='percentage'?' ('+g.uomDirection+')':''}</span>
              ${g.isShared ? '<span class="badge badge-info">🔗 Shared</span>' : ''}
            </div>
            <div class="flex gap-sm">
              ${canEdit && !g.isShared ? `<button class="btn btn-ghost btn-sm edit-goal" data-id="${g.id}">✏️</button>` : ''}
              ${canEdit && !g.isShared ? `<button class="btn btn-ghost btn-sm del-goal" data-id="${g.id}" style="color:var(--danger)">🗑️</button>` : ''}
            </div>
          </div>
          <h3 style="font-size:var(--text-lg);margin-bottom:4px">${g.title}</h3>
          ${g.description ? `<p style="font-size:var(--text-sm);margin-bottom:12px">${g.description}</p>` : ''}
          <div class="flex gap-lg" style="flex-wrap:wrap">
            <div><span style="font-size:var(--text-xs);color:var(--text-muted)">Target</span><div style="font-weight:600">${g.target}${g.uom==='percentage'?'%':''}</div></div>
            <div><span style="font-size:var(--text-xs);color:var(--text-muted)">Weightage</span><div style="font-weight:600;color:var(--accent)">${g.weightage}%</div></div>
            <div><span style="font-size:var(--text-xs);color:var(--text-muted)">Status</span><div><span class="status-dot ${g.status}"></span> ${g.status.replace('_',' ')}</div></div>
            ${g.lockedAt ? `<div><span style="font-size:var(--text-xs);color:var(--text-muted)">Locked</span><div>🔒 ${new Date(g.lockedAt).toLocaleDateString()}</div></div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
    <div class="modal-overlay" id="goalModal" style="display:none">
      <div class="modal-content">
        <div class="modal-header"><h3 id="modalTitle">Add Goal</h3><button class="btn btn-ghost btn-icon" id="closeModal">✕</button></div>
        <div class="modal-body">
          <input type="hidden" id="editGoalId">
          <div class="form-group" style="margin-bottom:16px"><label class="form-label">Thrust Area *</label><select class="form-select" id="fThrustArea"><option value="">Select...</option>${THRUST_AREAS.map(t=>`<option value="${t}">${t}</option>`).join('')}</select></div>
          <div class="form-group" style="margin-bottom:16px"><label class="form-label">Goal Title *</label><input class="form-input" id="fTitle" placeholder="e.g. Launch BLDC Motor V3"></div>
          <div class="form-group" style="margin-bottom:16px"><label class="form-label">Description</label><textarea class="form-textarea" id="fDesc" placeholder="Describe the goal..."></textarea></div>
          <div class="grid grid-2" style="margin-bottom:16px">
            <div class="form-group"><label class="form-label">Unit of Measurement *</label><select class="form-select" id="fUom">${UOM_OPTIONS.map(u=>`<option value="${u.v}">${u.l}</option>`).join('')}</select></div>
            <div class="form-group" id="dirGroup"><label class="form-label">Direction</label><select class="form-select" id="fDir"><option value="min">Min (Higher is Better)</option><option value="max">Max (Lower is Better)</option></select></div>
          </div>
          <div class="grid grid-2">
            <div class="form-group"><label class="form-label">Target *</label><input class="form-input" id="fTarget" placeholder="Enter target"></div>
            <div class="form-group"><label class="form-label">Weightage (%) * <span style="color:var(--text-muted)">(min 10%)</span></label><input class="form-input" id="fWeight" type="number" min="10" max="100" placeholder="e.g. 25"></div>
          </div>
          <div id="formError" class="form-error" style="margin-top:8px"></div>
        </div>
        <div class="modal-footer"><button class="btn btn-ghost" id="cancelModal">Cancel</button><button class="btn btn-primary" id="saveGoal">Save Goal</button></div>
      </div>
    </div>`;

  const modal = document.getElementById('goalModal');
  const closeM = () => modal.style.display = 'none';
  document.getElementById('closeModal').onclick = closeM;
  document.getElementById('cancelModal').onclick = closeM;
  modal.addEventListener('click', e => { if (e.target === modal) closeM(); });

  document.getElementById('fUom')?.addEventListener('change', e => {
    const dir = document.getElementById('dirGroup');
    dir.style.display = (e.target.value==='numeric'||e.target.value==='percentage') ? '' : 'none';
    const tgt = document.getElementById('fTarget');
    if (e.target.value === 'timeline') tgt.type = 'date';
    else if (e.target.value === 'zero') { tgt.value = '0'; tgt.disabled = true; }
    else { tgt.type = 'text'; tgt.disabled = false; }
  });

  document.getElementById('addGoalBtn')?.addEventListener('click', () => {
    document.getElementById('modalTitle').textContent = 'Add Goal';
    document.getElementById('editGoalId').value = '';
    ['fThrustArea','fTitle','fDesc','fTarget','fWeight'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('fUom').value = 'numeric';
    document.getElementById('fDir').value = 'min';
    document.getElementById('fTarget').type = 'text';
    document.getElementById('fTarget').disabled = false;
    document.getElementById('dirGroup').style.display = '';
    document.getElementById('formError').textContent = '';
    modal.style.display = 'flex';
  });

  document.querySelectorAll('.edit-goal').forEach(btn => btn.addEventListener('click', () => {
    const g = goals.find(x => x.id === btn.dataset.id);
    if (!g) return;
    document.getElementById('modalTitle').textContent = 'Edit Goal';
    document.getElementById('editGoalId').value = g.id;
    document.getElementById('fThrustArea').value = g.thrustArea;
    document.getElementById('fTitle').value = g.title;
    document.getElementById('fDesc').value = g.description || '';
    document.getElementById('fUom').value = g.uom;
    document.getElementById('fDir').value = g.uomDirection;
    document.getElementById('fTarget').value = g.target;
    document.getElementById('fWeight').value = g.weightage;
    document.getElementById('fTarget').type = g.uom==='timeline'?'date':'text';
    document.getElementById('fTarget').disabled = g.uom==='zero';
    document.getElementById('dirGroup').style.display = (g.uom==='numeric'||g.uom==='percentage')?'':'none';
    document.getElementById('formError').textContent = '';
    modal.style.display = 'flex';
  }));

  document.querySelectorAll('.del-goal').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Delete this goal?')) return;
    try {
      await api.goals.deleteGoal(btn.dataset.id, currentUser.id);
      showToast('success', 'Goal Deleted', '');
      renderGoalSheet(el);
    } catch(e) { showToast('error', 'Error', e.message); }
  }));

  document.getElementById('saveGoal')?.addEventListener('click', async () => {
    const data = {
      thrustArea: document.getElementById('fThrustArea').value,
      title: document.getElementById('fTitle').value,
      description: document.getElementById('fDesc').value,
      uom: document.getElementById('fUom').value,
      uomDirection: document.getElementById('fDir').value,
      target: document.getElementById('fTarget').value,
      weightage: parseFloat(document.getElementById('fWeight').value)
    };
    if (!data.thrustArea || !data.title || !data.target || isNaN(data.weightage)) {
      document.getElementById('formError').textContent = 'Please fill all required fields';
      return;
    }
    if (data.weightage < 10) { document.getElementById('formError').textContent = 'Minimum weightage is 10%'; return; }
    try {
      const editId = document.getElementById('editGoalId').value;
      if (editId) { await api.goals.updateGoal(editId, { ...data, changedBy: currentUser.id }); }
      else { await api.goals.addGoal(sheet.id, data); }
      showToast('success', editId ? 'Goal Updated' : 'Goal Added', '');
      closeM();
      renderGoalSheet(el);
    } catch(e) { document.getElementById('formError').textContent = e.message; }
  });

  document.getElementById('submitBtn')?.addEventListener('click', async () => {
    if (!confirm('Submit your goal sheet for manager approval? You won\'t be able to edit after submission.')) return;
    try {
      await api.goals.submitSheet(sheet.id);
      showToast('success', 'Submitted!', 'Your goal sheet has been sent to your manager');
      renderGoalSheet(el);
    } catch(e) { showToast('error', 'Error', e.message); }
  });
}
