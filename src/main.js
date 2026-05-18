import './styles/variables.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
import { initRouter, onRouteChange, navigate } from './router.js';
import { api } from './api.js';
import { renderLogin } from './pages/LoginPage.js';
import { renderEmployeeDashboard } from './pages/EmployeeDashboard.js';
import { renderGoalSheet } from './pages/GoalSheetPage.js';
import { renderCheckin } from './pages/CheckInPage.js';
import { renderManagerDashboard } from './pages/ManagerDashboard.js';
import { renderGoalReview } from './pages/GoalReviewPage.js';
import { renderAdminDashboard } from './pages/AdminDashboard.js';
import { renderReports } from './pages/ReportsPage.js';
import { renderAudit } from './pages/AuditLogPage.js';
import { renderSharedGoals } from './pages/SharedGoalsPage.js';
import { renderEscalation } from './pages/EscalationPage.js';

export let currentUser = null;
export function setCurrentUser(u) { currentUser = u; }

export function showToast(type, title, text) {
  let c = document.getElementById('toast-root');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<div><div class="toast-title">${title}</div><div class="toast-text">${text||''}</div></div><button class="toast-close" onclick="this.parentElement.remove()">×</button>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

function renderSidebar(role) {
  const items = {
    employee: [
      { icon: '📊', label: 'Dashboard', path: '#/dashboard' },
      { icon: '🎯', label: 'My Goals', path: '#/goals' },
      { icon: '📝', label: 'Check-ins', path: '#/checkin' },
      { icon: '📈', label: 'Reports', path: '#/reports' },
    ],
    manager: [
      { icon: '📊', label: 'Team Dashboard', path: '#/manager' },
      { icon: '🎯', label: 'My Goals', path: '#/goals' },
      { icon: '📝', label: 'Check-ins', path: '#/checkin' },
      { icon: '📈', label: 'Reports', path: '#/reports' },
    ],
    admin: [
      { icon: '📊', label: 'Dashboard', path: '#/admin' },
      { icon: '🔗', label: 'Shared Goals', path: '#/admin/shared-goals' },
      { icon: '⚡', label: 'Escalation', path: '#/admin/escalation' },
      { icon: '📈', label: 'Reports', path: '#/reports' },
      { icon: '📋', label: 'Audit Log', path: '#/reports/audit' },
    ]
  };
  const navItems = items[role] || items.employee;
  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <img src="/assets/logo.png" alt="AtomBerg">
        <span>Goal<span style="color:var(--accent)">Sync</span></span>
      </div>
      <nav class="sidebar-nav">
        <div class="sidebar-section-title">${role.toUpperCase()} MENU</div>
        ${navItems.map(n => `<button class="nav-item" data-path="${n.path}" onclick="window.location.hash='${n.path.replace('#','')}'">
          <span>${n.icon}</span><span>${n.label}</span>
        </button>`).join('')}
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="avatar">${currentUser?.avatar || '👤'}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${currentUser?.name || 'User'}</div>
            <div class="sidebar-user-role">${role}</div>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:8px" onclick="window.location.hash='/login'">🔄 Switch Role</button>
      </div>
    </aside>`;
}

function renderHeader(title) {
  return `
    <header class="header">
      <div class="header-left">
        <button class="hamburger" id="hamburger" onclick="document.getElementById('sidebar').classList.toggle('open');document.getElementById('sidebarOverlay').classList.toggle('open')">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
        </button>
        <h2 class="header-title">${title}</h2>
      </div>
      <div class="header-right">
        <button class="notification-btn" id="notifBtn" onclick="window.location.hash='/notifications'">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span class="notification-badge" id="notifBadge" style="display:none">0</span>
        </button>
      </div>
    </header>`;
}

async function loadNotifCount() {
  if (!currentUser) return;
  try {
    const notifs = await api.goals.getNotifications(currentUser.id);
    const unread = notifs.filter(n => !n.isRead).length;
    const badge = document.getElementById('notifBadge');
    if (badge) {
      badge.textContent = unread;
      badge.style.display = unread > 0 ? 'flex' : 'none';
    }
  } catch(e) {}
}

function getPageTitle(page) {
  const titles = { dashboard: 'Dashboard', goalSheet: 'My Goals', checkin: 'Check-ins', managerDashboard: 'Team Dashboard', goalReview: 'Goal Review', managerCheckin: 'Team Check-in', adminDashboard: 'Admin Dashboard', sharedGoals: 'Shared Goals', escalation: 'Escalation Rules', reports: 'Reports', audit: 'Audit Log', notifications: 'Notifications' };
  return titles[page] || 'Dashboard';
}

async function renderPage(route) {
  const app = document.getElementById('app');
  if (!route || route.page === 'login' || !currentUser) {
    app.innerHTML = '';
    renderLogin(app);
    return;
  }
  const role = currentUser.role;
  app.innerHTML = `
    <div class="app-layout">
      ${renderSidebar(role)}
      <div class="sidebar-overlay" id="sidebarOverlay" onclick="document.getElementById('sidebar').classList.remove('open');this.classList.remove('open')"></div>
      <main class="main-content">
        ${renderHeader(getPageTitle(route.page))}
        <div class="page-content" id="pageContent"></div>
      </main>
    </div>`;

  const content = document.getElementById('pageContent');
  const hash = window.location.hash.replace('#', '');
  document.querySelectorAll('.nav-item').forEach(el => {
    const p = el.dataset.path?.replace('#', '');
    el.classList.toggle('active', p === hash || (p && hash.startsWith(p) && p !== '/'));
  });

  try {
    switch (route.page) {
      case 'dashboard': await renderEmployeeDashboard(content); break;
      case 'goalSheet': await renderGoalSheet(content); break;
      case 'checkin': await renderCheckin(content); break;
      case 'managerDashboard': await renderManagerDashboard(content); break;
      case 'goalReview': await renderGoalReview(content, route.params.id); break;
      case 'managerCheckin': await renderGoalReview(content, route.params.id, true); break;
      case 'adminDashboard': await renderAdminDashboard(content); break;
      case 'sharedGoals': await renderSharedGoals(content); break;
      case 'escalation': await renderEscalation(content); break;
      case 'reports': await renderReports(content); break;
      case 'audit': await renderAudit(content); break;
      case 'notifications': await renderNotifications(content); break;
      default: content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🚧</div><div class="empty-state-title">Page Not Found</div></div>';
    }
  } catch(e) {
    console.error(e);
    content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">Error</div><p class="empty-state-text">${e.message}</p></div>`;
  }
  loadNotifCount();
}

