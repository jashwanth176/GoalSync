import { api } from '../api.js';
import { setCurrentUser } from '../main.js';
import { navigate } from '../router.js';

export async function renderLogin(container) {
  container.innerHTML = `
  <div class="login-page">
    <div class="login-container animate-fade-up">
      <div class="login-logo">
        <img src="/assets/logo.png" alt="AtomBerg">
        <h1>Goal<span>Sync</span></h1>
      </div>
      <p class="login-subtitle">Performance Goal Management Portal</p>

      <div class="glass-card" style="max-width:440px;margin:0 auto;padding:32px;text-align:left">
        <h3 style="margin-bottom:4px;text-align:center">Sign In</h3>
        <p style="text-align:center;font-size:var(--text-sm);color:var(--text-muted);margin-bottom:24px">Enter your credentials to access the portal</p>

        <div id="loginError" style="display:none;padding:10px 14px;background:var(--danger-dim);color:var(--danger);border-radius:var(--radius-md);font-size:var(--text-sm);margin-bottom:16px;text-align:center"></div>

        <div class="form-group" style="margin-bottom:16px">
          <label class="form-label">Email Address</label>
          <input class="form-input" id="loginEmail" type="email" placeholder="name@atomberg.com" autocomplete="email">
        </div>
        <div class="form-group" style="margin-bottom:24px">
          <label class="form-label">Password</label>
          <div style="position:relative">
            <input class="form-input" id="loginPassword" type="password" placeholder="Enter your password" autocomplete="current-password">
            <button type="button" id="togglePassword" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:13px;color:var(--text-muted);font-weight:500">Show</button>
          </div>
        </div>
        <button class="btn btn-primary btn-lg" style="width:100%" id="loginBtn">
          Sign In →
        </button>

        <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--glass-border)">
          <p style="font-size:var(--text-xs);color:var(--text-muted);text-align:center;margin-bottom:8px">Demo Credentials</p>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
            <button class="btn btn-ghost btn-sm quick-fill" data-email="arjun.patel@atomberg.com" style="font-size:11px;padding:6px 8px">Employee</button>
            <button class="btn btn-ghost btn-sm quick-fill" data-email="rajesh.kumar@atomberg.com" style="font-size:11px;padding:6px 8px">Manager</button>
            <button class="btn btn-ghost btn-sm quick-fill" data-email="priya.sharma@atomberg.com" style="font-size:11px;padding:6px 8px">Admin</button>
          </div>
        </div>
      </div>
    </div>
    <div style="position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:0">
      ${Array.from({length:15}, (_,i) => `<div style="position:absolute;width:${4+Math.random()*8}px;height:${4+Math.random()*8}px;background:var(--accent);opacity:${0.03+Math.random()*0.07};border-radius:50%;left:${Math.random()*100}%;top:${Math.random()*100}%;animation:float ${3+Math.random()*4}s ease-in-out infinite;animation-delay:${Math.random()*3}s"></div>`).join('')}
    </div>
  </div>`;

  const emailInput = document.getElementById('loginEmail');
  const passInput = document.getElementById('loginPassword');
  const loginBtn = document.getElementById('loginBtn');
  const errorDiv = document.getElementById('loginError');

  document.getElementById('togglePassword').addEventListener('click', (e) => {
    const type = passInput.type === 'password' ? 'text' : 'password';
    passInput.type = type;
    e.target.textContent = type === 'password' ? 'Show' : 'Hide';
  });

  document.querySelectorAll('.quick-fill').forEach(btn => {
    btn.addEventListener('click', () => {
      emailInput.value = btn.dataset.email;
      passInput.value = 'atomberg@123';
      emailInput.focus();
    });
  });

  async function doLogin() {
    const email = emailInput.value.trim();
    const password = passInput.value;
    if (!email || !password) {
      errorDiv.textContent = 'Please enter both email and password';
      errorDiv.style.display = 'block';
      return;
    }
    errorDiv.style.display = 'none';
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';

    try {
      const user = await api.auth.loginWithCredentials(email, password);
      setCurrentUser(user);
      const dest = { employee: '/dashboard', manager: '/manager', admin: '/admin' };
      navigate(dest[user.role] || '/dashboard');
    } catch(e) {
      errorDiv.textContent = e.message || 'Login failed. Check your credentials.';
      errorDiv.style.display = 'block';
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In →';
    }
  }

  loginBtn.addEventListener('click', doLogin);
  passInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
  emailInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') passInput.focus(); });
}
