import { api } from '../api.js';
import { showToast } from '../main.js';

export async function renderEscalation(el) {
  const rules = await api.admin.getEscalationRules();
  const triggerLabels = {
    goal_not_submitted: { icon: '📋', label: 'Goal Not Submitted', desc: 'Triggers when employee hasn\'t submitted goals within the delay period after cycle opens' },
    goal_not_approved: { icon: '✅', label: 'Goal Not Approved', desc: 'Triggers when manager hasn\'t approved goals within the delay period after submission' },
    checkin_not_completed: { icon: '📝', label: 'Check-in Not Completed', desc: 'Triggers when quarterly check-in isn\'t completed within the active window' }
  };

  el.innerHTML = `
    <div class="page-header"><h1>Escalation Rules & Logs</h1><p>Configure automated escalation triggers and track resolution</p></div>
    <div class="tabs" style="margin-bottom:24px">
      <button class="tab active" data-tab="rules">⚙️ Rules Configuration</button>
      <button class="tab" data-tab="logs">📋 Escalation Log</button>
      <button class="tab" data-tab="chain">🔗 Escalation Chain</button>
    </div>
    <div id="escalationContent"></div>
    <div class="modal-overlay" id="ruleModal" style="display:none">
      <div class="modal-content">
        <div class="modal-header"><h3>Add Escalation Rule</h3><button class="btn btn-ghost btn-icon" id="closeRuleModal">✕</button></div>
        <div class="modal-body">
          <div class="form-group" style="margin-bottom:16px"><label class="form-label">Trigger Type</label>
            <select class="form-select" id="rTrigger"><option value="goal_not_submitted">Goal Not Submitted</option><option value="goal_not_approved">Goal Not Approved</option><option value="checkin_not_completed">Check-in Not Completed</option></select></div>
          <div class="form-group" style="margin-bottom:16px"><label class="form-label">Delay (days after trigger event)</label><input class="form-input" id="rDelay" type="number" value="7" min="1" max="30"></div>
          <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="rDesc" placeholder="Describe when this escalation triggers..."></textarea></div>
        </div>
        <div class="modal-footer"><button class="btn btn-ghost" id="cancelRule">Cancel</button><button class="btn btn-primary" id="saveRule">Save Rule</button></div>
      </div>
    </div>`;

  function renderRulesTab() {
    const content = document.getElementById('escalationContent');
    content.innerHTML = `
      <div class="flex-between" style="margin-bottom:20px">
        <h3>${rules.length} rule${rules.length!==1?'s':''} configured</h3>
        <button class="btn btn-primary" id="addRule">+ Add Rule</button>
      </div>
      ${rules.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">⚡</div><div class="empty-state-title">No Escalation Rules</div><p class="empty-state-text">Create your first rule to enable automated escalations</p></div>` :
      `<div class="grid grid-2">${rules.map((r,i) => {
        const info = triggerLabels[r.triggerType] || { icon:'⚡', label: r.triggerType, desc:'' };
        return `
          <div class="glass-card animate-fade-up stagger-${i+1}" style="padding:24px;border-left:4px solid ${r.active?'var(--accent)':'var(--glass-border)'}">
            <div class="flex-between" style="margin-bottom:12px">
              <div class="flex gap-sm" style="align-items:center"><span style="font-size:24px">${info.icon}</span><h4 style="font-size:var(--text-lg)">${info.label}</h4></div>
              <span class="badge ${r.active?'badge-success':'badge-neutral'}">${r.active?'Active':'Inactive'}</span>
            </div>
            <p style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:16px">${r.description || info.desc}</p>
            <div class="flex gap-md" style="margin-bottom:16px">
              <div class="glass-panel" style="padding:10px 16px;flex:1;text-align:center"><div style="font-size:var(--text-xs);color:var(--text-muted)">Delay</div><div style="font-weight:700;font-size:var(--text-lg);color:var(--accent-dark)">${r.delayDays} days</div></div>
              <div class="glass-panel" style="padding:10px 16px;flex:1;text-align:center"><div style="font-size:var(--text-xs);color:var(--text-muted)">Chain</div><div style="font-weight:700;font-size:var(--text-lg)">3 levels</div></div>
            </div>
            <div class="flex gap-sm">
              <button class="btn ${r.active?'btn-outline':'btn-success'} btn-sm toggle-rule" data-id="${r.id}" data-active="${r.active?0:1}" style="flex:1">${r.active?'⏸ Disable':'▶ Enable'}</button>
              <button class="btn btn-ghost btn-sm del-rule" data-id="${r.id}" style="color:var(--danger)">🗑️</button>
            </div>
          </div>`;
      }).join('')}</div>`}`;

    document.getElementById('addRule')?.addEventListener('click', () => document.getElementById('ruleModal').style.display = 'flex');
    content.querySelectorAll('.toggle-rule').forEach(b => b.addEventListener('click', async () => {
      try { await api.admin.updateEscalationRule(b.dataset.id, { active: parseInt(b.dataset.active) }); showToast('success','Updated',''); renderEscalation(el); } catch(e) { showToast('error','Error',e.message); }
    }));
    content.querySelectorAll('.del-rule').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Delete this escalation rule?')) return;
      try { await api.admin.deleteEscalationRule(b.dataset.id); showToast('success','Deleted',''); renderEscalation(el); } catch(e) { showToast('error','Error',e.message); }
    }));
  }

  async function renderLogsTab() {
    const content = document.getElementById('escalationContent');
    content.innerHTML = '<div class="flex-center" style="padding:48px"><div style="animation:spin 1s linear infinite;font-size:24px">⏳</div></div>';
    const logs = await api.admin.getEscalationLogs();
    const pending = logs.filter(l => l.status === 'pending').length;
    const resolved = logs.filter(l => l.status === 'resolved').length;

    content.innerHTML = `
      <div class="grid grid-3" style="margin-bottom:24px">
        <div class="stat-card"><div class="stat-value">${logs.length}</div><div class="stat-label">Total Escalations</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--danger)">${pending}</div><div class="stat-label">Pending Resolution</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--success)">${resolved}</div><div class="stat-label">Resolved</div></div>
      </div>
      ${logs.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-title">No Escalations</div><p class="empty-state-text">No escalation events have been triggered</p></div>' : `
      <div class="glass-card" style="overflow-x:auto">
        <table class="data-table">
          <thead><tr><th>Date</th><th>Trigger</th><th>Employee</th><th>Escalated To</th><th>Level</th><th>Detail</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>${logs.map(l => {
            const info = triggerLabels[l.triggerType] || { icon:'⚡', label: l.triggerType };
            return `<tr>
              <td style="white-space:nowrap;font-size:var(--text-sm)">${new Date(l.createdAt).toLocaleDateString()}</td>
              <td><span class="badge badge-accent">${info.icon} ${info.label}</span></td>
              <td style="font-weight:500">${l.employeeName}</td>
              <td>${l.escalatedToName} <span style="font-size:var(--text-xs);color:var(--text-muted)">(${l.escalatedToRole})</span></td>
              <td><span class="badge ${l.escalationLevel>=2?'badge-danger':'badge-warning'}">L${l.escalationLevel}</span></td>
              <td style="font-size:var(--text-sm)">${l.detail||''}</td>
              <td><span class="badge ${l.status==='resolved'?'badge-success':l.status==='dismissed'?'badge-neutral':'badge-danger'}">${l.status}</span></td>
              <td>${l.status==='pending'?`<button class="btn btn-success btn-sm resolve-esc" data-id="${l.id}">✓ Resolve</button>`:`<span style="font-size:var(--text-xs);color:var(--text-muted)">${l.resolvedAt ? new Date(l.resolvedAt).toLocaleDateString() : ''}</span>`}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>`}`;

    content.querySelectorAll('.resolve-esc').forEach(b => b.addEventListener('click', async () => {
      try { await api.admin.updateEscalationLog(b.dataset.id, { status: 'resolved' }); showToast('success','Resolved','Escalation marked as resolved'); renderLogsTab(); } catch(e) { showToast('error','Error',e.message); }
    }));
  }

  function renderChainTab() {
    const content = document.getElementById('escalationContent');
    content.innerHTML = `
      <div class="glass-card" style="padding:24px;margin-bottom:24px">
        <h3 style="margin-bottom:16px">Escalation Chain Configuration</h3>
        <p style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:24px">When a rule is triggered, the system follows this escalation path. Each level activates after the configured delay if the issue remains unresolved.</p>
        <div style="display:flex;align-items:flex-start;gap:0;position:relative">
          ${[
            { level:'Level 1', target:'Employee', icon:'👤', color:'var(--info)', action:'Auto-notify employee via email & in-app notification', delay:'N days after trigger' },
            { level:'Level 2', target:'Manager (L1)', icon:'👔', color:'var(--warning)', action:'Escalate to direct manager with summary of pending items', delay:'N+3 days' },
            { level:'Level 3', target:'HR / Admin', icon:'🛡️', color:'var(--danger)', action:'Escalate to HR team with full audit trail & recommended action', delay:'N+7 days' },
          ].map((step,i) => `
            <div style="flex:1;text-align:center;position:relative">
              <div style="width:64px;height:64px;border-radius:50%;background:${step.color};display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:28px;color:white;box-shadow:0 4px 12px ${step.color}33">${step.icon}</div>
              <div style="font-weight:700;font-size:var(--text-base);margin-bottom:4px">${step.level}</div>
              <div style="font-weight:600;font-size:var(--text-sm);margin-bottom:8px">${step.target}</div>
              <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">${step.action}</div>
              <span class="badge badge-neutral" style="margin-top:4px">${step.delay}</span>
              ${i<2?'<div style="position:absolute;top:32px;right:-16px;font-size:24px;color:var(--text-muted)">→</div>':''}
            </div>`).join('')}
        </div>
      </div>
      <div class="grid grid-2">
        <div class="glass-card" style="padding:24px">
          <h4 style="margin-bottom:16px">📧 Notification Channels</h4>
          <div style="display:flex;flex-direction:column;gap:12px">
            ${[
              { icon:'📨', name:'Email Notification', desc:'Automated email with deep-link to pending action', color:'var(--info)' },
              { icon:'💬', name:'MS Teams Notification', desc:'Adaptive card in Teams with action buttons', color:'#7B68EE' },
              { icon:'🔔', name:'In-App Notification', desc:'Bell icon badge with deep-link to relevant page', color:'var(--accent)' }
            ].map(ch => `<div class="glass-panel" style="padding:12px;display:flex;align-items:center;gap:12px;border-left:3px solid ${ch.color}"><span style="font-size:24px">${ch.icon}</span><div><div style="font-weight:600;font-size:var(--text-sm)">${ch.name}</div><div style="font-size:var(--text-xs);color:var(--text-muted)">${ch.desc}</div></div></div>`).join('')}
          </div>
        </div>
        <div class="glass-card" style="padding:24px">
          <h4 style="margin-bottom:16px">🔐 Integration Status</h4>
          <div style="display:flex;flex-direction:column;gap:12px">
            ${[
              { icon:'🔵', name:'Microsoft Entra ID (Azure AD)', desc:'SSO & org hierarchy sync', badge:'Ready', cls:'badge-neutral' },
              { icon:'📧', name:'SMTP Email', desc:'Transactional email delivery', badge:'Active', cls:'badge-success' },
              { icon:'💬', name:'Microsoft Teams Bot', desc:'Adaptive card notifications', badge:'Ready', cls:'badge-neutral' }
            ].map(int => `<div class="glass-panel" style="padding:12px;display:flex;align-items:center;gap:12px"><span style="font-size:24px">${int.icon}</span><div style="flex:1"><div style="font-weight:600;font-size:var(--text-sm)">${int.name}</div><div style="font-size:var(--text-xs);color:var(--text-muted)">${int.desc}</div></div><span class="badge ${int.cls}">${int.badge}</span></div>`).join('')}
          </div>
        </div>
      </div>`;
  }

  function switchTab(tab) {
    el.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    if (tab === 'rules') renderRulesTab();
    else if (tab === 'logs') renderLogsTab();
    else if (tab === 'chain') renderChainTab();
  }

  el.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  switchTab('rules');

  const modal = document.getElementById('ruleModal');
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
}