async function renderNotifications(el) {
  const notifs = await api.goals.getNotifications(currentUser.id);
  el.innerHTML = `
    <div class="page-header flex-between">
      <div><h1>Notifications</h1><p>Stay updated on goal activities</p></div>
      <button class="btn btn-outline btn-sm" id="markAllRead">Mark All Read</button>
    </div>
    <div class="glass-card" style="padding:0;overflow:hidden">
      ${notifs.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">🔔</div><div class="empty-state-title">No notifications</div></div>' :
      notifs.map(n => `<div class="flex gap-md" style="padding:16px 20px;border-bottom:1px solid var(--glass-border);opacity:${n.isRead?0.6:1};cursor:pointer" data-link="${n.link||''}" data-nid="${n.id}">
        <div style="font-size:24px">${n.type==='success'?'✅':n.type==='warning'?'⚠️':n.type==='approval'?'📋':'🔔'}</div>
        <div style="flex:1"><div style="font-weight:600;font-size:var(--text-sm)">${n.title}</div><div style="font-size:var(--text-xs);color:var(--text-muted)">${n.message}</div><div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px">${new Date(n.createdAt).toLocaleString()}</div></div>
        ${n.isRead?'':'<div class="status-dot submitted"></div>'}
      </div>`).join('')}
    </div>`;
  el.querySelector('#markAllRead')?.addEventListener('click', async () => {
    await api.goals.markAllRead(currentUser.id);
    renderNotifications(el);
  });
  el.querySelectorAll('[data-nid]').forEach(el2 => el2.addEventListener('click', async () => {
    await api.goals.markRead(el2.dataset.nid);
    if (el2.dataset.link) window.location.hash = el2.dataset.link.replace('#','');
  }));
}

onRouteChange(renderPage);
initRouter();
