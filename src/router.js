const listeners = [];
let currentRoute = null;

const routes = {
  '/': 'login',
  '/login': 'login',
  '/dashboard': 'dashboard',
  '/goals': 'goalSheet',
  '/goals/create': 'goalSheet',
  '/checkin': 'checkin',
  '/manager': 'managerDashboard',
  '/manager/review/:id': 'goalReview',
  '/manager/checkin/:id': 'managerCheckin',
  '/admin': 'adminDashboard',
  '/admin/shared-goals': 'sharedGoals',
  '/admin/escalation': 'escalation',
  '/reports': 'reports',
  '/reports/audit': 'audit',
  '/notifications': 'notifications',
};

function matchRoute(hash) {
  const path = hash.replace('#', '') || '/';
  for (const [pattern, page] of Object.entries(routes)) {
    const paramNames = [];
    const regexStr = pattern.replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    const match = path.match(new RegExp(`^${regexStr}$`));
    if (match) {
      const params = {};
      paramNames.forEach((name, i) => { params[name] = match[i + 1]; });
      return { page, params, path };
    }
  }
  return { page: 'login', params: {}, path };
}

export function navigate(path) {
  window.location.hash = path;
}

export function getRoute() {
  return matchRoute(window.location.hash);
}

export function onRouteChange(fn) {
  listeners.push(fn);
}

export function initRouter() {
  const handler = () => {
    const route = matchRoute(window.location.hash);
    if (JSON.stringify(route) !== JSON.stringify(currentRoute)) {
      currentRoute = route;
      listeners.forEach(fn => fn(route));
    }
  };
  window.addEventListener('hashchange', handler);
  handler();
}
