import { api } from '../api.js';
import { currentUser, showToast } from '../main.js';

export async function renderAdminDashboard(el) {
  const [stats, cycles, allSheets] = await Promise.all([
    api.admin.getStats(),
    api.admin.getCycles(),
    api.goals.getSheets({})
  ]);
  const activeCycle = cycles.find(c => c.status === 'active') || cycles[0];

  el.innerHTML = `
    <div class="parallax-hero">
      <h1>Admin Dashboard 🛡️</h1>
      <p>Organization overview • ${activeCycle?.name || 'No active cycle'}</p>
      <div class="stats-row">
        <div class="stat-card glass-card animate-fade-up stagger-1"><div class="stat-value">${stats.totalEmployees}</div><div class="stat-label">Employees</div></div>
        <div class="stat-card glass-card animate-fade-up stagger-2"><div class="stat-value">${stats.totalManagers}</div><div class="stat-label">Managers</div></div>
        <div class="stat-card glass-card animate-fade-up stagger-3"><div class="stat-value">${stats.totalGoals}</div><div class="stat-label">Total Goals</div></div>
        <div class="stat-card glass-card animate-fade-up stagger-4"><div class="stat-value" style="color:var(--success)">${stats.approvedSheets}</div><div class="stat-label">Approved Sheets</div></div>
      </div>
    </div>
    <div class="grid grid-2" style="margin-bottom:32px">
      <div class="glass-card animate-fade-up" style="padding:20px">
        <h3 style="margin-bottom:16px">📊 Goal Sheet Status</h3>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div class="flex-between"><span>Approved</span><div class="flex gap-sm" style="align-items:center"><div class="progress-bar" style="width:120px"><div class="progress-bar-fill green" style="width:${stats.totalGoalSheets?Math.round(stats.approvedSheets/stats.totalGoalSheets*100):0}%"></div></div><span style="font-weight:600;color:var(--success)">${stats.approvedSheets}</span></div></div>
          <div class="flex-between"><span>Submitted</span><div class="flex gap-sm" style="align-items:center"><div class="progress-bar" style="width:120px"><div class="progress-bar-fill yellow" style="width:${stats.totalGoalSheets?Math.round(stats.submittedSheets/stats.totalGoalSheets*100):0}%"></div></div><span style="font-weight:600;color:var(--warning)">${stats.submittedSheets}</span></div></div>
          <div class="flex-between"><span>Draft</span><div class="flex gap-sm" style="align-items:center"><div class="progress-bar" style="width:120px"><div class="progress-bar-fill accent" style="width:${stats.totalGoalSheets?Math.round(stats.draftSheets/stats.totalGoalSheets*100):0}%"></div></div><span style="font-weight:600">${stats.draftSheets}</span></div></div>
          <div class="flex-between"><span>Returned</span><div class="flex gap-sm" style="align-items:center"><div class="progress-bar" style="width:120px"><div class="progress-bar-fill red" style="width:${stats.totalGoalSheets?Math.round(stats.returnedSheets/stats.totalGoalSheets*100):0}%"></div></div><span style="font-weight:600;color:var(--danger)">${stats.returnedSheets}</span></div></div>
        </div>
      </div>
      <div class="glass-card animate-fade-up stagger-1" style="padding:20px">
        <h3 style="margin-bottom:16px">🏢 Department Breakdown</h3>
        ${stats.deptStats?.length ? stats.deptStats.map(d => `
          <div style="margin-bottom:12px">
            <div class="flex-between" style="margin-bottom:4px"><span style="font-weight:600">${d.department}</span><span style="font-size:var(--text-sm);color:var(--text-muted)">${d.approved||0}/${d.sheets} approved</span></div>
            <div class="progress-bar"><div class="progress-bar-fill green" style="width:${d.sheets?Math.round((d.approved||0)/d.sheets*100):0}%"></div></div>
          </div>
        `).join('') : '<p style="color:var(--text-muted)">No data</p>'}
      </div>
    </div>
    <div class="grid grid-2" style="margin-bottom:32px">
      <div class="glass-card animate-fade-up stagger-2" style="padding:20px">
        <h3 style="margin-bottom:16px">🎯 Goal Distribution by Thrust Area</h3>
        ${stats.thrustAreaDist?.length ? stats.thrustAreaDist.map(t => `
          <div class="flex-between" style="margin-bottom:8px"><span style="font-size:var(--text-sm)">${t.thrustArea}</span><span class="badge badge-accent">${t.count}</span></div>
        `).join('') : '<p style="color:var(--text-muted)">No data</p>'}
      </div>
      <div class="glass-card animate-fade-up stagger-3" style="padding:20px">
        <h3 style="margin-bottom:16px">📐 UoM Distribution</h3>
        ${stats.uomDist?.length ? stats.uomDist.map(u => `
          <div class="flex-between" style="margin-bottom:8px"><span style="font-size:var(--text-sm);text-transform:capitalize">${u.uom}</span><span class="badge badge-neutral">${u.count}</span></div>
        `).join('') : '<p style="color:var(--text-muted)">No data</p>'}
      </div>
    </div>
    <h2 style="margin-bottom:16px">📅 Cycle Management</h2>
    <div class="glass-card" style="overflow-x:auto;margin-bottom:32px">
      <table class="data-table">
        <thead><tr><th>Cycle</th><th>Year</th><th>Goal Setting</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${cycles.map(c => `<tr>
          <td style="font-weight:600">${c.name}</td><td>${c.year}</td>
          <td>${c.goalSettingOpen} → ${c.goalSettingClose}</td>
          <td><span class="badge ${c.status==='active'?'badge-success':'badge-neutral'}">${c.status}</span></td>
          <td>${c.status==='active'?`<button class="btn btn-danger btn-sm close-cycle" data-id="${c.id}">Close</button>`:`<button class="btn btn-success btn-sm open-cycle" data-id="${c.id}">Activate</button>`}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
    <h2 style="margin-bottom:16px">🔓 Unlock Goal Sheets</h2>
    <div class="glass-card" style="overflow-x:auto">
      <table class="data-table">
        <thead><tr><th>Employee</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${allSheets.filter(s=>s.status==='approved').map(s => `<tr>
          <td>${s.employeeName}</td><td>${s.department}</td>
          <td><span class="badge badge-success">Locked</span></td>
          <td><button class="btn btn-outline btn-sm unlock-sheet" data-id="${s.id}">🔓 Unlock</button></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;

  el.querySelectorAll('.close-cycle').forEach(b => b.addEventListener('click', async () => {
    try { await api.admin.updateCycle(b.dataset.id, {status:'closed'}); showToast('success','Done','Cycle closed'); renderAdminDashboard(el); } catch(e) { showToast('error','Error',e.message); }
  }));
  el.querySelectorAll('.open-cycle').forEach(b => b.addEventListener('click', async () => {
    try { await api.admin.updateCycle(b.dataset.id, {status:'active'}); showToast('success','Done','Cycle activated'); renderAdminDashboard(el); } catch(e) { showToast('error','Error',e.message); }
  }));
  el.querySelectorAll('.unlock-sheet').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Unlock this goal sheet? Employee will be able to edit.')) return;
    try { await api.admin.unlockSheet(b.dataset.id, currentUser.id); showToast('success','Unlocked','Goal sheet unlocked'); renderAdminDashboard(el); } catch(e) { showToast('error','Error',e.message); }
  }));
}
