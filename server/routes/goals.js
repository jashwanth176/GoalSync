import { Router } from 'express';
import db from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

function addAudit(entityType, entityId, action, changedBy, field, oldValue, newValue) {
  db.prepare(`INSERT INTO audit_log (id, entityType, entityId, action, changedBy, field, oldValue, newValue) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(uuidv4(), entityType, entityId, action, changedBy, field, oldValue, newValue);
}

function addNotification(userId, type, title, message, link) {
  db.prepare(`INSERT INTO notifications (id, userId, type, title, message, link) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(uuidv4(), userId, type, title, message, link || null);
}

router.get('/sheets', (req, res) => {
  const { employeeId, cycleId, status } = req.query;
  let query = `SELECT gs.*, u.name as employeeName, u.department, u.avatar, c.name as cycleName
    FROM goal_sheets gs
    JOIN users u ON gs.employeeId = u.id
    JOIN cycles c ON gs.cycleId = c.id WHERE 1=1`;
  const params = [];
  if (employeeId) { query += ' AND gs.employeeId = ?'; params.push(employeeId); }
  if (cycleId) { query += ' AND gs.cycleId = ?'; params.push(cycleId); }
  if (status) { query += ' AND gs.status = ?'; params.push(status); }
  query += ' ORDER BY gs.createdAt DESC';
  const sheets = db.prepare(query).all(...params);
  res.json(sheets);
});

router.get('/sheets/:id', (req, res) => {
  const sheet = db.prepare(`SELECT gs.*, u.name as employeeName, u.department, u.avatar, c.name as cycleName
    FROM goal_sheets gs JOIN users u ON gs.employeeId = u.id JOIN cycles c ON gs.cycleId = c.id WHERE gs.id = ?`).get(req.params.id);
  if (!sheet) return res.status(404).json({ error: 'Goal sheet not found' });
  const goals = db.prepare('SELECT * FROM goals WHERE goalSheetId = ? ORDER BY createdAt').all(req.params.id);
  for (const g of goals) {
    g.achievements = db.prepare('SELECT * FROM achievements WHERE goalId = ? ORDER BY quarter').all(g.id);
  }
  res.json({ ...sheet, goals });
});

router.post('/sheets', (req, res) => {
  const { employeeId, cycleId } = req.body;
  const existing = db.prepare('SELECT id FROM goal_sheets WHERE employeeId = ? AND cycleId = ?').get(employeeId, cycleId);
  if (existing) return res.status(400).json({ error: 'Goal sheet already exists for this cycle' });
  const id = uuidv4();
  db.prepare(`INSERT INTO goal_sheets (id, employeeId, cycleId) VALUES (?, ?, ?)`).run(id, employeeId, cycleId);
  addAudit('goal_sheet', id, 'created', employeeId, null, null, null);
  res.json({ id });
});

router.post('/sheets/:id/goals', (req, res) => {
  const sheet = db.prepare('SELECT * FROM goal_sheets WHERE id = ?').get(req.params.id);
  if (!sheet) return res.status(404).json({ error: 'Goal sheet not found' });
  if (sheet.status === 'approved') return res.status(400).json({ error: 'Goal sheet is locked' });

  const existingGoals = db.prepare('SELECT COUNT(*) as c FROM goals WHERE goalSheetId = ?').get(req.params.id).c;
  if (existingGoals >= 8) return res.status(400).json({ error: 'Maximum 8 goals allowed per sheet' });

  const { thrustArea, title, description, uom, uomDirection, target, weightage } = req.body;
  if (weightage < 10) return res.status(400).json({ error: 'Minimum weightage per goal is 10%' });

  const totalWeightage = db.prepare('SELECT COALESCE(SUM(weightage), 0) as t FROM goals WHERE goalSheetId = ?').get(req.params.id).t;
  if (totalWeightage + weightage > 100) return res.status(400).json({ error: `Total weightage would exceed 100% (current: ${totalWeightage}%)` });

  const id = uuidv4();
  db.prepare(`INSERT INTO goals (id, goalSheetId, thrustArea, title, description, uom, uomDirection, target, weightage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, req.params.id, thrustArea, title, description || '', uom, uomDirection || 'min', String(target), weightage);

  db.prepare(`UPDATE goal_sheets SET updatedAt = datetime('now') WHERE id = ?`).run(req.params.id);
  addAudit('goal', id, 'created', sheet.employeeId, null, null, JSON.stringify({ title, weightage }));
  res.json({ id });
});

router.put('/goals/:id', (req, res) => {
  const goal = db.prepare('SELECT g.*, gs.status as sheetStatus, gs.employeeId FROM goals g JOIN goal_sheets gs ON g.goalSheetId = gs.id WHERE g.id = ?').get(req.params.id);
  if (!goal) return res.status(404).json({ error: 'Goal not found' });
  if (goal.sheetStatus === 'approved' && !req.body.adminUnlock) return res.status(400).json({ error: 'Goal is locked' });

  const { thrustArea, title, description, uom, uomDirection, target, weightage, status } = req.body;
  const changedBy = req.body.changedBy || goal.employeeId;

  if (goal.isShared && goal.sharedOwnerId !== goal.employeeId) {
    if (title || target || thrustArea || description) {
      return res.status(400).json({ error: 'Shared goals: only weightage can be modified' });
    }
  }

  if (weightage !== undefined && weightage < 10) return res.status(400).json({ error: 'Minimum weightage is 10%' });

  if (weightage !== undefined) {
    const otherWeightage = db.prepare('SELECT COALESCE(SUM(weightage), 0) as t FROM goals WHERE goalSheetId = ? AND id != ?')
      .get(goal.goalSheetId, goal.id).t;
    if (otherWeightage + weightage > 100) return res.status(400).json({ error: `Total weightage would exceed 100%` });
  }

  const fields = {};
  if (thrustArea !== undefined) fields.thrustArea = thrustArea;
  if (title !== undefined) fields.title = title;
  if (description !== undefined) fields.description = description;
  if (uom !== undefined) fields.uom = uom;
  if (uomDirection !== undefined) fields.uomDirection = uomDirection;
  if (target !== undefined) fields.target = String(target);
  if (weightage !== undefined) fields.weightage = weightage;
  if (status !== undefined) fields.status = status;

  for (const [key, val] of Object.entries(fields)) {
    addAudit('goal', goal.id, 'updated', changedBy, key, String(goal[key]), String(val));
  }

  const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  if (sets) {
    db.prepare(`UPDATE goals SET ${sets}, updatedAt = datetime('now') WHERE id = ?`).run(...Object.values(fields), goal.id);
    db.prepare(`UPDATE goal_sheets SET updatedAt = datetime('now') WHERE id = ?`).run(goal.goalSheetId);
  }

  res.json({ success: true });
});

router.delete('/goals/:id', (req, res) => {
  const goal = db.prepare('SELECT g.*, gs.status as sheetStatus, gs.employeeId FROM goals g JOIN goal_sheets gs ON g.goalSheetId = gs.id WHERE g.id = ?').get(req.params.id);
  if (!goal) return res.status(404).json({ error: 'Goal not found' });
  if (goal.sheetStatus === 'approved') return res.status(400).json({ error: 'Cannot delete locked goal' });

  db.prepare('DELETE FROM goals WHERE id = ?').run(req.params.id);
  db.prepare(`UPDATE goal_sheets SET updatedAt = datetime('now') WHERE id = ?`).run(goal.goalSheetId);
  addAudit('goal', goal.id, 'deleted', req.body.changedBy || goal.employeeId, null, goal.title, null);
  res.json({ success: true });
});

router.post('/sheets/:id/submit', (req, res) => {
  const sheet = db.prepare('SELECT * FROM goal_sheets WHERE id = ?').get(req.params.id);
  if (!sheet) return res.status(404).json({ error: 'Goal sheet not found' });
  if (sheet.status !== 'draft' && sheet.status !== 'returned') return res.status(400).json({ error: 'Can only submit draft or returned sheets' });

  const goals = db.prepare('SELECT * FROM goals WHERE goalSheetId = ?').all(req.params.id);
  if (goals.length === 0) return res.status(400).json({ error: 'At least one goal is required' });
  if (goals.length > 8) return res.status(400).json({ error: 'Maximum 8 goals allowed' });

  const totalWeightage = goals.reduce((sum, g) => sum + g.weightage, 0);
  if (Math.abs(totalWeightage - 100) > 0.01) return res.status(400).json({ error: `Total weightage must equal 100% (current: ${totalWeightage}%)` });

  for (const g of goals) {
    if (g.weightage < 10) return res.status(400).json({ error: `Goal "${g.title}" has weightage below 10%` });
  }

  db.prepare(`UPDATE goal_sheets SET status = 'submitted', submittedAt = datetime('now'), updatedAt = datetime('now') WHERE id = ?`).run(req.params.id);
  addAudit('goal_sheet', req.params.id, 'submitted', sheet.employeeId, 'status', sheet.status, 'submitted');

  const employee = db.prepare('SELECT * FROM users WHERE id = ?').get(sheet.employeeId);
  if (employee && employee.managerId) {
    addNotification(employee.managerId, 'approval', 'Goal Sheet Submitted', `${employee.name} has submitted their goal sheet for your review`, `#/manager/review/${req.params.id}`);
  }
  res.json({ success: true });
});

router.post('/sheets/:id/approve', (req, res) => {
  const sheet = db.prepare('SELECT * FROM goal_sheets WHERE id = ?').get(req.params.id);
  if (!sheet) return res.status(404).json({ error: 'Goal sheet not found' });
  if (sheet.status !== 'submitted') return res.status(400).json({ error: 'Can only approve submitted sheets' });

  const { managerId, comments } = req.body;

  db.prepare(`UPDATE goal_sheets SET status = 'approved', approvedAt = datetime('now'), managerComments = ?, updatedAt = datetime('now') WHERE id = ?`)
    .run(comments || null, req.params.id);

  db.prepare(`UPDATE goals SET lockedAt = datetime('now') WHERE goalSheetId = ?`).run(req.params.id);

  addAudit('goal_sheet', req.params.id, 'approved', managerId, 'status', 'submitted', 'approved');
  addNotification(sheet.employeeId, 'success', 'Goals Approved!', 'Your goal sheet has been approved and locked by your manager', '#/goals');
  res.json({ success: true });
});

router.post('/sheets/:id/return', (req, res) => {
  const sheet = db.prepare('SELECT * FROM goal_sheets WHERE id = ?').get(req.params.id);
  if (!sheet) return res.status(404).json({ error: 'Goal sheet not found' });
  if (sheet.status !== 'submitted') return res.status(400).json({ error: 'Can only return submitted sheets' });

  const { managerId, comments } = req.body;

  db.prepare(`UPDATE goal_sheets SET status = 'returned', returnedAt = datetime('now'), managerComments = ?, updatedAt = datetime('now') WHERE id = ?`)
    .run(comments || '', req.params.id);

  addAudit('goal_sheet', req.params.id, 'returned', managerId, 'status', 'submitted', 'returned');
  addNotification(sheet.employeeId, 'warning', 'Goals Returned', `Your goal sheet has been returned for rework. Manager comments: ${comments || 'None'}`, '#/goals');
  res.json({ success: true });
});

router.get('/notifications/:userId', (req, res) => {
  const notifications = db.prepare('SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50').all(req.params.userId);
  res.json(notifications);
});

router.put('/notifications/:id/read', (req, res) => {
  db.prepare('UPDATE notifications SET isRead = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.put('/notifications/read-all/:userId', (req, res) => {
  db.prepare('UPDATE notifications SET isRead = 1 WHERE userId = ?').run(req.params.userId);
  res.json({ success: true });
});

export default router;
