import { api } from '../api.js';
import { currentUser } from '../main.js';

export async function renderEmployeeDashboard(el) {
  const [cycles, sheets] = await Promise.all([
    api.admin.getCycles(),
    api.goals.getSheets({ employeeId: currentUser.id })
  ]);
  const activeCycle = cycles.find(c => c.status === 'active') || cycles[0];
  const mySheet = sheets.find(s => s.cycleId === activeCycle?.id);

  const statusMap = { draft: ['edit','Draft','badge-neutral'], submitted: ['send','Submitted','badge-info'], approved: ['check-circle','Approved','badge-success'], returned: ['rotate-ccw','Returned','badge-warning'] };
  const [sIcon, sLabel, sBadge] = statusMap[mySheet?.status] || ['minus','No Sheet','badge-neutral'];

  let goalCount = 0, totalWeight = 0;
  if (mySheet) {
    try {
      const full = await api.goals.getSheet(mySheet.id);
      goalCount = full.goals?.length || 0;
      totalWeight = full.goals?.reduce((s,g) => s + g.weightage, 0) || 0;
    } catch(e) {}
  }

  el.innerHTML = `
    <div class="parallax-hero">
      <h1 class="animate-fade-up">Welcome back, ${currentUser.name.split(' ')[0]}</h1>
      <p class="animate-fade-up stagger-1">${activeCycle?.name || 'No active cycle'} &bull; ${currentUser.department}</p>
      <div class="stats-row">
        <div class="stat-card glass-card animate-fade-up stagger-2">
          <div class="stat-value">${goalCount}</div>
          <div class="stat-label">Goals Created</div>
        </div>
        <div class="stat-card glass-card animate-fade-up stagger-3">
          <div class="stat-value">${totalWeight}%</div>
          <div class="stat-label">Total Weightage</div>
        </div>
        <div class="stat-card glass-card animate-fade-up stagger-4">
          <div class="stat-value"><i data-lucide="${sIcon}" style="width:28px;height:28px"></i></div>
          <div class="stat-label">Sheet Status: ${sLabel}</div>
        </div>
      </div>
    </div>
    <div class="grid grid-2">
      <div class="glass-card animate-fade-up stagger-3" style="padding:var(--space-lg)">
        <h3 style="margin-bottom:16px">Goal Sheet</h3>
        ${mySheet ? `
          <div class="flex-between" style="margin-bottom:12px">
            <span class="badge ${sBadge}">${sLabel}</span>
            <span style="font-size:var(--text-xs);color:var(--text-muted)">${mySheet.submittedAt ? 'Submitted: '+new Date(mySheet.submittedAt).toLocaleDateString() : ''}</span>
          </div>
          ${mySheet.managerComments ? `<div class="glass-panel" style="padding:12px;margin-bottom:12px"><div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">Manager Comments</div><div style="font-size:var(--text-sm)">${mySheet.managerComments}</div></div>` : ''}
          <a href="#/goals" class="btn btn-primary" style="width:100%">${mySheet.status==='draft'||mySheet.status==='returned'?'Edit Goals':'View Goals'}</a>
        ` : `
          <p style="margin-bottom:16px;font-size:var(--text-sm)">You haven't started your goal sheet for this cycle yet.</p>
          <a href="#/goals/create" class="btn btn-primary" style="width:100%">Create Goal Sheet</a>
        `}
      </div>
      <div class="glass-card animate-fade-up stagger-4" style="padding:var(--space-lg)">
        <h3 style="margin-bottom:16px">Quick Actions</h3>
        <div style="display:flex;flex-direction:column;gap:8px">
          <a href="#/goals" class="btn btn-outline" style="justify-content:flex-start"><i data-lucide="target" style="width:16px;height:16px;margin-right:8px"></i> View My Goals</a>
          <a href="#/checkin" class="btn btn-outline" style="justify-content:flex-start"><i data-lucide="clipboard-check" style="width:16px;height:16px;margin-right:8px"></i> Quarterly Check-in</a>
          <a href="#/reports" class="btn btn-outline" style="justify-content:flex-start"><i data-lucide="bar-chart-3" style="width:16px;height:16px;margin-right:8px"></i> View Reports</a>
        </div>
      </div>
    </div>`;
}
