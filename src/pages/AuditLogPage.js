import { api } from '../api.js';

export async function renderAudit(el) {
  let logs = await api.reports.getAudit({});

  el.innerHTML = `
    <div class="page-header"><h1>Audit Log</h1><p>Track all changes made to goals after lock date</p></div>
    <div class="glass-card" style="padding:16px;margin-bottom:24px">
      <div class="flex gap-md" style="flex-wrap:wrap;align-items:flex-end">
        <div class="form-group"><label class="form-label">Entity Type</label>
          <select class="form-select" id="aType" style="min-width:150px"><option value="">All</option><option value="goal">Goal</option><option value="goal_sheet">Goal Sheet</option><option value="achievement">Achievement</option><option value="checkin">Check-in</option><option value="shared_goal">Shared Goal</option></select></div>
        <div class="form-group"><label class="form-label">Action</label>
          <select class="form-select" id="aAction" style="min-width:150px"><option value="">All</option><option value="created">Created</option><option value="updated">Updated</option><option value="submitted">Submitted</option><option value="approved">Approved</option><option value="returned">Returned</option><option value="unlocked">Unlocked</option><option value="deleted">Deleted</option></select></div>
        <button class="btn btn-primary btn-sm" id="filterAudit">Apply Filter</button>
      </div>
    </div>
    <div class="glass-card" style="overflow-x:auto">
      <table class="data-table" id="auditTable">
        <thead><tr><th>Timestamp</th><th>Type</th><th>Action</th><th>Changed By</th><th>Field</th><th>Old Value</th><th>New Value</th></tr></thead>
        <tbody id="auditBody"></tbody>
      </table>
    </div>`;

  function renderRows(data) {
    document.getElementById('auditBody').innerHTML = data.map(l => `<tr>
      <td style="white-space:nowrap">${new Date(l.createdAt).toLocaleString()}</td>
      <td><span class="badge badge-neutral">${l.entityType}</span></td>
      <td><span class="badge ${l.action==='approved'?'badge-success':l.action==='returned'?'badge-warning':l.action==='deleted'?'badge-danger':'badge-info'}">${l.action}</span></td>
      <td>${l.changedByName||l.changedBy}</td>
      <td>${l.field||'—'}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">${l.oldValue||'—'}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">${l.newValue||'—'}</td>
    </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted)">No audit entries found</td></tr>';
  }

  renderRows(logs);

  document.getElementById('filterAudit').addEventListener('click', async () => {
    const params = {};
    const type = document.getElementById('aType').value;
    if (type) params.entityType = type;
    logs = await api.reports.getAudit(params);
    const action = document.getElementById('aAction').value;
    if (action) logs = logs.filter(l => l.action === action);
    renderRows(logs);
  });
}
