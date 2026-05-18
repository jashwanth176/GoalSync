import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/achievement', (req, res) => {
  const { cycleId, department, quarter } = req.query;
  let query = `
    SELECT u.name as employeeName, u.department, u.email,
      g.title as goalTitle, g.thrustArea, g.uom, g.uomDirection, g.target, g.weightage, g.status,
      gs.status as sheetStatus, c.name as cycleName
    FROM goals g
    JOIN goal_sheets gs ON g.goalSheetId = gs.id
    JOIN users u ON gs.employeeId = u.id
    JOIN cycles c ON gs.cycleId = c.id
    WHERE 1=1`;
  const params = [];
  if (cycleId) { query += ' AND gs.cycleId = ?'; params.push(cycleId); }
  if (department) { query += ' AND u.department = ?'; params.push(department); }
  query += ' ORDER BY u.department, u.name, g.thrustArea';
  const rows = db.prepare(query).all(...params);

  const quarters = quarter ? [quarter] : ['Q1', 'Q2', 'Q3', 'Q4'];
  const result = rows.map(row => {
    const goalId = db.prepare('SELECT id FROM goals WHERE goalSheetId = (SELECT id FROM goal_sheets WHERE employeeId = (SELECT id FROM users WHERE email = ?) LIMIT 1) AND title = ?').get(row.email, row.goalTitle);
    const achievements = {};
    if (goalId) {
      for (const q of quarters) {
        const ach = db.prepare('SELECT actual, score FROM achievements WHERE goalId = ? AND quarter = ?').get(goalId.id, q);
        achievements[q] = ach || { actual: null, score: null };
      }
    }
    return { ...row, achievements };
  });

  res.json(result);
});

router.get('/completion', (req, res) => {
  const { cycleId } = req.query;
  let query = `
    SELECT u.name as employeeName, u.department, u.email, u.avatar,
      gs.id as sheetId, gs.status as sheetStatus,
      m.name as managerName
    FROM users u
    LEFT JOIN goal_sheets gs ON u.id = gs.employeeId
    LEFT JOIN users m ON u.managerId = m.id
    WHERE u.role = 'employee'`;
  const params = [];
  if (cycleId) { query += ' AND (gs.cycleId = ? OR gs.cycleId IS NULL)'; params.push(cycleId); }
  query += ' ORDER BY u.department, u.name';
  const rows = db.prepare(query).all(...params);

  const result = rows.map(row => {
    const checkins = {};
    if (row.sheetId) {
      for (const q of ['Q1', 'Q2', 'Q3', 'Q4']) {
        const ci = db.prepare('SELECT employeeCompleted, managerCompleted, managerComment FROM checkins WHERE goalSheetId = ? AND quarter = ?').get(row.sheetId, q);
        checkins[q] = ci || { employeeCompleted: 0, managerCompleted: 0 };
      }
    }
    return { ...row, checkins };
  });

  res.json(result);
});

router.get('/audit', (req, res) => {
  const { entityType, entityId, changedBy, from, to } = req.query;
  let query = `SELECT al.*, u.name as changedByName FROM audit_log al LEFT JOIN users u ON al.changedBy = u.id WHERE 1=1`;
  const params = [];
  if (entityType) { query += ' AND al.entityType = ?'; params.push(entityType); }
  if (entityId) { query += ' AND al.entityId = ?'; params.push(entityId); }
  if (changedBy) { query += ' AND al.changedBy = ?'; params.push(changedBy); }
  if (from) { query += ' AND al.createdAt >= ?'; params.push(from); }
  if (to) { query += ' AND al.createdAt <= ?'; params.push(to); }
  query += ' ORDER BY al.createdAt DESC LIMIT 500';
  const logs = db.prepare(query).all(...params);
  res.json(logs);
});

router.get('/analytics/qoq', (req, res) => {
  const data = db.prepare(`
    SELECT a.quarter, AVG(a.score) as avgScore, COUNT(a.id) as entries,
      g.thrustArea
    FROM achievements a
    JOIN goals g ON a.goalId = g.id
    WHERE a.score IS NOT NULL
    GROUP BY a.quarter, g.thrustArea
    ORDER BY a.quarter
  `).all();
  res.json(data);
});

router.get('/analytics/department', (req, res) => {
  const data = db.prepare(`
    SELECT u.department, AVG(a.score) as avgScore, COUNT(DISTINCT gs.employeeId) as employees,
      SUM(CASE WHEN g.status = 'completed' THEN 1 ELSE 0 END) as completedGoals,
      COUNT(g.id) as totalGoals
    FROM achievements a
    JOIN goals g ON a.goalId = g.id
    JOIN goal_sheets gs ON g.goalSheetId = gs.id
    JOIN users u ON gs.employeeId = u.id
    WHERE a.score IS NOT NULL
    GROUP BY u.department
  `).all();
  res.json(data);
});

router.get('/analytics/manager-effectiveness', (req, res) => {
  const data = db.prepare(`
    SELECT m.name as managerName, m.id as managerId,
      COUNT(DISTINCT gs.id) as totalSheets,
      SUM(CASE WHEN gs.status = 'approved' THEN 1 ELSE 0 END) as approvedSheets,
      COUNT(DISTINCT ci.id) as totalCheckins,
      SUM(CASE WHEN ci.managerCompleted = 1 THEN 1 ELSE 0 END) as completedCheckins
    FROM users m
    JOIN users e ON e.managerId = m.id
    LEFT JOIN goal_sheets gs ON gs.employeeId = e.id
    LEFT JOIN checkins ci ON ci.goalSheetId = gs.id
    WHERE m.role = 'manager'
    GROUP BY m.id
  `).all();
  res.json(data);
});

export default router;
