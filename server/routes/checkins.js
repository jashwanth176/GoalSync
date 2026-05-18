import { Router } from 'express';
import db from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

function computeScore(goal, actual) {
  if (actual === null || actual === undefined || actual === '') return null;
  const target = parseFloat(goal.target);
  const actualVal = parseFloat(actual);

  switch (goal.uom) {
    case 'numeric':
    case 'percentage':
      if (goal.uomDirection === 'max') {
        return actualVal === 0 ? 100 : Math.min(100, (target / actualVal) * 100);
      }
      return target === 0 ? (actualVal === 0 ? 100 : 0) : Math.min(100, (actualVal / target) * 100);

    case 'timeline': {
      const targetDate = new Date(goal.target);
      const actualDate = new Date(actual);
      if (actualDate <= targetDate) return 100;
      const diffDays = (actualDate - targetDate) / (1000 * 60 * 60 * 24);
      return Math.max(0, 100 - (diffDays * 2));
    }

    case 'zero':
      return actualVal === 0 ? 100 : 0;

    default:
      return null;
  }
}

router.get('/:goalSheetId', (req, res) => {
  const { quarter } = req.query;
  let query = `SELECT c.*, g.title as goalTitle, g.uom, g.uomDirection, g.target, g.thrustArea, g.weightage
    FROM checkins c JOIN goals g ON c.goalSheetId = g.goalSheetId WHERE c.goalSheetId = ?`;
  const params = [req.params.goalSheetId];
  if (quarter) { query += ' AND c.quarter = ?'; params.push(quarter); }
  const checkins = db.prepare(query).all(...params);
  res.json(checkins);
});

router.get('/sheet/:goalSheetId/:quarter', (req, res) => {
  const { goalSheetId, quarter } = req.params;
  const goals = db.prepare('SELECT * FROM goals WHERE goalSheetId = ?').all(goalSheetId);
  const result = goals.map(goal => {
    const achievement = db.prepare('SELECT * FROM achievements WHERE goalId = ? AND quarter = ?').get(goal.id, quarter);
    const checkin = db.prepare('SELECT * FROM checkins WHERE goalSheetId = ? AND quarter = ?').get(goalSheetId, quarter);
    return {
      ...goal,
      achievement: achievement || null,
      checkin: checkin || null
    };
  });
  res.json(result);
});

router.post('/update', (req, res) => {
  const { goalId, quarter, actual, notes, status, employeeId } = req.body;
  const goal = db.prepare('SELECT g.*, gs.status as sheetStatus FROM goals g JOIN goal_sheets gs ON g.goalSheetId = gs.id WHERE g.id = ?').get(goalId);
  if (!goal) return res.status(404).json({ error: 'Goal not found' });
  if (goal.sheetStatus !== 'approved') return res.status(400).json({ error: 'Goals must be approved before logging achievements' });

  const score = computeScore(goal, actual);

  const existing = db.prepare('SELECT * FROM achievements WHERE goalId = ? AND quarter = ?').get(goalId, quarter);
  if (existing) {
    db.prepare(`UPDATE achievements SET actual = ?, score = ?, notes = ?, updatedAt = datetime('now') WHERE id = ?`)
      .run(String(actual), score, notes || '', existing.id);
  } else {
    db.prepare(`INSERT INTO achievements (id, goalId, quarter, actual, score, notes) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(uuidv4(), goalId, quarter, String(actual), score, notes || '');
  }

  if (status) {
    db.prepare(`UPDATE goals SET status = ?, updatedAt = datetime('now') WHERE id = ?`).run(status, goalId);
  }

  if (goal.isShared && goal.sharedGoalId) {
    const linkedGoals = db.prepare('SELECT id FROM goals WHERE sharedGoalId = ? AND id != ?').all(goal.sharedGoalId, goalId);
    for (const lg of linkedGoals) {
      const lexist = db.prepare('SELECT id FROM achievements WHERE goalId = ? AND quarter = ?').get(lg.id, quarter);
      if (lexist) {
        db.prepare(`UPDATE achievements SET actual = ?, score = ?, updatedAt = datetime('now') WHERE id = ?`)
          .run(String(actual), score, lexist.id);
      } else {
        db.prepare(`INSERT INTO achievements (id, goalId, quarter, actual, score) VALUES (?, ?, ?, ?, ?)`)
          .run(uuidv4(), lg.id, quarter, String(actual), score);
      }
    }
  }

  const checkin = db.prepare('SELECT * FROM checkins WHERE goalSheetId = ? AND quarter = ?').get(goal.goalSheetId, quarter);
  if (!checkin) {
    db.prepare(`INSERT INTO checkins (id, goalSheetId, quarter, employeeCompleted) VALUES (?, ?, ?, 1)`)
      .run(uuidv4(), goal.goalSheetId, quarter, 1);
  } else {
    db.prepare(`UPDATE checkins SET employeeCompleted = 1 WHERE id = ?`).run(checkin.id);
  }

  db.prepare(`INSERT INTO audit_log (id, entityType, entityId, action, changedBy, field, oldValue, newValue) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(uuidv4(), 'achievement', goalId, 'updated', employeeId || 'system', `${quarter}_actual`, existing?.actual || null, String(actual));

  res.json({ score, success: true });
});

router.post('/manager-comment', (req, res) => {
  const { goalSheetId, quarter, comment, managerId } = req.body;
  const checkin = db.prepare('SELECT * FROM checkins WHERE goalSheetId = ? AND quarter = ?').get(goalSheetId, quarter);

  if (checkin) {
    db.prepare(`UPDATE checkins SET managerComment = ?, managerCompleted = 1, completedAt = datetime('now') WHERE id = ?`)
      .run(comment, checkin.id);
  } else {
    db.prepare(`INSERT INTO checkins (id, goalSheetId, quarter, managerComment, managerCompleted, completedAt) VALUES (?, ?, ?, ?, 1, datetime('now'))`)
      .run(uuidv4(), goalSheetId, quarter, comment);
  }

  const sheet = db.prepare('SELECT employeeId FROM goal_sheets WHERE id = ?').get(goalSheetId);
  if (sheet) {
    db.prepare(`INSERT INTO notifications (id, userId, type, title, message, link) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(uuidv4(), sheet.employeeId, 'checkin', 'Check-in Complete', `Your manager has completed the ${quarter} check-in review`, `#/checkin/${goalSheetId}`);
  }

  db.prepare(`INSERT INTO audit_log (id, entityType, entityId, action, changedBy, field, oldValue, newValue) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(uuidv4(), 'checkin', goalSheetId, 'manager_comment', managerId, `${quarter}_comment`, checkin?.managerComment || null, comment);

  res.json({ success: true });
});

export default router;
