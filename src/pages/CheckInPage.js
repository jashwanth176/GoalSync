import { api } from '../api.js';
import { currentUser, showToast } from '../main.js';

export async function renderCheckin(el) {
  const cycles = await api.admin.getCycles();
  const activeCycle = cycles.find(c => c.status === 'active') || cycles[0];
  if (!activeCycle) { el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-title">No Active Cycle</div></div>'; return; }

  const sheets = await api.goals.getSheets({ employeeId: currentUser.id, cycleId: activeCycle.id });
  const sheet = sheets[0];
  if (!sheet || sheet.status !== 'approved') {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔒</div><div class="empty-state-title">Goals Not Yet Approved</div><p class="empty-state-text">Your goal sheet must be approved before you can log check-ins.</p></div>`;
    return;
  }

  const quarters = ['Q1','Q2','Q3','Q4'];
  let selectedQ = 'Q1';
  const now = new Date();
  if (now.getMonth() >= 9) selectedQ = 'Q2';
  if (now.getMonth() >= 0 && now.getMonth() < 3) selectedQ = 'Q3';
  if (now.getMonth() >= 2 && now.getMonth() < 5) selectedQ = 'Q4';

  async function render(quarter) {
    const fullSheet = await api.goals.getSheet(sheet.id);
    const goals = fullSheet.goals || [];

    el.innerHTML = `
      <div class="parallax-hero">
        <h1>Quarterly Check-in</h1>
        <p>${activeCycle.name} • Log your achievement against planned targets</p>
      </div>
      <div class="tabs" style="margin-bottom:24px">
        ${quarters.map(q => `<button class="tab ${q===quarter?'active':''}" data-q="${q}">${q}</button>`).join('')}
      </div>
      <div id="checkinGoals">
        ${goals.map((g, i) => {
          const ach = g.achievements?.find(a => a.quarter === quarter);
          const score = ach?.score != null ? Math.round(ach.score) : null;
          const scoreColor = score === null ? 'var(--text-muted)' : score >= 80 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';
          return `
          <div class="glass-card animate-fade-up stagger-${i+1}" style="padding:20px;margin-bottom:16px">
            <div class="flex-between" style="margin-bottom:12px">
              <div>
                <span class="badge badge-accent">${g.thrustArea}</span>
                <h3 style="font-size:var(--text-lg);margin-top:4px">${g.title}</h3>
              </div>
              ${score !== null ? `<div style="text-align:center"><div style="font-size:var(--text-2xl);font-weight:800;color:${scoreColor}">${score}%</div><div style="font-size:var(--text-xs);color:var(--text-muted)">Score</div></div>` : ''}
            </div>
            <div class="grid grid-2" style="margin-bottom:16px;gap:12px">
              <div class="glass-panel" style="padding:12px"><div style="font-size:var(--text-xs);color:var(--text-muted)">Target</div><div style="font-weight:600">${g.target}${g.uom==='percentage'?'%':''}</div></div>
              <div class="glass-panel" style="padding:12px"><div style="font-size:var(--text-xs);color:var(--text-muted)">UoM</div><div style="font-weight:600">${g.uom} (${g.uomDirection})</div></div>
            </div>
            <div class="grid grid-2" style="gap:12px">
              <div class="form-group">
                <label class="form-label">Actual Achievement</label>
                <input class="form-input ach-input" data-goal-id="${g.id}" type="${g.uom==='timeline'?'date':'number'}" value="${ach?.actual||''}" placeholder="${g.uom==='zero'?'Enter 0 for success':'Enter actual value'}" ${g.uom==='zero'?'min="0"':''}>
              </div>
              <div class="form-group">
                <label class="form-label">Status</label>
                <select class="form-select status-select" data-goal-id="${g.id}">
                  <option value="not_started" ${g.status==='not_started'?'selected':''}>Not Started</option>
                  <option value="on_track" ${g.status==='on_track'?'selected':''}>On Track</option>
                  <option value="completed" ${g.status==='completed'?'selected':''}>Completed</option>
                </select>
              </div>
            </div>
            ${score !== null ? `<div class="progress-bar" style="margin-top:12px"><div class="progress-bar-fill ${score>=80?'green':score>=50?'yellow':'red'}" style="width:${Math.min(score,100)}%"></div></div>` : ''}
          </div>`;
        }).join('')}
      </div>
      <button class="btn btn-primary btn-lg" id="saveCheckin" style="margin-top:16px">💾 Save Check-in Progress</button>`;

    el.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => render(t.dataset.q)));

    document.getElementById('saveCheckin').addEventListener('click', async () => {
      const inputs = el.querySelectorAll('.ach-input');
      const statuses = el.querySelectorAll('.status-select');
      let saved = 0;
      for (const inp of inputs) {
        if (!inp.value) continue;
        const goalId = inp.dataset.goalId;
        const statusEl = el.querySelector(`.status-select[data-goal-id="${goalId}"]`);
        try {
          await api.checkins.updateAchievement({
            goalId, quarter, actual: inp.value,
            status: statusEl?.value || 'on_track',
            employeeId: currentUser.id
          });
          saved++;
        } catch(e) { showToast('error', 'Error', e.message); }
      }
      if (saved > 0) { showToast('success', 'Saved!', `${saved} achievement(s) updated`); render(quarter); }
    });
  }

  render(selectedQ);
}
