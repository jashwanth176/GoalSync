import { api } from '../api.js';
import { showToast } from '../main.js';

export async function renderEscalation(el) {
  const rules = await api.admin.getEscalationRules();
  const triggerLabels = { goal_not_submitted: '📋 Goal Not Submitted', goal_not_approved: '✅ Goal Not Approved', checkin_not_completed: '📝 Check-in Not Completed' };

  el.innerHTML = `
    <div class="page-header flex-between">
      <div><h1>Escalation Rules</h1><p>Configure automated escalation triggers</p></div>
      <button class="btn btn-primary" id="addRule">+ Add Rule</button>
    </div>
    <div id="rulesList">
      ${rules.map((r,i) => `
        <div class="glass-card animate-fade-up stagger-${i+1}" style="padding:20px;margin-bottom:16px;border-left:3px solid ${r.active?'var(--accent)':'var(--text-muted)'}">
          <div class="flex-between" style="margin-bottom:8px">
            <div class="flex gap-sm" style="align-items:center"><span style="font-size:20px">${triggerLabels[r.triggerType]?.split(' ')[0]||'⚡'}</span><h3 style="font-size:var(--text-lg)">${triggerLabels[r.triggerType]?.substring(2)||r.triggerType}</h3></div>
            <div class="flex gap-sm">
              <span class="badge ${r.active?'badge-success':'badge-neutral'}">${r.active?'Active':'Inactive'}</span>
              <button class="btn btn-ghost btn-sm toggle-rule" data-id="${r.id}" data-active="${r.active?0:1}">${r.active?'Disable':'Enable'}</button>
              <button class="btn btn-ghost btn-sm del-rule" data-id="${r.id}" style="color:var(--danger)">🗑️</button>
            </div>
          </div>
          <p style="font-size:var(--text-sm);margin-bottom:8px">${r.description||'No description'}</p>
          <div class="flex gap-md">
            <div class="glass-panel" style="padding:8px 14px"><span style="font-size:var(--text-xs);color:var(--text-muted)">Delay</span><div style="font-weight:600">${r.delayDays} days</div></div>
            <div class="glass-panel" style="padding:8px 14px"><span style="font-size:var(--text-xs);color:var(--text-muted)">Chain</span><div style="font-weight:600">Employee → Manager → HR</div></div>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="modal-overlay" id="ruleModal" style="display:none">
      <div class="modal-content">
        <div class="modal-header"><h3>Add Escalation Rule</h3><button class="btn btn-ghost btn-icon" id="closeRuleModal">✕</button></div>
        <div class="modal-body">
          <div class="form-group" style="margin-bottom:16px"><label class="form-label">Trigger Type</label>
            <select class="form-select" id="rTrigger"><option value="goal_not_submitted">Goal Not Submitted</option><option value="goal_not_approved">Goal Not Approved</option><option value="checkin_not_completed">Check-in Not Completed</option></select></div>
          <div class="form-group" style="margin-bottom:16px"><label class="form-label">Delay (days)</label><input class="form-input" id="rDelay" type="number" value="7" min="1"></div>
          <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="rDesc"></textarea></div>
        </div>
        <div class="modal-footer"><button class="btn btn-ghost" id="cancelRule">Cancel</button><button class="btn btn-primary" id="saveRule">Save Rule</button></div>
      </div>
    </div>`;

  const modal = document.getElementById('ruleModal');
  document.getElementById('addRule').onclick = () => modal.style.display = 'flex';
  document.getElementById('closeRuleModal').onclick = () => modal.style.display = 'none';
  document.getElementById('cancelRule').onclick = () => modal.style.display = 'none';

  document.getElementById('saveRule').addEventListener('click', async () => {
    try {
      await api.admin.createEscalationRule({ triggerType: document.getElementById('rTrigger').value, delayDays: parseInt(document.getElementById('rDelay').value), description: document.getElementById('rDesc').value });
      showToast('success','Created','Escalation rule added');
      modal.style.display = 'none';
      renderEscalation(el);
    } catch(e) { showToast('error','Error',e.message); }
  });

  el.querySelectorAll('.toggle-rule').forEach(b => b.addEventListener('click', async () => {
    try { await api.admin.updateEscalationRule(b.dataset.id, { active: parseInt(b.dataset.active) }); renderEscalation(el); } catch(e) { showToast('error','Error',e.message); }
  }));
  el.querySelectorAll('.del-rule').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Delete this rule?')) return;
    try { await api.admin.deleteEscalationRule(b.dataset.id); showToast('success','Deleted',''); renderEscalation(el); } catch(e) { showToast('error','Error',e.message); }
  }));
}
