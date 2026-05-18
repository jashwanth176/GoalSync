import { api } from '../api.js';
import { currentUser } from '../main.js';

export async function renderManagerDashboard(el) {
  const team = await api.auth.getTeam(currentUser.id);
  const cycles = await api.admin.getCycles();
  const activeCycle = cycles.find(c => c.status === 'active') || cycles[0];
  const allSheets = await api.goals.getSheets({ cycleId: activeCycle?.id });
  const teamSheets = allSheets.filter(s => team.some(t => t.id === s.employeeId));

  const pending = teamSheets.filter(s => s.status === 'submitted');
  const approved = teamSheets.filter(s => s.status === 'approved');
  const draft = teamSheets.filter(s => s.status === 'draft');

  el.innerHTML = `
    <div class="parallax-hero">
      <h1>Team Dashboard 👥</h1>
      <p>Manage your team's goals and performance • ${activeCycle?.name || ''}</p>
      <div class="stats-row">
        <div class="stat-card glass-card animate-fade-up stagger-1">
          <div class="stat-value">${team.length}</div>
          <div class="stat-label">Team Members</div>
        </div>
        <div class="stat-card glass-card animate-fade-up stagger-2">
          <div class="stat-value" style="color:var(--warning)">${pending.length}</div>
          <div class="stat-label">Pending Approval</div>
        </div>
        <div class="stat-card glass-card animate-fade-up stagger-3">
          <div class="stat-value" style="color:var(--success)">${approved.length}</div>
          <div class="stat-label">Approved</div>
        </div>
        <div class="stat-card glass-card animate-fade-up stagger-4">
          <div class="stat-value" style="color:var(--text-muted)">${draft.length}</div>
          <div class="stat-label">Draft / Not Started</div>
        </div>
      </div>
    </div>

    ${pending.length > 0 ? `
    <div style="margin-bottom:32px">
      <h2 style="margin-bottom:16px;font-size:var(--text-2xl)">⏳ Pending Approvals</h2>
      <div class="grid grid-2">
        ${pending.map((s,i) => `
          <div class="glass-card animate-fade-up stagger-${i+1}" style="padding:20px;border-left:3px solid var(--warning)">
            <div class="flex-between" style="margin-bottom:12px">
              <div class="flex gap-sm" style="align-items:center">
                <div class="avatar">${s.avatar||'👤'}</div>
                <div><div style="font-weight:600">${s.employeeName}</div><div style="font-size:var(--text-xs);color:var(--text-muted)">${s.department}</div></div>
              </div>
              <span class="badge badge-warning">Pending</span>
            </div>
            <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:12px">Submitted: ${s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : 'N/A'}</div>
            <a href="#/manager/review/${s.id}" class="btn btn-primary btn-sm" style="width:100%">Review Goals →</a>
          </div>
        `).join('')}
      </div>
    </div>` : ''}

    <h2 style="margin-bottom:16px;font-size:var(--text-2xl)">👥 Team Members</h2>
    <div class="glass-card" style="overflow-x:auto">
      <table class="data-table">
        <thead><tr><th>Employee</th><th>Department</th><th>Goal Sheet</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${team.map(t => {
            const ts = teamSheets.find(s => s.employeeId === t.id);
            const st = ts?.status || 'not_started';
            const stLabel = { draft:'Draft', submitted:'Submitted', approved:'Approved', returned:'Returned', not_started:'Not Started' }[st];
            const stBadge = { draft:'badge-neutral', submitted:'badge-info', approved:'badge-success', returned:'badge-warning', not_started:'badge-neutral' }[st];
            return `<tr>
              <td><div class="flex gap-sm" style="align-items:center"><div class="avatar" style="width:28px;height:28px;font-size:14px">${t.avatar||'👤'}</div> ${t.name}</div></td>
              <td>${t.department}</td>
              <td>${ts ? '✓' : '—'}</td>
              <td><span class="badge ${stBadge}">${stLabel}</span></td>
              <td>
                ${st==='submitted'?`<a href="#/manager/review/${ts.id}" class="btn btn-outline btn-sm">Review</a>`:''}
                ${st==='approved'?`<a href="#/manager/checkin/${ts.id}" class="btn btn-outline btn-sm">Check-in</a>`:''}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}
