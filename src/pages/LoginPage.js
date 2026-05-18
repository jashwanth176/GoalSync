import { api } from '../api.js';
import { setCurrentUser } from '../main.js';
import { navigate } from '../router.js';

export async function renderLogin(container) {
  let users = [];
  try { users = await api.auth.getUsers(); } catch(e) { console.error(e); }

  const grouped = { employee: [], manager: [], admin: [] };
  users.forEach(u => { if (grouped[u.role]) grouped[u.role].push(u); });

  container.innerHTML = `
  <div class="login-page">
    <div class="login-container animate-fade-up">
      <div class="login-logo">
        <img src="/assets/logo.png" alt="AtomBerg">
        <h1>Goal<span>Sync</span></h1>
      </div>
      <p class="login-subtitle">Performance Goal Management Portal</p>
      <div class="role-cards" id="roleCards">
        <div class="role-card" data-role="employee">
          <div class="role-card-icon">👨‍💼</div>
          <div class="role-card-title">Employee</div>
          <div class="role-card-desc">Create goals, track achievements, and complete quarterly check-ins</div>
        </div>
        <div class="role-card" data-role="manager">
          <div class="role-card-icon">👩‍💻</div>
          <div class="role-card-title">Manager (L1)</div>
          <div class="role-card-desc">Review & approve team goals, conduct check-ins, and provide feedback</div>
        </div>
        <div class="role-card" data-role="admin">
          <div class="role-card-icon">🛡️</div>
          <div class="role-card-title">Admin / HR</div>
          <div class="role-card-desc">Configure cycles, manage hierarchy, oversee completion rates</div>
        </div>
      </div>
      <div id="userSelect" style="display:none;max-width:400px;margin:0 auto">
        <div class="form-group" style="margin-bottom:20px">
          <label class="form-label">Select User</label>
          <select class="form-select" id="userDropdown"><option value="">Choose a user...</option></select>
        </div>
        <button class="btn btn-primary btn-lg" style="width:100%" id="enterBtn" disabled>
          Enter Portal →
        </button>
      </div>
    </div>
    <div style="position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:0">
      ${Array.from({length:20}, (_,i) => `<div style="position:absolute;width:${4+Math.random()*8}px;height:${4+Math.random()*8}px;background:var(--accent);opacity:${0.03+Math.random()*0.07};border-radius:50%;left:${Math.random()*100}%;top:${Math.random()*100}%;animation:float ${3+Math.random()*4}s ease-in-out infinite;animation-delay:${Math.random()*3}s"></div>`).join('')}
    </div>
  </div>`;

  let selectedRole = null;
  document.querySelectorAll('.role-card').forEach(card => {
    card.addEventListener('click', () => {
      selectedRole = card.dataset.role;
      document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const sel = document.getElementById('userSelect');
      const dd = document.getElementById('userDropdown');
      dd.innerHTML = '<option value="">Choose a user...</option>' +
        grouped[selectedRole].map(u => `<option value="${u.id}">${u.avatar} ${u.name} — ${u.department}</option>`).join('');
      sel.style.display = 'block';
      document.getElementById('enterBtn').disabled = true;
    });
  });

  document.getElementById('userDropdown').addEventListener('change', (e) => {
    document.getElementById('enterBtn').disabled = !e.target.value;
  });

  document.getElementById('enterBtn').addEventListener('click', async () => {
    const userId = document.getElementById('userDropdown').value;
    if (!userId) return;
    try {
      const user = await api.auth.login(userId);
      setCurrentUser(user);
      const dest = { employee: '/dashboard', manager: '/manager', admin: '/admin' };
      navigate(dest[user.role] || '/dashboard');
    } catch(e) { alert(e.message); }
  });
}
