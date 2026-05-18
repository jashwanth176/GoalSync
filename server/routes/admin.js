import { Router } from 'express';
import db from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.get('/cycles', (req, res) => {
  const cycles = db.prepare('SELECT * FROM cycles ORDER BY year DESC').all();
  res.json(cycles);
});

router.post('/cycles', (req, res) => {
  const { name, year, goalSettingOpen, goalSettingClose, q1Open, q1Close, q2Open, q2Close, q3Open, q3Close, q4Open, q4Close } = req.body;
  const id = uuidv4();
  db.prepare(`INSERT INTO cycles (id, name, year, goalSettingOpen, goalSettingClose, q1Open, q1Close, q2Open, q2Close, q3Open, q3Close, q4Open, q4Close) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, name, year, goalSettingOpen, goalSettingClose, q1Open, q1Close, q2Open, q2Close, q3Open, q3Close, q4Open, q4Close);
  res.json({ id });
});

router.put('/cycles/:id', (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE cycles SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

router.post('/unlock-goal-sheet/:id', (req, res) => {
  const { adminId } = req.body;
  const sheet = db.prepare('SELECT * FROM goal_sheets WHERE id = ?').get(req.params.id);
  if (!sheet) return res.status(404).json({ error: 'Goal sheet not found' });
  db.prepare(`UPDATE goal_sheets SET status = 'returned', updatedAt = datetime('now') WHERE id = ?`).run(req.params.id);
  db.prepare(`UPDATE goals SET lockedAt = NULL WHERE goalSheetId = ?`).run(req.params.id);
  db.prepare(`INSERT INTO audit_log (id, entityType, entityId, action, changedBy, field, oldValue, newValue) VALUES (?,?,?,?,?,?,?,?)`)
    .run(uuidv4(), 'goal_sheet', req.params.id, 'unlocked', adminId, 'status', sheet.status, 'returned');
  const emp = db.prepare('SELECT * FROM users WHERE id = ?').get(sheet.employeeId);
  if (emp) {
    db.prepare(`INSERT INTO notifications (id, userId, type, title, message, link) VALUES (?,?,?,?,?,?)`)
      .run(uuidv4(), sheet.employeeId, 'info', 'Goals Unlocked', 'An admin has unlocked your goal sheet for editing', '#/goals');
  }
  res.json({ success: true });
});

router.post('/shared-goals', (req, res) => {
  const { createdBy, thrustArea, title, description, uom, uomDirection, target, department, recipientIds } = req.body;
  const templateId = uuidv4();
  db.prepare(`INSERT INTO shared_goal_templates (id, createdBy, thrustArea, title, description, uom, uomDirection, target, department) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(templateId, createdBy, thrustArea, title, description || '', uom, uomDirection || 'min', String(target), department || null);

  const activeCycle = db.prepare("SELECT id FROM cycles WHERE status = 'active' ORDER BY year DESC LIMIT 1").get();
  if (!activeCycle) return res.status(400).json({ error: 'No active cycle found' });

  const pushed = [];
  for (const empId of recipientIds) {
    let sheet = db.prepare('SELECT id FROM goal_sheets WHERE employeeId = ? AND cycleId = ?').get(empId, activeCycle.id);
    if (!sheet) {
      const sheetId = uuidv4();
      db.prepare(`INSERT INTO goal_sheets (id, employeeId, cycleId) VALUES (?,?,?)`).run(sheetId, empId, activeCycle.id);
      sheet = { id: sheetId };
    }
    const goalCount = db.prepare('SELECT COUNT(*) as c FROM goals WHERE goalSheetId = ?').get(sheet.id).c;
    if (goalCount >= 8) { pushed.push({ empId, error: 'Max goals reached' }); continue; }

    const goalId = uuidv4();
    db.prepare(`INSERT INTO goals (id, goalSheetId, thrustArea, title, description, uom, uomDirection, target, weightage, isShared, sharedOwnerId, sharedGoalId)
      VALUES (?,?,?,?,?,?,?,?,10,1,?,?)`)
      .run(goalId, sheet.id, thrustArea, title, description || '', uom, uomDirection || 'min', String(target), createdBy, templateId);
    pushed.push({ empId, goalId });

    db.prepare(`INSERT INTO notifications (id, userId, type, title, message, link) VALUES (?,?,?,?,?,?)`)
      .run(uuidv4(), empId, 'shared', 'Shared Goal Assigned', `A shared goal "${title}" has been assigned to you`, '#/goals');
  }

  db.prepare(`INSERT INTO audit_log (id, entityType, entityId, action, changedBy, field, oldValue, newValue) VALUES (?,?,?,?,?,?,?,?)`)
    .run(uuidv4(), 'shared_goal', templateId, 'created', createdBy, null, null, JSON.stringify({ title, recipientCount: recipientIds.length }));

  res.json({ templateId, pushed });
});

router.get('/shared-goals', (req, res) => {
  const templates = db.prepare(`SELECT sgt.*, u.name as creatorName FROM shared_goal_templates sgt JOIN users u ON sgt.createdBy = u.id ORDER BY sgt.createdAt DESC`).all();
  res.json(templates);
});

router.get('/escalation-rules', (req, res) => {
  const rules = db.prepare('SELECT * FROM escalation_rules ORDER BY createdAt').all();
  res.json(rules);
});

router.post('/escalation-rules', (req, res) => {
  const { triggerType, delayDays, description } = req.body;
  const id = uuidv4();
  db.prepare(`INSERT INTO escalation_rules (id, triggerType, delayDays, description) VALUES (?,?,?,?)`).run(id, triggerType, delayDays, description || '');
  res.json({ id });
});

router.put('/escalation-rules/:id', (req, res) => {
  const { active, delayDays, description } = req.body;
  if (active !== undefined) db.prepare('UPDATE escalation_rules SET active = ? WHERE id = ?').run(active ? 1 : 0, req.params.id);
  if (delayDays !== undefined) db.prepare('UPDATE escalation_rules SET delayDays = ? WHERE id = ?').run(delayDays, req.params.id);
  if (description !== undefined) db.prepare('UPDATE escalation_rules SET description = ? WHERE id = ?').run(description, req.params.id);
  res.json({ success: true });
});

router.delete('/escalation-rules/:id', (req, res) => {
  db.prepare('DELETE FROM escalation_rules WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/stats', (req, res) => {
  const totalEmployees = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'employee'").get().c;
  const totalManagers = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'manager'").get().c;
  const totalGoalSheets = db.prepare('SELECT COUNT(*) as c FROM goal_sheets').get().c;
  const approvedSheets = db.prepare("SELECT COUNT(*) as c FROM goal_sheets WHERE status = 'approved'").get().c;
  const submittedSheets = db.prepare("SELECT COUNT(*) as c FROM goal_sheets WHERE status = 'submitted'").get().c;
  const draftSheets = db.prepare("SELECT COUNT(*) as c FROM goal_sheets WHERE status = 'draft'").get().c;
  const returnedSheets = db.prepare("SELECT COUNT(*) as c FROM goal_sheets WHERE status = 'returned'").get().c;
  const totalGoals = db.prepare('SELECT COUNT(*) as c FROM goals').get().c;

  const deptStats = db.prepare(`
    SELECT u.department, COUNT(DISTINCT gs.id) as sheets,
      SUM(CASE WHEN gs.status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN gs.status = 'submitted' THEN 1 ELSE 0 END) as pending
    FROM goal_sheets gs JOIN users u ON gs.employeeId = u.id GROUP BY u.department
  `).all();

  const thrustAreaDist = db.prepare(`SELECT thrustArea, COUNT(*) as count FROM goals GROUP BY thrustArea`).all();
  const uomDist = db.prepare(`SELECT uom, COUNT(*) as count FROM goals GROUP BY uom`).all();

  res.json({ totalEmployees, totalManagers, totalGoalSheets, approvedSheets, submittedSheets, draftSheets, returnedSheets, totalGoals, deptStats, thrustAreaDist, uomDist });
});

router.get('/all-users', (req, res) => {
  const users = db.prepare(`SELECT u.id, u.name, u.email, u.department, u.role, u.managerId, u.avatar, u.createdAt, m.name as managerName FROM users u LEFT JOIN users m ON u.managerId = m.id ORDER BY u.department, u.name`).all();
  res.json(users);
});

router.get('/escalation-logs', (req, res) => {
  const logs = db.prepare(`
    SELECT el.*, e.name as employeeName, e.department, t.name as escalatedToName, t.role as escalatedToRole
    FROM escalation_log el
    JOIN users e ON el.employeeId = e.id
    JOIN users t ON el.escalatedToId = t.id
    ORDER BY el.createdAt DESC
  `).all();
  res.json(logs);
});

router.put('/escalation-logs/:id', (req, res) => {
  const { status } = req.body;
  if (status === 'resolved') {
    db.prepare("UPDATE escalation_log SET status = 'resolved', resolvedAt = datetime('now') WHERE id = ?").run(req.params.id);
  } else if (status === 'dismissed') {
    db.prepare("UPDATE escalation_log SET status = 'dismissed', resolvedAt = datetime('now') WHERE id = ?").run(req.params.id);
  }
  res.json({ success: true });
});

export default router;
