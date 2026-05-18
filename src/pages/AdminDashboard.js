import { api } from '../api.js';
import { currentUser, showToast } from '../main.js';

export async function renderAdminDashboard(el) {
  const [stats, cycles, allSheets, allUsers] = await Promise.all([
    api.admin.getStats(), api.admin.getCycles(), api.goals.getSheets({}), api.admin.getAllUsers()
  ]);
  const activeCycle = cycles.find(c => c.status === 'active') || cycles[0];
  const employees = allUsers.filter(u => u.role === 'employee');
  const noSheet = employees.filter(e => !allSheets.some(s => s.employeeId === e.id));

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
      <div class="glass-card animate-fade-up" style="padding:24px">
        <h3 style="margin-bottom:20px">📊 Goal Sheet Pipeline</h3>
        <div style="display:flex;flex-direction:column;gap:16px">
          ${[
            { label:'Approved', count: stats.approvedSheets, color:'var(--success)', pct: stats.totalGoalSheets ? Math.round(stats.approvedSheets/stats.totalGoalSheets*100) : 0 },
            { label:'Submitted (Pending)', count: stats.submittedSheets, color:'var(--warning)', pct: stats.totalGoalSheets ? Math.round(stats.submittedSheets/stats.totalGoalSheets*100) : 0 },
            { label:'Draft', count: stats.draftSheets, color:'var(--info)', pct: stats.totalGoalSheets ? Math.round(stats.draftSheets/stats.totalGoalSheets*100) : 0 },
            { label:'Returned', count: stats.returnedSheets, color:'var(--danger)', pct: stats.totalGoalSheets ? Math.round(stats.returnedSheets/stats.totalGoalSheets*100) : 0 },
          ].map(s => `<div>
            <div class="flex-between" style="margin-bottom:6px"><span style="font-weight:500;font-size:var(--text-sm)">${s.label}</span><span style="font-weight:700;color:${s.color}">${s.count} <span style="font-weight:400;color:var(--text-muted)">(${s.pct}%)</span></span></div>
            <div class="progress-bar" style="height:8px"><div class="progress-bar-fill" style="width:${s.pct}%;background:${s.color}"></div></div>
          </div>`).join('')}
        </div>
        ${noSheet.length > 0 ? `<div style="margin-top:16px;padding:12px;background:var(--danger-dim);border-radius:var(--radius-md);font-size:var(--text-sm)"><strong style="color:var(--danger)">⚠ ${noSheet.length} employee${noSheet.length>1?'s':''}</strong> have not created goal sheets yet: <span style="color:var(--text-secondary)">${noSheet.map(e => e.name).join(', ')}</span></div>` : ''}
      </div>
      <div class="glass-card animate-fade-up stagger-1" style="padding:24px">
        <h3 style="margin-bottom:20px">🏢 Department Completion</h3>
        ${stats.deptStats?.length ? stats.deptStats.map(d => {
          const pct = d.sheets ? Math.round((d.approved||0)/d.sheets*100) : 0;
          return `<div style="margin-bottom:20px">
            <div class="flex-between" style="margin-bottom:4px"><span style="font-weight:600">${d.department}</span><span style="font-size:var(--text-sm)">${d.approved||0}/${d.sheets} approved</span></div>
            <div class="progress-bar" style="height:8px"><div class="progress-bar-fill green" style="width:${pct}%"></div></div>
            <div class="flex gap-md" style="margin-top:6px;font-size:var(--text-xs);color:var(--text-muted)">
              <span>📋 ${d.sheets} sheets</span>
              <span>⏳ ${d.pending||0} pending</span>
            </div>
          </div>`;
        }).join('') : '<p style="color:var(--text-muted)">No department data</p>'}
      </div>
    </div>

    <div class="grid grid-2" style="margin-bottom:32px">
      <div class="glass-card animate-fade-up stagger-2" style="padding:24px">
        <h3 style="margin-bottom:20px">🎯 Goal Distribution by Thrust Area</h3>
        ${stats.thrustAreaDist?.length ? stats.thrustAreaDist.map((t, i) => {
          const colors = ['#FDB913','#3b82f6','#22c55e','#ef4444','#a855f7','#f97316','#06b6d4','#ec4899'];
          const pct = stats.totalGoals ? Math.round(t.count / stats.totalGoals * 100) : 0;
          return `<div class="flex-between" style="margin-bottom:12px;padding:8px 12px;background:var(--bg-body);border-radius:var(--radius-md);border-left:3px solid ${colors[i%8]}">
            <span style="font-size:var(--text-sm);font-weight:500">${t.thrustArea}</span>
            <div class="flex gap-sm" style="align-items:center"><div class="progress-bar" style="width:80px"><div class="progress-bar-fill" style="width:${pct}%;background:${colors[i%8]}"></div></div><span class="badge badge-accent">${t.count}</span></div>
          </div>`;
        }).join('') : '<p style="color:var(--text-muted)">No goals created yet</p>'}
      </div>
      <div class="glass-card animate-fade-up stagger-3" style="padding:24px">
        <h3 style="margin-bottom:20px">📐 UoM Type Distribution</h3>
        ${stats.uomDist?.length ? `
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px">
            ${stats.uomDist.map(u => {
              const colors = {numeric:'#3b82f6',percentage:'#22c55e',timeline:'#f97316',zero:'#ef4444'};
              const icons = {numeric:'🔢',percentage:'📊',timeline:'📅',zero:'🎯'};
              const pct = stats.totalGoals ? Math.round(u.count / stats.totalGoals * 100) : 0;
              return `<div class="glass-panel" style="padding:16px;flex:1;min-width:100px;text-align:center;border-top:3px solid ${colors[u.uom]||'var(--text-muted)'}">
                <div style="font-size:24px;margin-bottom:4px">${icons[u.uom]||'📏'}</div>
                <div style="font-size:var(--text-2xl);font-weight:800;color:${colors[u.uom]||'var(--text-primary)'}">${u.count}</div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:capitalize">${u.uom} (${pct}%)</div>
              </div>`;
            }).join('')}
          </div>` : '<p style="color:var(--text-muted)">No data</p>'}
      </div>
    </div>

    <h2 style="margin-bottom:16px">👥 Organization Hierarchy</h2>
    <div class="glass-card" style="padding:24px;margin-bottom:32px">
      ${allUsers.filter(u => u.role === 'manager').map(mgr => {
        const team = allUsers.filter(u => u.managerId === mgr.id);
        return `<div style="margin-bottom:24px">
          <div class="flex gap-sm" style="align-items:center;margin-bottom:12px">
            <div class="avatar" style="background:var(--info-dim);font-size:20px">${mgr.avatar||'👔'}</div>
            <div><div style="font-weight:700">${mgr.name}</div><div style="font-size:var(--text-xs);color:var(--text-muted)">${mgr.department} • Manager</div></div>
          </div>
          <div style="padding-left:28px;border-left:2px solid var(--glass-border);margin-left:18px">
            ${team.map(emp => {
              const empSheet = allSheets.find(s => s.employeeId === emp.id);
              const st = empSheet?.status || 'none';
              const stBadge = {draft:'badge-neutral',submitted:'badge-info',approved:'badge-success',returned:'badge-warning',none:'badge-neutral'}[st];
              return `<div class="flex-between" style="padding:8px 12px;margin-bottom:4px;border-radius:var(--radius-md);background:var(--bg-body)">
                <div class="flex gap-sm" style="align-items:center"><span style="font-size:16px">${emp.avatar||'👤'}</span><span style="font-size:var(--text-sm);font-weight:500">${emp.name}</span></div>
                <span class="badge ${stBadge}">${st === 'none' ? 'No Sheet' : st}</span>
              </div>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>

    <h2 style="margin-bottom:16px">📅 Cycle Management</h2>
    <div class="glass-card" style="overflow-x:auto;margin-bottom:32px">
      <table class="data-table">
        <thead><tr><th>Cycle</th><th>Year</th><th>Goal Setting Window</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${cycles.map(c => `<tr>
          <td style="font-weight:600">${c.name}</td><td>${c.year}</td>
          <td><span style="font-size:var(--text-sm)">${c.goalSettingOpen} → ${c.goalSettingClose}</span></td>
          <td><span class="badge ${c.status==='active'?'badge-success':'badge-neutral'}">${c.status}</span></td>
          <td>${c.status==='active'?`<button class="btn btn-danger btn-sm close-cycle" data-id="${c.id}">Close Cycle</button>`:`<button class="btn btn-success btn-sm open-cycle" data-id="${c.id}">Activate</button>`}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>

    <h2 style="margin-bottom:16px">🔓 Goal Sheet Administration</h2>
    <div class="glass-card" style="overflow-x:auto">
      <table class="data-table">
        <thead><tr><th>Employee</th><th>Department</th><th>Manager</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${allSheets.length === 0 ? '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted)">No goal sheets created yet</td></tr>' : allSheets.map(s => {
          const emp = allUsers.find(u => u.id === s.employeeId);
          const mgr = emp ? allUsers.find(u => u.id === emp.managerId) : null;
          return `<tr>
            <td><div class="flex gap-sm" style="align-items:center"><span>${emp?.avatar||'👤'}</span> <span style="font-weight:500">${s.employeeName || emp?.name || '—'}</span></div></td>
            <td>${s.department || emp?.department || '—'}</td>
            <td>${mgr?.name || '—'}</td>
            <td><span class="badge ${s.status==='approved'?'badge-success':s.status==='submitted'?'badge-info':s.status==='returned'?'badge-warning':'badge-neutral'}">${s.status}</span></td>
            <td>${s.status==='approved'?`<button class="btn btn-outline btn-sm unlock-sheet" data-id="${s.id}">🔓 Unlock</button>`:''}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;

  el.querySelectorAll('.close-cycle').forEach(b => b.addEventListener('click', async () => {
    try { await api.admin.updateCycle(b.dataset.id, {status:'closed'}); showToast('success','Done','Cycle closed'); renderAdminDashboard(el); } catch(e) { showToast('error','Error',e.message); }
  }));
  el.querySelectorAll('.open-cycle').forEach(b => b.addEventListener('click', async () => {
    try { await api.admin.updateCycle(b.dataset.id, {status:'active'}); showToast('success','Done','Cycle activated'); renderAdminDashboard(el); } catch(e) { showToast('error','Error',e.message); }
  }));
  el.querySelectorAll('.unlock-sheet').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Unlock this goal sheet? Employee will be able to edit their goals.')) return;
    try { await api.admin.unlockSheet(b.dataset.id, currentUser.id); showToast('success','Unlocked','Goal sheet unlocked for editing'); renderAdminDashboard(el); } catch(e) { showToast('error','Error',e.message); }
  }));
}
