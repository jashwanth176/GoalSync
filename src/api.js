const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  auth: {
    getUsers: () => request('/auth/users'),
    getUsersByRole: (role) => request(`/auth/users/${role}`),
    login: (userId) => request('/auth/login', { method: 'POST', body: JSON.stringify({ userId }) }),
    loginWithCredentials: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    getUser: (id) => request(`/auth/user/${id}`),
    getTeam: (managerId) => request(`/auth/team/${managerId}`),
  },
  goals: {
    getSheets: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/goals/sheets${q ? '?' + q : ''}`);
    },
    getSheet: (id) => request(`/goals/sheets/${id}`),
    createSheet: (employeeId, cycleId) => request('/goals/sheets', { method: 'POST', body: JSON.stringify({ employeeId, cycleId }) }),
    addGoal: (sheetId, goal) => request(`/goals/sheets/${sheetId}/goals`, { method: 'POST', body: JSON.stringify(goal) }),
    updateGoal: (goalId, data) => request(`/goals/goals/${goalId}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteGoal: (goalId, changedBy) => request(`/goals/goals/${goalId}`, { method: 'DELETE', body: JSON.stringify({ changedBy }) }),
    submitSheet: (sheetId) => request(`/goals/sheets/${sheetId}/submit`, { method: 'POST' }),
    approveSheet: (sheetId, managerId, comments) => request(`/goals/sheets/${sheetId}/approve`, { method: 'POST', body: JSON.stringify({ managerId, comments }) }),
    returnSheet: (sheetId, managerId, comments) => request(`/goals/sheets/${sheetId}/return`, { method: 'POST', body: JSON.stringify({ managerId, comments }) }),
    getNotifications: (userId) => request(`/goals/notifications/${userId}`),
    markRead: (id) => request(`/goals/notifications/${id}/read`, { method: 'PUT' }),
    markAllRead: (userId) => request(`/goals/notifications/read-all/${userId}`, { method: 'PUT' }),
  },
  checkins: {
    getForSheet: (sheetId, quarter) => {
      const q = quarter ? `?quarter=${quarter}` : '';
      return request(`/checkins/${sheetId}${q}`);
    },
    getSheetQuarter: (sheetId, quarter) => request(`/checkins/sheet/${sheetId}/${quarter}`),
    updateAchievement: (data) => request('/checkins/update', { method: 'POST', body: JSON.stringify(data) }),
    addManagerComment: (data) => request('/checkins/manager-comment', { method: 'POST', body: JSON.stringify(data) }),
  },
  admin: {
    getCycles: () => request('/admin/cycles'),
    createCycle: (data) => request('/admin/cycles', { method: 'POST', body: JSON.stringify(data) }),
    updateCycle: (id, data) => request(`/admin/cycles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    unlockSheet: (sheetId, adminId) => request(`/admin/unlock-goal-sheet/${sheetId}`, { method: 'POST', body: JSON.stringify({ adminId }) }),
    pushSharedGoal: (data) => request('/admin/shared-goals', { method: 'POST', body: JSON.stringify(data) }),
    getSharedGoals: () => request('/admin/shared-goals'),
    getEscalationRules: () => request('/admin/escalation-rules'),
    createEscalationRule: (data) => request('/admin/escalation-rules', { method: 'POST', body: JSON.stringify(data) }),
    updateEscalationRule: (id, data) => request(`/admin/escalation-rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteEscalationRule: (id) => request(`/admin/escalation-rules/${id}`, { method: 'DELETE' }),
    getEscalationLogs: () => request('/admin/escalation-logs'),
    updateEscalationLog: (id, data) => request(`/admin/escalation-logs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    getStats: () => request('/admin/stats'),
    getAllUsers: () => request('/admin/all-users'),
  },
  reports: {
    getAchievement: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/reports/achievement${q ? '?' + q : ''}`);
    },
    getCompletion: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/reports/completion${q ? '?' + q : ''}`);
    },
    getAudit: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/reports/audit${q ? '?' + q : ''}`);
    },
    getEmailLog: () => request('/reports/email-log'),
    getQoQ: () => request('/reports/analytics/qoq'),
    getDeptAnalytics: () => request('/reports/analytics/department'),
    getManagerEffectiveness: () => request('/reports/analytics/manager-effectiveness'),
  }
};
