import { api } from '../api.js';
import { showToast } from '../main.js';

export async function renderReports(el) {
  const cycles = await api.admin.getCycles();
  const activeCycle = cycles.find(c => c.status === 'active') || cycles[0];

  el.innerHTML = `
    <div class="page-header"><h1>Reports & Analytics</h1><p>Achievement reports, completion dashboard, and analytics</p></div>
    <div class="tabs" style="margin-bottom:24px">
      <button class="tab active" data-tab="achievement">Achievement Report</button>
      <button class="tab" data-tab="completion">Completion Dashboard</button>
      <button class="tab" data-tab="analytics">Analytics</button>
    </div>
    <div id="reportContent"></div>`;

  async function renderTab(tab) {
    const content = document.getElementById('reportContent');
    el.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));

    if (tab === 'achievement') {
      const data = await api.reports.getAchievement({ cycleId: activeCycle?.id });
      content.innerHTML = `
        <div class="flex-between" style="margin-bottom:16px">
          <h3>${data.length} records</h3>
          <button class="btn btn-outline btn-sm" id="exportCsv">📥 Export CSV</button>
        </div>
        <div class="glass-card" style="overflow-x:auto">
          <table class="data-table">
            <thead><tr><th>Employee</th><th>Dept</th><th>Goal</th><th>Thrust Area</th><th>Target</th><th>UoM</th><th>Weightage</th><th>Status</th></tr></thead>
            <tbody>${data.map(r => `<tr>
              <td>${r.employeeName}</td><td>${r.department}</td><td>${r.goalTitle}</td><td><span class="badge badge-accent">${r.thrustArea}</span></td>
              <td>${r.target}</td><td>${r.uom}</td><td>${r.weightage}%</td>
              <td><span class="badge ${r.sheetStatus==='approved'?'badge-success':'badge-neutral'}">${r.sheetStatus}</span></td>
            </tr>`).join('')}</tbody>
          </table>
        </div>`;
      document.getElementById('exportCsv')?.addEventListener('click', () => {
        const headers = ['Employee','Department','Goal','Thrust Area','Target','UoM','Weightage','Status'];
        const rows = data.map(r => [r.employeeName,r.department,r.goalTitle,r.thrustArea,r.target,r.uom,r.weightage+'%',r.sheetStatus]);
        const csv = [headers,...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'achievement_report.csv';
        a.click();
        showToast('success','Exported','CSV downloaded');
      });
    } else if (tab === 'completion') {
      const data = await api.reports.getCompletion({ cycleId: activeCycle?.id });
      content.innerHTML = `
        <div class="glass-card" style="overflow-x:auto">
          <table class="data-table">
            <thead><tr><th>Employee</th><th>Dept</th><th>Manager</th><th>Sheet</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th></tr></thead>
            <tbody>${data.map(r => {
              const qCell = (q) => {
                const ci = r.checkins?.[q];
                if (!ci) return '<td style="text-align:center">—</td>';
                const empDone = ci.employeeCompleted;
                const mgrDone = ci.managerCompleted;
                return `<td style="text-align:center"><span title="Emp: ${empDone?'✓':'✗'}, Mgr: ${mgrDone?'✓':'✗'}">${empDone&&mgrDone?'✅':empDone?'🟡':'⬜'}</span></td>`;
              };
              return `<tr><td><div class="flex gap-sm" style="align-items:center"><span>${r.avatar||'👤'}</span> ${r.employeeName}</div></td>
                <td>${r.department}</td><td>${r.managerName||'—'}</td>
                <td><span class="badge ${r.sheetStatus==='approved'?'badge-success':r.sheetStatus?'badge-info':'badge-neutral'}">${r.sheetStatus||'None'}</span></td>
                ${qCell('Q1')}${qCell('Q2')}${qCell('Q3')}${qCell('Q4')}</tr>`;
            }).join('')}</tbody>
          </table>
        </div>
        <div style="margin-top:16px;font-size:var(--text-sm);color:var(--text-muted)">✅ = Both complete &nbsp; 🟡 = Employee only &nbsp; ⬜ = Not started</div>`;
    } else if (tab === 'analytics') {
      const [mgrEff] = await Promise.all([api.reports.getManagerEffectiveness()]);
      content.innerHTML = `
        <div class="grid grid-2" style="margin-bottom:24px">
          <div class="glass-card" style="padding:20px">
            <h3 style="margin-bottom:16px">👔 Manager Effectiveness</h3>
            ${mgrEff.map(m => `
              <div style="margin-bottom:16px">
                <div class="flex-between" style="margin-bottom:4px"><span style="font-weight:600">${m.managerName}</span><span style="font-size:var(--text-sm)">${m.approvedSheets}/${m.totalSheets} sheets approved</span></div>
                <div class="progress-bar"><div class="progress-bar-fill green" style="width:${m.totalSheets?Math.round(m.approvedSheets/m.totalSheets*100):0}%"></div></div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px">Check-ins: ${m.completedCheckins}/${m.totalCheckins} completed</div>
              </div>
            `).join('')}
          </div>
          <div class="glass-card" style="padding:20px">
            <h3 style="margin-bottom:16px">📊 Check-in Schedule</h3>
            <div style="display:flex;flex-direction:column;gap:12px">
              ${[{q:'Goal Setting',d:'May',icon:'🎯'},{q:'Q1 Check-in',d:'July',icon:'📝'},{q:'Q2 Check-in',d:'October',icon:'📝'},{q:'Q3 Check-in',d:'January',icon:'📝'},{q:'Q4 / Annual',d:'March-April',icon:'🏆'}].map(p => `
                <div class="glass-panel" style="padding:12px;display:flex;align-items:center;gap:12px">
                  <span style="font-size:24px">${p.icon}</span>
                  <div><div style="font-weight:600">${p.q}</div><div style="font-size:var(--text-xs);color:var(--text-muted)">${p.d}</div></div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>`;
    }
  }

  el.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => renderTab(t.dataset.tab)));
  renderTab('achievement');
}
