import { api } from '../api.js';
import { showToast } from '../main.js';

export async function renderReports(el) {
  const cycles = await api.admin.getCycles();
  const activeCycle = cycles.find(c => c.status === 'active') || cycles[0];

  el.innerHTML = `
    <div class="page-header"><h1>Reports & Analytics</h1><p>Achievement reports, completion dashboard, and organizational analytics</p></div>
    <div class="tabs" style="margin-bottom:24px">
      <button class="tab active" data-tab="achievement">Achievement Report</button>
      <button class="tab" data-tab="completion">Completion Dashboard</button>
      <button class="tab" data-tab="analytics">Analytics</button>
      <button class="tab" data-tab="emails">Email Log</button>
    </div>
    <div id="reportContent"></div>`;

  async function renderTab(tab) {
    const content = document.getElementById('reportContent');
    el.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));

    if (tab === 'achievement') {
      const data = await api.reports.getAchievement({ cycleId: activeCycle?.id });
      content.innerHTML = `
        <div class="flex-between" style="margin-bottom:16px">
          <h3>${data.length} records found</h3>
          <div class="flex gap-sm">
            <button class="btn btn-outline btn-sm" id="exportCsv">📥 Export CSV</button>
            <button class="btn btn-outline btn-sm" id="exportExcel">📊 Export Excel</button>
          </div>
        </div>
        <div class="glass-card" style="overflow-x:auto">
          <table class="data-table">
            <thead><tr><th>Employee</th><th>Department</th><th>Goal Title</th><th>Thrust Area</th><th>UoM</th><th>Target</th><th>Weightage</th><th>Status</th></tr></thead>
            <tbody>${data.length === 0 ? '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted)">No achievement data available yet</td></tr>' : data.map(r => `<tr>
              <td style="font-weight:500">${r.employeeName}</td><td>${r.department}</td><td>${r.goalTitle}</td>
              <td><span class="badge badge-accent">${r.thrustArea}</span></td>
              <td><span class="badge badge-neutral">${r.uom}</span></td><td style="font-weight:600">${r.target}${r.uom==='percentage'?'%':''}</td>
              <td style="font-weight:600;color:var(--accent-dark)">${r.weightage}%</td>
              <td><span class="badge ${r.sheetStatus==='approved'?'badge-success':r.sheetStatus==='submitted'?'badge-info':'badge-neutral'}">${r.sheetStatus}</span></td>
            </tr>`).join('')}</tbody>
          </table>
        </div>`;

      const exportHandler = (type) => () => {
        const headers = ['Employee','Department','Goal','Thrust Area','UoM','Target','Weightage','Status'];
        const rows = data.map(r => [r.employeeName,r.department,r.goalTitle,r.thrustArea,r.uom,r.target,r.weightage+'%',r.sheetStatus]);
        const csv = [headers,...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `achievement_report.${type === 'excel' ? 'xls' : 'csv'}`; a.click();
        showToast('success','Exported',`${type.toUpperCase()} file downloaded`);
      };
      document.getElementById('exportCsv')?.addEventListener('click', exportHandler('csv'));
      document.getElementById('exportExcel')?.addEventListener('click', exportHandler('excel'));

    } else if (tab === 'completion') {
      const data = await api.reports.getCompletion({ cycleId: activeCycle?.id });
      const totalEmp = data.length;
      const sheetsCreated = data.filter(r => r.sheetStatus).length;
      const sheetsApproved = data.filter(r => r.sheetStatus === 'approved').length;

      content.innerHTML = `
        <div class="grid grid-3" style="margin-bottom:24px">
          <div class="stat-card"><div class="stat-value">${totalEmp}</div><div class="stat-label">Total Employees</div></div>
          <div class="stat-card"><div class="stat-value" style="color:var(--info)">${sheetsCreated}</div><div class="stat-label">Sheets Created</div></div>
          <div class="stat-card"><div class="stat-value" style="color:var(--success)">${sheetsApproved}</div><div class="stat-label">Sheets Approved</div></div>
        </div>
        <h3 style="margin-bottom:16px">Employee Check-in Status Matrix</h3>
        <div class="glass-card" style="overflow-x:auto">
          <table class="data-table">
            <thead><tr><th>Employee</th><th>Dept</th><th>Manager</th><th>Goal Sheet</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th></tr></thead>
            <tbody>${data.map(r => {
              const qCell = (q) => {
                const ci = r.checkins?.[q];
                if (!ci) return '<td style="text-align:center"><span style="display:inline-block;width:24px;height:24px;border-radius:4px;background:rgba(0,0,0,0.04);line-height:24px">—</span></td>';
                const empDone = ci.employeeCompleted;
                const mgrDone = ci.managerCompleted;
                const bg = empDone && mgrDone ? 'var(--success-dim)' : empDone ? 'var(--warning-dim)' : 'rgba(0,0,0,0.04)';
                const icon = empDone && mgrDone ? '✅' : empDone ? '🟡' : '⬜';
                return `<td style="text-align:center"><span style="display:inline-block;width:28px;height:28px;border-radius:6px;background:${bg};line-height:28px;font-size:14px" title="Employee: ${empDone?'Done':'Pending'}, Manager: ${mgrDone?'Done':'Pending'}">${icon}</span></td>`;
              };
              return `<tr>
                <td><div class="flex gap-sm" style="align-items:center"><span style="font-size:18px">${r.avatar||'👤'}</span> <span style="font-weight:500">${r.employeeName}</span></div></td>
                <td>${r.department}</td><td>${r.managerName||'—'}</td>
                <td><span class="badge ${r.sheetStatus==='approved'?'badge-success':r.sheetStatus?'badge-info':'badge-neutral'}">${r.sheetStatus||'None'}</span></td>
                ${qCell('Q1')}${qCell('Q2')}${qCell('Q3')}${qCell('Q4')}</tr>`;
            }).join('')}</tbody>
          </table>
        </div>
        <div class="flex gap-lg" style="margin-top:16px;font-size:var(--text-sm);color:var(--text-muted)">
          <span>✅ Both complete</span><span>🟡 Employee only</span><span>⬜ Not started</span>
        </div>`;

    } else if (tab === 'analytics') {
      const [mgrEff, deptData, stats] = await Promise.all([
        api.reports.getManagerEffectiveness(),
        api.reports.getDeptAnalytics(),
        api.admin.getStats()
      ]);

      content.innerHTML = `
        <div class="grid grid-2" style="margin-bottom:24px">
          <div class="glass-card" style="padding:24px">
            <h3 style="margin-bottom:20px">🎯 Goal Distribution by Thrust Area</h3>
            ${stats.thrustAreaDist?.length ? `
              <div style="display:flex;flex-direction:column;gap:12px">
                ${stats.thrustAreaDist.map(t => {
                  const pct = stats.totalGoals ? Math.round(t.count / stats.totalGoals * 100) : 0;
                  return `<div>
                    <div class="flex-between" style="margin-bottom:4px"><span style="font-size:var(--text-sm);font-weight:500">${t.thrustArea}</span><span style="font-size:var(--text-sm);color:var(--text-muted)">${t.count} goals (${pct}%)</span></div>
                    <div class="progress-bar"><div class="progress-bar-fill accent" style="width:${pct}%"></div></div>
                  </div>`;
                }).join('')}
              </div>` : '<p style="color:var(--text-muted)">No goal data available</p>'}
          </div>
          <div class="glass-card" style="padding:24px">
            <h3 style="margin-bottom:20px">📐 UoM Type Breakdown</h3>
            ${stats.uomDist?.length ? `
              <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px">
                ${stats.uomDist.map(u => {
                  const colors = {numeric:'var(--info)',percentage:'var(--success)',timeline:'var(--warning)',zero:'var(--danger)'};
                  const pct = stats.totalGoals ? Math.round(u.count / stats.totalGoals * 100) : 0;
                  return `<div class="glass-panel" style="padding:16px;flex:1;min-width:100px;text-align:center;border-left:3px solid ${colors[u.uom]||'var(--text-muted)'}">
                    <div style="font-size:var(--text-2xl);font-weight:800;color:${colors[u.uom]||'var(--text-primary)'}">${u.count}</div>
                    <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:capitalize;margin-top:4px">${u.uom} (${pct}%)</div>
                  </div>`;
                }).join('')}
              </div>` : '<p style="color:var(--text-muted)">No data</p>'}
          </div>
        </div>

        <div class="grid grid-2" style="margin-bottom:24px">
          <div class="glass-card" style="padding:24px">
            <h3 style="margin-bottom:20px">🏢 Department Performance</h3>
            ${deptData.length ? deptData.map(d => `
              <div style="margin-bottom:16px;padding:12px;background:var(--bg-body);border-radius:var(--radius-md)">
                <div class="flex-between" style="margin-bottom:8px">
                  <span style="font-weight:600">${d.department}</span>
                  <span style="font-size:var(--text-sm);color:var(--text-muted)">${d.employees} employees</span>
                </div>
                <div class="flex gap-lg" style="font-size:var(--text-sm)">
                  <div><span style="color:var(--text-muted)">Goals:</span> <strong>${d.totalGoals}</strong></div>
                  <div><span style="color:var(--text-muted)">Completed:</span> <strong style="color:var(--success)">${d.completedGoals}</strong></div>
                  <div><span style="color:var(--text-muted)">Avg Score:</span> <strong style="color:var(--accent-dark)">${d.avgScore ? Math.round(d.avgScore) + '%' : 'N/A'}</strong></div>
                </div>
              </div>
            `).join('') : '<p style="color:var(--text-muted)">No department analytics available yet. Scores populate after check-in data is entered.</p>'}
          </div>
          <div class="glass-card" style="padding:24px">
            <h3 style="margin-bottom:20px">👔 Manager Effectiveness</h3>
            ${mgrEff.length ? mgrEff.map(m => {
              const approvalRate = m.totalSheets ? Math.round(m.approvedSheets / m.totalSheets * 100) : 0;
              const checkinRate = m.totalCheckins ? Math.round(m.completedCheckins / m.totalCheckins * 100) : 0;
              return `<div style="margin-bottom:20px">
                <div class="flex-between" style="margin-bottom:8px"><span style="font-weight:600">${m.managerName}</span></div>
                <div style="margin-bottom:8px">
                  <div class="flex-between" style="margin-bottom:4px"><span style="font-size:var(--text-xs);color:var(--text-muted)">Approval Rate</span><span style="font-size:var(--text-xs);font-weight:600">${m.approvedSheets}/${m.totalSheets} (${approvalRate}%)</span></div>
                  <div class="progress-bar"><div class="progress-bar-fill green" style="width:${approvalRate}%"></div></div>
                </div>
                <div>
                  <div class="flex-between" style="margin-bottom:4px"><span style="font-size:var(--text-xs);color:var(--text-muted)">Check-in Completion</span><span style="font-size:var(--text-xs);font-weight:600">${m.completedCheckins}/${m.totalCheckins} (${checkinRate}%)</span></div>
                  <div class="progress-bar"><div class="progress-bar-fill accent" style="width:${checkinRate}%"></div></div>
                </div>
              </div>`;
            }).join('') : '<p style="color:var(--text-muted)">No manager data available</p>'}
          </div>
        </div>

        <div class="glass-card" style="padding:24px">
          <h3 style="margin-bottom:20px">📅 Check-in Schedule & Windows</h3>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px">
            ${[
              {q:'Goal Setting',d:'1st May',icon:'🎯',months:'May',status:'open'},
              {q:'Q1 Check-in',d:'July',icon:'📝',months:'Jul',status:'upcoming'},
              {q:'Q2 Check-in',d:'October',icon:'📝',months:'Oct',status:'upcoming'},
              {q:'Q3 Check-in',d:'January',icon:'📝',months:'Jan',status:'upcoming'},
              {q:'Q4 / Annual',d:'Mar – Apr',icon:'🏆',months:'Mar-Apr',status:'upcoming'}
            ].map((p,i) => `
              <div class="glass-panel" style="padding:16px;text-align:center;border-top:3px solid ${i===0?'var(--accent)':'var(--glass-border)'}">
                <div style="font-size:28px;margin-bottom:8px">${p.icon}</div>
                <div style="font-weight:600;font-size:var(--text-sm);margin-bottom:4px">${p.q}</div>
                <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:8px">${p.d}</div>
                <span class="badge ${i===0?'badge-success':'badge-neutral'}">${i===0?'Active':'Upcoming'}</span>
              </div>
            `).join('')}
          </div>
        </div>`;

    } else if (tab === 'emails') {
      const emails = await api.reports.getEmailLog();
      const typeColors = { submission:'badge-info', confirmation:'badge-success', approval:'badge-success', rejection:'badge-danger', reminder:'badge-warning', checkin:'badge-warning', escalation:'badge-danger', teams:'badge-info' };
      const channelIcons = { email:'📧', teams:'💬', in_app:'🔔' };

      content.innerHTML = `
        <div class="glass-card" style="padding:24px;margin-bottom:24px">
          <div class="flex-between">
            <div><h3 style="margin-bottom:4px">📧 Email & Notification Log</h3><p style="font-size:var(--text-sm)">Automated notifications sent for key portal events</p></div>
            <div class="flex gap-sm">
              <span class="badge badge-success">${emails.filter(e => e.status === 'sent').length} Sent</span>
              <span class="badge badge-info">${emails.filter(e => e.status === 'delivered').length} Delivered</span>
            </div>
          </div>
        </div>
        ${emails.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-title">No emails sent yet</div><p class="empty-state-text">Email notifications will appear here as portal events occur</p></div>' : `
        <div class="glass-card" style="overflow:hidden">
          <table class="data-table">
            <thead><tr><th>Timestamp</th><th>Channel</th><th>Type</th><th>Recipient</th><th>Subject</th><th>Status</th></tr></thead>
            <tbody>${emails.map(e => `<tr>
              <td style="white-space:nowrap;font-size:var(--text-sm)">${new Date(e.createdAt).toLocaleString()}</td>
              <td>${channelIcons[e.channel]||'📧'} <span style="font-size:var(--text-xs);text-transform:capitalize">${e.channel}</span></td>
              <td><span class="badge ${typeColors[e.type]||'badge-neutral'}">${e.type}</span></td>
              <td style="font-size:var(--text-sm)">${e.recipientEmail}</td>
              <td style="font-size:var(--text-sm)">${e.subject}</td>
              <td><span class="badge ${e.status==='sent'?'badge-success':e.status==='delivered'?'badge-info':'badge-danger'}">${e.status}</span></td>
            </tr>`).join('')}</tbody>
          </table>
        </div>`}
        <div class="glass-card" style="padding:20px;margin-top:24px">
          <h4 style="margin-bottom:12px">📨 Email Template Preview</h4>
          <div class="glass-panel" style="padding:20px;max-width:600px">
            <div style="text-align:center;padding-bottom:16px;border-bottom:2px solid var(--accent);margin-bottom:16px">
              <strong style="font-size:var(--text-lg);color:var(--accent-dark)">AtomBerg GoalSync</strong>
            </div>
            <p style="margin-bottom:12px;font-weight:600;font-size:var(--text-base);color:var(--text-primary)">Hi Rajesh,</p>
            <p style="margin-bottom:12px;font-size:var(--text-sm)"><strong>Arjun Patel</strong> from your team has submitted their goal sheet for <strong>FY 2026-27</strong>.</p>
            <p style="margin-bottom:16px;font-size:var(--text-sm)">The sheet contains <strong>4 goals</strong> with a total weightage of <strong>100%</strong>. Please review and approve or return for rework.</p>
            <div style="text-align:center;margin-bottom:16px">
              <span style="display:inline-block;padding:12px 32px;background:var(--accent);color:var(--text-on-accent);border-radius:var(--radius-md);font-weight:600;font-size:var(--text-sm)">Review Goal Sheet →</span>
            </div>
            <p style="font-size:var(--text-xs);color:var(--text-muted);text-align:center">This is an automated notification from AtomBerg GoalSync Portal</p>
          </div>
        </div>`;
    }
  }

  el.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => renderTab(t.dataset.tab)));
  renderTab('achievement');
}
