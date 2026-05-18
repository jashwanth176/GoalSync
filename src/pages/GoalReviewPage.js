import { api } from '../api.js';
import { currentUser, showToast } from '../main.js';

const COLORS = ['#FDB913','#3b82f6','#22c55e','#ef4444','#a855f7','#f97316','#06b6d4','#ec4899'];

export async function renderGoalReview(el, sheetId, isCheckin = false) {
  const sheet = await api.goals.getSheet(sheetId);
  if (!sheet) { el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">Sheet not found</div></div>'; return; }
  const goals = sheet.goals || [];
  const totalW = goals.reduce((s,g) => s + g.weightage, 0);

  if (isCheckin) {
    const quarters = ['Q1','Q2','Q3','Q4'];
    let selQ = 'Q1';

    async function renderCI(quarter) {
      el.innerHTML = `
        <div class="parallax-hero">
          <div class="flex-between">
            <div><h1>Check-in Review</h1><p>${sheet.employeeName} • ${sheet.department} • ${sheet.cycleName}</p></div>
            <a href="#/manager" class="btn btn-ghost">← Back</a>
          </div>
        </div>
        <div class="tabs" style="margin-bottom:24px">${quarters.map(q => `<button class="tab ${q===quarter?'active':''}" data-q="${q}">${q}</button>`).join('')}</div>
        ${goals.map((g,i) => {
          const ach = g.achievements?.find(a => a.quarter === quarter);
          const score = ach?.score != null ? Math.round(ach.score) : null;
          const sc = score===null?'var(--text-muted)':score>=80?'var(--success)':score>=50?'var(--warning)':'var(--danger)';
          return `<div class="glass-card animate-fade-up stagger-${i+1}" style="padding:20px;margin-bottom:16px">
            <div class="flex-between"><div><span class="badge badge-accent">${g.thrustArea}</span><h3 style="margin-top:4px">${g.title}</h3></div>
            ${score!==null?`<div style="text-align:center"><div style="font-size:var(--text-2xl);font-weight:800;color:${sc}">${score}%</div><div style="font-size:var(--text-xs);color:var(--text-muted)">Score</div></div>`:''}</div>
            <div class="grid grid-3" style="margin-top:12px;gap:12px">
              <div class="glass-panel" style="padding:12px"><div style="font-size:var(--text-xs);color:var(--text-muted)">Target</div><div style="font-weight:600">${g.target}</div></div>
              <div class="glass-panel" style="padding:12px"><div style="font-size:var(--text-xs);color:var(--text-muted)">Actual</div><div style="font-weight:600;color:${sc}">${ach?.actual||'Not reported'}</div></div>
              <div class="glass-panel" style="padding:12px"><div style="font-size:var(--text-xs);color:var(--text-muted)">Weightage</div><div style="font-weight:600;color:var(--accent)">${g.weightage}%</div></div>
            </div>
            ${score!==null?`<div class="progress-bar" style="margin-top:12px"><div class="progress-bar-fill ${score>=80?'green':score>=50?'yellow':'red'}" style="width:${Math.min(score,100)}%"></div></div>`:''}
          </div>`;
        }).join('')}
        <div class="glass-card" style="padding:20px;margin-top:24px">
          <h3 style="margin-bottom:12px">Manager Check-in Comment</h3>
          <textarea class="form-textarea" id="mgrComment" placeholder="Document your discussion, feedback, and agreed action items..." style="min-height:120px"></textarea>
          <button class="btn btn-primary" id="saveComment" style="margin-top:12px">Save Check-in Comment</button>
        </div>`;
      el.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => renderCI(t.dataset.q)));
      document.getElementById('saveComment').addEventListener('click', async () => {
        const comment = document.getElementById('mgrComment').value;
        if (!comment.trim()) { showToast('warning','Required','Please enter a comment'); return; }
        try {
          await api.checkins.addManagerComment({ goalSheetId: sheetId, quarter, comment, managerId: currentUser.id });
          showToast('success','Saved','Check-in comment recorded');
        } catch(e) { showToast('error','Error',e.message); }
      });
    }
    renderCI(selQ);
    return;
  }

  el.innerHTML = `
    <div class="parallax-hero">
      <div class="flex-between">
        <div><h1>Goal Review</h1><p>${sheet.employeeName} • ${sheet.department} • ${sheet.cycleName}</p></div>
        <div class="flex gap-sm"><span class="badge ${sheet.status==='submitted'?'badge-info':'badge-success'}">${sheet.status}</span><a href="#/manager" class="btn btn-ghost">← Back</a></div>
      </div>
    </div>
    <div style="margin-bottom:24px">
      <div class="flex-between" style="margin-bottom:8px"><span style="font-size:var(--text-sm);font-weight:600">Weightage Distribution</span><span style="font-size:var(--text-sm);color:${Math.abs(totalW-100)<0.01?'var(--success)':'var(--danger)'}">${totalW}%</span></div>
      <div class="weightage-bar">${goals.map((g,i) => `<div class="weightage-segment" style="width:${g.weightage}%;background:${COLORS[i%8]}">${g.weightage}%</div>`).join('')}</div>
    </div>
    <div id="reviewGoals">
      ${goals.map((g,i) => `
        <div class="glass-card animate-fade-up stagger-${i+1}" style="padding:20px;margin-bottom:16px" id="goal-${g.id}">
          <div class="flex-between" style="margin-bottom:12px">
            <div class="flex gap-sm" style="align-items:center"><div style="width:12px;height:12px;border-radius:50%;background:${COLORS[i%8]}"></div><span class="badge badge-accent">${g.thrustArea}</span><span class="badge badge-neutral">${g.uom}</span></div>
            ${sheet.status==='submitted'?`<button class="btn btn-ghost btn-sm inline-edit" data-id="${g.id}">✏️ Edit</button>`:''}
          </div>
          <h3 style="font-size:var(--text-lg);margin-bottom:4px">${g.title}</h3>
          ${g.description?`<p style="font-size:var(--text-sm);margin-bottom:12px">${g.description}</p>`:''}
          <div class="flex gap-lg" style="flex-wrap:wrap">
            <div><span style="font-size:var(--text-xs);color:var(--text-muted)">Target</span><div class="tgt-${g.id}" style="font-weight:600">${g.target}</div></div>
            <div><span style="font-size:var(--text-xs);color:var(--text-muted)">Weightage</span><div class="wgt-${g.id}" style="font-weight:600;color:var(--accent)">${g.weightage}%</div></div>
          </div>
          <div class="edit-form-${g.id}" style="display:none;margin-top:16px;padding-top:16px;border-top:1px solid var(--glass-border)">
            <div class="grid grid-2" style="gap:12px;margin-bottom:12px">
              <div class="form-group"><label class="form-label">Target</label><input class="form-input" id="et-${g.id}" value="${g.target}"></div>
              <div class="form-group"><label class="form-label">Weightage (%)</label><input class="form-input" id="ew-${g.id}" type="number" value="${g.weightage}" min="10" max="100"></div>
            </div>
            <button class="btn btn-primary btn-sm save-inline" data-id="${g.id}">Save Changes</button>
          </div>
        </div>
      `).join('')}
    </div>
    ${sheet.status==='submitted'?`
    <div class="glass-card" style="padding:20px;margin-top:24px">
      <h3 style="margin-bottom:12px">Decision</h3>
      <div class="form-group" style="margin-bottom:16px"><label class="form-label">Comments (optional)</label><textarea class="form-textarea" id="reviewComments" placeholder="Provide feedback..."></textarea></div>
      <div class="flex gap-sm">
        <button class="btn btn-success" id="approveBtn">✅ Approve & Lock</button>
        <button class="btn btn-danger" id="returnBtn">🔄 Return for Rework</button>
      </div>
    </div>`:''}`;

  el.querySelectorAll('.inline-edit').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.id;
    const form = el.querySelector(`.edit-form-${id}`);
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
  }));

  el.querySelectorAll('.save-inline').forEach(btn => btn.addEventListener('click', async () => {
    const id = btn.dataset.id;
    const target = document.getElementById(`et-${id}`).value;
    const weightage = parseFloat(document.getElementById(`ew-${id}`).value);
    try {
      await api.goals.updateGoal(id, { target, weightage, changedBy: currentUser.id });
      showToast('success','Updated','Goal updated');
      renderGoalReview(el, sheetId);
    } catch(e) { showToast('error','Error',e.message); }
  }));

  document.getElementById('approveBtn')?.addEventListener('click', async () => {
    if (!confirm('Approve and lock this goal sheet?')) return;
    try {
      await api.goals.approveSheet(sheetId, currentUser.id, document.getElementById('reviewComments')?.value);
      showToast('success','Approved','Goal sheet approved and locked');
      window.location.hash = '/manager';
    } catch(e) { showToast('error','Error',e.message); }
  });

  document.getElementById('returnBtn')?.addEventListener('click', async () => {
    const comments = document.getElementById('reviewComments')?.value;
    if (!comments?.trim()) { showToast('warning','Required','Please provide comments when returning'); return; }
    try {
      await api.goals.returnSheet(sheetId, currentUser.id, comments);
      showToast('success','Returned','Goal sheet returned for rework');
      window.location.hash = '/manager';
    } catch(e) { showToast('error','Error',e.message); }
  });
}
