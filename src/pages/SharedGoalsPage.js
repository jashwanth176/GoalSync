import { api } from '../api.js';
import { currentUser, showToast } from '../main.js';

const THRUST_AREAS = ['Product Innovation','Energy Efficiency','Market Expansion','Customer Experience','Operational Excellence','Revenue Growth','Talent Development','Sustainability'];

export async function renderSharedGoals(el) {
  const [templates, users] = await Promise.all([api.admin.getSharedGoals(), api.admin.getAllUsers()]);
  const employees = users.filter(u => u.role === 'employee');
  const departments = [...new Set(employees.map(e => e.department))];

  el.innerHTML = `
    <div class="page-header flex-between">
      <div><h1>Shared Goals</h1><p>Push departmental KPIs to multiple employees</p></div>
      <button class="btn btn-primary" id="newSharedGoal">+ Create Shared Goal</button>
    </div>
    ${templates.length ? `<div class="grid grid-2">${templates.map(t => `
      <div class="glass-card" style="padding:20px">
        <div class="flex-between" style="margin-bottom:8px"><span class="badge badge-accent">${t.thrustArea}</span><span style="font-size:var(--text-xs);color:var(--text-muted)">${new Date(t.createdAt).toLocaleDateString()}</span></div>
        <h3>${t.title}</h3>
        <p style="font-size:var(--text-sm);margin:8px 0">${t.description||'No description'}</p>
        <div class="flex gap-md"><div><span style="font-size:var(--text-xs);color:var(--text-muted)">Target</span><div style="font-weight:600">${t.target}</div></div>
        <div><span style="font-size:var(--text-xs);color:var(--text-muted)">UoM</span><div style="font-weight:600">${t.uom}</div></div>
        <div><span style="font-size:var(--text-xs);color:var(--text-muted)">Created by</span><div style="font-weight:600">${t.creatorName}</div></div></div>
      </div>`).join('')}</div>` : '<div class="empty-state"><div class="empty-state-icon">🔗</div><div class="empty-state-title">No shared goals yet</div></div>'}
    <div class="modal-overlay" id="sharedModal" style="display:none">
      <div class="modal-content modal-lg">
        <div class="modal-header"><h3>Create Shared Goal</h3><button class="btn btn-ghost btn-icon" id="closeSharedModal">✕</button></div>
        <div class="modal-body">
          <div class="grid grid-2" style="gap:16px;margin-bottom:16px">
            <div class="form-group"><label class="form-label">Thrust Area</label><select class="form-select" id="sThrustArea"><option value="">Select...</option>${THRUST_AREAS.map(t=>`<option>${t}</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label">UoM</label><select class="form-select" id="sUom"><option value="numeric">Numeric</option><option value="percentage">Percentage</option><option value="timeline">Timeline</option><option value="zero">Zero-based</option></select></div>
          </div>
          <div class="form-group" style="margin-bottom:16px"><label class="form-label">Goal Title</label><input class="form-input" id="sTitle" placeholder="Departmental KPI title"></div>
          <div class="form-group" style="margin-bottom:16px"><label class="form-label">Description</label><textarea class="form-textarea" id="sDesc"></textarea></div>
          <div class="form-group" style="margin-bottom:16px"><label class="form-label">Target</label><input class="form-input" id="sTarget"></div>
          <div class="form-group" style="margin-bottom:16px">
            <label class="form-label">Department Filter</label>
            <select class="form-select" id="sDept"><option value="">All Departments</option>${departments.map(d=>`<option>${d}</option>`).join('')}</select>
          </div>
          <div class="form-group"><label class="form-label">Select Recipients</label>
            <div id="recipientList" style="max-height:200px;overflow-y:auto;border:1px solid var(--glass-border);border-radius:var(--radius-md);padding:8px">
              ${employees.map(e => `<label style="display:flex;align-items:center;gap:8px;padding:6px;cursor:pointer" class="emp-check" data-dept="${e.department}">
                <input type="checkbox" value="${e.id}" class="emp-cb"> ${e.avatar} ${e.name} — ${e.department}
              </label>`).join('')}
            </div>
          </div>
        </div>
        <div class="modal-footer"><button class="btn btn-ghost" id="cancelShared">Cancel</button><button class="btn btn-primary" id="pushShared">Push to Selected</button></div>
      </div>
    </div>`;

  const modal = document.getElementById('sharedModal');
  document.getElementById('newSharedGoal').onclick = () => modal.style.display = 'flex';
  document.getElementById('closeSharedModal').onclick = () => modal.style.display = 'none';
  document.getElementById('cancelShared').onclick = () => modal.style.display = 'none';

  document.getElementById('sDept').addEventListener('change', e => {
    document.querySelectorAll('.emp-check').forEach(l => { l.style.display = !e.target.value || l.dataset.dept === e.target.value ? '' : 'none'; });
  });

  document.getElementById('pushShared').addEventListener('click', async () => {
    const checked = [...document.querySelectorAll('.emp-cb:checked')].map(c => c.value);
    if (!checked.length) { showToast('warning','Select','Choose at least one recipient'); return; }
    try {
      await api.admin.pushSharedGoal({
        createdBy: currentUser.id, thrustArea: document.getElementById('sThrustArea').value,
        title: document.getElementById('sTitle').value, description: document.getElementById('sDesc').value,
        uom: document.getElementById('sUom').value, target: document.getElementById('sTarget').value,
        recipientIds: checked
      });
      showToast('success','Pushed','Shared goal sent to ' + checked.length + ' employees');
      modal.style.display = 'none';
      renderSharedGoals(el);
    } catch(e) { showToast('error','Error',e.message); }
  });
}
